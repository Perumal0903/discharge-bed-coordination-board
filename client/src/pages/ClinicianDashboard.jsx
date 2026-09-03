import React from 'react';
import { FileText, CheckCircle2, User, ArrowRight } from 'lucide-react';

export const ClinicianDashboard = ({ patients = [], onSelectPatient, onCreateDischargeOrder }) => {
  const readyPatients = patients.filter(p => p.readiness.status === 'READY');
  const inCarePatients = patients.filter(p => p.dischargeStatus !== 'DISCHARGED');

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Clinician / Doctor Portal</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-purple-500/20 text-purple-300">CLINICIAN VIEW</span>
          </h2>
          <p className="text-xs text-slate-400">Review clinical readiness evidence and authorize electronic discharge orders</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-400">Ready for Discharge Order</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-heading">{readyPatients.length}</div>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Patient Discharge Clearance Queue</span>
        </h3>

        <div className="divide-y divide-slate-800 rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden">
          {inCarePatients.map(p => {
            const isReady = p.readiness.status === 'READY';
            const hasOrder = p.hasDischargeOrder;

            return (
              <div key={p.patientId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{p.patientId} — {p.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300">
                      Bed {p.bedId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{p.procedure} | Surgeon: {p.surgeon}</div>
                  <div className="text-xs text-slate-400">
                    Clinical Milestones: <span className="font-semibold text-emerald-400">{p.readiness.completedCount}/7</span> Completed
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onSelectPatient(p.patientId)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    View Evidence
                  </button>

                  {isReady && !hasOrder ? (
                    <button
                      onClick={() => onCreateDischargeOrder(p.patientId)}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Confirm Discharge Order</span>
                    </button>
                  ) : hasOrder ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      Order Confirmed
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded text-xs text-slate-500 bg-slate-900 border border-slate-800">
                      Milestones Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
