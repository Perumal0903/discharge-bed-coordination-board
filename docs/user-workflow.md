# User and Workflow Mapping Document

> **Discharge-Readiness & Bed-Turnover Coordination Board**

---

## 1. End-to-End Patient-to-Bed Workflow Lifecycle

```
Admission (T_0)
   ↓
Recovery & Clinical Milestones (7 Required Items)
   ↓
Clinical Discharge Readiness (Status = READY)
   ↓
Discharge Order (Order Status = CONFIRMED)
   ↓
Patient Departure (Bed State = DISCHARGED)
   ↓
Housekeeping Cleaning (Bed State = CLEANING)
   ↓
Safety Inspection (Bed State = INSPECTION)
   ↓
Safe Bed Available (Bed State = READY)
   ↓
Next Safe Bed Allocation
```

---

## 2. Role-Based Workflows

### Role 1: Bed Coordinator
- **Primary View**: Main Operations Board & Bed Turnover Board.
- **Workflow**:
  1. Inspect **Next Recommended Safe Bed** card.
  2. Review beds flagged with `MANUAL VERIFICATION REQUIRED` or `CAPACITY RISK`.
  3. Perform 5-point physical verification checklist before overriding unverified bed states.
  4. Allocate verified safe beds to incoming patients.

### Role 2: Nurse / Clinical Staff
- **Primary View**: Nurse Portal.
- **Workflow**:
  1. Review queue of active patients requiring milestone verification.
  2. Open Patient Evidence panel for target patient.
  3. Record 7 clinical recovery milestones (Vitals, Pain, Mobility, Oral Intake).
  4. System automatically broadcasts clinical discharge readiness once 100% completed.

### Role 3: Clinician / Doctor
- **Primary View**: Clinician Portal.
- **Workflow**:
  1. View patients with `READY` clinical status.
  2. Inspect milestone checklist timestamps and evidence.
  3. Confirm electronic discharge order.
  4. System updates order status and notifies housekeeping.

### Role 4: Housekeeping Staff
- **Primary View**: Housekeeping Portal.
- **Workflow**:
  1. View beds in state `DISCHARGED`.
  2. Click **Start Cleaning** (system checks capacity limit of 3).
  3. Complete sanitization and click **Complete Cleaning**.
  4. Bed state transitions to `INSPECTION` and subsequently `READY`.

### Role 5: Administrator
- **Primary View**: Administrator Governance Center.
- **Workflow**:
  1. View overall KPIs, capacity metrics, and baseline vs prototype evaluation metrics.
  2. Monitor error analysis (missing, stale, conflicting, fallback counts).
  3. Edit runtime parameters (`max_simultaneous_cleanings`, `freshness_threshold_minutes`).
  4. Review system audit log.
