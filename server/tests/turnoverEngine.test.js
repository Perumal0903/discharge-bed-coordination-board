import test from 'node:test';
import assert from 'node:assert';
import { isValidBedTransition, BED_STATES, checkCleaningCapacity, evaluatePhysicalBedAvailability } from '../src/engine/turnoverEngine.js';

test('Turnover Engine - Permitted Bed State Transitions', () => {
  assert.strictEqual(isValidBedTransition(BED_STATES.OCCUPIED, BED_STATES.DISCHARGE_PENDING), true);
  assert.strictEqual(isValidBedTransition(BED_STATES.DISCHARGE_PENDING, BED_STATES.DISCHARGED), true);
  assert.strictEqual(isValidBedTransition(BED_STATES.DISCHARGED, BED_STATES.CLEANING), true);
  assert.strictEqual(isValidBedTransition(BED_STATES.CLEANING, BED_STATES.INSPECTION), true);
  assert.strictEqual(isValidBedTransition(BED_STATES.INSPECTION, BED_STATES.READY), true);
});

test('Turnover Engine - PART 5: Unsafe Bed State Transitions Rejection', () => {
  assert.strictEqual(isValidBedTransition(BED_STATES.OCCUPIED, BED_STATES.READY), false);
  assert.strictEqual(isValidBedTransition(BED_STATES.DISCHARGED, BED_STATES.READY), false);
  assert.strictEqual(isValidBedTransition(BED_STATES.UNKNOWN, BED_STATES.READY), false);
  assert.strictEqual(isValidBedTransition(BED_STATES.BLOCKED, BED_STATES.READY), false);
  assert.strictEqual(isValidBedTransition(BED_STATES.CLEANING, BED_STATES.READY), false);
});

test('Turnover Engine - PART 6: Blocked Bed Unblocking Transition to MANUAL_VERIFICATION_REQUIRED', () => {
  // Unblocking MUST NOT jump directly to READY!
  assert.strictEqual(isValidBedTransition(BED_STATES.BLOCKED, BED_STATES.MANUAL_VERIFICATION_REQUIRED), true);
  assert.strictEqual(isValidBedTransition(BED_STATES.BLOCKED, BED_STATES.READY), false);
});

test('Turnover Engine - Capacity limit enforcement for simultaneous cleanings', () => {
  const mockBeds = [
    { bed_id: 'B01', state: BED_STATES.CLEANING },
    { bed_id: 'B02', state: BED_STATES.CLEANING },
    { bed_id: 'B03', state: BED_STATES.CLEANING }
  ];

  const checkAtLimit = checkCleaningCapacity(mockBeds, 3);
  assert.strictEqual(checkAtLimit.allowed, false);
  assert.strictEqual(checkAtLimit.activeCount, 3);

  const mockBedsUnder = [
    { bed_id: 'B01', state: BED_STATES.CLEANING },
    { bed_id: 'B02', state: BED_STATES.CLEANING }
  ];
  const checkUnderLimit = checkCleaningCapacity(mockBedsUnder, 3);
  assert.strictEqual(checkUnderLimit.allowed, true);
});

test('Turnover Engine - Physical bed availability criteria', () => {
  const readyBed = { bed_id: 'B04', state: BED_STATES.READY, is_blocked: 0, inspection_status: 'COMPLETED' };
  const cleaningComplete = { bed_id: 'B04', cleaning_status: 'COMPLETED' };
  const evalReady = evaluatePhysicalBedAvailability(readyBed, cleaningComplete);
  assert.strictEqual(evalReady.isAvailable, true);

  const blockedBed = { bed_id: 'B07', state: BED_STATES.BLOCKED, is_blocked: 1, block_reason: 'HVAC repair' };
  const evalBlocked = evaluatePhysicalBedAvailability(blockedBed);
  assert.strictEqual(evalBlocked.isAvailable, false);
});
