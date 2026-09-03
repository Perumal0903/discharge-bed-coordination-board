# Clinical Operations Failure Analysis

> **Discharge-Readiness & Bed-Turnover Coordination Board**

---

## Operational Failure Modes & Safety Response Matrix

```
Failure Event ──► Impact ──► Detection ──► System Safety Response ──► Human Fallback
```

---

### 1. Data Latency
- **Impact**: Telemetry delayed in transmission, creating risk of acting on outdated state.
- **Detection**: Freshness Engine calculates `received_time - event_time` and age > 5m (`AGING`) or > 15m (`STALE`).
- **System Response**: Badge updates to `🟡 AGING` or `🔴 STALE`. Recommendation Engine outputs `MANUAL VERIFICATION REQUIRED`.
- **Human Fallback**: Coordinator conducts verbal check with unit clerk before allocating bed.

### 2. Missing Milestone Event
- **Impact**: Clinical readiness cannot be safely established automatically.
- **Detection**: Readiness Engine evaluates 7-milestone checklist; flags missing required milestone.
- **System Response**: Readiness set to `UNKNOWN`. Automatic recommendation disabled.
- **Human Fallback**: Nurse inspects patient chart and enters missing milestone manually.

### 3. Incorrect Documentation
- **Impact**: Milestone marked completed in error by staff.
- **Detection**: Subsequent vital check or nurse audit corrects status to `INCOMPLETE`.
- **System Response**: Readiness transitions from `READY` to `NOT_READY`. Discharge order queue blocked.
- **Human Fallback**: Clinician re-evaluates patient before issuing discharge order.

### 4. Conflicting Systems Data
- **Impact**: Contradictory telemetry feeds (e.g. bed state `READY` while cleaning log says `IN_PROGRESS`).
- **Detection**: Engine detects mismatch between bed state and active cleaning event.
- **System Response**: Status set to `CONFLICT`. Recommendation outputs `MANUAL VERIFICATION REQUIRED`.
- **Human Fallback**: Operations manager resolves telemetry conflict and verifies physical bed.

### 5. Network / System Outage
- **Impact**: Telemetry feed interrupted; updates stop flowing to backend.
- **Detection**: Telemetry timestamp age exceeds 15 minutes across all beds.
- **System Response**: Top banner displays `🔴 Telemetry Offline / Stale`. Automated recommendations disabled.
- **Human Fallback**: Unit switches to manual whiteboard coordination protocol.

### 6. Human Workflow Error (Forgotten Updates)
- **Impact**: Patient physically departed, but system state remains `OCCUPIED`.
- **Detection**: Workflow age timer exceeds expected threshold (> 3 hours post-procedure).
- **System Response**: Card highlighted in orange on Coordinator Dashboard as un-updated.
- **Human Fallback**: Coordinator conducts physical bed round.

### 7. Physical Bed Not Matching Database State
- **Impact**: Database shows `READY`, but bed is physically damaged, dirty, or leaking.
- **Detection**: Staff discovers issue on physical inspection and clicks **Block Bed**.
- **System Response**: Bed state set to `BLOCKED`. Recommendation outputs `DO NOT ALLOCATE`.
- **Human Fallback**: Patient allocated to alternative safe bed; maintenance work order issued.

### 8. Patient Condition Changing After Readiness Signal
- **Impact**: Patient becomes un-ready due to sudden nausea, pain spike, or vital instability post-readiness.
- **Detection**: Nurse inputs updated milestone status (`VITAL_STABILITY = INCOMPLETE`).
- **System Response**: Readiness status immediately reverts from `READY` to `NOT_READY`. Discharge order revoked.
- **Human Fallback**: Patient retained in day-surgery unit for extended clinical observation.

### 9. Housekeeping Cleaning Delay
- **Impact**: Discharged bed waiting for cleaning longer than expected.
- **Detection**: Bed state = `DISCHARGED` for > 20 minutes without cleaning start.
- **System Response**: Highlighted in Housekeeping Portal queue as delayed.
- **Human Fallback**: Housekeeping lead assigns next available floating cleaner.

### 10. Capacity Overload
- **Impact**: Peak discharge demand exceeds available safe beds or simultaneous cleaning limits.
- **Detection**: Scheduled admissions > available safe beds OR active cleanings reach max limit (3).
- **System Response**: Dashboard displays `CAPACITY RISK` alert banner.
- **Human Fallback**: Coordinator delays non-urgent admissions or opens surge beds.

---

## Operational Scope Disclaimer

> **IMPORTANT**: This prototype is an operational coordination aid. It does NOT make clinical decisions, replace clinician judgment, automatically discharge patients, or autonomously guarantee physical bed safety. All unverified recommendations fall back to human verification.
