import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, FileText, Ban } from 'lucide-react';

export const FailureAnalysisPage = () => {
  const failureCategories = [
    {
      category: 'Data Failures',
      items: [
        {
          failure: 'Missing Clinical Event',
          impact: 'Patient readiness status remains UNKNOWN, blocking automated discharge queue.',
          detection: 'Readiness Engine detects missing required milestone from 7-point checklist.',
          response: 'Status set to UNKNOWN. Recommendation Engine outputs MANUAL VERIFICATION REQUIRED.',
          fallback: 'Nurse physically inspects patient chart and inputs missing milestone manually.'
        },
        {
          failure: 'Stale Bed Telemetry',
          impact: 'Bed state telemetry has not been refreshed for > 15 minutes.',
          detection: 'Freshness Engine flags timestamp as STALE (age > threshold).',
          response: 'Recommendation disabled. Bed status set to STALE.',
          fallback: 'Coordinator contacts unit clerk or housekeeping to verify bed status.'
        },
        {
          failure: 'Conflicting Milestone Events',
          impact: 'Two telemetry feeds report contradictory states (e.g. READY vs IN_PROGRESS).',
          detection: 'Engine detects mismatch in state attributes or duplicate conflicting timestamps.',
          response: 'Status set to CONFLICT. Recommendation Engine outputs MANUAL VERIFICATION REQUIRED.',
          fallback: 'Operations lead investigates telemetry source and resolves conflict manually.'
        }
      ]
    },
    {
      category: 'Human Workflow Failures',
      items: [
        {
          failure: 'Staff Forget to Update Status',
          impact: 'Bed physically ready or patient departed, but system shows previous state.',
          detection: 'Age timer exceeds expected workflow threshold (e.g., patient in recovery > 3 hours).',
          response: 'Alert flagged on Coordinator Dashboard highlighting stale/un-updated patient.',
          fallback: 'Coordinator performs verbal unit check during rounds.'
        },
        {
          failure: 'Discharge Order Delayed',
          impact: 'Patient clinically ready, but clinician has not entered electronic order.',
          detection: 'Clinical readiness = READY, but Discharge Order = NULL for > 30 minutes.',
          response: 'Patient placed in Clinician Action Queue with visual urgency indicator.',
          fallback: 'Charge nurse prompts clinician for order sign-off.'
        }
      ]
    },
    {
      category: 'Operational & Physical Failures',
      items: [
        {
          failure: 'Bed Physically Damaged / Blocked',
          impact: 'System shows READY, but bed has HVAC leak, broken frame, or infection hazard.',
          detection: 'Housekeeping or Nursing clicks "Block Bed" with maintenance reason.',
          response: 'Bed state immediately set to BLOCKED. Recommendation Engine outputs DO NOT ALLOCATE.',
          fallback: 'Patient allocated to next alternative safe bed.'
        },
        {
          failure: 'Housekeeping Capacity Exceeded',
          impact: 'Multiple beds waiting for cleaning simultaneously.',
          detection: 'Active cleanings count reaches configured limit (max 3).',
          response: 'System rejects new cleaning start with "Capacity Limit Reached" alert.',
          fallback: 'Housekeeping lead reallocates staff or prioritizes next needed bed.'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>Clinical Operations Failure Analysis & Safety Fallback Rules</span>
        </h2>
        <p className="text-xs text-slate-400">
          Comprehensive operational failure modes document detailing detection mechanisms, system safety responses, and required human fallbacks.
        </p>
      </div>

      <div className="space-y-6">
        {failureCategories.map((cat, idx) => (
          <div key={idx} className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{cat.category}</span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {cat.items.map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 text-sm">{item.failure}</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      SAFETY FALLBACK ACTIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">1. Impact</span>
                      <span className="text-slate-300">{item.impact}</span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-semibold text-blue-400 uppercase block">2. Detection</span>
                      <span className="text-slate-300">{item.detection}</span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-semibold text-amber-400 uppercase block">3. System Response</span>
                      <span className="text-amber-300 font-semibold">{item.response}</span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase block">4. Human Fallback</span>
                      <span className="text-emerald-300 font-semibold">{item.fallback}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
