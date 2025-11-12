# Governance and Access Control – Community Wallet

## 1. Overview
This document defines the governance rules, administrative hierarchy, and approval mechanisms for financial operations within the Community Wallet system.  
It ensures transparent control of funds, secure multi-party validation, and an audit-friendly flow for contributions and withdrawals.

---

## 2. Roles and Permissions

### Owner
- Creator of a group or campaign.
- Automatically assigned at group creation.
- Can initiate withdrawals and invite admins.
- Cannot override admin validations.

### Admin
- Appointed (or system-assigned) validators who approve withdrawal requests.
- Each group must have a minimum of 2 active admins.
- Can review transactions, freeze suspicious requests, and approve withdrawals.

### Contributor
- May contribute via **Checkout (tokenised)** or **Virtual Account (VA)**.
- Does not need a registered account to deposit.
- Receives a unique **access token** linked to their user ID + group ID for transaction tracking.

---

## 3. Token Architecture

### Access Token
- Generated per deposit via the hybrid flow.
- Format: `CW-{groupID}-{UUID8}`.
- Used by contributors to validate their deposits and view transaction summaries.

### Admin Token
- Issued to group admins for authenticating withdrawal approvals.
- Each token is **single-use** and expires after 48 hours.
- Stored in the `admin_tokens` table with the following structure:

id | admin_id | withdrawal_id | token | status | issued_at | expires_at

---

## 4. Withdrawal Flow Governance

### Step 1 — Request Creation
- Owner initiates withdrawal with amount and reason.
- Status set to `"PENDING_ADMIN_APPROVAL"`.
- Admins notified (or retrieved on next session).

### Step 2 — Approval Window
- Admins validate via **token-based authentication**.
- Approval tokens expire in **48 hours**.
- If no quorum or response, request auto-expires and is marked `"EXPIRED"`.

### Step 3 — Re-submission
- Owner may resubmit an expired request without re-entering details.
- Each re-submission creates a new `withdrawal_id` with a reference to the previous attempt.

---

## 5. Timeout and Escalation Logic

### Soft Timeout (MVP)
- If no admin action within 48 hours → mark request `"EXPIRED"`.
- Prevents fund lock-up without breaking validation rules.

### Auto-Escalation (Phase 2)
- Introduce `withdrawal_monitor.js` background job:
- Escalates overdue requests to a **Super Admin** for review.
- The Super Admin can override, approve, or permanently lock the request.

### Smart-Contract Layer (Phase 3)
- Implement a DAO-like “time-lock” where unopposed withdrawals are auto-approved after a defined threshold.

---

## 6. Admin Selection Policy

### MVP Policy
- Admins are selected from the pool of verified contributors during group creation.
- The system ensures role diversity by preventing the owner from selecting more than one admin directly.

### Future Enhancement
- Admins can be auto-assigned using rule-based scoring:
- Contribution history
- Tenure in group
- Past validation consistency

---

## 7. Audit and Transparency

### Logs
All actions (creation, approvals, expirations, resubmissions) are recorded in an `audit_trail` table with:

id | actor_id | action | target_id | target_type | timestamp | meta

### Public Ledger (Future)
Public dashboard can expose anonymised logs for community transparency.

---

## 8. Future Roadmap (Governance Layer)
- **Weighted voting** on withdrawals.
- **Escrow-based verification** for high-value campaigns.
- **Governance tokens** for active contributors.
- **Auto-admin reassignment** for inactive roles.

---

### Maintainer Notes
This document should evolve with each sprint.  
Every time a governance-related module (admin flow, token, or timeout logic) changes, update this file to maintain alignment between backend logic and operational policy.


---
