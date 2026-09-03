import test from 'node:test';
import assert from 'node:assert';
import { evaluateSingleBedRecommendation, evaluateNextSafeBed } from '../src/engine/recommendationEngine.js';
import { BED_STATES } from '../src/engine/turnoverEngine.js';

const mockConfig = {
  aging_threshold_minutes: 5,
  freshness_threshold_minutes: 15,
  max_simultaneous_cleanings: 3
};

test('Recommendation Engine - READY + no cleaning record -> MANUAL VERIFICATION REQUIRED', () => {
  const now = new Date();
  const bed = {
    bed_id: 'B04',
    room_number: 'Day Ward 104',
    state: BED_STATES.READY,
    state_updated_at: now.toISOString(),
    is_blocked: 0,
    inspection_status: 'COMPLETED'
  };

  const rec = evaluateSingleBedRecommendation(bed, null, now, mockConfig);
  assert.strictEqual(rec.recommendation, 'MANUAL VERIFICATION REQUIRED');
  assert.strictEqual(rec.safeToAllocate, false);
  assert.strictEqual(rec.confidence, 'ZERO');
});

test('Recommendation Engine - READY + cleaning IN_PROGRESS -> MANUAL VERIFICATION REQUIRED', () => {
  const now = new Date();
  const bed = {
    bed_id: 'B04',
    room_number: 'Day Ward 104',
    state: BED_STATES.READY,
    state_updated_at: now.toISOString(),
    is_blocked: 0,
    inspection_status: 'COMPLETED'
  };
  const cleaning = { bed_id: 'B04', cleaning_status: 'IN_PROGRESS' };

  const rec = evaluateSingleBedRecommendation(bed, cleaning, now, mockConfig);
  assert.strictEqual(rec.recommendation, 'MANUAL VERIFICATION REQUIRED');
  assert.strictEqual(rec.safeToAllocate, false);
  assert.strictEqual(rec.confidence, 'ZERO');
});

test('Recommendation Engine - READY + cleaning COMPLETED + inspection incomplete -> MANUAL VERIFICATION REQUIRED', () => {
  const now = new Date();
  const bed = {
    bed_id: 'B04',
    room_number: 'Day Ward 104',
    state: BED_STATES.READY,
    state_updated_at: now.toISOString(),
    is_blocked: 0,
    inspection_status: 'IN_PROGRESS' // Incomplete inspection
  };
  const cleaning = { bed_id: 'B04', cleaning_status: 'COMPLETED' };

  const rec = evaluateSingleBedRecommendation(bed, cleaning, now, mockConfig);
  assert.strictEqual(rec.recommendation, 'MANUAL VERIFICATION REQUIRED');
  assert.strictEqual(rec.safeToAllocate, false);
  assert.strictEqual(rec.confidence, 'ZERO');
});

test('Recommendation Engine - READY + cleaning COMPLETED + inspection COMPLETED -> SAFE TO ALLOCATE', () => {
  const now = new Date();
  const bed = {
    bed_id: 'B04',
    room_number: 'Day Ward 104',
    state: BED_STATES.READY,
    state_updated_at: now.toISOString(),
    is_blocked: 0,
    inspection_status: 'COMPLETED'
  };
  const cleaning = { bed_id: 'B04', cleaning_status: 'COMPLETED' };

  const rec = evaluateSingleBedRecommendation(bed, cleaning, now, mockConfig);
  assert.strictEqual(rec.recommendation, 'SAFE TO ALLOCATE');
  assert.strictEqual(rec.safeToAllocate, true);
  assert.strictEqual(rec.confidence, 'HIGH');
});

test('Recommendation Engine - Stale bed state -> MANUAL VERIFICATION REQUIRED', () => {
  const now = new Date();
  const bed = {
    bed_id: 'B06',
    room_number: 'Day Ward 106',
    state: BED_STATES.READY,
    state_updated_at: new Date(now.getTime() - 42 * 60000).toISOString(),
    is_blocked: 0
  };

  const rec = evaluateSingleBedRecommendation(bed, null, now, mockConfig);
  assert.strictEqual(rec.recommendation, 'MANUAL VERIFICATION REQUIRED');
  assert.strictEqual(rec.safeToAllocate, false);
});

test('Recommendation Engine - Blocked Bed -> DO NOT ALLOCATE', () => {
  const now = new Date();
  const bed = {
    bed_id: 'B07',
    room_number: 'Day Ward 107',
    state: BED_STATES.BLOCKED,
    state_updated_at: now.toISOString(),
    is_blocked: 1,
    block_reason: 'Water leak'
  };

  const rec = evaluateSingleBedRecommendation(bed, null, now, mockConfig);
  assert.strictEqual(rec.recommendation, 'DO NOT ALLOCATE');
  assert.strictEqual(rec.confidence, 'ZERO');
  assert.strictEqual(rec.safeToAllocate, false);
});
