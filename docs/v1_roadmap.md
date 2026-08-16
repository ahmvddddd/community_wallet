# Project v1 Completion & Refactoring Roadmap

This document outlines the operational roadmap and technical blueprint for finalizing **v1** of the application. The primary objectives are integrating static frontend user interfaces with live backend services, restructuring project architecture for maintainability and security, enforcing request validation and rate limiting, and completing end-to-end verification and documentation.


---

## 🏗️ Detailed Breakdown of Roadmap Items

### Phase 1: Frontend Dynamic API Integration & Auth Restructuring

#### 1. Complete Ledger Page (`/ledger`)
- **Current State:** Static UI mockup for ledger entries and transaction history.
- **Goal:** Transform into a dynamic, API-driven data grid/list.
- **Key Deliverables:**
  - Connect ledger state to the backend ledger API endpoint.
  - Implement dynamic pagination, filtering (by transaction type, date range, status).
  - Add robust error boundary and empty/loading skeleton states.

#### 2. Complete Withdrawal Page & Withdrawal Actions (`/withdrawals`)
- **Current State:** Static withdrawal layout and modal triggers.
- **Goal:** Enable live payout processing, pin/security checks, and action handling.
- **Key Deliverables:**
  - Form validation for withdrawal amounts, target bank accounts/destinations, and transaction PIN verification.
  - User feedback triggers (toast notifications, confirmation modals, success state routes).

#### 3. Auth Folder Restructuring
- **Goal:** Establish a modular, maintainable structure for authentication assets, state, and guards.
- **Target Structure:**
  ```text
  src/
  ├── auth/
  │   ├── components/      # Auth-specific UI (LoginForm, ProtectedRoute, MFA)
  │   ├── context/         # Auth Provider & State Context
  │   ├── hooks/           # useAuth, useSession, usePermissions
  │   ├── services/        # Auth API calls (login, logout, refresh, OTP)
  │   ├── utils/           # Token storage, decoded JWT helpers
  │   └── types/           # Auth interfaces & type definitions
  ```

#### 4. Project-Wide Refactor for Auth Alignment
- **Goal:** Update all existing pages, components, and API client interceptors to conform to the new `auth/` architecture.
- **Key Deliverables:**
  - Wrap API interceptors with automatic JWT token attachment and 401/403 refresh token flows.
  - Update route guards (e.g., `ProtectedRoute` / middleware) across Ledger, Withdrawals, and Dashboard routes.
  - Eliminate redundant state management and unify session lifecycle management.

---

### Phase 2: Backend Security, Validation & Architecture Refactoring

#### 1. Build Dedicated API Validators
- **Goal:** Add input validation files and integrate with controller logic.
- **Key Deliverables:**
  - Create standard validation schema files in `src/validators/`.
  - Build schemas for:
    - **Ledger Queries:** Date filters, pagination offsets, limits.
    - **Withdrawal Requests:** Amount limits, currency checking, destination account validation, PIN presence.
    - **Auth Requests:** Credentials format, password strength rules, MFA tokens.

#### 2. Refactor Controller Files to Use Validators
- **Goal:** Clean up controller files to ensure separation of concerns—controllers handle request flow and response formatting while validation middleware validates payloads before execution.
- **Key Deliverables:**
  - Inject validation middleware prior to executing controller actions.
  - Streamline error handling so schema validation failures yield consistent HTTP 400 response formats:
    ```json
    {
      "success": false,
      "error": "ValidationError",
      "details": [
        { "field": "amount", "message": "Withdrawal amount must be greater than zero." }
      ]
    }
    ```

#### 3. Integration of Rate Limiters with APIs
- **Goal:** Safeguard the application against brute-force attacks, resource exhaustion, and Denial-of-Service (DoS) vectors.
- **Key Deliverables:**
  - Implement targeted rate limiting middleware.
  - Apply granular limits based on endpoint sensitivity:
    - **Strict Rate Limits:** Payout/withdrawal endpoints, transaction PIN confirmation, login/auth attempts (e.g., 5 attempts per minute).
    - **Standard Rate Limits:** Ledger retrieval, general read queries (e.g., 60 requests per minute).
  - Standardize 429 Too Many Requests response format with standard `Retry-After` headers.

---

### Phase 3: General Project Quality, Security & Launch Readiness

#### 1. Page and Component Testing
- **Execution Strategy:**
  - **Unit Testing:** Validate core functions, utilities, and isolated UI components.
  - **Integration Testing:** Test complete user flows (e.g., requesting a withdrawal, verifying API state changes in the ledger).
  - **Edge Case Verification:** Test network latency, failed API responses, invalid form payloads, and session expiration scenarios.

#### 2. Security Validations
- **Audit Checklist:**
  - Verification of authentication headers and token expiration handling.
  - Sanitization of input fields to prevent Cross-Site Scripting (XSS) and SQL Injection.
  - Enforce SSL/TLS for all API communications.

#### 3. Product Walkthrough
- **Deliverables:**
  - Conduct an end-to-end product demonstration covering user onboarding, viewing ledger entries, executing deposits/withdrawals, and administrative/security alerts.
  - Validate UX smoothness, loading indicators, and error feedback across mobile and desktop viewpoints.

#### 4. Summary & Documentation
- **Deliverables:**
  - **Developer Guide:** Documentation on how to run, test v1.
  - **Release Notes:** Concise summary of v1 features, fixed bugs, and performance baseline.

---

## 🗓️ Implementation Action Matrix

| Phase | Component / Module | Key Task | Success Criteria |
| :--- | :--- | :--- | :--- |
| **Frontend** | `/ledger` | Dynamic state & API integration | Paginated, filterable transaction history |
| **Frontend** | `/withdrawals` | Action handlers & payout flows | PIN-verified payout execution with real-time UI feedback |
| **Frontend** | `auth/` Structure | Folder reorganization & migration | Unified session context and clean route protection |
| **Backend** | Validation Layer | Dedicated validator files | Modular schema validation firing before controllers |
| **Backend** | Controllers | Refactor payload handling | Lean controllers focused purely on business logic execution |
| **Backend** | Rate Limiting | Route limiter middleware | Enforced rate caps on sensitive & general API routes |
| **General** | Testing & QA | Component & flow testing | Zero critical bugs on payout/ledger paths |
| **General** | Security Audit | Input, session, & authorization checks | Robust protection against unauthorized access & abuse |
| **General** | Documentation | Final v1 walkthrough & docs | Up-to-date specs, setup guides, and walkthrough materials |