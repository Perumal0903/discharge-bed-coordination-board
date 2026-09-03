import test from 'node:test';
import assert from 'node:assert';
import { evaluateClinicalReadiness, calculateFreshness } from '../src/engine/readinessEngine.js';
import { REQUIRED_MILESTONES } from '../src/db/seedData.js';

const mockConfig = {
  aging_threshold_minutes: 5,
  freshness_threshold_minutes: 15
};

test('Readiness Engine - All 7 milestones completed and fresh (0-5m latency) -> READY (FRESH)', () => {
  const now = new Date();
  const milestones = REQUIRED_MILESTONES.map(m => ({
    milestone_type: m,
    status: 'COMPLETED',
    event_time: new Date(now.getTime() - 2 * 60000).toISOString(),
    received_time: new Date(now.getTime() - 1 * 60000).toISOString() // 1 min latency
  }));

  const result = evaluateClinicalReadiness(milestones, now, mockConfig);
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.freshness, 'FRESH');
  assert.strictEqual(result.isReady, true);
  assert.strictEqual(result.completedCount, 7);
});

test('Readiness Engine - All 7 milestones completed and aging (5-15m latency) -> READY (AGING)', () => {
  const now = new Date();
  const milestones = REQUIRED_MILESTONES.map(m => ({
    milestone_type: m,
    status: 'COMPLETED',
    event_time: new Date(now.getTime() - 10 * 60000).toISOString(),
    received_time: new Date(now.getTime() - 2 * 60000).toISOString() // 8 min latency
  }));

  const result = evaluateClinicalReadiness(milestones, now, mockConfig);
  assert.strictEqual(result.status, 'READY');
  assert.strictEqual(result.freshness, 'AGING');
  assert.strictEqual(result.isReady, true);
});

test('Readiness Engine - Test Case 1: Missing clinical milestone -> UNKNOWN', () => {
  const now = new Date();
  const milestones = REQUIRED_MILESTONES.slice(0, 6).map(m => ({
    milestone_type: m,
    status: 'COMPLETED',
    event_time: new Date(now.getTime() - 2 * 60000).toISOString(),
    received_time: new Date(now.getTime() - 1 * 60000).toISOString()
  }));

  const result = evaluateClinicalReadiness(milestones, now, mockConfig);
  assert.strictEqual(result.status, 'UNKNOWN');
  assert.strictEqual(result.isReady, false);
  assert.strictEqual(result.missingMilestones.length, 1);
  assert.strictEqual(result.missingMilestones[0], 'DISCHARGE_CRITERIA_COMPLETED');
});

test('Readiness Engine - Test Case 2 (Data): Stale clinical milestones (>15 mins latency) -> STALE', () => {
  const now = new Date();
  const milestones = REQUIRED_MILESTONES.map(m => ({
    milestone_type: m,
    status: 'COMPLETED',
    event_time: new Date(now.getTime() - 30 * 60000).toISOString(),
    received_time: new Date(now.getTime() - 5 * 60000).toISOString() // 25 min latency > 15m threshold
  }));

  const result = evaluateClinicalReadiness(milestones, now, mockConfig);
  assert.strictEqual(result.status, 'STALE');
  assert.strictEqual(result.freshness, 'STALE');
  assert.strictEqual(result.isReady, false);
});

test('Readiness Engine - Conflicting milestone statuses -> CONFLICT', () => {
  const now = new Date();
  const milestones = [
    { milestone_type: 'VITAL_STABILITY', status: 'COMPLETED', event_time: now.toISOString(), received_time: now.toISOString() },
    { milestone_type: 'VITAL_STABILITY', status: 'INCOMPLETE', event_time: now.toISOString(), received_time: now.toISOString() }
  ];

  const result = evaluateClinicalReadiness(milestones, now, mockConfig);
  assert.strictEqual(result.status, 'CONFLICT');
  assert.strictEqual(result.isReady, false);
});
