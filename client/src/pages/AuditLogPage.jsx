import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { FileText, Search, RefreshCw, Filter } from 'lucide-react';

export const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAudit = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.target_id.toLowerCase().includes(search.toLowerCase()) ||
    l.user_name.toLowerCase().includes(search.toLowerCase()) ||
    l.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Audit & System Event History Log</span>
          </h2>
          <p className="text-xs text-slate-400">Complete immutable audit trail of clinical readiness updates, bed state transitions, and safety fallbacks</p>
        </div>

        <button
          onClick={loadAudit}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="glass-panel rounded-xl border border-slate-800 p-4 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit logs by action, patient ID, bed ID, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Showing {filteredLogs.length} audit entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User / Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Transition</th>
                <th className="py-2.5 px-3">Reason / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-white">{l.user_name}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{l.user_role}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-300">
                    {l.action}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                    {l.target_type}: {l.target_id}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    {l.previous_state || 'NONE'} → <span className="text-white font-bold">{l.new_state || 'N/A'}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                    {l.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
