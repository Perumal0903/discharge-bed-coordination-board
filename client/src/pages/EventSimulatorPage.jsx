import React, { useState } from 'react';
import { api } from '../services/api.js';
import { 
  PlayCircle, 
  UserPlus, 
  CheckCircle2, 
  FileText, 
  UserMinus, 
  Sparkles, 
  ShieldCheck, 
  Ban, 
  Clock 
} from 'lucide-react';

const REQUIRED_MILESTONES = [
  'PROCEDURE_COMPLETED',
  'RECOVERY_ASSESSMENT',
  'VITAL_STABILITY',
  'PAIN_CONTROLLED',
  'MOBILITY_CRITERIA',
  'ORAL_INTAKE_TOLERATED',
  'DISCHARGE_CRITERIA_COMPLETED'
];

export const EventSimulatorPage = ({ beds = [], patients = [], onRefresh }) => {
  const [selectedBed, setSelectedBed] = useState('B01');
  const [selectedPatient, setSelectedPatient] = useState('PAT-101');
  const [selectedMilestone, setSelectedMilestone] = useState('PROCEDURE_COMPLETED');
  const [patientNameInput, setPatientNameInput] = useState('Synthetic Patient Test');
  const [procedureInput, setProcedureInput] = useState('Laparoscopic Cholecystectomy');
  const [msg, setMsg] = useState('');

  const showMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleAdmit = async () => {
    try {
      const res = await api.admitPatient({
        bedId: selectedBed,
        patientName: patientNameInput,
        procedureName: procedureInput
      });
      showMsg(`✅ Admitted patient ${res.patientId} to Bed ${res.bedId}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleCompleteMilestone = async () => {
    try {
      const res = await api.completeMilestone({
        patientId: selectedPatient,
        milestoneType: selectedMilestone,
        status: 'COMPLETED'
      });
      showMsg(`✅ Completed milestone ${selectedMilestone} for ${res.patientId}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleCreateOrder = async () => {
    try {
      const res = await api.createDischargeOrder({
        patientId: selectedPatient,
        clinician: 'Dr. Aris Thorne',
        notes: 'Discharge order written via Event Simulator.'
      });
      showMsg(`✅ Discharge order created for ${res.patientId}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleDischargePatient = async () => {
    try {
      const res = await api.dischargePatient({ patientId: selectedPatient });
      showMsg(`✅ Patient ${res.patientId} discharged from Bed ${res.bedId}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleStartCleaning = async () => {
    try {
      const res = await api.startCleaning({ bedId: selectedBed });
      showMsg(`✅ Housekeeping started cleaning Bed ${res.bedId}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleCompleteCleaning = async () => {
    try {
      const res = await api.completeCleaning({ bedId: selectedBed });
      showMsg(`✅ Housekeeping completed cleaning Bed ${res.bedId}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleMarkReady = async () => {
    try {
      const res = await api.markBedReady(selectedBed, {});
      showMsg(`✅ Bed ${res.bedId} marked READY`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleBlockBed = async () => {
    try {
      const res = await api.blockBed(selectedBed, { isBlocked: true, reason: 'Maintenance block' });
      showMsg(`✅ Bed ${res.bedId} BLOCKED for maintenance`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  const handleSimulateStale = async () => {
    try {
      const res = await api.simulateStaleBed(selectedBed, { minutesAgo: 42 });
      showMsg(`⚠️ Simulated stale telemetry for Bed ${selectedBed} (42 mins old)`);
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg(`❌ ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-blue-400" />
          <span>Synthetic Operational Event Simulator</span>
        </h2>
        <p className="text-xs text-slate-400">Trigger individual operational events to test state engine transitions, safety rules, and fallback indicators</p>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/40 text-xs font-bold text-blue-300 animate-fade-in">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Events Simulator */}
        <div className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span>Patient & Clinical Workflow Events</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Target Patient</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2.5"
              >
                {patients.map(p => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.patientId} — {p.name} ({p.bedId || 'Unassigned'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Clinical Milestone</label>
              <select
                value={selectedMilestone}
                onChange={(e) => setSelectedMilestone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2.5"
              >
                {REQUIRED_MILESTONES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleCompleteMilestone}
                className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Milestone</span>
              </button>

              <button
                onClick={handleCreateOrder}
                className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Create Discharge Order</span>
              </button>
            </div>

            <button
              onClick={handleDischargePatient}
              className="w-full p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
            >
              <UserMinus className="w-4 h-4" />
              <span>Confirm Patient Departure (Discharge)</span>
            </button>
          </div>
        </div>

        {/* Bed Turnover Events Simulator */}
        <div className="glass-panel rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Bed Turnover & Telemetry Events</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Target Bed</label>
              <select
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2.5"
              >
                {beds.map(b => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.bed_id} — {b.room_number} (State: {b.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleStartCleaning}
                className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Cleaning</span>
              </button>

              <button
                onClick={handleCompleteCleaning}
                className="p-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Cleaning</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleMarkReady}
                className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1 text-[11px]"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Mark Ready</span>
              </button>

              <button
                onClick={handleBlockBed}
                className="p-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1 text-[11px]"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block Bed</span>
              </button>

              <button
                onClick={handleSimulateStale}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs shadow border border-amber-500/30 transition flex items-center justify-center gap-1 text-[11px]"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Make Stale</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
