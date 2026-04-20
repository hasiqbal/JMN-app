create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  key text not null primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid() primary key,
  token text not null unique,
  platform text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_active
  on public.push_subscriptions (is_active);

alter table public.app_settings enable row level security;
alter table public.push_subscriptions enable row level security;

-- app_settings policies
drop policy if exists "anon_select_app_settings" on public.app_settings;
drop policy if exists "authenticated_select_app_settings" on public.app_settings;
drop policy if exists "authenticated_insert_app_settings" on public.app_settings;
drop policy if exists "authenticated_update_app_settings" on public.app_settings;
drop policy if exists "authenticated_delete_app_settings" on public.app_settings;

create policy "anon_select_app_settings"
  on public.app_settings for select to anon using (true);

create policy "authenticated_select_app_settings"
  on public.app_settings for select to authenticated using (true);

create policy "authenticated_insert_app_settings"
  on public.app_settings for insert to authenticated with check (true);

create policy "authenticated_update_app_settings"
  on public.app_settings for update to authenticated using (true) with check (true);

create policy "authenticated_delete_app_settings"
  on public.app_settings for delete to authenticated using (true);

-- push_subscriptions policies
drop policy if exists "anon_select_token" on public.push_subscriptions;
drop policy if exists "anon_insert_token" on public.push_subscriptions;
drop policy if exists "anon_update_token" on public.push_subscriptions;
drop policy if exists "authenticated_select_token" on public.push_subscriptions;
drop policy if exists "authenticated_insert_token" on public.push_subscriptions;
drop policy if exists "authenticated_update_token" on public.push_subscriptions;

create policy "anon_select_token"
  on public.push_subscriptions for select to anon using (true);

create policy "anon_insert_token"
  on public.push_subscriptions for insert to anon with check (char_length(token) > 20);

create policy "anon_update_token"
  on public.push_subscriptions for update to anon using (true) with check (char_length(token) > 20);

create policy "authenticated_select_token"
  on public.push_subscriptions for select to authenticated using (true);

create policy "authenticated_insert_token"
  on public.push_subscriptions for insert to authenticated with check (true);

create policy "authenticated_update_token"
  on public.push_subscriptions for update to authenticated using (true) with check (true);

insert into public.app_settings (key, value, updated_at)
values
  ('is_live', 'false', now()),
  ('live_notify_last_sent_ts', '0', now())
on conflict (key) do nothing;
