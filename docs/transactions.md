### Hybrid Contribution (VA + Checkout)

- Checkout: `POST /api/v1/transactions/simulate/checkout`
  - body: { group_id, user_id, account_id, amount, reference? }
  - returns: { client_ref, ledgerEntry }

- Virtual Account (VA) webhook: `POST /api/v1/transactions/simulate/va`
  - body: { group_id, account_id, amount, client_ref, reference? }
  - returns: { ledgerEntry }

## Notes:
- `client_ref` is used for idempotency (same ref will not double-post).
- Server validates: account belongs to group, and (if provided) user is a group member.
- `payment_channel` recorded as 'CHECKOUT' or 'VA'.

---

## Quick test payloads

### Checkout


Endpoint: POST /api/v1/transactions/simulate/checkout

```

{ 
    "group_id":"<g>",
     "user_id":"<u>", 
     "account_id":"<a>",
      "amount":5000,
       "reference":"alumni_fee_2025" 
}

```

### VA


Endpoint: POST /api/v1/transactions/simulate/va

```

{ 
    "group_id":"<g>", 
    "account_id":"<a>", 
    "amount":20000, 
    "client_ref":"<reuse-this-if-retry>" 
    
}

```

---

