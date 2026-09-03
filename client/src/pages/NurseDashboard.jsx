import React from 'react';
import { FreshnessBadge } from '../components/FreshnessBadge.jsx';
import { UserCheck, CheckCircle2, AlertCircle, Clock, ArrowRight } from 'lucide-react';

export const NurseDashboard = ({ patients = [], onSelectPatient, onRefresh }) => {
  const pendingAttention = patients.filter(p => p.readiness.status !== 'READY' && p.dischargeStatus !== 'DISCHARGED');
  const readyPatients = patients.filter(p => p.readiness.status === 'READY');

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Nurse / Clinical Staff Portal</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-emerald-300">NURSING VIEW</span>
          </h2>
          <p className="text-xs text-slate-400">Record clinical recovery milestones, verify vitals stability, and resolve missing patient evidence</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-400">Patients Requiring Attention</div>
          <div className="text-2xl font-extrabold text-amber-400 font-heading">{pendingAttention.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Patients Needing Milestone Updates */}
        <div className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Patients Requiring Milestone Verification ({pendingAttention.length})</span>
          </h3>

          <div className="space-y-3">
            {pendingAttention.map(p => (
              <div key={p.patientId} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-blue-300 text-sm">{p.patientId} — {p.name}</div>
                    <div className="text-xs text-slate-400">{p.procedure} | Bed {p.bedId || 'N/A'}</div>
                  </div>
                  <FreshnessBadge freshness={p.readiness.freshness} />
                </div>

                <div className="p-2.5 rounded bg-slate-900 text-xs text-amber-300 border border-amber-500/20">
                  <span className="font-semibold">Current Readiness Rationale:</span> {p.readiness.reason}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 font-semibold">{p.readiness.completedCount} of 7 Milestones Completed</span>
                  <button
                    onClick={() => onSelectPatient(p.patientId)}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1"
                  >
                    <span>Update Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discharge-Ready Patients */}
        <div className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Clinically Ready for Discharge Order ({readyPatients.length})</span>
          </h3>

          <div className="space-y-3">
            {readyPatients.map(p => (
              <div key={p.patientId} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-emerald-300 text-sm">{p.patientId} — {p.name}</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ✓ CLINICALLY READY
                  </span>
                </div>
                <div className="text-xs text-slate-400">Bed {p.bedId} | {p.procedure}</div>
                <div className="text-xs text-slate-400">Order Status: {p.hasDischargeOrder ? 'Order Written' : 'Awaiting Clinician Order'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
