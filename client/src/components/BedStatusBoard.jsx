import React from 'react';
import { StateBadge } from './StateBadge.jsx';
import { FreshnessBadge } from './FreshnessBadge.jsx';
import { RecommendationBadge } from './RecommendationBadge.jsx';
import { 
  Play, 
  Check, 
  UserMinus, 
  ShieldCheck, 
  Ban, 
  Clock, 
  Eye, 
  AlertOctagon,
  Sparkles
} from 'lucide-react';

export const BedStatusBoard = ({ 
  beds = [], 
  onSelectBed, 
  onSelectPatient,
  onStartCleaning,
  onCompleteCleaning,
  onDischargePatient,
  onMarkReady,
  onToggleBlock,
  onSimulateStale
}) => {
  return (
    <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Bed Turnover Status Board</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-300">
              {beds.length} Total Beds
            </span>
          </h2>
          <p className="text-xs text-slate-400">Real-time bed state tracking, telemetry freshness, and physical turnover coordination</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Bed ID</th>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Bed State</th>
              <th className="py-3 px-4">Clinical Readiness</th>
              <th className="py-3 px-4">Discharge Order</th>
              <th className="py-3 px-4">Cleaning Status</th>
              <th className="py-3 px-4">Freshness</th>
              <th className="py-3 px-4">Recommendation</th>
              <th className="py-3 px-4 text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200 font-medium">
            {beds.map((bed) => {
              const p = bed.currentPatient;
              const hasPatient = Boolean(p);
              const readinessStatus = p ? p.readiness.status : 'N/A';
              const hasOrder = p ? p.hasDischargeOrder : false;

              return (
                <tr key={bed.bed_id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Bed ID */}
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <button
                      onClick={() => onSelectBed(bed.bed_id)}
                      className="text-blue-400 hover:underline font-mono text-sm"
                    >
                      {bed.bed_id}
                    </button>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">({bed.room_number})</span>
                  </td>

                  {/* Patient */}
                  <td className="py-3 px-4">
                    {hasPatient ? (
                      <button
                        onClick={() => onSelectPatient(p.patientId)}
                        className="text-left group"
                      >
                        <div className="font-semibold text-blue-300 group-hover:underline flex items-center gap-1.5">
                          <span>{p.patientId}</span>
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{p.procedure}</div>
                      </button>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Bed State */}
                  <td className="py-3 px-4">
                    <StateBadge state={bed.state} />
                  </td>

                  {/* Clinical Readiness */}
                  <td className="py-3 px-4">
                    {hasPatient ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        readinessStatus === 'READY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        readinessStatus === 'NOT_READY' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        readinessStatus === 'STALE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {readinessStatus === 'READY' && '✓ READY'}
                        {readinessStatus === 'NOT_READY' && '✕ NOT READY'}
                        {readinessStatus === 'STALE' && '⚠️ STALE'}
                        {readinessStatus === 'UNKNOWN' && '❓ UNKNOWN'}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Discharge Order */}
                  <td className="py-3 px-4">
                    {hasOrder ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        ✓ CONFIRMED
                      </span>
                    ) : hasPatient ? (
                      <span className="text-slate-500 text-[11px]">PENDING ORDER</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Cleaning Status */}
                  <td className="py-3 px-4">
                    <span className={`text-[11px] font-semibold ${
                      bed.cleaningStatus === 'COMPLETED' ? 'text-emerald-400' :
                      bed.cleaningStatus === 'IN_PROGRESS' ? 'text-amber-400 animate-pulse' :
                      'text-slate-400'
                    }`}>
                      {bed.cleaningStatus === 'IN_PROGRESS' && '🧹 IN CLEANING'}
                      {bed.cleaningStatus === 'COMPLETED' && '✨ SANITIZED'}
                      {bed.cleaningStatus === 'NONE' && 'NOT REQUIRED'}
                    </span>
                  </td>

                  {/* Freshness */}
                  <td className="py-3 px-4">
                    <FreshnessBadge freshness={bed.freshness} />
                  </td>

                  {/* Recommendation */}
                  <td className="py-3 px-4">
                    <RecommendationBadge recommendation={bed.recommendation} />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Discharge Patient Action */}
                      {bed.state === 'DISCHARGE_PENDING' && (
                        <button
                          onClick={() => onDischargePatient && p && onDischargePatient(p.patientId)}
                          title="Confirm physical patient departure"
                          className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Discharge</span>
                        </button>
                      )}

                      {/* Start Cleaning Action */}
                      {bed.state === 'DISCHARGED' && (
                        <button
                          onClick={() => onStartCleaning && onStartCleaning(bed.bed_id)}
                          title="Start housekeeping cleaning"
                          className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Start Clean</span>
                        </button>
                      )}

                      {/* Complete Cleaning Action */}
                      {bed.state === 'CLEANING' && (
                        <button
                          onClick={() => onCompleteCleaning && onCompleteCleaning(bed.bed_id)}
                          title="Finish cleaning & submit for inspection"
                          className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Finish Clean</span>
                        </button>
                      )}

                      {/* Mark Ready Action */}
                      {(bed.state === 'INSPECTION' || (bed.state === 'CLEANING' && bed.cleaningStatus === 'COMPLETED')) && (
                        <button
                          onClick={() => onMarkReady && onMarkReady(bed.bed_id)}
                          title="Verify safe & mark ready"
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Mark Ready</span>
                        </button>
                      )}

                      {/* Block / Unblock Toggle */}
                      <button
                        onClick={() => onToggleBlock && onToggleBlock(bed.bed_id, !bed.is_blocked)}
                        title={bed.is_blocked ? 'Unblock bed' : 'Block bed for maintenance'}
                        className={`p-1 rounded text-[11px] font-semibold transition ${
                          bed.is_blocked 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900' 
                            : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>

                      {/* Simulate Stale Action */}
                      <button
                        onClick={() => onSimulateStale && onSimulateStale(bed.bed_id)}
                        title="Simulate stale telemetry (>15m)"
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
