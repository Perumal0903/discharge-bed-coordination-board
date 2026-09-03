import React from 'react';

export const StateBadge = ({ state }) => {
  const map = {
    OCCUPIED: { bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', label: 'OCCUPIED' },
    DISCHARGE_PENDING: { bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', label: 'DISCHARGE PENDING' },
    DISCHARGED: { bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'DISCHARGED' },
    CLEANING: { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'CLEANING' },
    INSPECTION: { bg: 'bg-teal-500/20 text-teal-300 border-teal-500/30', label: 'INSPECTION' },
    READY: { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'READY' },
    BLOCKED: { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', label: 'BLOCKED' },
    UNKNOWN: { bg: 'bg-slate-700/50 text-slate-400 border-slate-600', label: 'UNKNOWN' }
  };

  const style = map[state] || map.UNKNOWN;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${style.bg}`}>
      {style.label}
    </span>
  );
};
