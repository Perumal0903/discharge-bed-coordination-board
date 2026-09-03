import React from 'react';
import { Bed, UserCheck, Sparkles, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export const KPICards = ({ kpis = {}, onFilterClick }) => {
  const cards = [
    {
      id: 'TOTAL',
      label: 'Total Beds',
      value: kpis.totalBeds || 20,
      subtext: 'Day-Care Surgery Capacity',
      icon: Bed,
      color: 'from-slate-800 to-slate-900 border-slate-700 text-slate-100',
      badgeColor: 'bg-slate-700/50 text-slate-300'
    },
    {
      id: 'OCCUPIED',
      label: 'Occupied',
      value: kpis.occupied || 0,
      subtext: 'Active patients in care',
      icon: UserCheck,
      color: 'from-indigo-950/40 to-slate-900 border-indigo-500/30 text-indigo-300',
      badgeColor: 'bg-indigo-500/20 text-indigo-300'
    },
    {
      id: 'DISCHARGE_PENDING',
      label: 'Discharge Pending',
      value: kpis.dischargePending || 0,
      subtext: 'Clinically ready or orders written',
      icon: Clock,
      color: 'from-cyan-950/40 to-slate-900 border-cyan-500/30 text-cyan-300',
      badgeColor: 'bg-cyan-500/20 text-cyan-300'
    },
    {
      id: 'CLEANING',
      label: 'Cleaning / Inspection',
      value: kpis.cleaning || 0,
      subtext: 'Housekeeping turnover active',
      icon: Sparkles,
      color: 'from-amber-950/40 to-slate-900 border-amber-500/30 text-amber-300',
      badgeColor: 'bg-amber-500/20 text-amber-300'
    },
    {
      id: 'READY',
      label: 'Ready Beds',
      value: kpis.ready || 0,
      subtext: 'Sanitized & safe to allocate',
      icon: CheckCircle,
      color: 'from-emerald-950/40 to-slate-900 border-emerald-500/30 text-emerald-300',
      badgeColor: 'bg-emerald-500/20 text-emerald-300'
    },
    {
      id: 'STALE',
      label: 'Stale / Unknown',
      value: kpis.staleUnknown || 0,
      subtext: 'Manual verification required',
      icon: AlertTriangle,
      color: 'from-rose-950/40 to-slate-900 border-rose-500/40 text-rose-300 pulse-glow-amber',
      badgeColor: 'bg-rose-500/20 text-rose-300'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onFilterClick && onFilterClick(c.id)}
            className={`p-4 rounded-xl bg-gradient-to-b ${c.color} border backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-all shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">{c.label}</span>
              <div className={`p-1.5 rounded-md ${c.badgeColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold font-heading text-white">{c.value}</div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">{c.subtext}</div>
          </div>
        );
      })}
    </div>
  );
};
