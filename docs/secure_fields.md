# Secure Fields Readme

This document describes the secure field encryption helper used across the codebase. Secure fields are automatically encrypted before being written to the database and decrypted when read back into the application. This ensures sensitive data is never stored in plaintext at rest.

The encryption layer is handled by encryptFields and decryptFields, which operate based on the secure field maps defined in secureFieldMaps.js.

Each model defines which fields are sensitive and must always be encrypted.

---

## Secure Field Maps

### USER_SECURE_FIELDS

Fields encrypted for user records.

. email

---

### REFRESH_TOKENS_SECURE_FIELDS

Sensitive metadata stored with refresh tokens.

. device_info

. ip_address

---

### USER_ACTIVITY_SECURE_FIELDS

Metadata stored for user activity logging.

. ip_address

. device_info

---

### ACCOUNT_SECURE_FIELDS

Encrypted within account records.

. virtual_account_number

. provider_ref

---

### LEDGER_SECURE_FIELDS

Encrypted inside ledger entries.

. reference

. client_ref

---

### PAYOUT_SECURE_FIELDS

Used in payoutModel to encrypt provider data and beneficiary details.

. beneficiary

. provider_payload

---

### WITHDRAWAL_SECURE_FIELDS

Used in withdrawalModel to encrypt withdrawal instructions.

. beneficiary

. reason

---

### VA_REQUEST_SECURE_FIELDS

Used when requesting virtual accounts.

. client_ref


---

### VA_RECOVERY_SECURE_FIELDS

Used for storing failed virtual account request attempts.

. raw_payload

. error_message


---

### ACCOUNT_METADATA_SECURE_FIELDS

Encrypted storage of raw provider metadata for accounts.

.raw_payload

---

### PAYOUT_RECOVERY_SECURE_FIELDS

Encrypted fields for recording failed payout attempts.

.attempted_payload

.error_message

---

### WEBHOOK_EVENT_SECURE_FIELDS

Encrypted storage of raw webhook payloads.

. raw_payload


---

## How These Fields Are Used

### accountModel

Encrypts virtual account numbers, provider references, and raw provider metadata.

Ensures no provider-sensitive identifiers are stored in plaintext.

### withdrawalModel

Encrypts the withdrawal beneficiary object and the optional reason field.

Before payout execution, the withdrawal beneficiary must be decrypted using WITHDRAWAL_SECURE_FIELDS to get the original values.

### payoutModel

Encrypts beneficiary details and provider responses for successful payouts.

Encrypts attempted payloads and error messages for failed payouts.

Encrypts ledger references for payout-related ledger entries.

### emailLookup

To safely compare user emails in the login controller without storing plaintext values, the computeEmailLookupHash function generates a deterministic HMAC-SHA256 hash of the normalized email using EMAIL_LOOKUP_SECRET.

This ensures login queries can be performed using the hash instead of the raw email, protecting user email addresses at rest and during lookups.

---

## Pending Secure Field Mapping

The following secure field definitions are placeholders and will be finalized after provider integration is complete.

Pending Secure Field Mapping (to be completed after provider integration):

'VA_REQUEST_SECURE_FIELDS' → expecting final structure once real provider client_ref format is confirmed

'VA_RECOVERY_SECURE_FIELDS' → depends on exact shape of provider error payloads

'WEBHOOK_EVENT_SECURE_FIELDS' → depends on final webhook schema from Flutterwave