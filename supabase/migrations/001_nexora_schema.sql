create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text unique not null,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table merchants (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  razorpay_account_mode text not null default 'test',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_profile_id, name)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  sku text unique not null,
  name text not null,
  description text not null,
  category text not null,
  price_inr integer not null check (price_inr > 0),
  inventory integer not null check (inventory >= 0),
  attributes jsonb not null default '{}',
  intent_matches text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(merchant_id, email)
);

create table agent_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  intent jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  agent_session_id uuid references agent_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table cart_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_session_id uuid references cart_sessions(id) on delete cascade,
  product_id uuid references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_inr integer not null check (unit_price_inr > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  cart_session_id uuid references cart_sessions(id) on delete set null,
  razorpay_order_id text unique,
  total_inr integer not null check (total_inr >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_inr integer not null check (unit_price_inr > 0),
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  razorpay_payment_id text unique,
  razorpay_order_id text,
  amount_inr integer not null,
  status text not null,
  failure_reason text,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  agent_session_id uuid references agent_sessions(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  recommendation_type text not null,
  decision_summary text not null,
  confidence numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create table agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_session_id uuid references agent_sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  merchant_id uuid references merchants(id) on delete cascade,
  action_type text not null,
  requested_payload jsonb not null default '{}',
  decision_summary text not null,
  risk_level text not null check (risk_level in ('LOW','MEDIUM','HIGH')),
  requires_approval boolean not null default false,
  approval_status text not null default 'NOT_REQUIRED',
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  execution_status text not null default 'PROPOSED',
  execution_result jsonb not null default '{}',
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  agent_session_id uuid references agent_sessions(id) on delete set null,
  actor_type text not null,
  actor_id text,
  event_type text not null,
  description text not null,
  input_data jsonb not null default '{}',
  output_data jsonb not null default '{}',
  reason_summary text not null,
  risk_level text not null default 'LOW',
  authorization_status text not null default 'NOT_REQUIRED',
  status text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  prompt text not null,
  audience jsonb not null default '{}',
  message text not null,
  estimated_recovery_inr int4range,
  approval_status text not null default 'AWAITING_APPROVAL',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table merchant_guardrails (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade unique,
  maximum_transaction_value integer not null default 10000,
  maximum_discount_percentage numeric(5,2) not null default 15,
  maximum_campaign_spend integer not null default 25000,
  allow_ai_cart_editing boolean not null default true,
  allow_ai_upselling boolean not null default true,
  allow_ai_cross_selling boolean not null default true,
  allow_automatic_campaign_generation boolean not null default true,
  allow_automatic_campaign_sending boolean not null default false,
  require_payment_authorization boolean not null default true,
  maximum_recommended_cart_value integer not null default 8000,
  allowed_product_categories text[] not null default '{}',
  allowed_agent_tools text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_merchant_category_idx on products(merchant_id, category);
create index products_intent_matches_idx on products using gin(intent_matches);
create index audit_logs_merchant_created_idx on audit_logs(merchant_id, created_at desc);
create index agent_actions_idempotency_idx on agent_actions(idempotency_key);
create index orders_merchant_status_idx on orders(merchant_id, status);
