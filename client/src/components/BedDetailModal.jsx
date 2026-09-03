import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { StateBadge } from './StateBadge.jsx';
import { FreshnessBadge } from './FreshnessBadge.jsx';
import { X, Bed, Clock, History, CheckSquare, XSquare, Ban, Sparkles } from 'lucide-react';

export const BedDetailModal = ({ bedId, onClose, onRefresh }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBedDetail = async () => {
    try {
      setLoading(true);
      const res = await api.getBedDetail(bedId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bedId) loadBedDetail();
  }, [bedId]);

  if (!bedId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Bed className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Bed {bedId}</h2>
                <span className="text-xs text-slate-400">({data?.bed?.room_number})</span>
              </div>
              <p className="text-xs text-slate-400">Physical Bed Turnover History & Event Telemetry Log</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading bed turnover telemetry...</span>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Bed Status Summary Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Current State</span>
                <div className="mt-1"><StateBadge state={data.bed.state} /></div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Inspection Status</span>
                <div className="font-bold text-slate-200 mt-1">{data.bed.inspection_status || 'NOT_STARTED'}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Last State Update</span>
                <div className="font-mono text-slate-300 mt-1">{new Date(data.bed.state_updated_at).toLocaleTimeString()}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Maintenance Status</span>
                <div className={`font-bold mt-1 ${data.bed.is_blocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {data.bed.is_blocked ? `BLOCKED (${data.bed.block_reason})` : 'UNBLOCKED'}
                </div>
              </div>
            </div>

            {/* Complete Bed Event History (PART 4) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Bed State Event History (bed_events table)</span>
              </h3>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                {(data.bedEvents || []).map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{ev.previous_state || 'NONE'} → <span className="text-emerald-400">{ev.state}</span></span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300">
                          {ev.source}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{ev.notes}</div>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 font-mono">
                      <div>Event: {new Date(ev.timestamp).toLocaleTimeString()}</div>
                      <div>Received: {new Date(ev.received_time || ev.timestamp).toLocaleTimeString()}</div>
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
