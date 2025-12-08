# Group Read APIs

This document defines all “read-only” Group endpoints used by the mobile app.
These APIs power the dashboards, summaries, withdrawal listings, transaction history, and detail pages.

All endpoints require a valid authenticated user via Bearer Token.


---

## Get All My Groups

### Endpoint

GET `/api/v1/groups/my-groups`

Description
Returns all groups the authenticated user belongs to, sorted by join date (latest first).

Auth Required
Yes

### Response (200 OK)

```

{
  "groups": [
    {
      "group_id": "uuid",
      "group_name": "Final year dinner",
      "role_in_group": "OWNER",
      "joined_at": "2025-11-18T14:25:19.172Z"
    }
  ]
}

```


---

## Group Summary

### Endpoint

GET `/api/v1/groups/:group_id/group-summary`

Description
Returns high-level metrics for a group, including balance, approvals, members, deposits, and withdrawal counts.

Authorisation Rules

Only members of the group may access this endpoint.


### Response (200 OK)

```

{
  "group_id": "uuid",
  "name": "Final year dinner",
  "description": "Contribution for final year dinner",
  "approvals_required": 2,
  "balance_kobo": "4499925",
  "counts": {
    "members": 1,
    "deposits": 0,
    "pending_withdrawals": 0,
    "approved_unpaid": 1,
    "paid": 0
  }
}

```


---

## Group Withdrawals (Paginated)

Endpoint

GET `/api/v1/transactions/:group_id/group-withdrawals?status=&page=&pageSize=`

Query Params

status optional, one of: PENDING, APPROVED, DECLINED, PAID

page default: 1

pageSize default: 10, max: 50


Description
Returns a paginated list of withdrawals for a group.
Encrypted fields such as beneficiary and reason are automatically decrypted when available.

Authorisation Rules

Only members of the group may access this list.


### Response (200 OK)

```

{
  "withdrawals": [
    {
      "id": "uuid",
      "group_id": "uuid",
      "amount_kobo": 1500075,
      "beneficiary_name": "Test User",
      "reason": "Emergency withdrawal",
      "status": "APPROVED",
      "requested_by": "uuid",
      "created_at": "2025-11-18T17:02:27.461Z",
      "executed_at": null,
      "approvals_required": 2,
      "approvals_count": 1
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}

```


---

## Withdrawal Details

### Endpoint

GET `/api/v1/transactions/:withdrawal_id/withdrawal-details`

Description
Returns full details of a single withdrawal, including request info, decrypted beneficiary, decrypted reason, and list of approvals.

Authorisation Rules

Only members of the group that owns the withdrawal can view the details.

If the user is not a member, response is:


`{ "error": "You are not a member of this group" }`

### Response (200 OK)

```

{
  "details": {
    "id": "uuid",
    "group_id": "uuid",
    "amount_kobo": 1500075,
    "beneficiary": { "name": "Test User" },
    "reason": "Emergency withdrawal for group expenses",
    "status": "APPROVED",
    "requested_by": "uuid",
    "expires_at": null,
    "created_at": "2025-11-18T17:02:27.461Z",
    "executed_at": null,
    "requester_name": "Test User",
    "approvals": [
      {
        "id": "uuid",
        "created_at": "2025-11-19T18:33:49.263Z",
        "approver_name": "Test User",
        "approver_user_id": "uuid"
      }
    ]
  }
}

```


---

## Group Ledger Snapshot (Paginated)

Endpoint:

`GET /api/v1/groups/:group_id/ledger-snapshot?page=&pageSize=`

Description
Returns paginated ledger entries for the selected group.
Encrypted fields such as reference and client_ref are decrypted automatically.

Authorisation Rules

Only members of the group may access ledger entries.


### Response (200 OK)

```

{
  "status": "success",
  "data": {
    "pagination": {
      "page": 1,
      "pageSize": 1,
      "total": 2,
      "totalPages": 2
    },
    "entries": [
      {
        "id": "uuid",
        "group_id": "uuid",
        "account_id": "uuid",
        "type": "DEBIT",
        "amount_kobo": 1500075,
        "currency": "NGN",
        "source": "payout",
        "reference": "PAYOUT_XXX",
        "reference_masked": "PAYO****0386",
        "created_at": "2025-11-21T01:27:35.231Z"
      }
    ]
  }
}

```


---

## Notes on Secure Fields in Read APIs

Beneficiary objects, reasons, provider payloads, and references are always decrypted before returning to the client.

Masked variants (reference_masked) are added for privacy.

Any unreadable encrypted field falls back to null.



---

