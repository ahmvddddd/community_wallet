# Transaction PIN

This document explains the logic, flow, validation rules, error responses, and database operations for creating, validating and resetting the **Transaction PIN** for the Virtual Account.

---

## Features
- Create a secure **4-digit transaction PIN**
- Validate the PIN before performing sensitive actions
- Reset the PIN **using a recovery token**
- All PINs and tokens are hashed using **Argon2id**
- Recovery token is regenerated on every reset

---

## Create Transaction PIN

1. Validate PIN (must be exactly 4 digits)

2. Hash the PIN using Argon2 (argon2id, strong parameters)

3. Generate a 32-byte recovery token

4. Hash the recovery token

5.Store both hashes in the database

6. Return the recovery token (user must save it)


### Authorization: 

Bearer Token

### Body: 

```

{
  "pin": 1234
}

```

### 201 Response:

```

{
    "message": "Transaction PIN created successfully. Please store your recovery token in a secure place, you will need it to reset your PIN.",
    "recovery_token": "6b52a5273724dd6676bd8764d8baf1dffe396a14c759d59395888a745dcc683f"
}

```

### Error 

1. `400`	Validation failed (PIN not 4 digits, not numeric)

2. `409`	User already has a PIN

3. `500`	Server/database error


---

## Validate Transaction PIN

1. Retrieve stored pin_hash for the user.

2. Verify the provided PIN using Argon2.

3. Return success or failure.


### Authorization: 

Bearer Token

### Body:

```

{
  "pin": "1234"
}

```

### 200 Response

```

{ "message": "PIN is valid." }

```

### Errors
	
`401`	Invalid PIN / Incorrect PIN

`500`	Server error


---

## Reset Transaction PIN (using recovery token)

1. Validate the new 4-digit PIN.

2. Validate the provided recovery token.

3.Create new hashes for:

4. New PIN

5. New recovery token

6. Update the record in transaction_pins.


### Authorization: 

Bearer Token


### 200 Response

```

{
  "message": "Transaction PIN has been reset successfully.",
  "recovery_token": "new-token-here"
}

```

### Error 

`400`	Invalid input data

`401`	Invalid or missing recovery token

`500`	Internal server error


---

## Note

1. `validateTransactionPin({ pin, userId })` will mainly be used inside flows like withdrawals, not exposed to the public as a separate “screen” on its own.



2. The table already has `failed_attempts` and `locked_until`, so in a future pass we can:

increment failed_attempts on wrong PIN,

lock the PIN temporarily after 3–5 bad tries,

and reset the counter on a successful PIN.