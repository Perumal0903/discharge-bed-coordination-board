import test from 'node:test';
import assert from 'node:assert';
import {
  cancelDischargeOrder,
  createDischargeOrder,
  triggerAdmission,
  dischargePatient,
  startCleaning,
  completeCleaning,
  recordBedEvent
} from '../src/services/simulatorService.js';
import { isEventStaleOrOutOfOrder, BED_STATES, isValidBedTransition } from '../src/engine/turnoverEngine.js';
import { evaluateSingleBedRecommendation } from '../src/engine/recommendationEngine.js';
import { runSyntheticScenarioEvaluation } from '../src/engine/scenarioEvaluation.js';
import { query, run, getOne } from '../src/db/index.js';

const mockConfig = {
  aging_threshold_minutes: 5,
  freshness_threshold_minutes: 15,
  max_simultaneous_cleanings: 3
};

// 1. Simultaneous Discharge Cancellation Tests
test('Edge Case - Discharge order can be confirmed and then safely cancelled', async () => {
  await run("UPDATE beds SET state = 'READY', is_blocked = 0, current_patient_id = NULL WHERE bed_id = 'B17'");
  const admission = await triggerAdmission({ bedId: 'B17', patientName: 'Test Patient Cancel', procedureName: 'Minor Surgery' });
  const patId = admission.patientId;

  await createDischargeOrder({ patientId: patId, clinician: 'Dr. Aris Thorne' });
  let pat = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patId]);
  let bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', ['B17']);
  assert.strictEqual(pat.discharge_status, 'PENDING_LEAVE');
  assert.strictEqual(bed.state, BED_STATES.DISCHARGE_PENDING);

  // Cancel discharge order
  const cancelRes = await cancelDischargeOrder({ patientId: patId, reason: 'Patient developed fever' });
  assert.strictEqual(cancelRes.orderStatus, 'CANCELLED');

  pat = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patId]);
  bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', ['B17']);
  assert.strictEqual(pat.discharge_status, 'IN_CARE');
  assert.strictEqual(bed.state, BED_STATES.OCCUPIED);

  // Verify Audit Log
  const audit = await query('SELECT * FROM audit_logs WHERE target_id = ? AND action = ?', [patId, 'CANCEL_DISCHARGE_ORDER']);
  assert.strictEqual(audit.length >= 1, true);
});

test('Edge Case - Idempotent repeated discharge cancellation', async () => {
  await run("UPDATE beds SET state = 'READY', is_blocked = 0, current_patient_id = NULL WHERE bed_id = 'B18'");
  const admission = await triggerAdmission({ bedId: 'B18', patientName: 'Idempotent Test', procedureName: 'Endoscopy' });
  const patId = admission.patientId;

  await createDischargeOrder({ patientId: patId });
  await cancelDischargeOrder({ patientId: patId, reason: 'Nausea post-op' });

  // Second cancellation attempt
  const repeatRes = await cancelDischargeOrder({ patientId: patId, reason: 'Nausea post-op' });
  assert.strictEqual(repeatRes.orderStatus, 'CANCELLED');
  assert.strictEqual(repeatRes.alreadyCancelled, true);

  const pat = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patId]);
  assert.strictEqual(pat.discharge_status, 'IN_CARE');
});

test('Edge Case - Cancellation post physical departure is rejected', async () => {
  await run("UPDATE beds SET state = 'READY', is_blocked = 0, current_patient_id = NULL WHERE bed_id = 'B11'");
  const admission = await triggerAdmission({ bedId: 'B11', patientName: 'Departed Patient Test', procedureName: 'Cataract' });
  const patId = admission.patientId;

  await createDischargeOrder({ patientId: patId });
  await dischargePatient({ patientId: patId });

  const pat = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patId]);
  assert.strictEqual(pat.discharge_status, 'DISCHARGED');

  await assert.rejects(
    async () => {
      await cancelDischargeOrder({ patientId: patId, reason: 'Late cancellation' });
    },
    /has already physically departed/
  );
});

// 2. Cleaning State Race Conditions & Out-Of-Order Event Handling
test('Race Condition - isEventStaleOrOutOfOrder detects out-of-order timestamps and tie-breakers', () => {
  const latestTime = '2026-10-01T10:30:00.000Z';
  const olderTime = '2026-10-01T10:20:00.000Z';
  const newerTime = '2026-10-01T10:40:00.000Z';

  assert.strictEqual(isEventStaleOrOutOfOrder(latestTime, olderTime), true);
  assert.strictEqual(isEventStaleOrOutOfOrder(latestTime, newerTime), false);

  // Tie-breaker ID comparison for identical timestamps
  assert.strictEqual(isEventStaleOrOutOfOrder(latestTime, latestTime, 100, 95), true);
  assert.strictEqual(isEventStaleOrOutOfOrder(latestTime, latestTime, 100, 105), false);
});

test('Race Condition - Older stale cleaning event arriving after completion is ignored', async () => {
  const bedId = 'B10';
  const newerTime = '2026-10-01T12:00:00.000Z';
  const olderTime = '2026-10-01T11:30:00.000Z';

  await run('UPDATE beds SET state = ?, state_updated_at = ? WHERE bed_id = ?', [BED_STATES.INSPECTION, newerTime, bedId]);

  // Attempt starting cleaning with older timestamp
  const res = await startCleaning({ bedId, eventTime: olderTime });
  assert.strictEqual(res.ignored, true);
  assert.match(res.reason, /Stale\/out-of-order/);

  const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [bedId]);
  assert.strictEqual(bed.state, BED_STATES.INSPECTION);
});

test('Race Condition - Cannot complete cleaning on an OCCUPIED bed', async () => {
  await run('UPDATE beds SET state = ?, current_patient_id = ? WHERE bed_id = ?', [BED_STATES.OCCUPIED, 'PAT-999', 'B01']);

  await assert.rejects(
    async () => {
      await completeCleaning({ bedId: 'B01' });
    },
    /is currently OCCUPIED/
  );
});

test('Race Condition - Non-existent bed cleaning attempt throws error', async () => {
  await assert.rejects(
    async () => {
      await startCleaning({ bedId: 'B999' });
    },
    /Bed B999 not found/
  );
});

// 3. Fallback Activations & Unsafe Recommendations Prevention
test('Safety Safeguard - Conflicting cleaning status IN_PROGRESS on READY bed triggers MANUAL VERIFICATION REQUIRED', () => {
  const now = new Date();
  const bed = { bed_id: 'B04', state: BED_STATES.READY, state_updated_at: now.toISOString(), is_blocked: 0 };
  const cleaning = { bed_id: 'B04', cleaning_status: 'IN_PROGRESS' };

  const rec = evaluateSingleBedRecommendation(bed, cleaning, now, mockConfig);
  assert.strictEqual(rec.recommendation, 'MANUAL VERIFICATION REQUIRED');
  assert.strictEqual(rec.safeToAllocate, false);
});

test('Safety Safeguard - Direct transition from UNKNOWN, BLOCKED, OCCUPIED, or CLEANING to READY is strictly blocked', () => {
  assert.strictEqual(isValidBedTransition(BED_STATES.UNKNOWN, BED_STATES.READY), false);
  assert.strictEqual(isValidBedTransition(BED_STATES.BLOCKED, BED_STATES.READY), false);
  assert.strictEqual(isValidBedTransition(BED_STATES.OCCUPIED, BED_STATES.READY), false);
  assert.strictEqual(isValidBedTransition(BED_STATES.CLEANING, BED_STATES.READY), false);
});

// 4. Deterministic Synthetic Scenario Cohort Evaluation
test('Synthetic Scenario Analysis - Deterministic evaluation produces all 6 scenario cohorts with 0 unsafe recs', () => {
  const scenarios = runSyntheticScenarioEvaluation();
  assert.strictEqual(scenarios.length, 6);

  scenarios.forEach(sc => {
    assert.strictEqual(sc.unsafeRecommendationsCount, 0);
    assert.strictEqual(sc.disclaimer, 'Descriptive synthetic result — insufficient sample size for statistical inference.');
  });

  const normalSc = scenarios.find(s => s.id === 'baseline_normal');
  assert.strictEqual(normalSc.baseline.mean, 80);
  assert.strictEqual(normalSc.prototype.mean, 40);

  const staleSc = scenarios.find(s => s.id === 'stale_conflicting_data');
  assert.strictEqual(staleSc.manualFallbacksCount, 20);
  assert.strictEqual(staleSc.validCases, 0);
});
