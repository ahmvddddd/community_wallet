# Auth Validation Module (middlewares/auth/validator.js)

### Purpose

Centralised validation for all authentication endpoints (register & login).
Prevents bad input, enforces strong password rules, and keeps responses consistent across routes.


---

## Tech stack

Library: Joi

Middleware: Applied before controller logic

Schema: Validates both request shape and value format


---

## Schemas

Register Schema

```
{
  email: string().trim().lowercase().email().max(254).required(),
  name: string().trim().max(100).required(),
  password: string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/)
    .required()
}

```

---

## Rules enforced

1. Email must include “@” and valid domain

2. Name required, max 100 chars

3. Password must include:

4. 1 uppercase

5. 1 lowercase

6. 1 number

7. 1 special character

8. Min length 8




---

## Login Schema

```

{
  email: string().trim().lowercase().email().required(),
  password: string().required()
}


```

---

## Integration

```

router.post('/register', limitAuth, validateRegister, auth.register);
router.post('/login', limitLogin, validateLogin, auth.login);

```

---

## Response Examples

 Valid Registration

```

✅ 201 Created
{
  "user": {
    "id": "8e77e09f-25e5-4ba6-a1c0-124af579a7c0",
    "email": "test@example.com",
    "name": "Test User"
  }
}

❌ Invalid Email

400 Bad Request
{
  "error": "Validation failed",
  "details": [{ "message": "\"email\" must be a valid email" }]
}

❌ Weak Password

400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "message": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    }
  ]
}

❌ Missing Fields

400 Bad Request
{
  "error": "Validation failed",
  "details": [
    { "message": "\"name\" is required" },
    { "message": "\"email\" is required" }
  ]
}


```

---

## Future Add-ons

Custom error codes for front-end parsing

.stripUnknown() to ignore extra fields (already active)

Localised Joi messages for multi-language support



---


---

## Auth Controller

Secure authentication using Argon2 password hashing, JWT access tokens, and rotating, hashed refresh tokens stored server-side.


---

Endpoints

Method	Path	Purpose	Auth

1. Creates a new account:
POST	/api/v1/auth/register	

2. Issue access + refresh tokens
POST	/api/v1/auth/login

3. Rotate refresh, mint new access	tokens
POST	/api/v1/auth/refresh

4. Revoke current refresh token	and logs a user out
POST	/api/v1/auth/logout

5. Revoke all user refresh tokens
POST	/api/v1/auth/logout-all


> Middleware: rateLimit on register/login/refresh, ensureAuth on logout-all.
Cookies: refresh token is set as HTTP-Only cookie at /api/v1/auth/refresh.




---

## Token model

1. Access token: short-lived JWT (HS256, default 15 min)

2. Refresh token: random 64-byte secret, hashed (SHA-256), rotated on each /refresh

3. Cookie: httpOnly, sameSite=lax, secure in production, path=/api/v1/auth/refresh, maxAge=30 days


## JWT claims

{ "sub": "<userId>", "iat": 1731234567, "exp": 1731235467 }


---

## Register

POST /api/v1/auth/register

{ "email": "test@example.com", "name": "Test User", "password": "Str0ng@Pass" }

✅ 201 Created

{ "user": { "id": "<uuid>", "email": "test@example.com", "name": "Test User" } }

❌ 400 Validation failed
❌ 409 Account already exists – please log in


---

## Login

POST /api/v1/auth/login

{ "email": "test@example.com", "password": "Str0ng@Pass" }

✅ 200 OK

{
  "accessToken": "<jwt>",
  "user": { "id": "<uuid>", "email": "test@example.com" }
}

Sets refresh_token as HTTP-only cookie (30 days).
Errors:
400 Validation failed • 401 Invalid credentials


---

## Refresh (rotation)

POST /api/v1/auth/refresh

Validates and rotates refresh token, returns a new access token and cookie.

✅ 200 OK

{ "accessToken": "<new-jwt>" }

❌ Errors
401 No token  • 401 Invalid token  • 401 Revoked  • 401 Expired


---

## Logout (current device)

POST /api/v1/auth/logout

Revokes the refresh token tied to the current cookie and clears it.

✅ 200 OK

{ "ok": true }


---

## Logout-all (all devices)

POST /api/v1/auth/logout-all  (requires ensureAuth)
Revokes all refresh tokens for the authenticated user.

✅ 200 OK

{ "ok": true }


---

## Security notes

1. Passwords hashed with Argon2id

2. Refresh tokens never stored in plaintext (SHA-256 only)

3. Refresh rotation: old token → revoked=true, replaced_by new ID

4. Short-lived access tokens → renew via /refresh

5. Rate limits on register/login/refresh endpoints



---

## Error reference

400 { "error": "Validation failed" }
401 { "error": "Invalid credentials" }
401 { "error": "Missing auth" }
401 { "error": "Invalid token" }
409 { "error": "Account already exists – please log in" }
500 { "error": "Server error" }


---

## Env

JWT_ACCESS_SECRET=your_jwt_secret
NODE_ENV=development
DATABASE_URL=postgres://...
PORT=3000


---

## Client flow summary

1. Register → Login → get accessToken (cookie auto-set).


2. Use Authorization: Bearer <accessToken> for API calls.


3. When 401 due to expiry → call /refresh to renew.


4. Logout (current) or Logout-all (revoke all devices).




---