# Database Schema Documentation

This document provides a clear overview of the core database tables used in the Community Wallet MVP.  
It describes table purpose, key fields, constraints, and important behavioural notes so future updates do not break security or business rules.

---

## 1. USER MODULE

### **Table: user**
Holds core authentication identity for all users.

| Field | Type | Notes |
|------|------|-------|
| id | UUID (PK) | Primary user identifier |
| email | text, unique | Login credential |
| password_hash | text | Argon2 hashed password |
| name | text | Display name |
| created_at | timestamp | Auto-generated |

**Important:**
- Passwords are never stored in plain text.
- Email must remain unique per user.

---

### **Table: user_activity_log**
Tracks authentication and behavioural events for audit and security.

| Field | Notes |
|-------|-------|
| user_id | FK → user.id |
| event | Login, logout, PIN reset etc |
| ip_address | Optional |
| device_info | Optional |
| created_at | Timestamp |

---

### **Table: refresh_tokens**
Stores hashed refresh tokens for multi-device login.

**Important rules:**
- Only store **token_hash**, never the raw token.
- `revoked` and `replaced_by` support session invalidation.

---

### **Table: transaction_pins**
Stores encrypted user PIN metadata.

| Field | Notes |
|-------|-------|
| user_id | UNIQUE FK → user.id (one PIN per user) |
| pin_hash | Argon2id hash |
| recovery_token_hash | Argon2id hash |
| failed_attempts | Supports lockout rules |
| locked_until | Optional |
| updated_at | Auto-updated |

**Behaviour:**
- Creating a second PIN for the same user will fail via UNIQUE constraint.
- PIN never stored raw, only Argon2 hash.

---

## 2. GROUPS & MEMBERSHIP

### **Table: group**
Represents a savings group / community wallet.

| Field | Notes |
|-------|-------|
| id | UUID |
| name | Group name |
| description | Optional |
| rule_template | Default approval rule |
| approvals_required | Min number for approval (default 2) |
| approvals_cap | Max approvers allowed |
| created_by | FK → user.id |
| public_read_token | Optional token for public dashboards |

---

### **Table: group_membership**
Defines user roles inside a group.

| Field | Notes |
|-------|-------|
| group_id | FK → group.id |
| user_id | FK → user.id |
| role_in_group | OWNER, TREASURER, MEMBER |
| joined_at | Timestamp |

**Rules:**
- OWNER and TREASURER roles are the only ones allowed to approve or execute withdrawals.

---

## 3. WITHDRAWALS

### **Table: withdrawal_request**
Represents a withdrawal initiated by a group member.

| Field | Notes |
|-------|-------|
| group_id | FK |
| amount_kobo | Integer, >0 |
| beneficiary | JSONB (account_name, bank_name, **encrypted** account_number) |
| reason | Optional |
| status | PENDING, APPROVED, DECLINED, PAID |
| requested_by | FK → user.id |
| executed_at | Timestamp when payout succeeds |

**Important behaviour:**
- Status transitions: `PENDING → APPROVED → PAID` or `PENDING → DECLINED`.
- Row is locked (`FOR UPDATE`) during payout execution.

---

## 4. VIRTUAL ACCOUNTS

### **Table: account**
Stores a static virtual account assigned to a group.

| Field | Notes |
|-------|-------|
| virtual_account_number | **Encrypted** string |
| provider_ref | Flutterwave reference |
| provider | flutterwave or other |
| bank_name | Default = Wema Bank |
| status | pending, active, failed |

**Notes:**
- Only the encrypted version of the account number is stored.
- Raw provider payload is kept in account_metadata.

---

### **Table: account_metadata**
Stores raw provider metadata for audit/debug.

---

## 5. LEDGER

### **Table: ledger_entry**
Canonical record of credits and debits per group account.

| Field | Notes |
|-------|-------|
| type | CREDIT or DEBIT |
| amount_kobo | Non-negative |
| reference | Unique (prevents duplicate posting) |
| simulated | True if sandbox/provider demo |
| payment_channel | VA, payout, provider_sandbox |
| rule_status | VALID or flagged |

**Important:**
- Every payout creates a DEBIT ledger entry.
- Preventing double-ledger entries relies on `reference` UNIQUE constraint.

---

## 6. PAYOUTS

### **Table: payout**
Stores results of payout attempts.

| Field | Notes |
|-------|-------|
| withdrawal_id | FK |
| status | PENDING, SUCCESS, FAILED |
| provider_payload | Raw provider response |
| beneficiary | JSONB |

---

### **Table: payout_recovery**
Captures failed payout attempts for retry.

| Field | Notes |
|--------|-------|
| withdrawal_id | FK |
| attempted_payload | JSONB |
| error_message | Provider message |

---

## 7. APPROVALS

### **Table: approval**
Stores each approval action for a withdrawal.

| Field | Notes |
|-------|-------|
| withdrawal_id | FK |
| approver_user_id | FK |
| created_at | Timestamp |

**Rules:**
- UNIQUE constraint (withdrawal_id, approver_user_id) applied at model level.
- Prevents double-approvals.

---

## 8. WEBHOOK EVENTS

Stores raw provider webhook events for replay and audit.

---

## 9. VIRTUAL ACCOUNT REQUESTS & RECOVERY

### **Table: va_request**
Tracks provider virtual account creation requests.

### **Table: va_recovery**
Stores unmatched or failed VA creation attempts.  
This supports retry logic, **not exposed to UI**.

---

## Encryption Notes

- All sensitive data must use **app-level AES-256-GCM encryption** via `cryptoHelper.js`.
- Never store plaintext account numbers or sensitive identifiers.
- Decryption only happens at the moment it is required.

---

## Future Enhancements (post-MVP)
- PostgreSQL RLS policies.
- Event-sourced ledger entries.
- Rotating encryption keys with key versioning.
- Provider-specific subaccount storage.

---

_End of document._


---