import React from 'react';
import { FreshnessBadge } from './FreshnessBadge.jsx';
import { CheckCircle2, AlertCircle, FileText, ArrowRight, User } from 'lucide-react';

export const DischargeReadinessBoard = ({ 
  patients = [], 
  onSelectPatient,
  onCreateDischargeOrder
}) => {
  return (
    <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Patient Discharge Readiness Board</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300">
              {patients.length} Active Patients
            </span>
          </h2>
          <p className="text-xs text-slate-400">Clinical milestone evaluation and administrative discharge order tracking</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Patient ID</th>
              <th className="py-3 px-4">Bed</th>
              <th className="py-3 px-4">Procedure</th>
              <th className="py-3 px-4">Milestones Progress</th>
              <th className="py-3 px-4">Clinical Readiness</th>
              <th className="py-3 px-4">Discharge Order</th>
              <th className="py-3 px-4">Data Freshness</th>
              <th className="py-3 px-4 text-right">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200 font-medium">
            {patients.map((p) => {
              const r = p.readiness;
              const pct = Math.round((r.completedCount / r.totalRequired) * 100);
              const isReady = r.status === 'READY';
              const hasOrder = p.hasDischargeOrder;

              return (
                <tr key={p.patientId} className="hover:bg-slate-800/40 transition-colors">
                  {/* Patient ID */}
                  <td className="py-3 px-4 font-bold text-white">
                    <button
                      onClick={() => onSelectPatient(p.patientId)}
                      className="text-blue-400 hover:underline flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{p.patientId}</span>
                    </button>
                    <div className="text-[10px] text-slate-400 font-normal">{p.name}</div>
                  </td>

                  {/* Bed */}
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {p.bedId || 'Unassigned'}
                  </td>

                  {/* Procedure */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200 truncate max-w-[160px]">{p.procedure}</div>
                    <div className="text-[10px] text-slate-400">{p.surgeon}</div>
                  </td>

                  {/* Milestones Progress */}
                  <td className="py-3 px-4 min-w-[150px]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400 font-semibold">{r.completedCount}/{r.totalRequired} Milestones</span>
                      <span className="text-blue-400 font-mono">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </td>

                  {/* Clinical Readiness */}
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                      r.status === 'READY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      r.status === 'NOT_READY' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      r.status === 'STALE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      r.status === 'UNKNOWN' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                      'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    }`}>
                      {r.status === 'READY' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {r.status === 'NOT_READY' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                      <span>{r.status}</span>
                    </span>
                    <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">{r.reason}</div>
                  </td>

                  {/* Discharge Order */}
                  <td className="py-3 px-4">
                    {hasOrder ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <FileText className="w-3 h-3" />
                          CONFIRMED
                        </span>
                        <div className="text-[10px] text-slate-400">{p.dischargeOrderDetails?.clinician}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">No Order Yet</span>
                    )}
                  </td>

                  {/* Data Freshness */}
                  <td className="py-3 px-4">
                    <FreshnessBadge freshness={r.freshness} />
                  </td>

                  {/* Next Action */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isReady && !hasOrder && (
                        <button
                          onClick={() => onCreateDischargeOrder && onCreateDischargeOrder(p.patientId)}
                          className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Issue Order</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectPatient(p.patientId)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <span>Evidence</span>
                        <ArrowRight className="w-3 h-3 text-blue-400" />
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
