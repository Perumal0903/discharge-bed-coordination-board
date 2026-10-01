const BASE_URL = '/api';

async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getDashboard: () => fetchJson('/dashboard'),
  getBeds: () => fetchJson('/beds'),
  getBedDetail: (id) => fetchJson(`/beds/${id}`),
  getPatients: () => fetchJson('/patients'),
  getPatientDetail: (id) => fetchJson(`/patients/${id}`),

  admitPatient: (data) => fetchJson('/admissions', { method: 'POST', body: JSON.stringify(data) }),
  completeMilestone: (data) => fetchJson('/milestones', { method: 'POST', body: JSON.stringify(data) }),
  createDischargeOrder: (data) => fetchJson('/discharge-orders', { method: 'POST', body: JSON.stringify(data) }),
  cancelDischargeOrder: (data) => fetchJson('/discharge-orders/cancel', { method: 'POST', body: JSON.stringify(data) }),
  dischargePatient: (data) => fetchJson('/discharge-patient', { method: 'POST', body: JSON.stringify(data) }),
  startCleaning: (data) => fetchJson('/cleaning/start', { method: 'POST', body: JSON.stringify(data) }),
  completeCleaning: (data) => fetchJson('/cleaning/complete', { method: 'POST', body: JSON.stringify(data) }),

  blockBed: (id, data) => fetchJson(`/beds/${id}/block`, { method: 'POST', body: JSON.stringify(data) }),
  markBedReady: (id, data) => fetchJson(`/beds/${id}/ready`, { method: 'POST', body: JSON.stringify(data) }),
  simulateStaleBed: (id, data) => fetchJson(`/beds/${id}/stale`, { method: 'POST', body: JSON.stringify(data) }),

  getRecommendations: () => fetchJson('/recommendations'),
  getAuditLogs: () => fetchJson('/audit'),
  getEvaluation: () => fetchJson('/evaluation'),
  getScenarioEvaluation: () => fetchJson('/evaluation/scenarios'),
  runExperiment: () => fetchJson('/experiment/run', { method: 'POST' }),

  startDemo: () => fetchJson('/demo/start', { method: 'POST' }),
  resetDemo: () => fetchJson('/demo/reset', { method: 'POST' }),

  getSettings: () => fetchJson('/settings'),
  updateSetting: (data) => fetchJson('/settings', { method: 'POST', body: JSON.stringify(data) })
};
