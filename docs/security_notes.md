# Security Notes

This document outlines the core security principles for the Community Wallet backend.  
These rules ensure safe handling of authentication, group permissions, payouts, and transaction PIN flows.

---

## 1. Authentication & Session Security

- JWT must **never** be trusted on its own for group-level access.
- Every group-related operation must:
  - Verify membership via `group_membership`.
  - Verify correct role (`OWNER` or `TREASURER` where required).
- Rate limits must apply to:
  - `/auth/login`
  - `/auth/register`
  - `/auth/refresh`

---

## 2. Transaction PIN Security

- PINs and recovery tokens must be hashed using **Argon2id**.
- The system must implement:
  - `failed_attempts` counter.
  - `locked_until` timestamp.
- Behaviour:
  - Wrong PIN → increment attempts.
  - 3–5 wrong attempts → lock user temporarily.
  - Correct PIN → reset counters.
- Recovery token must:
  - Be shown only once.
  - Never be logged in plaintext.
  - Regenerate on each reset.

---

## 3. Group & Role Enforcement

- Only OWNER can:
  - Create a group.
  - Create a Virtual Account.
  - (In future) assign TREASURER roles.
- OWNER + TREASURER can:
  - Approve withdrawals.
  - Reject withdrawals.
  - Execute payouts.
- Members:
  - Can contribute.
  - Can optionally request withdrawals if enabled by the rule.

Every endpoint involving `group_id` must validate the caller’s role.

---

## 4. Withdrawal + Approval Flow

- A withdrawal must move through strict states:
  - `PENDING` → `APPROVED` → `PAID`
  - Or `PENDING` → `REJECTED`
- Once `PAID`, the request can never revert.
- Unique constraint prevents the same admin approving twice.
- Concurrency rule:
  - Payout controller must lock the row using `FOR UPDATE`.

---

## 5. Payout Execution Security

- Payouts must be **idempotent**:
  - Never allow a second payout if one already succeeded.
- Provider responses should be stored in:
  - `payout`
  - `payout_recovery` (on failure)
- Error logs must avoid including sensitive provider data.

---

## 6. Provider Integration (Flutterwave)

- API keys must only come from environment variables.
- No sensitive provider payloads should appear in server logs.
- Sandbox behaviour (same test account returned) must be handled with:
  - Validation
  - Proper error handling
  - No assumptions reused in production code

---

## 7. Logging & Audit

- Logs may include:
  - withdrawal_id
  - group_id
  - user_id
  - reference, provider status
- Logs must **never** include:
  - PINs
  - Recovery tokens
  - Raw tokens
  - Bank account numbers (except masked)
  - Full provider payloads in plaintext

---

## 8. General Application Security

- All API traffic must run over HTTPS.
- Enforce CORS rules to prevent unauthorised frontend calls.
- No super-admin backdoor should bypass normal checks.

---

## 9. Future Security Enhancements (Post-MVP)

- Suspicious activity monitoring.
- Device fingerprinting.
- Email verification workflow.
- PIN reset with optional multi-factor checks.

---

Last updated: {{ date }}


---

