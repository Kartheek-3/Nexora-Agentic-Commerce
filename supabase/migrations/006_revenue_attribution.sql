alter table recommendations
add column if not exists status text not null default 'proposed';

alter table recommendations
add column if not exists accepted_at timestamptz;

alter table recommendations
add column if not exists accepted_price_inr integer;

alter table recommendations
add column if not exists realized_order_id uuid references orders(id) on delete set null;

alter table recommendations
add column if not exists realized_payment_id uuid references payments(id) on delete set null;

alter table recommendations
add column if not exists realized_revenue_inr integer not null default 0;

create index if not exists idx_recommendations_agent_status
on recommendations(agent_session_id, recommendation_type, status);

create index if not exists idx_recommendations_realized_order
on recommendations(realized_order_id)
where realized_order_id is not null;

create table if not exists recovery_attempts (
    id uuid primary key default gen_random_uuid(),
    merchant_id uuid references merchants(id) on delete set null,
    customer_id uuid references customers(id) on delete set null,
    agent_session_id uuid references agent_sessions(id) on delete set null,
    cart_session_id uuid references cart_sessions(id) on delete set null,
    original_order_id uuid references orders(id) on delete set null,
    recovered_order_id uuid references orders(id) on delete set null,
    original_razorpay_order_id text,
    recovered_razorpay_payment_id text,
    failure_reason text,
    status text not null default 'pending',
    recovered_amount_inr integer not null default 0,
    created_at timestamptz default now(),
    recovered_at timestamptz
);

create unique index if not exists idx_recovery_attempts_original_order
on recovery_attempts(original_order_id)
where original_order_id is not null;

create index if not exists idx_recovery_attempts_cart_status
on recovery_attempts(cart_session_id, status);

create table if not exists checkout_funnel_sessions (
    id uuid primary key default gen_random_uuid(),
    merchant_id uuid references merchants(id) on delete set null,
    profile_id uuid references profiles(id) on delete set null,
    agent_session_id uuid references agent_sessions(id) on delete set null,
    channel text not null,
    status text not null default 'started',
    cart_session_id uuid references cart_sessions(id) on delete set null,
    created_at timestamptz default now(),
    converted_at timestamptz,
    abandoned_at timestamptz,
    funnel_key text unique,
    constraint checkout_funnel_channel_check check (channel in ('agent', 'direct')),
    constraint checkout_funnel_status_check check (status in ('started', 'converted', 'abandoned'))
);

create index if not exists idx_checkout_funnel_channel_status
on checkout_funnel_sessions(channel, status, created_at);

create index if not exists idx_checkout_funnel_agent_session
on checkout_funnel_sessions(agent_session_id);
