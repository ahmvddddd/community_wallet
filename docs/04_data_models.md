# Data Models (MVP Phase 1)

These entities support the MVP user flows.

---

## 1. User

- id (UUID)
- name
- email (unique)
- passwordHash
- createdAt

---

## 2. Group

- id (UUID)
-  name
-  description
-  ruleTemplate ("two_officer")
-  approvalsRequired (integer)
-  approvalsCap (integer)
-  createdAt
-  createdBy (User.id)

---

## 3. GroupMembership

- id (UUID)
- groupId (Group.id)
- userId (User.id)
- roleInGroup ("OWNER" | "TREASURER" | "MEMBER")
- joinedAt

---

## 4. Account (Group Wallet)

- id (UUID)
- groupId (Group.id)
- virtualAccountNumber (string or mock)
- providerRef (string or null)
- createdAt

---

## 5. LedgerEntry

- id (UUID)
- groupId (Group.id)
- accountId (Account.id)
- userId (nullable)
- type ("CREDIT" | "DEBIT")
- amountKobo (int)
- currency ("NGN")
- source ("demo" | "provider_sandbox" | "payout")
- reference (string, unique)
- simulated (boolean)
- createdAt

---

## 6. WithdrawalRequest

- id (UUID)
- groupId (Group.id)
- amountKobo
- beneficiaryAccount (string or JSON)
- reason
- status ("PENDING" | "APPROVED" | "REJECTED" | "EXPIRED")
- requestedBy (User.id)
- expiresAt
- createdAt

---

## 7. Approval

- id (UUID)
- withdrawalId (WithdrawalRequest.id)
- approverUserId (User.id)
- createdAt

---

## 8. Deposits

- id (UUID)
- public_read_token (UUID)
- group_id (UUID)
- group_name (varchar)
- account_id (UUID)
- account_number (varchar)
- account_name (varchar)
- bank_name (varchar)
- status (varchar)
- ledger_entry_id (UUID)
- createdAt
- updatedAt

## 9. WebhookEvent (Later)

- id (UUID)
- eventType ("DEPOSIT")
- rawPayload (JSON)
- processed (boolean)
- processedAt
- createdAt

---


## Notes
- Amounts stored in **kobo** (INTEGER)
- Simulated contributions flagged `simulated=true`
- Idempotency via `reference`
