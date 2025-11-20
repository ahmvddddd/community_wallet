# Withdrawal Request (Creation Flow)

This document describes the full logic for creating a withdrawal request, including validation, member permissions, balance checks, database operations, and expected API responses.

---

# 1. Overview

A **withdrawal request** is created when a member of the group attempts to withdraw from the pooled balance.

It enters the approval system as **PENDING** until enough admins approve it.

---

# 2. Endpoint

### **POST /api/v1/transactions/withdrawal-request**

Authorization:  
**Bearer Token**

---

# 3. Request Body

```

json
{
  "groupId": "d4bfb4cb-8d12-4236-949a-fe4b48cee62f",
  "amount": 15000.75,
  "beneficiary": {
    "name": "Test User",
    "bank_name": "First National Bank",
    "account_number": "1234567890"
  },
  "reason": "Emergency withdrawal for group expenses"
}

```

---

# 4. Validation Rules

## **Body Validation (Joi)**

### **groupId**
- must be UUID  
- must reference an existing group  

### **amount**
- must be numeric  
- must be positive  
- converted to kobo using  

  ```

  amountKobo = Math.round(amount * 100)
  
  ```

### **beneficiary**
Must include:

```

| Field | Rule |
|-------|------|
| name | required, string |
| bank_name | required, string |
| account_number | required, exactly 10 digits |

```

### **reason**
- optional  
- max 255 characters  

---

# 5. Authorization Rules

### 1. User must be logged in  
→ Verified via Bearer Token

### 2. User must be a **member** of the group  
Checked via:

```

SELECT user_id 
FROM group_membership 
WHERE user_id = $1 AND group_id = $2

```

If not found → **403 Forbidden**

---

# 6. Balance Validation

System checks current group balance using the materialized view:

```

SELECT balance_kobo 
FROM vw_group_balance 
WHERE group_id = $1

```

If:

```

currentBalance < amountKobo

```

Return:

```

409 Conflict
{ "error": "Insufficient balance" }

```

---

# 7. Database Insert

### Table: withdrawal_request

A withdrawal is stored as:

```

| Column | Description |
|--------|-------------|
| group_id | FK → group.id |
| amount_kobo | stored in kobo |
| beneficiary | JSON payload |
| reason | short message |
| requested_by | user initiating request |
| status | always `"PENDING"` |
| created_at | timestamp |
| expires_at | null for now |

```

Inserted via:

```

sql
INSERT INTO withdrawal_request 
(group_id, amount_kobo, beneficiary, requested_by, status, reason)
VALUES (...)
RETURNING *

```

---

# 8. Success Response

```

json
{
  "message": "Withdrawal request successfully created",
  "withdrawal": {
    "id": "5b0ed297-fa79-4a61-b370-7d08aecb62c1",
    "group_id": "d4bfb4cb-8d12-4236-949a-fe4b48cee62f",
    "amount_kobo": 1500075,
    "beneficiary": {
      "name": "Test User",
      "bank_name": "First National Bank",
      "account_number": "1234567890"
    },
    "reason": "Emergency withdrawal for group expenses",
    "status": "PENDING",
    "requested_by": "c572d110-3c85-4d7c-821e-990277a5fc86",
    "expires_at": null,
    "created_at": "2025-11-18T17:02:27.461Z"
  }
}

```

---

# 9. Error Responses

### **400 – Validation error**
Examples:

```

"amount must be a positive number"
"account_number must be 10 digits"
"Missing required fields"

```

---

### **403 – Unauthorized**
User is not a member of the group.

```

{
  "error": "You are unauthorized to make this request for this group"
}

```

---

### **409 – Conflict**
Not enough balance:

```

{ "error": "Insufficient balance" }

```

---

### **500 – Server Error**
Unexpected DB or internal issue.

---

# 10. Business Rules

✔ Only group members can request withdrawals  
✔ All withdrawals start as **PENDING**  
✔ Balance must be sufficient  
✔ Amount always stored in kobo  
✔ Approval flow handled separately  
✔ No auto-approval in this stage  

---

# 11. Future Enhancements (Phase 2)

- withdrawal expiry (24h timer)  
- attach file/image proof for reason  
- auto-reject on insufficient admin activity  
- ability to cancel withdrawal (if still pending)  
- webhook-triggered payout after final approval  

---

# Status  
✓ Fully implemented  
✓ Tested via Postman  
✓ Works seamlessly with Sprint C5 (Approval Flow)


---