import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { FreshnessBadge } from './FreshnessBadge.jsx';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  Activity, 
  Sparkles,
  CheckSquare,
  XSquare
} from 'lucide-react';

const REQUIRED_MILESTONE_LABELS = {
  PROCEDURE_COMPLETED: 'Procedure Completed',
  RECOVERY_ASSESSMENT: 'Recovery Assessment',
  VITAL_STABILITY: 'Vital Stability',
  PAIN_CONTROLLED: 'Pain Controlled',
  MOBILITY_CRITERIA: 'Mobility Criteria',
  ORAL_INTAKE_TOLERATED: 'Oral Intake Tolerated',
  DISCHARGE_CRITERIA_COMPLETED: 'Discharge Criteria Completed'
};

export const PatientDetailModal = ({ patientId, onClose, onRefresh }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const res = await api.getPatientDetail(patientId);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadDetail();
    }
  }, [patientId]);

  const handleToggleMilestone = async (mType, currentStatus) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'INCOMPLETE' : 'COMPLETED';
    await api.completeMilestone({
      patientId,
      milestoneType: mType,
      status: nextStatus
    });
    await loadDetail();
    if (onRefresh) onRefresh();
  };

  const handleIssueDischargeOrder = async () => {
    await api.createDischargeOrder({
      patientId,
      clinician: 'Dr. Aris Thorne',
      notes: 'Discharge order written via Clinical Evidence panel.'
    });
    await loadDetail();
    if (onRefresh) onRefresh();
  };

  if (!patientId) return null;

  const isMilestonesComplete = data?.readiness?.completedCount === 7;
  const isOrderRecorded = Boolean(data?.dischargeOrder);
  const isPatientDeparted = data?.patient?.discharge_status === 'DISCHARGED';
  const isFresh = data?.readiness?.freshness === 'FRESH' || data?.readiness?.freshness === 'AGING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{data?.patient?.patient_id || patientId}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Bed {data?.patient?.bed_id || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{data?.patient?.name} ({data?.patient?.age} yrs, {data?.patient?.gender})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 animate-spin text-blue-400" />
            <span>Loading clinical evidence...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 font-semibold">{error}</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Patient Summary Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Procedure</span>
                <div className="font-bold text-slate-200 mt-0.5">{data.patient.procedure_name}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Attending Surgeon</span>
                <div className="font-bold text-slate-200 mt-0.5">{data.patient.surgeon}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Admission Time</span>
                <div className="font-mono text-slate-300 mt-0.5">{new Date(data.patient.admission_time).toLocaleTimeString()}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Scheduled Discharge</span>
                <div className="font-mono text-slate-300 mt-0.5">{new Date(data.patient.scheduled_discharge_time).toLocaleTimeString()}</div>
              </div>
            </div>

            {/* PART 15: Explicit Drill-Down Readiness Evidence Checklist */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center justify-between">
                <span>System Decision Rationale & Verification Evidence</span>
                <span className="text-[10px] text-slate-400 font-mono">STATUS: {data.readiness.status}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  isMilestonesComplete ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {isMilestonesComplete ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <XSquare className="w-4 h-4 text-slate-600" />}
                  <span>Clinical Milestones Complete ({data.readiness.completedCount}/7)</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  isOrderRecorded ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {isOrderRecorded ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <XSquare className="w-4 h-4 text-slate-600" />}
                  <span>Discharge Order Recorded</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  isPatientDeparted ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {isPatientDeparted ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <XSquare className="w-4 h-4 text-slate-600" />}
                  <span>Patient Departed Bed</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  isFresh ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {isFresh ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <XSquare className="w-4 h-4 text-slate-600" />}
                  <span>Clinical Telemetry Fresh ({data.readiness.freshness})</span>
                </div>

                <div className="p-2.5 rounded-lg border bg-slate-900 border-slate-800 text-slate-400 col-span-2 sm:col-span-2">
                  <span className="font-semibold text-slate-300 block">System Rationale:</span>
                  <span className="text-[11px]">{data.readiness.reason}</span>
                </div>
              </div>
            </div>

            {/* Clinical Readiness Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              data.readiness.status === 'READY' 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                : data.readiness.status === 'NOT_READY'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>Clinical Readiness Status: {data.readiness.status}</span>
                    <FreshnessBadge freshness={data.readiness.freshness} />
                  </div>
                  <p className="text-xs mt-0.5 opacity-90">{data.readiness.reason}</p>
                </div>
              </div>

              {data.readiness.status === 'READY' && !data.dischargeOrder && (
                <button
                  onClick={handleIssueDischargeOrder}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Issue Discharge Order</span>
                </button>
              )}
            </div>

            {/* Clinical Evidence Checklist */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>7-Point Clinical Evidence Checklist</span>
                <span className="text-xs text-slate-400 font-normal">Click item to toggle state for testing</span>
              </h3>

              <div className="divide-y divide-slate-800 rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden">
                {Object.entries(REQUIRED_MILESTONE_LABELS).map(([mKey, mLabel]) => {
                  const found = data.milestones.find(m => m.milestone_type === mKey);
                  const isCompleted = found && found.status === 'COMPLETED';

                  return (
                    <div
                      key={mKey}
                      onClick={() => handleToggleMilestone(mKey, isCompleted ? 'COMPLETED' : 'INCOMPLETE')}
                      className="p-3 flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-600" />
                        )}
                        <div>
                          <div className={`text-xs font-semibold ${isCompleted ? 'text-white' : 'text-slate-400'}`}>
                            {mLabel}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Event: {found ? new Date(found.event_time).toLocaleTimeString() : 'N/A'} | Received: {found ? new Date(found.received_time || found.event_time).toLocaleTimeString() : 'N/A'} | Source: {found ? found.source : 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {found && <FreshnessBadge freshness={data.readiness.freshness} eventTime={found.event_time} receivedTime={found.received_time} />}
                        <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isCompleted ? '✓ COMPLETED' : '✕ INCOMPLETE'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Timeline */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Visual Operational Timeline</h3>
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                {data.timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shadow-sm shadow-blue-500/50"></div>
                    <div className="flex-1 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{item.event}</span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          Event: {new Date(item.time).toLocaleTimeString()} {item.receivedTime ? `| Received: ${new Date(item.receivedTime).toLocaleTimeString()}` : ''}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">Source: {item.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
