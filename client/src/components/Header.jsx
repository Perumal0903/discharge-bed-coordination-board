import React, { useState, useEffect } from 'react';
import { useAuth, ROLES } from '../context/AuthContext';
import { Activity, Clock, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';

export const Header = ({ lastUpdate, hasStaleData, onRefresh }) => {
  const { currentRole, setCurrentRole, currentUser } = useAuth();
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="glass-header sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            Discharge & Bed-Turnover Coordination Board
          </h1>
          <p className="text-xs text-slate-400">Day-Care Surgery Centre Operational Intelligence & Safety System</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:gap-5">
        {/* Date & Time */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{today}</span>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-blue-300 font-semibold">{timeStr}</span>
        </div>

        {/* Data Health Indicator */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
          hasStaleData 
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        }`}>
          <span className={`w-2 h-2 rounded-full ${hasStaleData ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
          {hasStaleData ? '🟡 Telemetry Stale' : '🟢 System Telemetry Healthy'}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* User & Role Switcher */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-bold text-xs">
            {currentUser.avatar}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-slate-200">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400">{currentUser.role}</div>
          </div>

          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            className="ml-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
          >
            {Object.values(ROLES).map((role) => (
              <option key={role.id} value={role.id}>
                🎭 View as: {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
