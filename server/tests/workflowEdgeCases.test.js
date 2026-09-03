import test from 'node:test';
import assert from 'node:assert';
import { evaluateClinicalReadiness, calculateFreshness } from '../src/engine/readinessEngine.js';
import { evaluateSingleBedRecommendation, evaluateNextSafeBed } from '../src/engine/recommendationEngine.js';
import { BED_STATES, isValidBedTransition, evaluatePhysicalBedAvailability } from '../src/engine/turnoverEngine.js';
import { REQUIRED_MILESTONES } from '../src/db/seedData.js';
import { calculateStats, evaluateExperimentMetrics, runSyntheticExperiment, calculateTurnoverTimeMinutes } from '../src/engine/metricsEngine.js';
import { updateSystemConfigCache } from '../src/services/configService.js';

const mockConfig = {
  aging_threshold_minutes: 5,
  freshness_threshold_minutes: 15,
  max_simultaneous_cleanings: 3
};

// TEST A: Same bed reused by multiple patients -> events must not cross-contaminate KPI
test('TEST A - Same bed reused by multiple patients does not cross-contaminate KPI', async () => {
  const mockDbQuery = async (sql) => {
    if (sql.includes('FROM patients')) {
      return [
        { patient_id: 'PAT-101', bed_id: 'B01' },
        { patient_id: 'PAT-102', bed_id: 'B01' } // Reused same bed B01
      ];
    }
    if (sql.includes('FROM clinical_milestones')) {
      return [
        ...REQUIRED_MILESTONES.map(m => ({ patient_id: 'PAT-101', milestone_type: m, status: 'COMPLETED', event_time: '2026-09-03T10:00:00.000Z', received_time: '2026-09-03T10:02:00.000Z' })),
        ...REQUIRED_MILESTONES.map(m => ({ patient_id: 'PAT-102', milestone_type: m, status: 'COMPLETED', event_time: '2026-09-03T14:00:00.000Z', received_time: '2026-09-03T14:02:00.000Z' }))
      ];
    }
    if (sql.includes('FROM bed_events')) {
      return [
        { id: 1, bed_id: 'B01', patient_id: 'PAT-101', state: 'READY', source: 'PROTOTYPE', timestamp: '2026-09-03T10:55:00.000Z' },
        { id: 2, bed_id: 'B01', patient_id: 'PAT-101', state: 'READY', source: 'BASELINE', timestamp: '2026-09-03T11:35:00.000Z' },
        { id: 3, bed_id: 'B01', patient_id: 'PAT-102', state: 'READY', source: 'PROTOTYPE', timestamp: '2026-09-03T14:50:00.000Z' },
        { id: 4, bed_id: 'B01', patient_id: 'PAT-102', state: 'READY', source: 'BASELINE', timestamp: '2026-09-03T15:35:00.000Z' }
      ];
    }
    return [];
  };

  const res = await runSyntheticExperiment(mockDbQuery);
  assert.strictEqual(res.validCases, 2);
  assert.strictEqual(res.caseDetails[0].patient_id, 'PAT-101');
  assert.strictEqual(res.caseDetails[0].prototypeDuration, 55);
  assert.strictEqual(res.caseDetails[1].patient_id, 'PAT-102');
  assert.strictEqual(res.caseDetails[1].prototypeDuration, 50);
});

// TEST B: event_time vs received_time -> KPI must use event_time
test('TEST B - KPI turnover duration uses event_time for clinical truth', () => {
  const eventTimeISO = '2026-09-03T10:00:00.000Z';
  const readyTimeISO = '2026-09-03T10:55:00.000Z';
  const duration = calculateTurnoverTimeMinutes(eventTimeISO, readyTimeISO);
  assert.strictEqual(duration, 55);
});

// TEST C: Synthetic old timestamps must not automatically become STALE because of wall-clock Date.now()
test('TEST C - Synthetic historical event timestamp freshness uses latency (received_time - event_time)', () => {
  const eventTimeISO = '2026-01-01T10:00:00.000Z';
  const receivedTimeISO = '2026-01-01T10:02:00.000Z'; // 2 mins ingestion latency
  const freshnessResult = calculateFreshness(eventTimeISO, null, mockConfig, receivedTimeISO);
  assert.strictEqual(freshnessResult.freshness, 'FRESH');
  assert.strictEqual(freshnessResult.ageMinutes, 2);
});

// TEST D: Missing cleaning evidence -> bed must not be safely recommended
test('TEST D - Missing cleaning evidence prevents safe bed recommendation', () => {
  const bed = { bed_id: 'B04', state: BED_STATES.READY, is_blocked: 0 };
  const availability = evaluatePhysicalBedAvailability(bed, null);
  assert.strictEqual(availability.isAvailable, false);
  assert.match(availability.reason, /missing cleaning evidence record/);
});

// TEST E: UNKNOWN -> READY rejected
test('TEST E - UNKNOWN to READY state transition is rejected', () => {
  assert.strictEqual(isValidBedTransition(BED_STATES.UNKNOWN, BED_STATES.READY), false);
});

// TEST F: BLOCKED -> READY rejected
test('TEST F - BLOCKED to READY state transition is rejected', () => {
  assert.strictEqual(isValidBedTransition(BED_STATES.BLOCKED, BED_STATES.READY), false);
});

// TEST G: OCCUPIED -> READY rejected
test('TEST G - OCCUPIED to READY state transition is rejected', () => {
  assert.strictEqual(isValidBedTransition(BED_STATES.OCCUPIED, BED_STATES.READY), false);
});

// TEST H: CLEANING -> READY without verification rejected
test('TEST H - CLEANING to READY direct state transition is rejected', () => {
  assert.strictEqual(isValidBedTransition(BED_STATES.CLEANING, BED_STATES.READY), false);
});

// TEST I: MANUAL_VERIFICATION_REQUIRED -> READY without completed cleaning evidence rejected
test('TEST I - MANUAL_VERIFICATION_REQUIRED bed without cleaning evidence is not available', () => {
  const bed = { bed_id: 'B07', state: BED_STATES.MANUAL_VERIFICATION_REQUIRED, is_blocked: 0 };
  const availability = evaluatePhysicalBedAvailability(bed, null);
  assert.strictEqual(availability.isAvailable, false);
});

// TEST J: Deterministic experiment -> same dataset produces same KPI
test('TEST J - Deterministic experiment execution produces identical reproducible KPI output', async () => {
  const mockDbQuery = async (sql) => {
    if (sql.includes('FROM patients')) return [{ patient_id: 'PAT-101', bed_id: 'B01' }];
    if (sql.includes('FROM clinical_milestones')) return REQUIRED_MILESTONES.map(m => ({ patient_id: 'PAT-101', milestone_type: m, status: 'COMPLETED', event_time: '2026-09-03T10:00:00.000Z', received_time: '2026-09-03T10:02:00.000Z' }));
    if (sql.includes('FROM bed_events')) return [
      { bed_id: 'B01', patient_id: 'PAT-101', state: 'READY', source: 'PROTOTYPE', timestamp: '2026-09-03T10:55:00.000Z' },
      { bed_id: 'B01', patient_id: 'PAT-101', state: 'READY', source: 'BASELINE', timestamp: '2026-09-03T11:35:00.000Z' }
    ];
    return [];
  };

  const res1 = await runSyntheticExperiment(mockDbQuery);
  const res2 = await runSyntheticExperiment(mockDbQuery);
  assert.strictEqual(res1.prototype.mean, res2.prototype.mean);
  assert.strictEqual(res1.baseline.mean, res2.baseline.mean);
  assert.strictEqual(res1.improvementMinutes, res2.improvementMinutes);
});

// TEST K: Configuration threshold changes affect application behavior
test('TEST K - Configuration threshold override changes freshness categorization', () => {
  const eventTimeISO = '2026-09-03T10:00:00.000Z';
  const receivedTimeISO = '2026-09-03T10:08:00.000Z'; // 8 mins latency

  const strictConfig = { aging_threshold_minutes: 5, freshness_threshold_minutes: 15 };
  const strictRes = calculateFreshness(eventTimeISO, null, strictConfig, receivedTimeISO);
  assert.strictEqual(strictRes.freshness, 'AGING');

  const relaxedConfig = { aging_threshold_minutes: 10, freshness_threshold_minutes: 30 };
  const relaxedRes = calculateFreshness(eventTimeISO, null, relaxedConfig, receivedTimeISO);
  assert.strictEqual(relaxedRes.freshness, 'FRESH');
});
