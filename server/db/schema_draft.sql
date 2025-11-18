
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. user
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 2. group
CREATE TABLE IF NOT EXISTS "group" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    rule_template TEXT,
    approvals_required INT,
    approvals_cap INT,
    created_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 3. group_membership
CREATE TABLE IF NOT EXISTS group_membership (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role_in_group TEXT NOT NULL CHECK (role_in_group IN ('OWNER', 'TREASURER', 'MEMBER')),
    joined_at TIMESTAMP DEFAULT now() NOT NULL,
    UNIQUE (group_id, user_id)
);

-- 4. account (group wallet)
CREATE TABLE IF NOT EXISTS account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    virtual_account_number TEXT NOT NULL,
    provider_ref TEXT,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 5. ledger_entry
CREATE TABLE IF NOT EXISTS ledger_entry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    amount_kobo INT NOT NULL CHECK (amount_kobo >= 0),
    currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
    source TEXT CHECK (source IN ('demo', 'provider_sandbox', 'payout')),
    reference TEXT UNIQUE NOT NULL,
    simulated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 6. withdrawal_request
CREATE TABLE IF NOT EXISTS withdrawal_request (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    amount_kobo INT NOT NULL CHECK (amount_kobo > 0),
    beneficiary JSONB NOT NULL,
    reason TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    requested_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 7. approval
CREATE TABLE IF NOT EXISTS approval (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    withdrawal_id UUID NOT NULL REFERENCES withdrawal_request(id) ON DELETE CASCADE,
    approver_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now() NOT NULL,
    UNIQUE (withdrawal_id, approver_user_id)
);

-- 8. webhook_event (placeholder)
CREATE TABLE IF NOT EXISTS webhook_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    raw_payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- 9. Tweaks and fixes

-- a) Tighten group rule fields
ALTER TABLE "group"
  ALTER COLUMN rule_template SET DEFAULT 'two_officer',
  ALTER COLUMN approvals_required SET DEFAULT 2,
  ALTER COLUMN approvals_cap SET DEFAULT 3;

ALTER TABLE "group"
  ADD CONSTRAINT chk_group_approvals_required CHECK (approvals_required >= 1),
  ADD CONSTRAINT chk_group_approvals_cap CHECK (approvals_cap IS NULL OR approvals_cap >= approvals_required);

-- b) Ensure VA numbers are unique
ALTER TABLE account
  ADD CONSTRAINT uq_account_virtual_account UNIQUE (virtual_account_number);

-- c) Add contributor to ledger (nullable)
ALTER TABLE ledger_entry
  ADD COLUMN user_id UUID NULL REFERENCES "user"(id);

-- d) A few pragmatic indexes
CREATE INDEX idx_le_group ON ledger_entry(group_id);
CREATE INDEX idx_le_group_type ON ledger_entry(group_id, type);
CREATE INDEX idx_wr_group_status ON withdrawal_request(group_id, status);
CREATE INDEX idx_gm_group ON group_membership(group_id);

-- e) Nice-to-have defaults
ALTER TABLE withdrawal_request
  ALTER COLUMN status SET DEFAULT 'PENDING';


-- Derived balance per group wallet (CREDIT - DEBIT)
CREATE OR REPLACE VIEW vw_group_balance AS
SELECT
  g.id AS group_id,
  COALESCE(SUM(CASE WHEN le.type='CREDIT' THEN le.amount_kobo ELSE -le.amount_kobo END), 0) AS balance_kobo
FROM "group" g
LEFT JOIN ledger_entry le ON le.group_id = g.id
GROUP BY g.id;


-- *View: Member Contribution Totals (only when user_id exists)*

-- Total contributions per member per group
CREATE OR REPLACE VIEW vw_member_contributions AS
SELECT
  le.group_id,
  le.user_id,
  COALESCE(SUM(CASE WHEN le.type='CREDIT' THEN le.amount_kobo ELSE 0 END), 0) AS total_contributed_kobo
FROM ledger_entry le
WHERE le.user_id IS NOT NULL
GROUP BY le.group_id, le.user_id;

-- *Add one more practical index*
CREATE INDEX idx_account_group ON account(group_id);


-- *Create transaction_pins table*
CREATE TABLE IF NOT EXISTS transaction_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  recovery_token_hash TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);