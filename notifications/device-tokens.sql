-- CiaraLink — device push-token store
-- Run once in the Supabase SQL editor (project txcndwunbwuexasqtrow).
-- Backs /api/register-push-token and any push-sending job.

create table if not exists public.device_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null default 'unknown'
              check (platform in ('ios','android','web','unknown')),
  role        text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

-- RLS: only the service role (used by the serverless endpoint) reads/writes.
-- No anon/auth client should ever touch this table directly.
alter table public.device_tokens enable row level security;

-- (No permissive policies = locked to service role, which bypasses RLS.)
-- A user may delete their own tokens (sign-out cleanup) if you later add a
-- client path; uncomment to allow it:
-- create policy device_tokens_owner_delete on public.device_tokens
--   for delete using (auth.uid() = user_id);
