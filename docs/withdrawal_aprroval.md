# Withdrawal Approval Flow

This document explains the full approval and rejection logic for group withdrawals, including validation, roles, database operations, and API behaviour.

---

# 1. Overview

Every withdrawal created by a member must be approved by a number of admins defined in the group settings:

- **approvals_required** – minimum approvals needed  
- **approvals_cap** – maximum approvers allowed (audit purposes)

Only **OWNER** or **TREASURER** can approve or reject a withdrawal.

PIN verification is optional but supported.

---

# 2. Database Tables Used

### withdrawal_request
Stores each withdrawal request.

```

| Column | Description |
|--------|-------------|
| id | UUID |
| group_id | FK → group.id |
| amount_kobo | Amount in kobo |
| beneficiary | JSON {"name", "bank_name", "account_number"} |
| reason | Purpose |
| requested_by | FK → user.id |
| status | "PENDING", "APPROVED", "REJECTED" |
| created_at | Timestamp |


```
---

### approval  
Tracks each admin approval.

```

| Column | Description |
|--------|-------------|
| withdrawal_id | FK → withdrawal_request.id |
| approver_user_id | FK → user.id |
| created_at | Timestamp |


```

**Unique constraint:**  

```

UNIQUE (withdrawal_id, approver_user_id)

```
Prevents double-approval.

---

### group  
Relevant fields:

```

| Field | Meaning |
|--------|----------|
| approvals_required | Minimum approvals |
| approvals_cap | Maximum approvers |
| created_by | Group owner |


```

---

### group_membership  
Used to verify roles:

- OWNER  
- TREASURER  
- MEMBER  

---

# 3. API Endpoints

---

## POST /api/v1/transactions/:withdrawal_id/approve

Approve a withdrawal.

### Authorization  
- Bearer token required  
- Must be OWNER or TREASURER  

### Optional Body

```

json
{
  "pin": "1234"
}

```

---

### Logic Steps

1. Validate withdrawal ID  
2. Fetch withdrawal + group rules  
3. Ensure status = **PENDING**  
4. Confirm approver role = OWNER or TREASURER  
5. If PIN provided → validate  
6. Insert approval (duplicate → 409 conflict)  
7. Count approvals  
8. If approvals ≥ required → update to **APPROVED**  
9. Return success

---

### Success Example

```

json
{
  "status": "ok",
  "current_approvals": 2,
  "approvals_required": 2,
  "withdrawal_status": "APPROVED",
  "message": "Withdrawal has reached the required approvals and is now APPROVED."
}

```

### Error Codes

```

| Code | Meaning |
|------|---------|
| 400 | Invalid PIN |
| 401 | Wrong/invalid PIN |
| 403 | Not authorised |
| 404 | Withdrawal not found |
| 409 | Duplicate approval or withdrawal not pending |
| 500 | Internal server error |

```
---

# 4. Reject Withdrawal

---

## POST /api/v1/transactions/:withdrawal_id/reject

Rejects a withdrawal request.

### Authorization  
- Must be OWNER or TREASURER  

---

### Logic

1. Fetch withdrawal  
2. Ensure status = **PENDING**  
3. Confirm user role  
4. Update withdrawal → **REJECTED**  
5. Return response

---

### Success Example

```

json
{
  "status": "ok",
  "withdrawal_status": "REJECTED",
  "message": "Withdrawal successfully marked as REJECTED."
}


```

---

# 5. Business Rules Summary

✔ Only **PENDING** withdrawals can be approved or rejected  
✔ Only **OWNER** / **TREASURER** can approve or reject  
✔ User cannot approve twice  
✔ PIN validation optional  
✔ Auto-approve when threshold met  
✔ Rejection instantly ends approval flow  

---

# 6. Future Enhancements (Phase 2)

- Multi-stage approvals  
- 24-hour expiry for pending approvals  
- Full audit log with timestamp and admin identity  
- Push/email notifications  
- Escalation when approvers unavailable  
- Webhook event to trigger wallet payout  

---

# 7. Postman Examples

### Approve
```

POST /api/v1/transactions/<withdrawal_id>/approve

Authorization: Bearer <token>

{
  "pin": "4321"
}


```

### Reject


```

POST /api/v1/transactions/<withdrawal_id>/reject
Authorization: Bearer <token>


```

---

# Status  
✓ Fully implemented  
✓ Tested with Postman  
✓ Matches Sprint C5 approval flow requirements


---