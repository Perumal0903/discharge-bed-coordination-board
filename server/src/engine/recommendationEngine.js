import { calculateFreshness } from './readinessEngine.js';
import { BED_STATES } from './turnoverEngine.js';
import { getSystemConfig } from '../services/configService.js';

/**
 * Recommends the Next Safe Bed for allocation or provides a safe fallback.
 */
export const evaluateNextSafeBed = (beds = [], cleaningEvents = [], patientReadinessList = [], referenceTime = new Date(), customConfig = null) => {
  const cleaningMap = new Map(cleaningEvents.map(c => [c.bed_id, c]));
  const bedRecommendations = [];

  for (const bed of beds) {
    const rec = evaluateSingleBedRecommendation(bed, cleaningMap.get(bed.bed_id), referenceTime, customConfig);
    bedRecommendations.push(rec);
  }

  // Filter beds that are strictly SAFE TO ALLOCATE
  const safeReadyBeds = bedRecommendations.filter(r => r.recommendation === 'SAFE TO ALLOCATE');

  // Sort safe beds by last confirmed timestamp
  safeReadyBeds.sort((a, b) => new Date(a.lastConfirmed).getTime() - new Date(b.lastConfirmed).getTime());

  const topNextSafeBed = safeReadyBeds.length > 0 ? safeReadyBeds[0] : null;

  // Capacity check
  const cfg = customConfig || getSystemConfig();
  const scheduledCount = patientReadinessList.filter(p => p.dischargeStatus === 'IN_CARE' || p.dischargeStatus === 'PENDING_LEAVE').length;
  const isCapacityRisk = scheduledCount > safeReadyBeds.length && safeReadyBeds.length < 2;

  return {
    nextSafeBed: topNextSafeBed,
    totalBeds: beds.length,
    safeBedsCount: safeReadyBeds.length,
    isCapacityRisk,
    allRecommendations: bedRecommendations
  };
};

/**
 * Evaluates a single bed and enforces strict evidence-based safety fallback logic.
 * A bed in READY state must NEVER be returned as SAFE TO ALLOCATE unless ALL evidence criteria are satisfied.
 */
export const evaluateSingleBedRecommendation = (bed, cleaningEvent, referenceTime = new Date(), customConfig = null) => {
  const timeToEvaluate = bed.state_received_at || bed.state_updated_at;
  const { freshness: bedFreshness, ageMinutes } = calculateFreshness(timeToEvaluate, referenceTime, customConfig);

  const isCleaningVerified = Boolean(cleaningEvent && cleaningEvent.cleaning_status === 'COMPLETED');
  const isInspectionVerified = Boolean(bed.inspection_status === 'COMPLETED');
  const isDepartureVerified = bed.state !== BED_STATES.OCCUPIED && bed.state !== BED_STATES.DISCHARGE_PENDING && !bed.current_patient_id;
  const isUnblockedVerified = !bed.is_blocked && bed.state !== BED_STATES.BLOCKED;
  const isFreshnessVerified = bedFreshness === 'FRESH' || bedFreshness === 'AGING';

  const verificationChecklist = [
    { item: 'Patient physically departed', verified: isDepartureVerified },
    { item: 'Cleaning completed', verified: isCleaningVerified },
    { item: 'Inspection completed', verified: isInspectionVerified },
    { item: 'Bed physically available & unblocked', verified: isUnblockedVerified },
    { item: 'Bed state data fresh & trustworthy', verified: isFreshnessVerified }
  ];

  // 1. Blocked Bed Rule
  if (bed.is_blocked || bed.state === BED_STATES.BLOCKED) {
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: BED_STATES.BLOCKED,
      freshness: bedFreshness,
      recommendation: 'DO NOT ALLOCATE',
      confidence: 'ZERO',
      reason: `Bed ${bed.bed_id} is BLOCKED for maintenance/safety (${bed.block_reason || 'Maintenance'})`,
      action: 'Do not allocate. Resolve maintenance block first.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'SYSTEM',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: false,
      verificationChecklist
    };
  }

  // 2. Stale Bed State Rule -> Fallback to MANUAL VERIFICATION REQUIRED
  if (bedFreshness === 'STALE') {
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: bed.state,
      freshness: 'STALE',
      recommendation: 'MANUAL VERIFICATION REQUIRED',
      confidence: 'LOW',
      reason: `DO NOT TRUST AUTOMATIC RECOMMENDATION: Bed state telemetry has not been received for ${ageMinutes} minutes (threshold: 15 mins).`,
      action: 'Verify physical bed status manually with staff before allocation.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'SYSTEM',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: false,
      verificationChecklist
    };
  }

  // 3. Unknown / Unverified State Rule -> Fallback
  if (bed.state === BED_STATES.UNKNOWN || bed.state === BED_STATES.MANUAL_VERIFICATION_REQUIRED) {
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: bed.state,
      freshness: bedFreshness,
      recommendation: 'MANUAL VERIFICATION REQUIRED',
      confidence: 'ZERO',
      reason: 'DO NOT TRUST AUTOMATIC RECOMMENDATION: Bed status is UNKNOWN or unverified.',
      action: 'Perform 5-point physical verification before allocation.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'SYSTEM',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: false,
      verificationChecklist
    };
  }

  // 4. Occupied Bed Rule
  if (bed.state === BED_STATES.OCCUPIED) {
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: BED_STATES.OCCUPIED,
      freshness: bedFreshness,
      recommendation: 'WAIT',
      confidence: 'MEDIUM',
      reason: `Bed currently OCCUPIED by active patient (${bed.current_patient_id || 'Assigned'}).`,
      action: 'Monitor clinical milestones towards discharge.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'SYSTEM',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: false,
      verificationChecklist
    };
  }

  // 5. Discharge Pending Rule
  if (bed.state === BED_STATES.DISCHARGE_PENDING) {
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: BED_STATES.DISCHARGE_PENDING,
      freshness: bedFreshness,
      recommendation: 'WAIT',
      confidence: 'HIGH',
      reason: 'Patient clinically ready or discharge order written; physical departure pending.',
      action: 'Coordinate patient discharge departure.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'SYSTEM',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: false,
      verificationChecklist
    };
  }

  // 6. Patient Discharged but Cleaning Incomplete / In Progress
  if (bed.state === BED_STATES.DISCHARGED || bed.state === BED_STATES.CLEANING) {
    const cleaningStatus = cleaningEvent ? cleaningEvent.cleaning_status : 'NOT_STARTED';
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: bed.state,
      freshness: bedFreshness,
      recommendation: 'WAIT',
      confidence: 'MEDIUM',
      reason: `Patient departed; bed turnover in progress (Cleaning status: ${cleaningStatus}). Cannot become SAFE TO ALLOCATE until cleaning completes.`,
      action: 'Wait for housekeeping completion and safety inspection.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'HOUSEKEEPING',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: false,
      verificationChecklist
    };
  }

  // 7. Inspection Rule
  if (bed.state === BED_STATES.INSPECTION) {
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: BED_STATES.INSPECTION,
      freshness: bedFreshness,
      recommendation: 'WAIT',
      confidence: 'HIGH',
      reason: 'Cleaning complete; final safety inspection in progress.',
      action: 'Verify safety checklist before marking READY.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'INSPECTOR',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: false,
      verificationChecklist
    };
  }

  // 8. Strict Ready State Verification Rule
  if (bed.state === BED_STATES.READY) {
    // Check for contradictory telemetry conflict
    if (cleaningEvent && cleaningEvent.cleaning_status === 'IN_PROGRESS') {
      return {
        bedId: bed.bed_id,
        roomNumber: bed.room_number,
        currentState: 'CONFLICT',
        freshness: 'CONFLICT',
        recommendation: 'MANUAL VERIFICATION REQUIRED',
        confidence: 'ZERO',
        reason: 'DO NOT TRUST AUTOMATIC RECOMMENDATION: CONFLICT DETECTED. Bed marked READY but active cleaning event shows IN_PROGRESS.',
        action: 'Manual verification required to resolve conflicting telemetry.',
        eventTime: bed.state_updated_at,
        receivedTime: bed.state_received_at || bed.state_updated_at,
        source: bed.state_source || 'SYSTEM',
        lastConfirmed: bed.state_updated_at,
        safeToAllocate: false,
        verificationChecklist
      };
    }

    // REQUIREMENT 1: Missing cleaning evidence record or status not COMPLETED
    if (!cleaningEvent || cleaningEvent.cleaning_status !== 'COMPLETED') {
      return {
        bedId: bed.bed_id,
        roomNumber: bed.room_number,
        currentState: BED_STATES.READY,
        freshness: bedFreshness,
        recommendation: 'MANUAL VERIFICATION REQUIRED',
        confidence: 'ZERO',
        reason: `DO NOT TRUST AUTOMATIC RECOMMENDATION: Bed ${bed.bed_id} missing completed cleaning evidence. Cannot safely allocate without verifiable housekeeping completion.`,
        action: 'Verify physical cleaning completion with housekeeping.',
        eventTime: bed.state_updated_at,
        receivedTime: bed.state_received_at || bed.state_updated_at,
        source: bed.state_source || 'SYSTEM',
        lastConfirmed: bed.state_updated_at,
        safeToAllocate: false,
        verificationChecklist
      };
    }

    // REQUIREMENT 1: Missing or incomplete safety inspection
    if (bed.inspection_status !== 'COMPLETED') {
      return {
        bedId: bed.bed_id,
        roomNumber: bed.room_number,
        currentState: BED_STATES.READY,
        freshness: bedFreshness,
        recommendation: 'MANUAL VERIFICATION REQUIRED',
        confidence: 'ZERO',
        reason: `DO NOT TRUST AUTOMATIC RECOMMENDATION: Bed ${bed.bed_id} safety inspection incomplete or unverified.`,
        action: 'Perform safety inspection before allocation.',
        eventTime: bed.state_updated_at,
        receivedTime: bed.state_received_at || bed.state_updated_at,
        source: bed.state_source || 'SYSTEM',
        lastConfirmed: bed.state_updated_at,
        safeToAllocate: false,
        verificationChecklist
      };
    }

    // All evidence satisfied: SAFE TO ALLOCATE
    return {
      bedId: bed.bed_id,
      roomNumber: bed.room_number,
      currentState: BED_STATES.READY,
      freshness: bedFreshness,
      recommendation: 'SAFE TO ALLOCATE',
      confidence: 'HIGH',
      reason: 'Bed fully turned over, sanitized, inspected, and safely available.',
      action: 'Safe for immediate patient allocation.',
      eventTime: bed.state_updated_at,
      receivedTime: bed.state_received_at || bed.state_updated_at,
      source: bed.state_source || 'SYSTEM',
      lastConfirmed: bed.state_updated_at,
      safeToAllocate: true,
      verificationChecklist
    };
  }

  // Catch-all fallback
  return {
    bedId: bed.bed_id,
    roomNumber: bed.room_number,
    currentState: bed.state,
    freshness: bedFreshness,
    recommendation: 'MANUAL VERIFICATION REQUIRED',
    confidence: 'ZERO',
    reason: `Unclassified bed state: ${bed.state}`,
    action: 'Verify bed physically before allocation.',
    eventTime: bed.state_updated_at,
    receivedTime: bed.state_received_at || bed.state_updated_at,
    source: bed.state_source || 'SYSTEM',
    lastConfirmed: bed.state_updated_at,
    safeToAllocate: false,
    verificationChecklist
  };
};
