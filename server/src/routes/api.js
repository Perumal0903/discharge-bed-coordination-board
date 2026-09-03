import express from 'express';
import { query, getOne, run } from '../db/index.js';
import { seedDatabase } from '../db/seedData.js';
import { evaluateClinicalReadiness } from '../engine/readinessEngine.js';
import { evaluateNextSafeBed, evaluateSingleBedRecommendation } from '../engine/recommendationEngine.js';
import { BED_STATES } from '../engine/turnoverEngine.js';
import { runSyntheticExperiment } from '../engine/metricsEngine.js';
import { loadSystemConfig, updateSystemConfigCache } from '../services/configService.js';
import {
  triggerAdmission,
  completeMilestone,
  createDischargeOrder,
  dischargePatient,
  startCleaning,
  completeCleaning,
  markBedReady,
  toggleBlockBed,
  simulateStaleBed,
  runDemoScenario
} from '../services/simulatorService.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

const getDashboardPayload = async (referenceTime = new Date()) => {
  const config = await loadSystemConfig();
  const beds = await query('SELECT * FROM beds ORDER BY bed_id ASC');
  const patients = await query('SELECT * FROM patients ORDER BY patient_id ASC');
  const milestones = await query('SELECT * FROM clinical_milestones');
  const dischargeOrders = await query('SELECT * FROM discharge_orders');
  const cleaningEvents = await query('SELECT * FROM cleaning_events ORDER BY id DESC');

  const latestCleaningMap = new Map();
  for (const c of cleaningEvents) {
    if (!latestCleaningMap.has(c.bed_id)) {
      latestCleaningMap.set(c.bed_id, c);
    }
  }

  // Evaluate patients
  const patientReadinessList = patients.map(p => {
    const pMilestones = milestones.filter(m => m.patient_id === p.patient_id);
    const readiness = evaluateClinicalReadiness(pMilestones, referenceTime, config);
    const pOrder = dischargeOrders.find(o => o.patient_id === p.patient_id);

    return {
      patientId: p.patient_id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      procedure: p.procedure_name,
      surgeon: p.surgeon,
      admissionTime: p.admission_time,
      scheduledDischargeTime: p.scheduled_discharge_time,
      bedId: p.bed_id,
      dischargeStatus: p.discharge_status,
      hasDischargeOrder: Boolean(pOrder),
      dischargeOrderDetails: pOrder || null,
      readiness,
      milestones: pMilestones
    };
  });

  // Evaluate beds
  const evaluatedBeds = beds.map(b => {
    const cleaning = latestCleaningMap.get(b.bed_id) || null;
    const patient = patientReadinessList.find(p => p.bedId === b.bed_id && p.dischargeStatus !== 'DISCHARGED');
    const rec = evaluateSingleBedRecommendation(b, cleaning, referenceTime, config);

    return {
      ...b,
      currentPatient: patient || null,
      cleaningStatus: cleaning ? cleaning.cleaning_status : 'NONE',
      latestCleaning: cleaning,
      recommendation: rec.recommendation,
      confidence: rec.confidence,
      recReason: rec.reason,
      recAction: rec.action,
      freshness: rec.freshness,
      safeToAllocate: rec.safeToAllocate,
      verificationChecklist: rec.verificationChecklist
    };
  });

  // KPI Calculations
  const totalBeds = evaluatedBeds.length;
  const occupiedCount = evaluatedBeds.filter(b => b.state === BED_STATES.OCCUPIED).length;
  const dischargePendingCount = evaluatedBeds.filter(b => b.state === BED_STATES.DISCHARGE_PENDING).length;
  const cleaningCount = evaluatedBeds.filter(b => b.state === BED_STATES.CLEANING || b.state === BED_STATES.INSPECTION).length;
  const readyCount = evaluatedBeds.filter(b => b.state === BED_STATES.READY).length;
  const staleOrUnknownCount = evaluatedBeds.filter(b => 
    b.freshness === 'STALE' || 
    b.state === BED_STATES.UNKNOWN || 
    b.state === BED_STATES.MANUAL_VERIFICATION_REQUIRED ||
    b.recommendation === 'MANUAL VERIFICATION REQUIRED'
  ).length;

  const nextSafeBedResult = evaluateNextSafeBed(beds, Array.from(latestCleaningMap.values()), patientReadinessList, referenceTime, config);

  return {
    kpis: {
      totalBeds,
      occupied: occupiedCount,
      dischargePending: dischargePendingCount,
      cleaning: cleaningCount,
      ready: readyCount,
      staleUnknown: staleOrUnknownCount
    },
    nextSafeBed: nextSafeBedResult.nextSafeBed,
    isCapacityRisk: nextSafeBedResult.isCapacityRisk,
    beds: evaluatedBeds,
    patients: patientReadinessList,
    systemTime: referenceTime.toISOString()
  };
};

router.get('/dashboard', async (req, res) => {
  try {
    const payload = await getDashboardPayload();
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/beds', async (req, res) => {
  try {
    const payload = await getDashboardPayload();
    res.json(payload.beds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/beds/:id', async (req, res) => {
  try {
    const bed = await getOne('SELECT * FROM beds WHERE bed_id = ?', [req.params.id]);
    if (!bed) return res.status(404).json({ error: 'Bed not found' });

    const cleaningEvents = await query('SELECT * FROM cleaning_events WHERE bed_id = ? ORDER BY id DESC', [req.params.id]);
    const bedEvents = await query('SELECT * FROM bed_events WHERE bed_id = ? ORDER BY id DESC', [req.params.id]);
    const currentPatient = await getOne('SELECT * FROM patients WHERE bed_id = ? AND discharge_status != ?', [req.params.id, 'DISCHARGED']);

    res.json({ bed, cleaningEvents, bedEvents, currentPatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/patients', async (req, res) => {
  try {
    const payload = await getDashboardPayload();
    res.json(payload.patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await getOne('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const milestones = await query('SELECT * FROM clinical_milestones WHERE patient_id = ? ORDER BY id ASC', [req.params.id]);
    const dischargeOrder = await getOne('SELECT * FROM discharge_orders WHERE patient_id = ? ORDER BY id DESC', [req.params.id]);
    const auditHistory = await query('SELECT * FROM audit_logs WHERE target_id = ? ORDER BY id DESC', [req.params.id]);

    const config = await loadSystemConfig();
    const readiness = evaluateClinicalReadiness(milestones, new Date(), config);

    const timeline = [];
    if (patient.admission_time) {
      timeline.push({ time: patient.admission_time, event: 'Patient Admitted', source: 'ADMISSION' });
    }
    milestones.forEach(m => {
      if (m.status === 'COMPLETED') {
        timeline.push({ time: m.event_time, receivedTime: m.received_time, event: `Milestone Completed: ${m.milestone_type.replace(/_/g, ' ')}`, source: m.source });
      }
    });
    if (readiness.isReady && readiness.lastUpdate) {
      timeline.push({ time: readiness.lastUpdate, event: 'Clinical Discharge Readiness Achieved', source: 'READINESS_ENGINE' });
    }
    if (dischargeOrder) {
      timeline.push({ time: dischargeOrder.order_time, receivedTime: dischargeOrder.received_time, event: `Discharge Order Created by ${dischargeOrder.clinician}`, source: 'CLINICIAN' });
    }
    if (patient.discharge_status === 'DISCHARGED') {
      timeline.push({ time: new Date().toISOString(), event: 'Patient Departed Bed', source: 'DISCHARGE' });
    }

    timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    res.json({
      patient,
      milestones,
      dischargeOrder: dischargeOrder || null,
      readiness,
      timeline,
      auditHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admissions', async (req, res) => {
  try {
    const result = await triggerAdmission(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/milestones', async (req, res) => {
  try {
    const result = await completeMilestone(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/discharge-orders', async (req, res) => {
  try {
    const result = await createDischargeOrder(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/discharge-patient', async (req, res) => {
  try {
    const result = await dischargePatient(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cleaning/start', async (req, res) => {
  try {
    const result = await startCleaning(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cleaning/complete', async (req, res) => {
  try {
    const result = await completeCleaning(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/beds/:id/block', async (req, res) => {
  try {
    const result = await toggleBlockBed({ bedId: req.params.id, ...req.body });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/beds/:id/ready', async (req, res) => {
  try {
    const result = await markBedReady({ bedId: req.params.id, ...req.body });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/beds/:id/stale', async (req, res) => {
  try {
    const result = await simulateStaleBed({ bedId: req.params.id, ...req.body });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const payload = await getDashboardPayload();
    res.json({
      nextSafeBed: payload.nextSafeBed,
      isCapacityRisk: payload.isCapacityRisk,
      beds: payload.beds.map(b => ({
        bedId: b.bed_id,
        roomNumber: b.room_number,
        state: b.state,
        recommendation: b.recommendation,
        confidence: b.confidence,
        reason: b.recReason,
        action: b.recAction,
        freshness: b.freshness,
        verificationChecklist: b.verificationChecklist
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const logs = await query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/evaluation', async (req, res) => {
  try {
    const result = await runSyntheticExperiment(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/experiment/run', async (req, res) => {
  try {
    const result = await runSyntheticExperiment(query);
    await run(
      `INSERT INTO experiment_results 
      (run_time, total_cases, total_beds, baseline_mean, prototype_mean, improvement_minutes, improvement_pct, baseline_median, prototype_median, baseline_p90, prototype_p90, baseline_std_dev, prototype_std_dev, unsafe_recommendations_count, manual_fallbacks_count, stale_data_detections, missing_data_detections, conflicting_events_count, failed_cases)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.runTime,
        result.totalCases,
        result.totalBeds,
        result.baseline.mean,
        result.prototype.mean,
        result.improvementMinutes,
        result.improvementPct,
        result.baseline.median,
        result.prototype.median,
        result.baseline.p90,
        result.prototype.p90,
        result.baseline.stdDev,
        result.prototype.stdDev,
        result.unsafeRecommendationsCount,
        result.manualFallbacksCount,
        result.staleDataDetections,
        result.missingDataDetections,
        result.conflictingEventsCount,
        result.failedCases
      ]
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/demo/start', async (req, res) => {
  try {
    const demoResult = await runDemoScenario();
    res.json(demoResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/demo/reset', async (req, res) => {
  try {
    await run('DELETE FROM audit_logs');
    await run('DELETE FROM cleaning_events');
    await run('DELETE FROM discharge_orders');
    await run('DELETE FROM clinical_milestones');
    await run('DELETE FROM bed_events');
    await run('DELETE FROM patients');
    await run('DELETE FROM beds');
    await run('DELETE FROM system_settings');
    await seedDatabase();
    await loadSystemConfig();
    res.json({ success: true, message: 'Database reset to initial synthetic seed state.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await query('SELECT * FROM system_settings');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    await run('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    updateSystemConfigCache(key, value);
    await logAudit({
      userRole: 'admin',
      userName: 'System Admin',
      action: 'UPDATE_SETTING',
      targetType: 'SETTING',
      targetId: key,
      newState: value,
      reason: `Updated runtime system setting '${key}' to '${value}'`
    });
    res.json({ success: true, key, value });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
