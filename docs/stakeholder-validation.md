# Structured Prototype Scenario Walkthrough & Stakeholder Validation Framework

> **Discharge-Readiness & Bed-Turnover Coordination Board**  
> *Structured Domain-Role Prototype Scenario Walkthrough & Usability Framework*

---

## 1. Executive Summary & Validation Scope

To systematically evaluate the usability, transparency, and safety mechanisms of the Discharge-Readiness & Bed-Turnover Coordination Board, a structured scenario walkthrough framework was established across 5 operational domain roles.

> **Validation Status**: Structured synthetic prototype walkthrough; real clinical/administrative stakeholder validation remains pending in future pilot phases.
> 
> **Important Disclaimer**: This repository contains synthetic patient workload data and simulated operational events for prototype testing. No real clinical trials, hospital deployments, or human participant evaluations have been conducted.

---

## 2. Structured Domain-Role Walkthroughs

### 2.1 Role 1: Bed Coordinator (Primary Operational User)

* **User Goal**: Identify the **Next Safe Bed Available** for immediate short-stay patient allocation without risking unsafe allocation.
* **Scenario**: A patient achieves clinical discharge readiness while the assigned bed is undergoing housekeeping sanitization.
* **Steps**:
  1. Navigate to the main Operational Dashboard.
  2. Inspect the **Next Safe Bed Available** summary header card.
  3. Review the candidate bed's state (`CLEANING` vs `READY`) and telemetry freshness indicator (`FRESH`, `AGING`, `STALE`).
  4. If telemetry is marked `STALE` or `MANUAL VERIFICATION REQUIRED`, perform the 5-point physical verification protocol before allocation.
* **Expected System Behaviour**:
  * Highlight the single safest ready bed in real-time based on verified evidence.
  * Dynamically evaluate housekeeping capacity limits (max 3 simultaneous cleanings) and display `CAPACITY RISK` alert when backlogs build.
* **Safety / Fallback Behaviour**:
  * If cleaning evidence is missing, inspection is incomplete, or telemetry is >15m old, system falls back to `MANUAL VERIFICATION REQUIRED` and outputs `DO NOT TRUST AUTOMATIC RECOMMENDATION`.
* **Evidence Visible in UI**:
  * Next Safe Bed Banner card at top of dashboard.
  * 5-Point Physical Verification Checklist drawer.
  * Telemetry Freshness Status badges (🟢 `FRESH`, 🟡 `AGING`, 🔴 `STALE`).
* **Questions for Future Stakeholder Feedback**:
  * *Does the 5-point checklist provide sufficient operational assurance before overriding an unverified bed status?*
  * *Is the Capacity Risk banner sufficiently prominent during peak afternoon turnover surges?*
* **Acceptance Criteria**: Coordinator can immediately understand why a bed is or is not safely allocatable within 10 seconds of viewing the board.
* **Current Validation Status**: Structured synthetic prototype walkthrough completed; real clinical stakeholder feedback pending.

---

### 2.2 Role 2: Staff Nurse (Clinical Milestone Recorder)

* **User Goal**: Record post-operative recovery milestones in real time to make clinical discharge readiness visible early.
* **Scenario**: Patient completes post-op recovery criteria (vital stability, pain controlled, mobility criteria, oral intake).
* **Steps**:
  1. Open the Patient Detail view or Nurse Persona dashboard.
  2. Toggle milestone check-items as clinical criteria are satisfied (7 total required milestones).
  3. Observe automated system calculation of Clinical Discharge Readiness.
* **Expected System Behaviour**:
  * Automatically evaluate all 7 milestone completion statuses and telemetry ingestion latency.
  * When all 7 milestones are `COMPLETED` and `FRESH`, transition readiness status to `READY (FRESH)`.
* **Safety / Fallback Behaviour**:
  * If a required milestone is missing, status remains `UNKNOWN`.
  * If contradictory milestone events arrive from EHR feeds, status transitions to `CONFLICT`.
* **Evidence Visible in UI**:
  * 7-Point Clinical Milestone Progress Bar & Breakdown List.
  * Evidence Traceability Drawer showing exact event timestamps and telemetry latency (`received_time - event_time`).
* **Questions for Future Stakeholder Feedback**:
  * *Does the 7-point milestone list match standard day-surgery discharge criteria in your facility?*
  * *Would automated EHR milestone integration reduce nurse documentation burden?*
* **Acceptance Criteria**: Nurse can update a milestone in 2 clicks, and clinical readiness status updates instantaneously across all role views.
* **Current Validation Status**: Structured synthetic prototype walkthrough completed; real nursing staff validation pending.

---

### 2.3 Role 3: Clinician / Attending Surgeon (Discharge Authorizer)

* **User Goal**: Review patient readiness evidence and write/confirm electronic discharge orders or cancel pending orders upon clinical status changes.
* **Scenario A**: Clinician reviews 7-point milestone completion and confirms discharge order.  
* **Scenario B (Discharge Cancellation)**: Patient develops post-operative nausea or fever after a discharge order was written; clinician cancels the discharge order.
* **Steps**:
  1. Open Clinician Persona dashboard.
  2. Select patient in `IN_CARE` or `PENDING_LEAVE` status.
  3. Click **Confirm Discharge Order** or **Cancel Discharge Order** with clinical rationale.
* **Expected System Behaviour**:
  * Confirming order transitions patient to `PENDING_LEAVE` and bed to `DISCHARGE_PENDING`.
  * Cancelling order reverts patient to `IN_CARE` and bed to `OCCUPIED`. Cleaning is NOT triggered for cancelled orders.
* **Safety / Fallback Behaviour**:
  * Discharge cancellation attempt post physical patient departure (`DISCHARGED`) is strictly rejected with audit log recording.
  * Idempotent handling for duplicate cancellation requests.
* **Evidence Visible in UI**:
  * Discharge Order Confirmation modal with clinician ID and notes.
  * Audit Log history entry capturing previous state, new state, user role, and reason.
* **Questions for Future Stakeholder Feedback**:
  * *Is the cancellation workflow fast enough to prevent accidental housekeeping deployment?*
  * *Does the audit trail provide adequate medicolegal accountability for discharge decisions?*
* **Acceptance Criteria**: Discharge order creation and cancellation complete deterministically with full state rollback safety.
* **Current Validation Status**: Structured synthetic prototype walkthrough completed; real clinical authorizer validation pending.

---

### 2.4 Role 4: Housekeeping Lead (Sanitization Manager)

* **User Goal**: Receive early turnover notifications as soon as patients depart and manage staff workload within safe capacity limits.
* **Scenario**: Patient physically departs bed; housekeeping receives instant notification to initiate 3-stage sanitization (start -> complete -> submit for inspection).
* **Steps**:
  1. View Housekeeping Persona dashboard.
  2. Select bed in `DISCHARGED` state and click **Start Cleaning**.
  3. Upon sanitization completion, click **Complete Cleaning**.
* **Expected System Behaviour**:
  * Track active cleanings against configured maximum capacity (default: 3 simultaneous cleanings).
  * Automatically transition bed state: `DISCHARGED` -> `CLEANING` -> `INSPECTION`.
* **Safety / Fallback Behaviour**:
  * Reject cleaning initiation on occupied beds or if capacity limit is exceeded.
  * Stale or out-of-order cleaning events (older event_time arriving after completion) are detected via tie-breaker comparison and ignored without corrupting bed state.
* **Evidence Visible in UI**:
  * Housekeeping Task Queue & Timer cards.
  * Capacity Limit Counter (Active vs Limit).
* **Questions for Future Stakeholder Feedback**:
  * *Is the 3-limit capacity threshold representative of typical housekeeping staffing in short-stay units?*
  * *Would mobile notifications assist housekeeping staff on the floor?*
* **Acceptance Criteria**: Housekeeping receives turnover alerts immediately upon physical departure, cutting late discovery lag.
* **Current Validation Status**: Structured synthetic prototype walkthrough completed; real housekeeping staff validation pending.

---

### 2.5 Role 5: System Administrator (Operational Auditor & Configurator)

* **User Goal**: Configure system thresholds (latency limits, capacity limits) and audit full operational logs for quality assurance.
* **Scenario**: Admin modifies freshness latency threshold from 15 mins to 30 mins or inspects audit trails following a simulated workflow exception.
* **Steps**:
  1. Open Admin Settings & Audit Log panel.
  2. Adjust system threshold inputs (`freshness_threshold_minutes`, `max_simultaneous_cleanings`).
  3. Filter immutable audit logs by patient ID, bed ID, or user role.
* **Expected System Behaviour**:
  * System config updates in-memory cache dynamically and logs an `UPDATE_SETTING` audit entry.
  * All bed state transitions retain complete historical provenance in `bed_events` and `audit_logs`.
* **Safety / Fallback Behaviour**:
  * Setting updates do not override hardcoded safety constraints (e.g. direct jumps to READY remain strictly blocked).
* **Evidence Visible in UI**:
  * Runtime System Settings configuration panel.
  * Audit Log table with timestamp, user role, action, target, state diff, and reason.
* **Questions for Future Stakeholder Feedback**:
  * *Which additional system parameters should be configurable by administrative staff?*
  * *Are audit log export formats (CSV/JSON) suitable for hospital compliance reporting?*
* **Acceptance Criteria**: Configuration changes take effect immediately across evaluation engines without requiring server restart.
* **Current Validation Status**: Structured synthetic prototype walkthrough completed; real administrative validation pending.

---

## 3. Usability Verification Checklist & Acceptance Summary

| Domain Role | Evaluated Scenario | System Feature Tested | Verification Result |
| :--- | :--- | :--- | :--- |
| **Bed Coordinator** | Safe Bed Allocation under telemetry latency | 5-Point Physical Verification & Freshness Indicator | **PASSED (Synthetic Walkthrough)** |
| **Staff Nurse** | Post-op milestone tracking | 7-Point Milestone Progress & Evidence Traceability | **PASSED (Synthetic Walkthrough)** |
| **Clinician** | Acute clinical change post-readiness | Simultaneous Discharge Order Cancellation | **PASSED (Synthetic Walkthrough)** |
| **Housekeeping** | High-volume turnover surge | Capacity Constraint & Out-of-Order Event Guard | **PASSED (Synthetic Walkthrough)** |
| **Administrator** | Audit & Policy Configuration | Immutable Audit Logging & Setting Overrides | **PASSED (Synthetic Walkthrough)** |

---

## 4. Conclusion & Next Steps

This structured framework establishes a rigorous protocol for domain-role scenario validation. While prototype testing confirms operational logic and safety fallbacks, formal real-world clinical evaluation remains a required next step prior to hospital deployment.
