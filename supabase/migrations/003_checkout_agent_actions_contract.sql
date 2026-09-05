create table if not exists agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_session_id uuid references agent_sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  merchant_id uuid references merchants(id) on delete cascade,
  action_type text not null,
  requested_payload jsonb not null default '{}',
  decision_summary text not null,
  risk_level text not null default 'LOW' check (risk_level in ('LOW','MEDIUM','HIGH')),
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

alter table agent_actions add column if not exists agent_session_id uuid references agent_sessions(id) on delete cascade;
alter table agent_actions add column if not exists user_id uuid references profiles(id) on delete set null;
alter table agent_actions add column if not exists merchant_id uuid references merchants(id) on delete cascade;
alter table agent_actions add column if not exists action_type text;
alter table agent_actions add column if not exists requested_payload jsonb not null default '{}';
alter table agent_actions add column if not exists decision_summary text;
alter table agent_actions add column if not exists risk_level text not null default 'LOW';
alter table agent_actions add column if not exists requires_approval boolean not null default false;
alter table agent_actions add column if not exists approval_status text not null default 'NOT_REQUIRED';
alter table agent_actions add column if not exists approved_by uuid references profiles(id) on delete set null;
alter table agent_actions add column if not exists approved_at timestamptz;
alter table agent_actions add column if not exists execution_status text not null default 'PROPOSED';
alter table agent_actions add column if not exists execution_result jsonb not null default '{}';
alter table agent_actions add column if not exists idempotency_key text;
alter table agent_actions add column if not exists created_at timestamptz not null default now();
alter table agent_actions add column if not exists updated_at timestamptz not null default now();

create index if not exists agent_actions_idempotency_repair_idx on agent_actions(idempotency_key);
create index if not exists agent_actions_user_id_idx on agent_actions(user_id);
create index if not exists agent_actions_merchant_id_idx on agent_actions(merchant_id);
