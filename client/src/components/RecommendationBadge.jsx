import React from 'react';
import { ShieldCheck, ShieldAlert, Clock, Ban, AlertTriangle } from 'lucide-react';

export const RecommendationBadge = ({ recommendation, confidence }) => {
  switch (recommendation) {
    case 'SAFE TO ALLOCATE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          SAFE TO ALLOCATE {confidence && <span className="text-[10px] opacity-75">[{confidence}]</span>}
        </span>
      );
    case 'WAIT':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
          <Clock className="w-4 h-4 text-blue-400" />
          WAIT {confidence && <span className="text-[10px] opacity-75">[{confidence}]</span>}
        </span>
      );
    case 'MANUAL VERIFICATION REQUIRED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-amber-500/25 text-amber-300 border border-amber-500/50 pulse-glow-amber">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          MANUAL VERIFICATION REQUIRED
        </span>
      );
    case 'CAPACITY RISK':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-orange-500/25 text-orange-300 border border-orange-500/50 pulse-glow-amber">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          CAPACITY RISK
        </span>
      );
    case 'DO NOT ALLOCATE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <Ban className="w-4 h-4 text-rose-400" />
          DO NOT ALLOCATE
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          UNSPECIFIED
        </span>
      );
  }
};
