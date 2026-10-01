import { calculateStats, calculateTurnoverTimeMinutes } from './metricsEngine.js';

// Base synthetic reference timestamp (deterministic ISO string, no Date.now() used)
const SCENARIO_BASE_REF_TIME = '2026-09-01T08:00:00.000Z';

/**
 * Generates deterministic synthetic event timestamps for a scenario case.
 * Timeline stages represented:
 *   1. clinical discharge readiness
 *   2. discharge / departure
 *   3. cleaning
 *   4. inspection
 *   5. next safe bed availability
 */
const generateDeterministicCaseTimestamps = ({
  caseIndex,
  baselineOffsets,
  prototypeOffsets,
  isCancelled = false,
  isTelemetryFailure = false
}) => {
  // Stagger each case deterministically by 1 hour (3600000 ms)
  const baseMs = new Date(SCENARIO_BASE_REF_TIME).getTime() + (caseIndex * 3600000);
  const clinicalReadinessISO = new Date(baseMs).toISOString();

  if (isTelemetryFailure) {
    // Required evidence is missing, stale (>15m latency), or conflicting -> unverified readiness
    return {
      caseId: `CASE-${caseIndex + 1}`,
      clinicalReadinessTime: null,
      baselineTimeline: null,
      prototypeTimeline: null,
      outcome: 'MANUAL_VERIFICATION_REQUIRED',
      reason: 'Missing, stale, or conflicting clinical telemetry evidence.'
    };
  }

  if (isCancelled) {
    // Discharge order cancelled due to clinical status change -> bed returned to OCCUPIED
    const orderCancelledISO = new Date(baseMs + 20 * 60000).toISOString();
    return {
      caseId: `CASE-${caseIndex + 1}`,
      clinicalReadinessTime: clinicalReadinessISO,
      baselineTimeline: {
        clinicalDischargeReadiness: clinicalReadinessISO,
        orderCancelled: orderCancelledISO,
        dischargeDeparture: null,
        cleaningStart: null,
        cleaningComplete: null,
        inspectionComplete: null,
        nextSafeBedAvailable: null
      },
      prototypeTimeline: {
        clinicalDischargeReadiness: clinicalReadinessISO,
        orderCancelled: orderCancelledISO,
        dischargeDeparture: null,
        cleaningStart: null,
        cleaningComplete: null,
        inspectionComplete: null,
        nextSafeBedAvailable: null
      },
      outcome: 'DISCHARGE_CANCELLED',
      reason: 'Discharge order cancelled post-readiness. Bed returned to OCCUPIED state.'
    };
  }

  // Construct baseline timeline timestamps
  const baselineTimeline = {
    clinicalDischargeReadiness: clinicalReadinessISO,
    dischargeDeparture: new Date(baseMs + baselineOffsets.departure * 60000).toISOString(),
    cleaningStart: new Date(baseMs + baselineOffsets.cleaningStart * 60000).toISOString(),
    cleaningComplete: new Date(baseMs + baselineOffsets.cleaningComplete * 60000).toISOString(),
    inspectionComplete: new Date(baseMs + baselineOffsets.safeAvailable * 60000).toISOString(),
    nextSafeBedAvailable: new Date(baseMs + baselineOffsets.safeAvailable * 60000).toISOString()
  };

  // Construct prototype timeline timestamps
  const prototypeTimeline = {
    clinicalDischargeReadiness: clinicalReadinessISO,
    dischargeDeparture: new Date(baseMs + prototypeOffsets.departure * 60000).toISOString(),
    cleaningStart: new Date(baseMs + prototypeOffsets.cleaningStart * 60000).toISOString(),
    cleaningComplete: new Date(baseMs + prototypeOffsets.cleaningComplete * 60000).toISOString(),
    inspectionComplete: new Date(baseMs + prototypeOffsets.safeAvailable * 60000).toISOString(),
    nextSafeBedAvailable: new Date(baseMs + prototypeOffsets.safeAvailable * 60000).toISOString()
  };

  return {
    caseId: `CASE-${caseIndex + 1}`,
    clinicalReadinessTime: clinicalReadinessISO,
    baselineTimeline,
    prototypeTimeline,
    outcome: 'SAFE_BED_AVAILABLE'
  };
};

/**
 * Deterministic Synthetic Scenario & Cohort Definitions for Stress-Testing.
 * Compares baseline manual workflow vs prototype coordination board across operational edge cases.
 * Uses event timestamp generators rather than pre-baked KPI duration arrays.
 */
export const SCENARIO_DEFINITIONS = [
  {
    id: 'baseline_normal',
    name: 'A. Baseline / Normal Operations',
    description: 'Standard day-surgery workflow with nominal housekeeping staffing and smooth patient transport.',
    category: 'Nominal Baseline',
    totalCasesCount: 20,
    generator: (index) => generateDeterministicCaseTimestamps({
      caseIndex: index,
      baselineOffsets: { departure: 30, cleaningStart: 50, cleaningComplete: 75, safeAvailable: 80 },
      prototypeOffsets: { departure: 15, cleaningStart: 18, cleaningComplete: 35, safeAvailable: 40 }
    }),
    manualFallbacksCount: 0,
    unsafeRecommendationsCount: 0,
    failureCount: 0
  },
  {
    id: 'housekeeping_deficit',
    name: 'B. Housekeeping Staffing Deficit',
    description: 'Sudden housekeeping staffing deficit creating sanitization queue backlogs.',
    category: 'Staffing Deficit',
    totalCasesCount: 20,
    generator: (index) => generateDeterministicCaseTimestamps({
      caseIndex: index,
      baselineOffsets: { departure: 30, cleaningStart: 90, cleaningComplete: 115, safeAvailable: 120 },
      prototypeOffsets: { departure: 15, cleaningStart: 45, cleaningComplete: 65, safeAvailable: 70 }
    }),
    manualFallbacksCount: 0,
    unsafeRecommendationsCount: 0,
    failureCount: 0
  },
  {
    id: 'delayed_transport',
    name: 'C. Delayed Patient Transport',
    description: 'Patient departure post-discharge-readiness delayed by external transport availability.',
    category: 'Transport Delay',
    totalCasesCount: 20,
    generator: (index) => generateDeterministicCaseTimestamps({
      caseIndex: index,
      baselineOffsets: { departure: 90, cleaningStart: 100, cleaningComplete: 125, safeAvailable: 130 },
      prototypeOffsets: { departure: 55, cleaningStart: 60, cleaningComplete: 90, safeAvailable: 95 }
    }),
    manualFallbacksCount: 0,
    unsafeRecommendationsCount: 0,
    failureCount: 0
  },
  {
    id: 'discharge_cancellation',
    name: 'D. Discharge Cancellation',
    description: 'Confirmed discharge orders cancelled due to acute clinical status change post-readiness.',
    category: 'Workflow Exception',
    totalCasesCount: 20,
    generator: (index) => generateDeterministicCaseTimestamps({
      caseIndex: index,
      baselineOffsets: { departure: 30, cleaningStart: 55, cleaningComplete: 80, safeAvailable: 85 },
      prototypeOffsets: { departure: 15, cleaningStart: 20, cleaningComplete: 40, safeAvailable: 45 },
      isCancelled: index >= 15
    }),
    unmeasurableCasesCount: 5,
    manualFallbacksCount: 5,
    unsafeRecommendationsCount: 0,
    failureCount: 5
  },
  {
    id: 'stale_conflicting_data',
    name: 'E. Missing / Stale / Conflicting Telemetry',
    description: 'Telemetry ingestion delays (>15m latency), missing milestones, and conflicting data feeds.',
    category: 'Telemetry Failure',
    totalCasesCount: 20,
    generator: (index) => generateDeterministicCaseTimestamps({
      caseIndex: index,
      isTelemetryFailure: true
    }),
    unmeasurableCasesCount: 20,
    manualFallbacksCount: 20,
    unsafeRecommendationsCount: 0,
    failureCount: 20
  },
  {
    id: 'combined_edge_cases',
    name: 'F. Combined Edge-Case Heavy Cohort',
    description: 'Multi-hazard operational stress-test combining transport delays, staffing deficit, cancellations, and stale telemetry.',
    category: 'Multi-Hazard Stress Test',
    totalCasesCount: 20,
    generator: (index) => {
      if (index >= 15) {
        return generateDeterministicCaseTimestamps({
          caseIndex: index,
          isTelemetryFailure: true
        });
      }
      const baseOffsets = [90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160];
      const protoOffsets = [50, 55, 60, 62, 65, 70, 75, 80, 85, 90, 92, 95, 98, 100, 105];
      const bOffset = baseOffsets[index];
      const pOffset = protoOffsets[index];

      return generateDeterministicCaseTimestamps({
        caseIndex: index,
        baselineOffsets: { departure: bOffset - 50, cleaningStart: bOffset - 30, cleaningComplete: bOffset - 5, safeAvailable: bOffset },
        prototypeOffsets: { departure: Math.max(10, pOffset - 30), cleaningStart: Math.max(15, pOffset - 20), cleaningComplete: Math.max(25, pOffset - 5), safeAvailable: pOffset }
      });
    },
    unmeasurableCasesCount: 5,
    manualFallbacksCount: 5,
    unsafeRecommendationsCount: 0,
    failureCount: 5
  }
];

/**
 * Executes evaluation across all synthetic scenario cohorts deterministically.
 * Derives KPI durations strictly from synthetic event timestamps:
 * KPI = next safe bed availability event_time - clinical discharge readiness event_time
 */
export const runSyntheticScenarioEvaluation = () => {
  return SCENARIO_DEFINITIONS.map(sc => {
    const baselineTimes = [];
    const prototypeTimes = [];
    const caseTimelines = [];

    const totalCasesCount = sc.totalCasesCount || 20;
    for (let i = 0; i < totalCasesCount; i++) {
      const caseItem = sc.generator(i);
      caseTimelines.push(caseItem);

      // KPI Calculation: next safe bed availability event_time - clinical discharge readiness event_time
      if (
        caseItem.clinicalReadinessTime &&
        caseItem.baselineTimeline &&
        caseItem.baselineTimeline.nextSafeBedAvailable
      ) {
        const duration = calculateTurnoverTimeMinutes(
          caseItem.clinicalReadinessTime,
          caseItem.baselineTimeline.nextSafeBedAvailable
        );
        if (duration !== null) {
          baselineTimes.push(duration);
        }
      }

      if (
        caseItem.clinicalReadinessTime &&
        caseItem.prototypeTimeline &&
        caseItem.prototypeTimeline.nextSafeBedAvailable
      ) {
        const duration = calculateTurnoverTimeMinutes(
          caseItem.clinicalReadinessTime,
          caseItem.prototypeTimeline.nextSafeBedAvailable
        );
        if (duration !== null) {
          prototypeTimes.push(duration);
        }
      }
    }

    const baseline = calculateStats(baselineTimes);
    const prototype = calculateStats(prototypeTimes);
    const unmeasurableCases = sc.unmeasurableCasesCount || 0;
    const validCases = Math.max(baseline.count, prototype.count);
    const totalCases = validCases + unmeasurableCases;

    const improvementMinutes = validCases > 0 ? Math.round((baseline.mean - prototype.mean) * 10) / 10 : 0;
    const improvementPct = validCases > 0 && baseline.mean > 0
      ? Math.round(((baseline.mean - prototype.mean) / baseline.mean) * 1000) / 10
      : 0;

    return {
      id: sc.id,
      name: sc.name,
      description: sc.description,
      category: sc.category,
      totalCases,
      validCases,
      unmeasurableCases,
      baseline,
      prototype,
      improvementMinutes,
      improvementPct,
      manualFallbacksCount: sc.manualFallbacksCount,
      unsafeRecommendationsCount: sc.unsafeRecommendationsCount,
      relevantFailureCount: sc.failureCount,
      caseTimelines,
      analysisLabel: 'Synthetic Scenario Analysis',
      disclaimer: 'Descriptive synthetic result — insufficient sample size for statistical inference.',
      timestampDisclaimer: 'Synthetic Scenario Analysis — values are derived from deterministic synthetic event timestamps.'
    };
  });
};

