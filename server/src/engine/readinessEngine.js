import { REQUIRED_MILESTONES } from '../db/seedData.js';
import { getSystemConfig } from '../services/configService.js';

/**
 * Evaluate freshness based on received_time vs event_time latency or referenceTime.
 * 0 - 5 min = FRESH
 * 5 - 15 min = AGING
 * > 15 min = STALE
 * @param {string} timestampISO - Event timestamp (event_time)
 * @param {Date} [referenceTime] - Optional reference wall-clock time
 * @param {Object} [customConfig] - Optional runtime settings override
 * @param {string} [receivedTimeISO] - Optional received_time for telemetry ingestion latency evaluation
 * @returns {{ freshness: 'FRESH' | 'AGING' | 'STALE' | 'MISSING', ageMinutes: number }}
 */
export const calculateFreshness = (timestampISO, referenceTime = null, customConfig = null, receivedTimeISO = null) => {
  if (!timestampISO) {
    return { freshness: 'MISSING', ageMinutes: Infinity };
  }
  const eventTime = new Date(timestampISO);
  if (isNaN(eventTime.getTime())) {
    return { freshness: 'MISSING', ageMinutes: Infinity };
  }

  const cfg = customConfig || getSystemConfig();
  const agingThreshold = cfg.aging_threshold_minutes || 5;
  const staleThreshold = cfg.freshness_threshold_minutes || 15;

  let ageMinutes = 0;
  if (receivedTimeISO) {
    const recTime = new Date(receivedTimeISO);
    if (!isNaN(recTime.getTime())) {
      const diffMs = recTime.getTime() - eventTime.getTime();
      ageMinutes = Math.max(0, Math.floor(diffMs / 60000));
    }
  } else if (referenceTime) {
    const diffMs = referenceTime.getTime() - eventTime.getTime();
    ageMinutes = Math.max(0, Math.floor(diffMs / 60000));
  }

  if (ageMinutes <= agingThreshold) {
    return { freshness: 'FRESH', ageMinutes };
  } else if (ageMinutes <= staleThreshold) {
    return { freshness: 'AGING', ageMinutes };
  } else {
    return { freshness: 'STALE', ageMinutes };
  }
};

/**
 * Evaluates patient clinical discharge readiness based on clinical milestones.
 * Uses event_time for clinical truth timestamp, and received_time for telemetry latency / freshness evaluation.
 * @param {Array} milestones - Array of milestone objects for a single patient
 * @param {Date} [referenceTime]
 * @param {Object} [customConfig]
 */
export const evaluateClinicalReadiness = (milestones = [], referenceTime = null, customConfig = null) => {
  const milestoneMap = new Map();
  let hasConflict = false;
  let conflictReason = '';

  for (const m of milestones) {
    if (milestoneMap.has(m.milestone_type)) {
      const existing = milestoneMap.get(m.milestone_type);
      if (existing.status !== m.status) {
        hasConflict = true;
        conflictReason = `CONTRADICTORY MILESTONE TELEMETRY for ${m.milestone_type}: '${existing.status}' vs '${m.status}'`;
      }
    } else {
      milestoneMap.set(m.milestone_type, m);
    }
  }

  if (hasConflict) {
    return {
      status: 'CONFLICT',
      freshness: 'CONFLICT',
      completedCount: milestoneMap.size,
      totalRequired: REQUIRED_MILESTONES.length,
      missingMilestones: [],
      reason: conflictReason,
      isReady: false
    };
  }

  const missingMilestones = [];
  const incompleteMilestones = [];
  const staleMilestones = [];
  const agingMilestones = [];
  let latestEventTime = null;
  let latestReceivedTime = null;

  for (const reqType of REQUIRED_MILESTONES) {
    if (!milestoneMap.has(reqType)) {
      missingMilestones.push(reqType);
    } else {
      const m = milestoneMap.get(reqType);
      if (m.status !== 'COMPLETED') {
        incompleteMilestones.push(reqType);
      }
      
      const eTime = m.event_time;
      const rTime = m.received_time || m.event_time;
      const { freshness, ageMinutes } = calculateFreshness(eTime, referenceTime, customConfig, rTime);
      
      if (freshness === 'STALE') {
        staleMilestones.push({ type: reqType, ageMinutes });
      } else if (freshness === 'AGING') {
        agingMilestones.push({ type: reqType, ageMinutes });
      }

      const mTimeMs = new Date(eTime).getTime();
      if (!latestEventTime || mTimeMs > new Date(latestEventTime).getTime()) {
        latestEventTime = eTime;
        latestReceivedTime = rTime;
      }
    }
  }

  const overallFreshnessCalc = latestEventTime 
    ? calculateFreshness(latestEventTime, referenceTime, customConfig, latestReceivedTime) 
    : { freshness: 'MISSING', ageMinutes: Infinity };
    
  const overallFreshness = overallFreshnessCalc.freshness;

  if (missingMilestones.length > 0) {
    return {
      status: 'UNKNOWN',
      freshness: overallFreshness === 'FRESH' || overallFreshness === 'AGING' ? 'MISSING' : overallFreshness,
      completedCount: REQUIRED_MILESTONES.length - missingMilestones.length - incompleteMilestones.length,
      totalRequired: REQUIRED_MILESTONES.length,
      missingMilestones,
      reason: `Missing ${missingMilestones.length} required clinical milestone(s): ${missingMilestones.join(', ')}`,
      isReady: false,
      lastUpdate: latestEventTime
    };
  }

  if (incompleteMilestones.length > 0) {
    return {
      status: 'NOT_READY',
      freshness: overallFreshness,
      completedCount: REQUIRED_MILESTONES.length - incompleteMilestones.length,
      totalRequired: REQUIRED_MILESTONES.length,
      incompleteMilestones,
      missingMilestones: [],
      reason: `Patient has ${incompleteMilestones.length} incomplete milestone(s): ${incompleteMilestones.join(', ')}`,
      isReady: false,
      lastUpdate: latestEventTime
    };
  }

  if (staleMilestones.length > 0 || overallFreshness === 'STALE') {
    const maxAge = Math.max(...staleMilestones.map(s => s.ageMinutes), overallFreshnessCalc.ageMinutes);
    return {
      status: 'STALE',
      freshness: 'STALE',
      completedCount: REQUIRED_MILESTONES.length,
      totalRequired: REQUIRED_MILESTONES.length,
      missingMilestones: [],
      reason: `All milestones recorded completed, but clinical telemetry is STALE (${maxAge} mins ingestion latency > threshold of 15 mins)`,
      isReady: false,
      lastUpdate: latestEventTime
    };
  }

  const isAging = agingMilestones.length > 0 || overallFreshness === 'AGING';

  return {
    status: 'READY',
    freshness: isAging ? 'AGING' : 'FRESH',
    completedCount: REQUIRED_MILESTONES.length,
    totalRequired: REQUIRED_MILESTONES.length,
    missingMilestones: [],
    reason: isAging 
      ? 'All 7 required clinical milestones completed (telemetry AGING 5-15 mins)' 
      : 'All 7 required clinical milestones completed and FRESH (updated within 5 mins)',
    isReady: true,
    lastUpdate: latestEventTime,
    receivedTime: latestReceivedTime
  };
};
