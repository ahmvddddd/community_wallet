# DB SCHEMA


```

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------------------------
-- 1. USER TABLES (foundation)
------------------------------------------------------------
CREATE TABLE public."user" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  event text NOT NULL,
  ip_address text,
  device_info text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_activity_log_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public."user"(id)
);

CREATE TABLE public.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  device_info text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  revoked boolean DEFAULT false,
  replaced_by uuid,
  CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public."user"(id)
);

CREATE TABLE public.transaction_pins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  recovery_token_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT transaction_pins_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public."user"(id)
);

------------------------------------------------------------
-- 2. GROUPS & MEMBERSHIPS
------------------------------------------------------------
CREATE TABLE public."group" (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  rule_template text DEFAULT 'two_officer',
  approvals_required integer DEFAULT 2 CHECK (approvals_required >= 1),
  approvals_cap integer DEFAULT 3,
  created_by uuid NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  public_read_token text UNIQUE,
  CONSTRAINT group_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public."user"(id)
);

CREATE TABLE public.group_membership (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_in_group text NOT NULL CHECK (
    role_in_group = ANY (ARRAY['OWNER', 'TREASURER', 'MEMBER'])
  ),
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_membership_group_id_fkey FOREIGN KEY (group_id)
    REFERENCES public."group"(id),
  CONSTRAINT group_membership_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public."user"(id)
);

------------------------------------------------------------
-- 3. WITHDRAWALS & DEPENDENCIES
------------------------------------------------------------
CREATE TABLE public.withdrawal_request (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  amount_kobo integer NOT NULL CHECK (amount_kobo > 0),
  beneficiary jsonb NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status = ANY (ARRAY['PENDING','APPROVED','DECLINED','PAID'])),
  requested_by uuid NOT NULL,
  expires_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  executed_at timestamp with time zone,
  CONSTRAINT withdrawal_request_group_id_fkey FOREIGN KEY (group_id)
    REFERENCES public."group"(id),
  CONSTRAINT withdrawal_request_requested_by_fkey FOREIGN KEY (requested_by)
    REFERENCES public."user"(id)
);

------------------------------------------------------------
-- 4. ACCOUNTS (VIRTUAL ACCOUNTS)
------------------------------------------------------------
CREATE TABLE public.account (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  virtual_account_number text NOT NULL UNIQUE,
  provider_ref text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  provider text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','active','failed'])),
  bank_name text NOT NULL DEFAULT 'Wema Bank',
  CONSTRAINT account_group_id_fkey FOREIGN KEY (group_id)
    REFERENCES public."group"(id)
);

CREATE TABLE public.account_metadata (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid NOT NULL,
  provider text NOT NULL,
  raw_payload jsonb NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_metadata_account_id_fkey FOREIGN KEY (account_id)
    REFERENCES public.account(id)
);

------------------------------------------------------------
-- 5. LEDGER
------------------------------------------------------------
CREATE TABLE public.ledger_entry (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  account_id uuid NOT NULL,
  user_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['CREDIT','DEBIT'])),
  amount_kobo integer NOT NULL CHECK (amount_kobo >= 0),
  currency text NOT NULL DEFAULT 'NGN'
    CHECK (currency = 'NGN'),
  source text CHECK (
    source = ANY (ARRAY['demo','provider_sandbox','payout'])
  ),
  reference text NOT NULL UNIQUE,
  simulated boolean DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  payment_channel text DEFAULT 'VA',
  rule_status text DEFAULT 'VALID',
  client_ref text UNIQUE,
  CONSTRAINT ledger_entry_group_id_fkey FOREIGN KEY (group_id)
    REFERENCES public."group"(id),
  CONSTRAINT ledger_entry_account_id_fkey FOREIGN KEY (account_id)
    REFERENCES public.account(id),
  CONSTRAINT ledger_entry_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public."user"(id)
);

------------------------------------------------------------
-- 6. PAYOUTS
------------------------------------------------------------
CREATE TABLE public.payout (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  withdrawal_id uuid NOT NULL,
  provider text NOT NULL,
  amount_kobo integer NOT NULL CHECK (amount_kobo > 0),
  beneficiary jsonb NOT NULL,
  status text NOT NULL CHECK (
    status = ANY (ARRAY['PENDING','SUCCESS','FAILED'])
  ),
  provider_payload jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_withdrawal_id_fkey FOREIGN KEY (withdrawal_id)
    REFERENCES public.withdrawal_request(id)
);

CREATE TABLE public.payout_recovery (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  withdrawal_id uuid NOT NULL,
  attempted_payload jsonb,
  error_message text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_recovery_withdrawal_id_fkey FOREIGN KEY (withdrawal_id)
    REFERENCES public.withdrawal_request(id)
);

------------------------------------------------------------
-- 7. APPROVALS
------------------------------------------------------------
CREATE TABLE public.approval (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  withdrawal_id uuid NOT NULL,
  approver_user_id uuid NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT approval_withdrawal_id_fkey FOREIGN KEY (withdrawal_id)
    REFERENCES public.withdrawal_request(id),
  CONSTRAINT approval_approver_user_id_fkey FOREIGN KEY (approver_user_id)
    REFERENCES public."user"(id)
);

------------------------------------------------------------
-- 8. WEBHOOK EVENTS
------------------------------------------------------------
CREATE TABLE public.webhook_event (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type text NOT NULL,
  raw_payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- 9. VIRTUAL ACCOUNT RECOVERY & REQUESTS
------------------------------------------------------------
CREATE TABLE public.va_request (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  provider text NOT NULL,
  client_ref text NOT NULL,
  status text NOT NULL CHECK (
    status = ANY (ARRAY['pending','success','failed'])
  ),
  last_error text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT va_request_group_id_fkey FOREIGN KEY (group_id)
    REFERENCES public."group"(id)
);

CREATE TABLE public.va_recovery (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_ref text NOT NULL,
  group_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'flutterwave',
  raw_payload jsonb NOT NULL,
  error_message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  last_retry_at timestamp without time zone,
  retry_count integer NOT NULL DEFAULT 0,
  CONSTRAINT va_recovery_group_id_fkey FOREIGN KEY (group_id)
    REFERENCES public."group"(id)
);


```