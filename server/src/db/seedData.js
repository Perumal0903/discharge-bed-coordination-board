import { run, query } from './index.js';

export const REQUIRED_MILESTONES = [
  'PROCEDURE_COMPLETED',
  'RECOVERY_ASSESSMENT',
  'VITAL_STABILITY',
  'PAIN_CONTROLLED',
  'MOBILITY_CRITERIA',
  'ORAL_INTAKE_TOLERATED',
  'DISCHARGE_CRITERIA_COMPLETED'
];

export const seedDatabase = async () => {
  const existingBeds = await query('SELECT COUNT(*) as count FROM beds');
  if (existingBeds[0].count > 0) {
    console.log('Database already seeded. Skipping initial seed.');
    return;
  }

  console.log('Seeding database with deterministic synthetic workload (20 beds, 100 patient cycles)...');

  const now = new Date();
  const getISOStr = (minutesOffset) => new Date(now.getTime() + minutesOffset * 60000).toISOString();

  // 1. System Settings
  const settings = [
    ['total_beds', '20', 'Total physical bed capacity in day-care centre'],
    ['max_simultaneous_cleanings', '3', 'Maximum housekeeping cleaning tasks allowed simultaneously'],
    ['aging_threshold_minutes', '5', 'Minutes latency before telemetry is marked AGING'],
    ['freshness_threshold_minutes', '15', 'Minutes latency before telemetry is marked STALE'],
    ['target_coordination_time_minutes', '60', 'Target turnover coordination time goal']
  ];

  for (const [key, val, desc] of settings) {
    await run(
      'INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
      [key, val, desc]
    );
  }

  // 2. 20 Beds (B01 - B20)
  const initialBedConfigs = [
    { bed_id: 'B01', room: 'Day Ward 101', state: 'OCCUPIED', offset: -10, blocked: 0 },
    { bed_id: 'B02', room: 'Day Ward 102', state: 'OCCUPIED', offset: -5, blocked: 0 },
    { bed_id: 'B03', room: 'Day Ward 103', state: 'DISCHARGE_PENDING', offset: -8, blocked: 0 },
    { bed_id: 'B04', room: 'Day Ward 104', state: 'READY', offset: -12, blocked: 0 },
    { bed_id: 'B05', room: 'Day Ward 105', state: 'CLEANING', offset: -6, blocked: 0 },
    { bed_id: 'B06', room: 'Day Ward 106', state: 'OCCUPIED', offset: -25, blocked: 0 }, // STALE telemetry latency
    { bed_id: 'B07', room: 'Day Ward 107', state: 'BLOCKED', offset: -30, blocked: 1, reason: 'HVAC Vent Repair' },
    { bed_id: 'B08', room: 'Day Ward 108', state: 'CLEANING', offset: -4, blocked: 0 },
    { bed_id: 'B09', room: 'Day Ward 109', state: 'DISCHARGED', offset: -10, blocked: 0 },
    { bed_id: 'B10', room: 'Day Ward 110', state: 'READY', offset: -14, blocked: 0 },
    { bed_id: 'B11', room: 'Day Ward 111', state: 'OCCUPIED', offset: -2, blocked: 0 },
    { bed_id: 'B12', room: 'Day Ward 112', state: 'INSPECTION', offset: -3, blocked: 0 },
    { bed_id: 'B13', room: 'Day Ward 113', state: 'OCCUPIED', offset: -18, blocked: 0 }, // MISSING milestone
    { bed_id: 'B14', room: 'Day Ward 114', state: 'READY', offset: -20, blocked: 0 },
    { bed_id: 'B15', room: 'Day Ward 115', state: 'READY', offset: -7, blocked: 0 }, // CONFLICT test case
    { bed_id: 'B16', room: 'Day Ward 116', state: 'DISCHARGE_PENDING', offset: -9, blocked: 0 },
    { bed_id: 'B17', room: 'Day Ward 117', state: 'OCCUPIED', offset: -11, blocked: 0 },
    { bed_id: 'B18', room: 'Day Ward 118', state: 'OCCUPIED', offset: -14, blocked: 0 },
    { bed_id: 'B19', room: 'Day Ward 119', state: 'CLEANING', offset: -2, blocked: 0 },
    { bed_id: 'B20', room: 'Day Ward 120', state: 'UNKNOWN', offset: -45, blocked: 0 }
  ];

  for (const b of initialBedConfigs) {
    const tISO = getISOStr(b.offset);
    await run(
      'INSERT INTO beds (bed_id, room_number, state, state_updated_at, state_source, is_blocked, block_reason, inspection_status, last_inspected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [b.bed_id, b.room, b.state, tISO, 'INITIAL_SEED', b.blocked, b.reason || null, b.state === 'READY' ? 'COMPLETED' : 'NOT_STARTED', b.state === 'READY' ? tISO : null]
    );

    await run(
      'INSERT INTO bed_events (bed_id, patient_id, state, previous_state, timestamp, received_time, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [b.bed_id, null, b.state, 'INITIALIZATION', tISO, tISO, 'SYSTEM', `Initial bed setup: ${b.state}`]
    );
  }

  // 3. Seed 100 Patient Workload Cycles (PAT-101 to PAT-200) with complete deterministic event chains
  const procedures = [
    'Laparoscopic Cholecystectomy',
    'Arthroscopic Knee Repair',
    'Cataract Surgery',
    'Inguinal Hernia Repair',
    'Tonsillectomy',
    'Cystoscopy & Biopsy',
    'Carpal Tunnel Release',
    'Endoscopy / Colonoscopy'
  ];
  const surgeons = ['Dr. Aris Thorne', 'Dr. Elena Rostova', 'Dr. Marcus Vance', 'Dr. Sarah Lin', 'Dr. James Miller'];

  for (let i = 1; i <= 100; i++) {
    const patId = `PAT-${100 + i}`;
    const bedId = `B${String(((i - 1) % 20) + 1).padStart(2, '0')}`;
    const procedure = procedures[(i - 1) % procedures.length];
    const surgeon = surgeons[(i - 1) % surgeons.length];
    const adminOffset = -360 + (i * 3);
    const schedOffset = adminOffset + 240;

    let dischargeStatus = 'IN_CARE';
    if (i > 20 || bedId === 'B04' || bedId === 'B10' || bedId === 'B14' || bedId === 'B09') {
      dischargeStatus = 'DISCHARGED';
    } else if (bedId === 'B03' || bedId === 'B16') {
      dischargeStatus = 'PENDING_LEAVE';
    }

    const tAdmin = getISOStr(adminOffset);
    const tSched = getISOStr(schedOffset);

    await run(
      'INSERT INTO patients (patient_id, name, age, gender, procedure_name, surgeon, admission_time, scheduled_discharge_time, bed_id, discharge_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [patId, `Synthetic Patient #${100 + i}`, 25 + (i % 50), i % 2 === 0 ? 'Female' : 'Male', procedure, surgeon, tAdmin, tSched, i <= 20 ? bedId : null, dischargeStatus]
    );

    if (i <= 20 && dischargeStatus !== 'DISCHARGED') {
      await run('UPDATE beds SET current_patient_id = ? WHERE bed_id = ?', [patId, bedId]);
    }

    // Event Chain Timestamps for Patient Episode:
    // 1. Admission Event
    await run(
      'INSERT INTO bed_events (bed_id, patient_id, state, previous_state, timestamp, received_time, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [bedId, patId, 'OCCUPIED', 'READY', tAdmin, tAdmin, 'ADMISSION', `Patient ${patId} admitted`]
    );

    // 2. Clinical Milestones
    const mBaseOffset = adminOffset + 120; // Readiness event_time is 2 hours post-admission
    const tReadyEvent = getISOStr(mBaseOffset);

    if (i === 13) {
      // Test Case 1: Skip PROCEDURE_COMPLETED (Missing Milestone Case)
      for (const m of REQUIRED_MILESTONES.slice(1)) {
        await run(
          'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [patId, m, 'COMPLETED', tReadyEvent, tReadyEvent, 'NURSE', 'Nurse Sarah']
        );
      }
    } else if (i === 6) {
      // Test Case 2: Telemetry Ingestion Latency = 25 minutes (STALE Telemetry)
      const tStaleRec = getISOStr(mBaseOffset + 25);
      for (const m of REQUIRED_MILESTONES) {
        await run(
          'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [patId, m, 'COMPLETED', tReadyEvent, tStaleRec, 'NURSE', 'Nurse David']
        );
      }
    } else if (i === 15) {
      // Test Case 4: Conflicting Milestone Feeds
      for (const m of REQUIRED_MILESTONES.slice(0, 6)) {
        await run(
          'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [patId, m, 'COMPLETED', tReadyEvent, tReadyEvent, 'NURSE', 'Nurse Sarah']
        );
      }
      await run(
        'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [patId, 'DISCHARGE_CRITERIA_COMPLETED', 'COMPLETED', tReadyEvent, tReadyEvent, 'NURSE', 'Nurse Sarah']
      );
      await run(
        'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [patId, 'DISCHARGE_CRITERIA_COMPLETED', 'INCOMPLETE', tReadyEvent, tReadyEvent, 'MONITORING', 'EHR System']
      );
    } else {
      // Standard Case: Complete all 7 milestones with 2-minute ingestion latency (FRESH)
      const tFreshRec = getISOStr(mBaseOffset + 2);
      for (const m of REQUIRED_MILESTONES) {
        await run(
          'INSERT INTO clinical_milestones (patient_id, milestone_type, status, event_time, received_time, source, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [patId, m, 'COMPLETED', tReadyEvent, tFreshRec, 'NURSE', 'Staff Nurse']
        );
      }
    }

    // 3. Discharge Order
    const tOrderEvent = getISOStr(mBaseOffset + 15);
    const tOrderRec = getISOStr(mBaseOffset + 17);
    await run(
      'INSERT INTO discharge_orders (patient_id, order_status, order_time, received_time, clinician, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [patId, 'CONFIRMED', tOrderEvent, tOrderRec, surgeon, 'Fit for discharge to home with escort.']
    );

    // 4. Patient Departure Event
    const tDepart = getISOStr(mBaseOffset + 30);
    await run(
      'INSERT INTO bed_events (bed_id, patient_id, state, previous_state, timestamp, received_time, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [bedId, patId, 'DISCHARGED', 'DISCHARGE_PENDING', tDepart, tDepart, 'PATIENT_DEPARTURE', `Patient ${patId} departed bed ${bedId}`]
    );

    // 5. PROTOTYPE Workflow Events (Early Visibility):
    // Readiness is visible early at tReadyEvent. Housekeeping turnover starts 2m post-departure:
    const tProtoCleanStart = getISOStr(mBaseOffset + 32);
    const tProtoCleanComp = getISOStr(mBaseOffset + 50);
    const tProtoReady = getISOStr(mBaseOffset + 55); // Safe bed ready at tReadyEvent + 55m

    await run(
      'INSERT INTO cleaning_events (bed_id, patient_id, cleaning_status, assigned_staff, start_time, completion_time, received_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [bedId, patId, 'COMPLETED', 'Housekeeper John', tProtoCleanStart, tProtoCleanComp, tProtoCleanComp, 'Prototype early cleaning completion']
    );

    await run(
      'INSERT INTO bed_events (bed_id, patient_id, state, previous_state, timestamp, received_time, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [bedId, patId, 'READY', 'INSPECTION', tProtoReady, tProtoReady, 'PROTOTYPE', `Prototype safe bed available for patient ${patId}`]
    );

    // 6. BASELINE Workflow Events (Late Discovery Delay):
    // Readiness is NOT visible early. Housekeeping turnover starts 35m post-order:
    const tBaseCleanStart = getISOStr(mBaseOffset + 65);
    const tBaseCleanComp = getISOStr(mBaseOffset + 90);
    const tBaseReady = getISOStr(mBaseOffset + 95); // Safe bed ready at tReadyEvent + 95m

    await run(
      'INSERT INTO bed_events (bed_id, patient_id, state, previous_state, timestamp, received_time, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [bedId, patId, 'READY', 'INSPECTION', tBaseReady, tBaseReady, 'BASELINE', `Baseline safe bed available for patient ${patId}`]
    );
  }

  // 4. Active Cleaning Events for current state dashboard
  const activeCleanings = [
    { bed_id: 'B05', status: 'IN_PROGRESS', start: -10, staff: 'Housekeeper John' },
    { bed_id: 'B08', status: 'IN_PROGRESS', start: -5, staff: 'Housekeeper Maria' },
    { bed_id: 'B19', status: 'IN_PROGRESS', start: -2, staff: 'Housekeeper Sam' }
  ];

  for (const c of activeCleanings) {
    const sTime = getISOStr(c.start);
    await run(
      'INSERT INTO cleaning_events (bed_id, patient_id, cleaning_status, assigned_staff, start_time, completion_time, received_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [c.bed_id, null, c.status, c.staff, sTime, null, sTime, 'Active turnover sanitization']
    );
  }

  // 5. Initial Audit Log Entry
  await run(
    'INSERT INTO audit_logs (timestamp, user_role, user_name, action, target_type, target_id, previous_state, new_state, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      getISOStr(-60),
      'admin',
      'System Admin',
      'INITIALIZE_SYSTEM',
      'SYSTEM',
      'SYS-01',
      'NONE',
      'ACTIVE',
      'Initial synthetic database seeding completed for 20 beds and 100 patient workload cycles with complete event records.'
    ]
  );

  console.log('Database seeding complete with full patient-specific synthetic event records!');
};
