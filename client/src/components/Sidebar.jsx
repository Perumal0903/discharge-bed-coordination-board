import React from 'react';
import { 
  LayoutDashboard, 
  Bed, 
  UserCheck, 
  PlayCircle, 
  BarChart3, 
  AlertTriangle, 
  FileText, 
  Settings,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, onStartDemo }) => {
  const navItems = [
    { id: 'dashboard', label: 'Main Operations Board', icon: LayoutDashboard },
    { id: 'bed-turnover', label: 'Bed Turnover Board', icon: Bed },
    { id: 'patient-discharge', label: 'Patient Discharge Board', icon: UserCheck },
    { id: 'simulator', label: 'Event Simulator', icon: PlayCircle },
    { id: 'evaluation', label: 'Experiment & Evaluation', icon: BarChart3 },
    { id: 'failure-analysis', label: 'Clinical Failure Analysis', icon: AlertTriangle },
    { id: 'audit-log', label: 'Audit / Event Log', icon: FileText },
    { id: 'settings', label: 'Admin Limits & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 p-4 flex flex-col justify-between hidden lg:flex min-h-[calc(100vh-73px)]">
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Navigation Views
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Start Demo Button */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-500/30 space-y-3">
          <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
            <span>Interactive Demo Mode</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Automatically execute a complete 3-minute workflow demo (Admission → Readiness → Discharge → Cleaning → Next Safe Bed + Stale Failure Case).
          </p>
          <button
            onClick={onStartDemo}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Start Demo Scenario
          </button>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300">Prototype Status</div>
        <div>Synthetic Data Only</div>
        <div className="text-emerald-400 font-mono">Safety Fallbacks ACTIVE</div>
      </div>
    </aside>
  );
};
