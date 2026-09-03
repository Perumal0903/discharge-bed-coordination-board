-- Database Schema for Discharge-Readiness & Bed-Turnover Coordination Board

CREATE TABLE IF NOT EXISTS beds (
  bed_id TEXT PRIMARY KEY,
  room_number TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'UNKNOWN',
  state_updated_at TEXT NOT NULL,
  state_source TEXT DEFAULT 'SYSTEM',
  is_blocked INTEGER DEFAULT 0,
  block_reason TEXT DEFAULT NULL,
  current_patient_id TEXT DEFAULT NULL,
  inspection_status TEXT DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED
  last_inspected_at TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  surgeon TEXT NOT NULL,
  admission_time TEXT NOT NULL,
  scheduled_discharge_time TEXT NOT NULL,
  bed_id TEXT,
  discharge_status TEXT DEFAULT 'IN_CARE'
);

CREATE TABLE IF NOT EXISTS clinical_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL,
  status TEXT NOT NULL, -- COMPLETED, INCOMPLETE, PENDING
  event_time TEXT NOT NULL,
  received_time TEXT NOT NULL,
  source TEXT DEFAULT 'NURSE',
  updated_by TEXT DEFAULT 'Staff Nurse'
);

CREATE TABLE IF NOT EXISTS discharge_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id TEXT NOT NULL,
  order_status TEXT NOT NULL, -- CREATED, CONFIRMED, CANCELLED
  order_time TEXT NOT NULL,
  received_time TEXT NOT NULL,
  clinician TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS cleaning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bed_id TEXT NOT NULL,
  patient_id TEXT,
  cleaning_status TEXT NOT NULL, -- NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED
  assigned_staff TEXT DEFAULT 'Housekeeping Staff',
  start_time TEXT,
  completion_time TEXT,
  received_time TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bed_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bed_id TEXT NOT NULL,
  patient_id TEXT,
  state TEXT NOT NULL,
  previous_state TEXT,
  timestamp TEXT NOT NULL,
  received_time TEXT NOT NULL,
  source TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS experiment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_time TEXT NOT NULL,
  total_cases INTEGER NOT NULL,
  valid_cases INTEGER NOT NULL,
  failed_cases INTEGER NOT NULL,
  total_beds INTEGER NOT NULL,
  baseline_mean REAL NOT NULL,
  prototype_mean REAL NOT NULL,
  improvement_minutes REAL NOT NULL,
  improvement_pct REAL NOT NULL,
  baseline_median REAL NOT NULL,
  prototype_median REAL NOT NULL,
  baseline_p90 REAL NOT NULL,
  prototype_p90 REAL NOT NULL,
  baseline_std_dev REAL NOT NULL,
  prototype_std_dev REAL NOT NULL,
  unsafe_recommendations_count INTEGER NOT NULL,
  manual_fallbacks_count INTEGER NOT NULL,
  stale_data_detections INTEGER NOT NULL,
  missing_data_detections INTEGER NOT NULL,
  conflicting_events_count INTEGER NOT NULL
);
