import { getSystemConfig } from '../services/configService.js';

export const BED_STATES = {
  OCCUPIED: 'OCCUPIED',
  DISCHARGE_PENDING: 'DISCHARGE_PENDING',
  DISCHARGED: 'DISCHARGED',
  CLEANING: 'CLEANING',
  INSPECTION: 'INSPECTION',
  READY: 'READY',
  BLOCKED: 'BLOCKED',
  UNKNOWN: 'UNKNOWN',
  MANUAL_VERIFICATION_REQUIRED: 'MANUAL_VERIFICATION_REQUIRED'
};

export const VALID_TRANSITIONS = {
  [BED_STATES.OCCUPIED]: [BED_STATES.DISCHARGE_PENDING, BED_STATES.BLOCKED, BED_STATES.UNKNOWN],
  [BED_STATES.DISCHARGE_PENDING]: [BED_STATES.DISCHARGED, BED_STATES.OCCUPIED, BED_STATES.BLOCKED],
  [BED_STATES.DISCHARGED]: [BED_STATES.CLEANING, BED_STATES.BLOCKED, BED_STATES.MANUAL_VERIFICATION_REQUIRED],
  [BED_STATES.CLEANING]: [BED_STATES.INSPECTION, BED_STATES.BLOCKED, BED_STATES.MANUAL_VERIFICATION_REQUIRED],
  [BED_STATES.INSPECTION]: [BED_STATES.READY, BED_STATES.CLEANING, BED_STATES.BLOCKED, BED_STATES.MANUAL_VERIFICATION_REQUIRED],
  [BED_STATES.READY]: [BED_STATES.OCCUPIED, BED_STATES.BLOCKED, BED_STATES.CLEANING],
  [BED_STATES.BLOCKED]: [BED_STATES.MANUAL_VERIFICATION_REQUIRED, BED_STATES.CLEANING, BED_STATES.UNKNOWN],
  [BED_STATES.UNKNOWN]: [BED_STATES.MANUAL_VERIFICATION_REQUIRED, BED_STATES.CLEANING, BED_STATES.BLOCKED],
  [BED_STATES.MANUAL_VERIFICATION_REQUIRED]: [BED_STATES.CLEANING, BED_STATES.INSPECTION, BED_STATES.READY, BED_STATES.BLOCKED]
};

/**
 * Validates if a bed transition from currentState to nextState is permitted.
 */
export const isValidBedTransition = (currentState, nextState) => {
  if (currentState === nextState) return true;
  
  // Direct jumps to READY from OCCUPIED, UNKNOWN, BLOCKED, or CLEANING are STRICTLY REJECTED!
  if (nextState === BED_STATES.READY) {
    if (currentState === BED_STATES.OCCUPIED || 
        currentState === BED_STATES.UNKNOWN || 
        currentState === BED_STATES.BLOCKED || 
        currentState === BED_STATES.CLEANING) {
      return false;
    }
  }

  const allowed = VALID_TRANSITIONS[currentState] || [];
  return allowed.includes(nextState);
};

/**
 * Checks if starting a new cleaning task exceeds max simultaneous cleaning capacity limits.
 */
export const checkCleaningCapacity = (allBeds = [], customLimit = null) => {
  const cfg = getSystemConfig();
  const maxLimit = customLimit !== null ? customLimit : (cfg.max_simultaneous_cleanings || 3);
  const activeCleaningCount = allBeds.filter(b => b.state === BED_STATES.CLEANING).length;
  
  return {
    allowed: activeCleaningCount < maxLimit,
    activeCount: activeCleaningCount,
    maxLimit
  };
};

/**
 * Evaluates physical bed turnover completion criteria before bed can become safely available.
 * Requires ALL evidence:
 * 1. Patient has physically departed
 * 2. Cleaning record exists and is COMPLETED (missing cleaning evidence = NOT AVAILABLE)
 * 3. Inspection completed
 * 4. Bed is not blocked
 * 5. Latest bed state data is trustworthy and fresh
 * 6. No conflicting bed events
 */
export const evaluatePhysicalBedAvailability = (bed, cleaningEvent = null) => {
  if (!bed) {
    return { isAvailable: false, reason: 'Bed record missing' };
  }

  if (bed.is_blocked || bed.state === BED_STATES.BLOCKED) {
    return {
      isAvailable: false,
      reason: `Bed ${bed.bed_id} is BLOCKED (${bed.block_reason || 'Maintenance'})`
    };
  }

  if (bed.current_patient_id && bed.state === BED_STATES.OCCUPIED) {
    return {
      isAvailable: false,
      reason: `Bed ${bed.bed_id} is OCCUPIED by patient ${bed.current_patient_id}`
    };
  }

  if (bed.state === BED_STATES.CLEANING) {
    return {
      isAvailable: false,
      reason: `Bed ${bed.bed_id} is currently in CLEANING process (cleaning incomplete)`
    };
  }

  if (bed.state === BED_STATES.UNKNOWN) {
    return {
      isAvailable: false,
      reason: `Bed ${bed.bed_id} state is UNKNOWN. Manual verification required.`
    };
  }

  if (bed.state === BED_STATES.MANUAL_VERIFICATION_REQUIRED) {
    return {
      isAvailable: false,
      reason: `Bed ${bed.bed_id} requires manual staff verification.`
    };
  }

  if (bed.state === BED_STATES.INSPECTION) {
    return {
      isAvailable: false,
      reason: `Bed ${bed.bed_id} is undergoing final safety INSPECTION`
    };
  }

  if (bed.state === BED_STATES.READY) {
    // REQUIREMENT 5: Cleaning evidence MUST exist and be COMPLETED
    if (!cleaningEvent) {
      return {
        isAvailable: false,
        reason: `Bed ${bed.bed_id} missing cleaning evidence record. Cannot safely allocate without completed cleaning evidence.`
      };
    }

    if (cleaningEvent.cleaning_status !== 'COMPLETED') {
      return {
        isAvailable: false,
        reason: `Bed state conflict: bed marked READY but cleaning status is '${cleaningEvent.cleaning_status}'`
      };
    }

    return {
      isAvailable: true,
      reason: `Bed ${bed.bed_id} has passed cleaning, safety inspection, and freshness checks.`
    };
  }

  return {
    isAvailable: false,
    reason: `Bed state '${bed.state}' is not safely available for allocation.`
  };
};
