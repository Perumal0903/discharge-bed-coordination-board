# System Architecture Document

> **Discharge-Readiness & Bed-Turnover Coordination Board**

---

## 1. System Pipeline Architecture

```
  ┌────────────────────────────────────────────────────────┐
  │                 Synthetic Event Generator              │
  │ Admissions, Milestones, Orders, Cleaning, Bed Telemetry│
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                    Event Ingestion                     │
  │   Records event_time, received_time, source, notes    │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │          Event Store (SQLite DB / bed_events)          │
  └───────────────────────────┬────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌──────────────┐      ┌──────────────┐          ┌──────────────┐
│  Readiness   │      │  Bed State   │          │  Freshness & │
│    Engine    │      │    Engine    │          │  Conflict    │
│ 7-Milestones │      │ StateMachine │          │   Engine     │
└──────┬───────┘      └──────┬───────┘          └──────┬───────┘
       │                     │                         │
       └─────────────────────┼─────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │       Capacity Engine       │
              │  Max Cleanings & Risk Check │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │    Recommendation Engine    │
              │   Next Safe Bed & Fallbacks │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │        REST API Layer       │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  Role-Based React Dashboard │
              └─────────────────────────────┘
```

---

## 2. Safe Fallback Path Diagram

```
                 ┌─────────────────────────────┐
                 │    Incoming Telemetry Event │
                 └──────────────┬──────────────┘
                                │
                                ▼
                 ┌─────────────────────────────┐
                 │  Freshness / Conflict Check │
                 └──────────────┬──────────────┘
                                │
                   Is data stale, missing,
                conflicting, or blocked?
                                │
               ┌────────────────┴────────────────┐
               │                                 │
           YES │                                 │ NO
               ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│    Recommendation Blocked   │   │     SAFE TO ALLOCATE        │
│ MANUAL VERIFICATION REQUIRED│   │ Next Safe Bed Recommended   │
└──────────────┬──────────────┘   └─────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 5-Point Verification Check  │
│  Authorized Staff Confirms  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Safe Bed State Update & Alloc│
└─────────────────────────────┘
```

---

## 3. Database Schema Overview

- `beds`: Bed master record (`bed_id`, `state`, `state_updated_at`, `is_blocked`, `inspection_status`).
- `patients`: Synthetic patient admissions (`patient_id`, `admission_time`, `scheduled_discharge_time`, `discharge_status`).
- `clinical_milestones`: 7 clinical milestone records (`patient_id`, `milestone_type`, `status`, `event_time`, `received_time`).
- `discharge_orders`: Clinician discharge orders (`patient_id`, `order_status`, `order_time`, `received_time`).
- `cleaning_events`: Housekeeping turnover events (`bed_id`, `cleaning_status`, `start_time`, `completion_time`, `received_time`).
- `bed_events`: Bed state transition audit log (`bed_id`, `previous_state`, `state`, `timestamp`, `received_time`, `source`).
- `audit_logs`: User and system action log.
- `system_settings`: Configurable runtime settings (`aging_threshold_minutes`, `freshness_threshold_minutes`, `max_simultaneous_cleanings`).
- `experiment_results`: Reproducible experiment statistical results.
