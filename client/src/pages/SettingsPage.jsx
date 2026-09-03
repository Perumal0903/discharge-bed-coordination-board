import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Settings, Save, ShieldCheck } from 'lucide-react';

export const SettingsPage = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      setSettings(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdate = async (key, value) => {
    try {
      await api.updateSetting({ key, value });
      setMsg(`Saved setting '${key}' to '${value}'`);
      setTimeout(() => setMsg(''), 3000);
      await loadSettings();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-rose-400" />
          <span>System Limits & Operational Capacity Settings</span>
        </h2>
        <p className="text-xs text-slate-400">Configure operational constraints, maximum simultaneous housekeeping tasks, and freshness threshold limits</p>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/40 text-xs font-bold text-emerald-300">
          {msg}
        </div>
      )}

      <div className="glass-panel rounded-xl border border-slate-800 p-6 space-y-6 shadow-xl max-w-3xl">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Active Capacity & Freshness Parameters</h3>

        <div className="space-y-4">
          {settings.map((s) => (
            <div key={s.setting_key} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-white text-xs font-mono">{s.setting_key}</div>
                <div className="text-xs text-slate-400">{s.description}</div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  defaultValue={s.setting_value}
                  onBlur={(e) => handleUpdate(s.setting_key, e.target.value)}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono font-bold text-center"
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling;
                    handleUpdate(s.setting_key, input.value);
                  }}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
                  title="Save Setting"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
