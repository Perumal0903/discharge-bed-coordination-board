import React from 'react';
import { SettingsPage } from './SettingsPage.jsx';
import { ExperimentEvaluationPage } from './ExperimentEvaluationPage.jsx';
import { AuditLogPage } from './AuditLogPage.jsx';
import { FailureAnalysisPage } from './FailureAnalysisPage.jsx';
import { ShieldCheck, BarChart3, Settings, AlertTriangle, FileText } from 'lucide-react';

export const AdminDashboard = () => {
  return (
    <div className="space-y-8">
      <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            <span>Administrator Operations & Governance Center</span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-rose-500/20 text-rose-300">ADMIN VIEW</span>
          </h2>
          <p className="text-xs text-slate-400">System metrics, capacity limit settings, experiment evaluation, failure mode analysis, and audit trails</p>
        </div>
      </div>

      <ExperimentEvaluationPage />
      <FailureAnalysisPage />
      <SettingsPage />
      <AuditLogPage />
    </div>
  );
};
