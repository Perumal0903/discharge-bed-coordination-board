import React from 'react';
import { Sparkles, Check, Ban, AlertTriangle, ShieldCheck } from 'lucide-react';

export const HousekeepingDashboard = ({ 
  beds = [], 
  onStartCleaning, 
  onCompleteCleaning,
  onToggleBlock 
}) => {
  const needingClean = beds.filter(b => b.state === 'DISCHARGED');
  const inProgress = beds.filter(b => b.state === 'CLEANING');
  const readyBeds = beds.filter(b => b.state === 'READY');

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Housekeeping / Bed Turnover Portal</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-amber-500/20 text-amber-300">HOUSEKEEPING VIEW</span>
          </h2>
          <p className="text-xs text-slate-400">Manage physical bed sanitization, start/complete cleaning workflows, and report maintenance blocks</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-400">Simultaneous Capacity Limit</div>
          <div className="text-2xl font-extrabold text-amber-400 font-heading">
            {inProgress.length} / 3 Active Cleanings
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beds Pending Cleaning */}
        <div className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Beds Pending Housekeeping Start ({needingClean.length})</span>
          </h3>

          <div className="space-y-3">
            {needingClean.map(bed => (
              <div key={bed.bed_id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{bed.bed_id} — {bed.room_number}</div>
                  <div className="text-xs text-slate-400">Patient Discharged. Ready for sanitization.</div>
                </div>

                <button
                  onClick={() => onStartCleaning(bed.bed_id)}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Cleaning</span>
                </button>
              </div>
            ))}

            {needingClean.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 italic">No beds currently pending housekeeping start.</div>
            )}
          </div>
        </div>

        {/* Cleaning In Progress */}
        <div className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400 animate-spin" />
            <span>Cleanings In Progress ({inProgress.length})</span>
          </h3>

          <div className="space-y-3">
            {inProgress.map(bed => (
              <div key={bed.bed_id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-teal-300 text-sm">{bed.bed_id} — {bed.room_number}</div>
                  <div className="text-xs text-slate-400">Cleaning in progress. Staff: Housekeeper</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCompleteCleaning(bed.bed_id)}
                    className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complete Cleaning</span>
                  </button>

                  <button
                    onClick={() => onToggleBlock(bed.bed_id, true)}
                    title="Report maintenance block"
                    className="p-2 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-500/30 transition"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {inProgress.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 italic">No active cleanings in progress.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
