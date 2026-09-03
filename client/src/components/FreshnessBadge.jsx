import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

export const FreshnessBadge = ({ freshness, ageMinutes, eventTime, receivedTime }) => {
  switch (freshness) {
    case 'FRESH':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title={`Event: ${eventTime ? new Date(eventTime).toLocaleTimeString() : 'N/A'} | Received: ${receivedTime ? new Date(receivedTime).toLocaleTimeString() : 'N/A'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          🟢 FRESH {ageMinutes !== undefined && ageMinutes !== Infinity ? `(${ageMinutes}m)` : ''}
        </span>
      );
    case 'AGING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30" title={`Event: ${eventTime ? new Date(eventTime).toLocaleTimeString() : 'N/A'} | Received: ${receivedTime ? new Date(receivedTime).toLocaleTimeString() : 'N/A'}`}>
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          🟡 AGING {ageMinutes !== undefined && ageMinutes !== Infinity ? `(${ageMinutes}m)` : ''}
        </span>
      );
    case 'STALE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30" title={`Telemetry delayed or old (>15m). Received: ${receivedTime ? new Date(receivedTime).toLocaleTimeString() : 'N/A'}`}>
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          🔴 STALE {ageMinutes !== undefined && ageMinutes !== Infinity ? `(${ageMinutes}m)` : ''}
        </span>
      );
    case 'MISSING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          🔴 MISSING
        </span>
      );
    case 'CONFLICT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          🟠 CONFLICT
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          ⚪ UNKNOWN
        </span>
      );
  }
};
