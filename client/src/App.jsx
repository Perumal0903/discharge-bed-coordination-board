import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Header } from './components/Header.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard.jsx';
import { NurseDashboard } from './pages/NurseDashboard.jsx';
import { ClinicianDashboard } from './pages/ClinicianDashboard.jsx';
import { HousekeepingDashboard } from './pages/HousekeepingDashboard.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { EventSimulatorPage } from './pages/EventSimulatorPage.jsx';
import { ExperimentEvaluationPage } from './pages/ExperimentEvaluationPage.jsx';
import { FailureAnalysisPage } from './pages/FailureAnalysisPage.jsx';
import { AuditLogPage } from './pages/AuditLogPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { PatientDetailModal } from './components/PatientDetailModal.jsx';
import { BedDetailModal } from './components/BedDetailModal.jsx';
import { api } from './services/api.js';
import { Search, Filter } from 'lucide-react';

function DashboardContent() {
  const { currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedBedId, setSelectedBedId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      setDashboardData(res);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStartDemo = async () => {
    try {
      await api.startDemo();
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const beds = (dashboardData?.beds || []).filter(b => {
    const matchesSearch = 
      b.bed_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.currentPatient && b.currentPatient.patientId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.currentPatient && b.currentPatient.procedure.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterState === 'ALL' || b.state === filterState || b.recommendation === filterState;
    return matchesSearch && matchesFilter;
  });

  const patients = (dashboardData?.patients || []).filter(p => 
    p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.procedure.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasStaleData = (dashboardData?.beds || []).some(b => b.freshness === 'STALE');

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Header 
        lastUpdate={dashboardData?.systemTime} 
        hasStaleData={hasStaleData}
        onRefresh={loadData}
      />

      <div className="flex-1 flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onStartDemo={handleStartDemo}
        />

        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Patient ID (e.g. PAT-102), Bed ID (B04), or Procedure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-semibold">Filter Bed State:</span>
              {['ALL', 'OCCUPIED', 'DISCHARGE_PENDING', 'CLEANING', 'READY', 'STALE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterState(st)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterState === st 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Main View Router */}
          {loading && !dashboardData ? (
            <div className="p-16 text-center text-slate-400">Loading Hospital Coordination Telemetry...</div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                currentRole === 'nurse' ? (
                  <NurseDashboard patients={patients} onSelectPatient={setSelectedPatientId} onRefresh={loadData} />
                ) : currentRole === 'clinician' ? (
                  <ClinicianDashboard patients={patients} onSelectPatient={setSelectedPatientId} onCreateDischargeOrder={async (id) => { await api.createDischargeOrder({ patientId: id }); loadData(); }} />
                ) : currentRole === 'housekeeping' ? (
                  <HousekeepingDashboard beds={beds} onStartCleaning={async (id) => { await api.startCleaning({ bedId: id }); loadData(); }} onCompleteCleaning={async (id) => { await api.completeCleaning({ bedId: id }); loadData(); }} onToggleBlock={async (id, block) => { await api.blockBed(id, { isBlocked: block }); loadData(); }} />
                ) : (
                  <CoordinatorDashboard
                    data={{ ...dashboardData, beds, patients }}
                    onRefresh={loadData}
                    onSelectBed={setSelectedBedId}
                    onSelectPatient={setSelectedPatientId}
                    onStartCleaning={async (id) => { await api.startCleaning({ bedId: id }); loadData(); }}
                    onCompleteCleaning={async (id) => { await api.completeCleaning({ bedId: id }); loadData(); }}
                    onDischargePatient={async (id) => { await api.dischargePatient({ patientId: id }); loadData(); }}
                    onMarkReady={async (id) => { await api.markBedReady(id, {}); loadData(); }}
                    onToggleBlock={async (id, block) => { await api.blockBed(id, { isBlocked: block }); loadData(); }}
                    onSimulateStale={async (id) => { await api.simulateStaleBed(id, { minutesAgo: 42 }); loadData(); }}
                    onCreateDischargeOrder={async (id) => { await api.createDischargeOrder({ patientId: id }); loadData(); }}
                    onAllocateBed={async (id) => { alert(`Bed ${id} successfully allocated to next scheduled patient.`); loadData(); }}
                  />
                )
              )}

              {activeTab === 'bed-turnover' && (
                <CoordinatorDashboard
                  data={{ ...dashboardData, beds, patients }}
                  onRefresh={loadData}
                  onSelectBed={setSelectedBedId}
                  onSelectPatient={setSelectedPatientId}
                  onStartCleaning={async (id) => { await api.startCleaning({ bedId: id }); loadData(); }}
                  onCompleteCleaning={async (id) => { await api.completeCleaning({ bedId: id }); loadData(); }}
                  onDischargePatient={async (id) => { await api.dischargePatient({ patientId: id }); loadData(); }}
                  onMarkReady={async (id) => { await api.markBedReady(id, {}); loadData(); }}
                  onToggleBlock={async (id, block) => { await api.blockBed(id, { isBlocked: block }); loadData(); }}
                  onSimulateStale={async (id) => { await api.simulateStaleBed(id, { minutesAgo: 42 }); loadData(); }}
                  onCreateDischargeOrder={async (id) => { await api.createDischargeOrder({ patientId: id }); loadData(); }}
                />
              )}

              {activeTab === 'patient-discharge' && (
                <NurseDashboard patients={patients} onSelectPatient={setSelectedPatientId} onRefresh={loadData} />
              )}

              {activeTab === 'simulator' && (
                <EventSimulatorPage beds={dashboardData?.beds || []} patients={dashboardData?.patients || []} onRefresh={loadData} />
              )}

              {activeTab === 'evaluation' && (
                <ExperimentEvaluationPage />
              )}

              {activeTab === 'failure-analysis' && (
                <FailureAnalysisPage />
              )}

              {activeTab === 'audit-log' && (
                <AuditLogPage />
              )}

              {activeTab === 'settings' && (
                <SettingsPage />
              )}
            </>
          )}
        </main>
      </div>

      {/* Patient Detail Drill-down Modal */}
      {selectedPatientId && (
        <PatientDetailModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          onRefresh={loadData}
        />
      )}

      {/* Bed Detail Event History Modal */}
      {selectedBedId && (
        <BedDetailModal
          bedId={selectedBedId}
          onClose={() => setSelectedBedId(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
