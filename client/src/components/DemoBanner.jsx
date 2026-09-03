import React, { useState } from 'react';
import { api } from '../services/api.js';
import { PlayCircle, RotateCcw, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

export const DemoBanner = ({ onScenarioCompleted }) => {
  const [running, setRunning] = useState(false);
  const [demoSteps, setDemoSteps] = useState([]);
  const [activeStepIdx, setActiveStepIdx] = useState(-1);

  const handleStartDemo = async () => {
    try {
      setRunning(true);
      setDemoSteps([]);
      setActiveStepIdx(0);

      const res = await api.startDemo();
      setDemoSteps(res.steps || []);

      // Animate through steps for visual user presentation
      for (let i = 0; i < (res.steps || []).length; i++) {
        setActiveStepIdx(i);
        await new Promise(r => setTimeout(r, 600));
      }

      if (onScenarioCompleted) onScenarioCompleted();
    } catch (err) {
      console.error('Demo execution error:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      setRunning(true);
      await api.resetDemo();
      setDemoSteps([]);
      setActiveStepIdx(-1);
      if (onScenarioCompleted) onScenarioCompleted();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 border border-blue-500/30 shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive 3-Minute Demo Scenario</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">ONE-CLICK DEMO</span>
            </h3>
            <p className="text-xs text-slate-400">Automates the complete workflow from admission to next safe bed + demonstrates stale data fallback</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartDemo}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            <span>{running ? 'Executing Demo...' : 'Start Demo Scenario'}</span>
          </button>

          <button
            onClick={handleResetDemo}
            disabled={running}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Demo Step Progress Bar */}
      {demoSteps.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-300">
            <span>Demo Execution Progress: Step {activeStepIdx + 1} of {demoSteps.length}</span>
            <span className="text-slate-400 font-mono text-[11px]">{demoSteps[activeStepIdx]?.title}</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {demoSteps.map((step, idx) => {
              const isPast = idx <= activeStepIdx;
              const isCurrent = idx === activeStepIdx;
              return (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent ? 'bg-emerald-400 animate-pulse' : isPast ? 'bg-blue-500' : 'bg-slate-800'
                  }`}
                />
              );
            })}
          </div>

          <div className="text-xs text-slate-300 flex items-center gap-2 pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{demoSteps[activeStepIdx]?.detail}</span>
          </div>
        </div>
      )}
    </div>
  );
};
