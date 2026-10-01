import { run, query, getOne } from '../db/index.js';
import { logAudit } from './auditService.js';
import { BED_STATES, isValidBedTransition, checkCleaningCapacity, isEventStaleOrOutOfOrder } from '../engine/turnoverEngine.js';
import { REQUIRED_MILESTONES } from '../db/seedData.js';

/**
 * Record event in bed_events table
 */
export const recordBedEvent = async ({ bedId, patientId = null, state, previousState, source = 'SYSTEM', notes = '' }) => {
  const now = new Date().toISOString();
  await run(
    'INSERT INTO bed_events (bed_id, patient_id, state, previous_state, timestamp, received_time, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [bedId, patientId, state, previousState || 'UNKNOWN', now, now, source, notes]
  );
};

export const triggerAdmission = async ({ bedId, patientName, procedureName, userRole = 'coordinator', userName = 'Bed Coordinator' }) => {
  const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [bedId]);
  if (!bed) throw new Error(`Bed ${bedId} not found`);

  if (!isValidBedTransition(bed.state, BED_STATES.OCCUPIED)) {
    throw new Error(`Cannot admit patient to bed ${bedId} in state '${bed.state}'. Allowed path required.`);
  }

  const patId = `PAT-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  const scheduledDischarge = new Date(Date.now() + 240 * 60000).toISOString();

  await run(
    'INSERT INTO patients (patient_id, name, age, gender, procedure_name, surgeon, admission_time, scheduled_discharge_time, bed_id, discharge_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [patId, patientName || `Synthetic Patient ${patId}`, 45, 'Unspecified', procedureName || 'Day Surgery Procedure', 'Dr. Aris Thorne', now, scheduledDischarge, bedId, 'IN_CARE']
  );

  const prevState = bed.state;
  await run(
    'UPDATE beds SET state = ?, state_updated_at = ?, state_source = ?, current_patient_id = ?, inspection_status = ? WHERE bed_id = ?',
    [BED_STATES.OCCUPIED, now, userRole.toUpperCase(), patId, 'NOT_STARTED', bedId]
  );

  await recordBedEvent({
    bedId,
    patientId: patId,
    state: BED_STATES.OCCUPIED,
    previousState: prevState,
    source: userRole.toUpperCase(),
    notes: `Admitted patient ${patId} for ${procedureName}`
  });

  for (const m of REQUIRED_MILESTONES) {
    await run(
      'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [patId, m, 'INCOMPLETE', now, now, 'SIMULATOR', userName]
    );
  }

  await logAudit({
    userRole,
    userName,
    action: 'ADMIT_PATIENT',
    targetType: 'PATIENT',
    targetId: patId,
    previousState: prevState,
    newState: BED_STATES.OCCUPIED,
    reason: `Admitted patient ${patId} to bed ${bedId} for ${procedureName}`
  });

  return { patientId: patId, bedId, state: BED_STATES.OCCUPIED };
};

export const completeMilestone = async ({ patientId, milestoneType, status = 'COMPLETED', userRole = 'nurse', userName = 'Staff Nurse' }) => {
  const patient = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  const now = new Date().toISOString();
  const existing = await getOne('SELECT * FROM clinical_milestones WHERE patient_id = ? AND milestone_type = ?', [patientId, milestoneType]);
  
  if (existing) {
    await run(
      'UPDATE clinical_milestones SET status = ?, event_time = ?, received_time = ?, source = ?, updated_by = ? WHERE id = ?',
      [status, now, now, userRole.toUpperCase(), userName, existing.id]
    );
  } else {
    await run(
      'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [patientId, milestoneType, status, now, now, userRole.toUpperCase(), userName]
    );
  }

  await logAudit({
    userRole,
    userName,
    action: 'UPDATE_MILESTONE',
    targetType: 'PATIENT',
    targetId: patientId,
    previousState: existing ? existing.status : 'NONE',
    newState: status,
    reason: `Updated clinical milestone ${milestoneType} to '${status}'`
  });

  return { patientId, milestoneType, status };
};

export const createDischargeOrder = async ({ patientId, clinician = 'Dr. Aris Thorne', notes = 'Patient cleared for discharge', userRole = 'clinician', userName = 'Dr. Aris Thorne' }) => {
  const patient = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  const now = new Date().toISOString();
  await run(
    'INSERT INTO discharge_orders (patient_id, order_status, order_time, received_time, clinician, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [patientId, 'CONFIRMED', now, now, clinician, notes]
  );

  await run('UPDATE patients SET discharge_status = ? WHERE patient_id = ?', ['PENDING_LEAVE', patientId]);

  if (patient.bed_id) {
    const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [patient.bed_id]);
    if (bed && bed.state === BED_STATES.OCCUPIED) {
      const prevState = bed.state;
      await run(
        'UPDATE beds SET state = ?, state_updated_at = ?, state_source = ? WHERE bed_id = ?',
        [BED_STATES.DISCHARGE_PENDING, now, userRole.toUpperCase(), patient.bed_id]
      );

      await recordBedEvent({
        bedId: patient.bed_id,
        patientId,
        state: BED_STATES.DISCHARGE_PENDING,
        previousState: prevState,
        source: userRole.toUpperCase(),
        notes: `Discharge order written by ${clinician}`
      });
    }
  }

  await logAudit({
    userRole,
    userName,
    action: 'CREATE_DISCHARGE_ORDER',
    targetType: 'PATIENT',
    targetId: patientId,
    previousState: 'IN_CARE',
    newState: 'DISCHARGE_PENDING',
    reason: `Discharge order created by ${clinician}`
  });

  return { patientId, orderStatus: 'CONFIRMED' };
};

export const cancelDischargeOrder = async ({ patientId, orderId = null, reason = 'Clinical condition changed', userRole = 'clinician', userName = 'Dr. Aris Thorne' }) => {
  const patient = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  if (patient.discharge_status === 'DISCHARGED') {
    throw new Error(`Cannot cancel discharge order: Patient ${patientId} has already physically departed (DISCHARGED).`);
  }

  const order = orderId
    ? await getOne('SELECT * FROM discharge_orders WHERE id = ? AND patient_id = ?', [orderId, patientId])
    : await getOne('SELECT * FROM discharge_orders WHERE patient_id = ? ORDER BY id DESC LIMIT 1', [patientId]);

  if (!order) {
    throw new Error(`No discharge order found for patient ${patientId}`);
  }

  if (order.order_status === 'CANCELLED' && patient.discharge_status === 'IN_CARE') {
    return { success: true, patientId, orderStatus: 'CANCELLED', alreadyCancelled: true, message: 'Discharge order is already cancelled' };
  }

  const now = new Date().toISOString();

  await run('UPDATE discharge_orders SET order_status = ?, notes = ? WHERE id = ?', ['CANCELLED', `CANCELLED: ${reason}`, order.id]);

  const prevPatientStatus = patient.discharge_status;
  await run('UPDATE patients SET discharge_status = ? WHERE patient_id = ?', ['IN_CARE', patientId]);

  if (patient.bed_id) {
    const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [patient.bed_id]);
    if (bed && bed.state === BED_STATES.DISCHARGE_PENDING) {
      const prevState = bed.state;
      await run(
        'UPDATE beds SET state = ?, state_updated_at = ?, state_source = ? WHERE bed_id = ?',
        [BED_STATES.OCCUPIED, now, userRole.toUpperCase(), patient.bed_id]
      );

      await recordBedEvent({
        bedId: patient.bed_id,
        patientId,
        state: BED_STATES.OCCUPIED,
        previousState: prevState,
        source: userRole.toUpperCase(),
        notes: `Discharge order cancelled by ${userName}. Bed returned to OCCUPIED.`
      });
    }
  }

  await logAudit({
    userRole,
    userName,
    action: 'CANCEL_DISCHARGE_ORDER',
    targetType: 'PATIENT',
    targetId: patientId,
    previousState: prevPatientStatus,
    newState: 'IN_CARE',
    reason: `Discharge order cancelled by ${userName}: ${reason}`
  });

  return { success: true, patientId, orderStatus: 'CANCELLED', message: 'Discharge order cancelled successfully' };
};

export const dischargePatient = async ({ patientId, userRole = 'coordinator', userName = 'Bed Coordinator' }) => {
  const patient = await getOne('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  const now = new Date().toISOString();
  await run('UPDATE patients SET discharge_status = ? WHERE patient_id = ?', ['DISCHARGED', patientId]);

  if (patient.bed_id) {
    const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [patient.bed_id]);
    const prevState = bed ? bed.state : 'OCCUPIED';

    await run(
      'UPDATE beds SET state = ?, state_updated_at = ?, state_source = ?, current_patient_id = NULL, inspection_status = ? WHERE bed_id = ?',
      [BED_STATES.DISCHARGED, now, userRole.toUpperCase(), 'NOT_STARTED', patient.bed_id]
    );

    await recordBedEvent({
      bedId: patient.bed_id,
      patientId,
      state: BED_STATES.DISCHARGED,
      previousState: prevState,
      source: userRole.toUpperCase(),
      notes: `Patient ${patientId} physically departed bed ${patient.bed_id}`
    });

    await logAudit({
      userRole,
      userName,
      action: 'DISCHARGE_PATIENT',
      targetType: 'BED',
      targetId: patient.bed_id,
      previousState: prevState,
      newState: BED_STATES.DISCHARGED,
      reason: `Patient ${patientId} physically departed bed ${patient.bed_id}`
    });
  }

  return { patientId, bedId: patient.bed_id, state: BED_STATES.DISCHARGED };
};

export const startCleaning = async ({ bedId, staff = 'Housekeeper Alex', userRole = 'housekeeping', userName = 'Housekeeping Staff', eventTime = null }) => {
  const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [bedId]);
  if (!bed) throw new Error(`Bed ${bedId} not found`);

  const now = eventTime || new Date().toISOString();

  if (isEventStaleOrOutOfOrder(bed.state_updated_at, now)) {
    return { bedId, state: bed.state, ignored: true, reason: 'Stale/out-of-order cleaning event ignored.' };
  }

  if (!isValidBedTransition(bed.state, BED_STATES.CLEANING)) {
    throw new Error(`Cannot start cleaning on bed ${bedId} in state '${bed.state}'.`);
  }

  const allBeds = await query('SELECT * FROM beds');
  const cap = checkCleaningCapacity(allBeds);
  if (!cap.allowed) {
    throw new Error(`CAPACITY RISK: ${cap.activeCount} simultaneous cleanings active (limit: ${cap.maxLimit})`);
  }

  await run(
    'INSERT INTO cleaning_events (bed_id, patient_id, cleaning_status, assigned_staff, start_time, received_time) VALUES (?, ?, ?, ?, ?, ?)',
    [bedId, bed.current_patient_id || null, 'IN_PROGRESS', staff, now, now]
  );

  const prevState = bed.state;
  await run(
    'UPDATE beds SET state = ?, state_updated_at = ?, state_source = ? WHERE bed_id = ?',
    [BED_STATES.CLEANING, now, userRole.toUpperCase(), bedId]
  );

  await recordBedEvent({
    bedId,
    patientId: bed.current_patient_id || null,
    state: BED_STATES.CLEANING,
    previousState: prevState,
    source: userRole.toUpperCase(),
    notes: `Cleaning started by ${staff}`
  });

  await logAudit({
    userRole,
    userName,
    action: 'START_CLEANING',
    targetType: 'BED',
    targetId: bedId,
    previousState: prevState,
    newState: BED_STATES.CLEANING,
    reason: `Started cleaning by ${staff}`
  });

  return { bedId, state: BED_STATES.CLEANING };
};

export const completeCleaning = async ({ bedId, userRole = 'housekeeping', userName = 'Housekeeping Staff', eventTime = null }) => {
  const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [bedId]);
  if (!bed) throw new Error(`Bed ${bedId} not found`);

  if (bed.state === BED_STATES.OCCUPIED || bed.current_patient_id) {
    throw new Error(`Cannot complete cleaning: Bed ${bedId} is currently OCCUPIED.`);
  }

  const now = eventTime || new Date().toISOString();

  if (isEventStaleOrOutOfOrder(bed.state_updated_at, now)) {
    return { bedId, state: bed.state, ignored: true, reason: 'Stale/out-of-order cleaning completion ignored.' };
  }

  const activeCleaning = await getOne('SELECT * FROM cleaning_events WHERE bed_id = ? ORDER BY id DESC LIMIT 1', [bedId]);
  if (activeCleaning && activeCleaning.cleaning_status === 'COMPLETED' && (bed.state === BED_STATES.INSPECTION || bed.state === BED_STATES.READY)) {
    return { bedId, state: bed.state, idempotent: true, message: 'Cleaning already completed' };
  }

  await run(
    'UPDATE cleaning_events SET cleaning_status = ?, completion_time = ?, received_time = ? WHERE bed_id = ? AND cleaning_status = ?',
    ['COMPLETED', now, now, bedId, 'IN_PROGRESS']
  );

  const prevState = bed.state;
  await run(
    'UPDATE beds SET state = ?, state_updated_at = ?, state_source = ?, inspection_status = ? WHERE bed_id = ?',
    [BED_STATES.INSPECTION, now, userRole.toUpperCase(), 'IN_PROGRESS', bedId]
  );

  await recordBedEvent({
    bedId,
    patientId: bed.current_patient_id || null,
    state: BED_STATES.INSPECTION,
    previousState: prevState,
    source: userRole.toUpperCase(),
    notes: 'Housekeeping cleaning complete; submitted for inspection'
  });

  await logAudit({
    userRole,
    userName,
    action: 'COMPLETE_CLEANING',
    targetType: 'BED',
    targetId: bedId,
    previousState: prevState,
    newState: BED_STATES.INSPECTION,
    reason: 'Cleaning complete; bed submitted for safety inspection'
  });

  return { bedId, state: BED_STATES.INSPECTION };
};

export const markBedReady = async ({ bedId, userRole = 'coordinator', userName = 'Bed Coordinator' }) => {
  const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [bedId]);
  if (!bed) throw new Error(`Bed ${bedId} not found`);

  // REQUIREMENT 6: Validate transition safety
  if (!isValidBedTransition(bed.state, BED_STATES.READY)) {
    throw new Error(`UNSAFE TRANSITION BLOCKED: Cannot mark bed ${bedId} READY from state '${bed.state}'. Physical cleaning and inspection path required.`);
  }

  // Validate Block State
  if (bed.is_blocked || bed.state === BED_STATES.BLOCKED) {
    throw new Error(`UNSAFE TRANSITION BLOCKED: Bed ${bedId} is currently BLOCKED (${bed.block_reason || 'Maintenance'}). Cannot mark READY while blocked.`);
  }

  // Validate Occupancy
  if (bed.state === BED_STATES.OCCUPIED || bed.current_patient_id) {
    throw new Error(`UNSAFE TRANSITION BLOCKED: Bed ${bedId} is currently OCCUPIED. Cannot mark READY while occupied.`);
  }

  // REQUIREMENT 5 & 6: Validate Cleaning Evidence Record
  const cleaning = await getOne('SELECT * FROM cleaning_events WHERE bed_id = ? ORDER BY id DESC LIMIT 1', [bedId]);
  if (!cleaning || cleaning.cleaning_status !== 'COMPLETED') {
    throw new Error(`UNSAFE TRANSITION BLOCKED: Bed ${bedId} missing completed cleaning evidence record. Cleaning status: '${cleaning ? cleaning.cleaning_status : 'NONE'}'.`);
  }

  const now = new Date().toISOString();
  const prevState = bed.state;

  await run(
    'UPDATE beds SET state = ?, state_updated_at = ?, state_source = ?, is_blocked = 0, block_reason = NULL, inspection_status = ?, last_inspected_at = ? WHERE bed_id = ?',
    [BED_STATES.READY, now, userRole.toUpperCase(), 'COMPLETED', now, bedId]
  );

  await recordBedEvent({
    bedId,
    patientId: cleaning ? cleaning.patient_id : null,
    state: BED_STATES.READY,
    previousState: prevState,
    source: userRole.toUpperCase(),
    notes: 'Bed verified safe, cleaning completed, inspected, and ready for allocation'
  });

  await logAudit({
    userRole,
    userName,
    action: 'MARK_BED_READY',
    targetType: 'BED',
    targetId: bedId,
    previousState: prevState,
    newState: BED_STATES.READY,
    reason: 'Bed verified safe, cleaning completed, inspected, and ready for allocation'
  });

  return { bedId, state: BED_STATES.READY };
};

export const toggleBlockBed = async ({ bedId, isBlocked, reason = 'Maintenance', userRole = 'coordinator', userName = 'Bed Coordinator' }) => {
  const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [bedId]);
  if (!bed) throw new Error(`Bed ${bedId} not found`);

  const now = new Date().toISOString();
  const prevState = bed.state;

  // REQUIREMENT 5: Removing a block MUST NOT automatically convert to READY!
  // It converts to MANUAL_VERIFICATION_REQUIRED!
  const newState = isBlocked ? BED_STATES.BLOCKED : BED_STATES.MANUAL_VERIFICATION_REQUIRED;

  await run(
    'UPDATE beds SET is_blocked = ?, block_reason = ?, state = ?, state_updated_at = ? WHERE bed_id = ?',
    [isBlocked ? 1 : 0, isBlocked ? reason : null, newState, now, bedId]
  );

  await recordBedEvent({
    bedId,
    patientId: bed.current_patient_id || null,
    state: newState,
    previousState: prevState,
    source: userRole.toUpperCase(),
    notes: isBlocked ? `Bed blocked: ${reason}` : 'Block removed. Bed transitioned to MANUAL_VERIFICATION_REQUIRED'
  });

  await logAudit({
    userRole,
    userName,
    action: isBlocked ? 'BLOCK_BED' : 'UNBLOCK_BED',
    targetType: 'BED',
    targetId: bedId,
    previousState: prevState,
    newState,
    reason: isBlocked ? `Bed blocked: ${reason}` : 'Block removed. Transitioned to MANUAL_VERIFICATION_REQUIRED pending inspection'
  });

  return { bedId, isBlocked, state: newState };
};

export const simulateStaleBed = async ({ bedId, minutesAgo = 42, userRole = 'admin', userName = 'System Admin' }) => {
  const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [bedId]);
  if (!bed) throw new Error(`Bed ${bedId} not found`);

  const staleTime = new Date(Date.now() - minutesAgo * 60000).toISOString();
  await run('UPDATE beds SET state_updated_at = ? WHERE bed_id = ?', [staleTime, bedId]);

  await recordBedEvent({
    bedId,
    patientId: bed.current_patient_id || null,
    state: bed.state,
    previousState: bed.state,
    source: 'TELEMETRY_SIMULATOR',
    notes: `Simulated stale telemetry data (${minutesAgo} mins old)`
  });

  await logAudit({
    userRole,
    userName,
    action: 'SIMULATE_STALE_BED',
    targetType: 'BED',
    targetId: bedId,
    previousState: bed.state,
    newState: bed.state,
    reason: `Simulated stale telemetry data (${minutesAgo} minutes ago)`
  });

  return { bedId, staleTime };
};

export const runDemoScenario = async () => {
  const targetBed = 'B02';
  const targetPatient = 'PAT-102';
  const logs = [];

  for (const m of REQUIRED_MILESTONES) {
    await completeMilestone({ patientId: targetPatient, milestoneType: m, status: 'COMPLETED' });
  }
  logs.push({ step: 1, title: 'Clinical Milestones Completed', detail: `All 7 clinical milestones completed for ${targetPatient}. Status = READY` });

  await createDischargeOrder({ patientId: targetPatient, clinician: 'Dr. Aris Thorne' });
  logs.push({ step: 2, title: 'Discharge Order Confirmed', detail: `Discharge order written by Dr. Aris Thorne for ${targetPatient}. Bed B02 state -> DISCHARGE_PENDING` });

  await dischargePatient({ patientId: targetPatient });
  logs.push({ step: 3, title: 'Patient Discharged', detail: `Patient ${targetPatient} departed bed B02. Bed B02 state -> DISCHARGED` });

  await startCleaning({ bedId: targetBed, staff: 'Housekeeper John' });
  logs.push({ step: 4, title: 'Housekeeping Cleaning Started', detail: `Housekeeper John started cleaning bed B02. Bed state -> CLEANING` });

  await completeCleaning({ bedId: targetBed });
  logs.push({ step: 5, title: 'Cleaning Complete', detail: `Bed B02 cleaning finished. State -> INSPECTION` });

  await markBedReady({ bedId: targetBed });
  logs.push({ step: 6, title: 'Bed Marked Ready', detail: `Bed B02 verified safe, inspected, and READY. System identifies B02 as Next Safe Bed Available` });

  await simulateStaleBed({ bedId: 'B06', minutesAgo: 42 });
  logs.push({ step: 7, title: 'Stale Telemetry Demonstration', detail: 'Bed B06 timestamp aged to 42 mins. Recommendation disabled -> Fallback: MANUAL VERIFICATION REQUIRED' });

  return { success: true, steps: logs };
};
