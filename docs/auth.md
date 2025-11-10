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
