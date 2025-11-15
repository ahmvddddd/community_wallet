# 📘 Create Static Virtual Account

---

This allows the **creator of a group** to generate a **static virtual bank account** for that group.  
The virtual account is created using **Flutterwave’s Virtual Account API**, stored in the database, and backed up with a recovery log if any failure occurs.

---

## Endpoint

POST

```
http://localhost:3000/api/v1/:group_id/create-account

```

---

## Request Body Example

```json
{
  "email": "testuser@example.com",
  "firstname": "Test",
  "lastname": "User",
  "phonenumber": "+2348012345678",
  "narration": "Final Year Dinner Account",
  "bvn": "12345678901"
}

```

---

## Authorization Requirements

The requesting user (req.user.id) must be the creator of the group.
If not, the API will return 403 Forbidden.

### How the Endpoint Works

1. Validates the incoming request body.

2. Checks if the provided group_id exists.

3. Ensures the requesting user is the group creator.

4. Generates a transaction reference (tx_ref).

5. Sends a request to Flutterwave to create a static virtual account.

7. Saves the account details to the database.

8. Saves the raw Flutterwave metadata as well.

9. Commits the database transaction.

### On errors:

1. Saves a recovery log into va_recovery.

2. Rolls back the transaction.

3. Returns an appropriate error message.

---

## Successfull Response Example

JSON

```
{
    "status": "success",
    "message": "Virtual account created successfully",
    "data": {
        "account": {
            "id": "f5d2a1f8-db4e-4ea6-8163-8c13b7091d26",
            "group_id": "d4bfb4cb-8d12-4236-949a-fe4b48cee62f",
            "virtual_account_number": "0067100155",
            "provider_ref": "URF_1763160164024_1828035",
            "created_at": "2025-11-14T21:42:43.105Z",
            "provider": "flutterwave",
            "status": "active",
            "bank_name": "Mock Bank"
        }
    }
}

```

---

## Errors Codes and Examples

### 400 – Bad Request

### Validation error example:

```

{
  "status": "error",
  "message": "\"bvn\" with value \"12345\" fails to match the required pattern: /^\\d{11}$/"
}


```

### Missing group_id:

```

{
  "status": "error",
  "message": "group_id is required"
}

```

### 404 – Group Not Found

```
{
  "status": "error",
  "message": "Group not found"
}

```

### 403 – Forbidden

### Triggered when the requester is not the group creator.

```
{
  "status": "error",
  "message": "Only the group creator can generate a virtual account"
}

```

### 500 – Internal Server Error

### Flutterwave or unexpected error:

```
{
  "status": "error",
  "message": "Flutterwave API request failed"
}

```

### General server failure:

```
{
  "status": "error",
  "message": "Internal server error"
}
```

When this happens, the system logs:

tx_ref,, group_id,raw_payload, error message, into va_recovery for debugging and replay capability.

---