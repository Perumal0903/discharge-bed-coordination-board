import React from 'react';
import { RecommendationBadge } from './RecommendationBadge.jsx';
import { ShieldCheck, ShieldAlert, Clock, CheckCircle2, ArrowRight, CheckSquare, XSquare } from 'lucide-react';

export const NextSafeBedCard = ({ nextSafeBed, isCapacityRisk, onAllocate }) => {
  if (!nextSafeBed || nextSafeBed.recommendation === 'MANUAL VERIFICATION REQUIRED') {
    const checklist = nextSafeBed?.verificationChecklist || [
      { item: 'Patient physically departed', verified: false },
      { item: 'Cleaning completed', verified: false },
      { item: 'Inspection completed', verified: false },
      { item: 'Bed physically available & unblocked', verified: false },
      { item: 'Bed state data fresh & trustworthy', verified: false }
    ];

    return (
      <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-lg pulse-glow-amber space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">DO NOT TRUST AUTOMATIC RECOMMENDATION</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">SAFETY FALLBACK</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">MANUAL VERIFICATION REQUIRED</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                {nextSafeBed ? nextSafeBed.reason : 'No bed currently satisfies 100% automated safety criteria without stale, missing, or blocked telemetry. Perform physical verification.'}
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-5">
            <div className="text-xs font-semibold text-slate-400">Safety Rule Enforced:</div>
            <div className="text-xs text-amber-300 font-mono mt-0.5">Zero Unsafe Recommendations</div>
          </div>
        </div>

        {/* Coordinator Physical Verification Checklist */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Bed Coordinator Verification Checklist</span>
            <span className="text-[10px] text-slate-400 italic">Operational coordination aid — does not replace clinical judgment</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {checklist.map((chk, idx) => (
              <div key={idx} className={`p-2 rounded border flex items-center gap-1.5 ${
                chk.verified ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {chk.verified ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <XSquare className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                <span className="text-[11px] truncate">{chk.item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isSafe = nextSafeBed.recommendation === 'SAFE TO ALLOCATE';

  return (
    <div className={`p-5 rounded-xl border backdrop-blur-md shadow-xl transition-all space-y-4 ${
      isSafe 
        ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 pulse-glow-green' 
        : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
    }`}>
      {isCapacityRisk && (
        <div className="p-2.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-400 animate-pulse" />
          <span>CAPACITY RISK: High demand relative to available safe beds. Coordinator review required before allocation.</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-xl border ${
            isSafe ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
          }`}>
            {isSafe ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Recommended Safe Bed</span>
              <RecommendationBadge recommendation={nextSafeBed.recommendation} confidence={nextSafeBed.confidence} />
            </div>

            <div className="flex items-baseline gap-3">
              <h3 className="text-2xl font-extrabold font-heading text-white">{nextSafeBed.bedId}</h3>
              <span className="text-sm font-medium text-slate-300">({nextSafeBed.roomNumber})</span>
            </div>

            <p className="text-xs text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{nextSafeBed.reason}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:pl-6 lg:border-l lg:border-slate-800">
          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Last Telemetry Timestamp</div>
            <div className="text-xs font-mono text-slate-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{new Date(nextSafeBed.lastConfirmed).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Safety Telemetry</div>
            <div className="text-xs font-semibold text-emerald-400">🟢 100% Verified Fresh</div>
          </div>

          {isSafe && onAllocate && (
            <button
              onClick={() => onAllocate(nextSafeBed.bedId)}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 ml-auto"
            >
              <span>Allocate Bed {nextSafeBed.bedId}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
