-- ============================================================
-- Jami' Masjid Noorani — Full Setup (one-run file)
-- Run this once in a fresh Supabase project SQL editor.
-- ============================================================

-- 1) EXTENSIONS
create extension if not exists pgcrypto;

-- 2) TABLES
create table if not exists public.adhkar (
  id               uuid        not null default gen_random_uuid() primary key,
  prayer_time      text        not null,
  title            text        not null,
  arabic_title     text,
  arabic           text        not null,
  transliteration  text,
  translation      text,
  reference        text,
  count            text,
  display_order    integer     not null default 100,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  sections         jsonb,
  group_name       text,
  group_order      integer     not null default 100,
  description      text,
  file_url         text,
  card_color       text,
  content_type     text check (content_type in ('adhkar', 'quran')),
  content_source   text check (content_source in ('db', 'local', 'api')),
  content_key      text,
  card_icon        text,
  card_badge       text
);

create table if not exists public.announcements (
  id           uuid        not null default gen_random_uuid() primary key,
  title        text        not null,
  body         text        not null,
  category     text        not null default 'General',
  is_active    boolean     not null default true,
  pinned       boolean     not null default false,
  published_at timestamptz not null default now(),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.app_settings (
  key        text        not null primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.prayer_times (
  id            uuid        not null default gen_random_uuid() primary key,
  month         integer     not null,
  day           integer     not null,
  fajr          text        not null,
  sunrise       text        not null,
  zuhr          text        not null,
  asr           text        not null,
  maghrib       text        not null,
  isha          text        not null,
  jumu_ah_1     text,
  jumu_ah_2     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  ishraq        text,
  date          text,
  zawaal        text,
  fajr_jamat    text,
  zuhr_jamat    text,
  asr_jamat     text,
  maghrib_jamat text,
  isha_jamat    text,
  unique (month, day)
);

create table if not exists public.push_subscriptions (
  id         uuid        not null default gen_random_uuid() primary key,
  token      text        not null unique,
  platform   text,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sunnah_reminders (
  id            uuid        not null default gen_random_uuid() primary key,
  title         text        not null,
  detail        text,
  reference     text,
  icon          text,
  friday_only   boolean     not null default false,
  display_order integer     not null default 100,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3) INDEXES
create index if not exists idx_adhkar_prayer_active_order
  on public.adhkar (prayer_time, is_active, group_order, display_order);

create index if not exists idx_announcements_active_expires
  on public.announcements (is_active, expires_at, published_at desc);

create index if not exists idx_push_subscriptions_active
  on public.push_subscriptions (is_active);

-- 4) RLS ENABLE
alter table public.adhkar enable row level security;
alter table public.announcements enable row level security;
alter table public.app_settings enable row level security;
alter table public.prayer_times enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.sunnah_reminders enable row level security;

-- 5) DROP EXISTING POLICIES (idempotent)
-- adhkar
drop policy if exists "anon_select_adhkar" on public.adhkar;
drop policy if exists "anon_insert_adhkar" on public.adhkar;
drop policy if exists "anon_update_adhkar" on public.adhkar;
drop policy if exists "anon_delete_adhkar" on public.adhkar;
drop policy if exists "authenticated_select_adhkar" on public.adhkar;
drop policy if exists "authenticated_insert_adhkar" on public.adhkar;
drop policy if exists "authenticated_update_adhkar" on public.adhkar;
drop policy if exists "authenticated_delete_adhkar" on public.adhkar;

-- announcements
drop policy if exists "anon_select_active_announcements" on public.announcements;
drop policy if exists "authenticated_select_announcements" on public.announcements;
drop policy if exists "authenticated_insert_announcements" on public.announcements;
drop policy if exists "authenticated_update_announcements" on public.announcements;
drop policy if exists "authenticated_delete_announcements" on public.announcements;

-- app_settings
drop policy if exists "anon_select_app_settings" on public.app_settings;
drop policy if exists "anon_insert_app_settings" on public.app_settings;
drop policy if exists "anon_update_app_settings" on public.app_settings;
drop policy if exists "anon_delete_app_settings" on public.app_settings;
drop policy if exists "authenticated_select_app_settings" on public.app_settings;
drop policy if exists "authenticated_insert_app_settings" on public.app_settings;
drop policy if exists "authenticated_update_app_settings" on public.app_settings;
drop policy if exists "authenticated_delete_app_settings" on public.app_settings;

-- prayer_times
drop policy if exists "anon_select_prayer_times" on public.prayer_times;
drop policy if exists "anon_insert_prayer_times" on public.prayer_times;
drop policy if exists "anon_update_prayer_times" on public.prayer_times;
drop policy if exists "anon_delete_prayer_times" on public.prayer_times;
drop policy if exists "authenticated_select_prayer_times" on public.prayer_times;
drop policy if exists "authenticated_insert_prayer_times" on public.prayer_times;
drop policy if exists "authenticated_update_prayer_times" on public.prayer_times;
drop policy if exists "authenticated_delete_prayer_times" on public.prayer_times;

-- push_subscriptions
drop policy if exists "anon_select_token" on public.push_subscriptions;
drop policy if exists "anon_insert_token" on public.push_subscriptions;
drop policy if exists "anon_update_token" on public.push_subscriptions;
drop policy if exists "authenticated_select_token" on public.push_subscriptions;
drop policy if exists "authenticated_insert_token" on public.push_subscriptions;
drop policy if exists "authenticated_update_token" on public.push_subscriptions;

-- sunnah_reminders
drop policy if exists "anon_select_sunnah_reminders" on public.sunnah_reminders;
drop policy if exists "anon_insert_sunnah_reminders" on public.sunnah_reminders;
drop policy if exists "anon_update_sunnah_reminders" on public.sunnah_reminders;
drop policy if exists "anon_delete_sunnah_reminders" on public.sunnah_reminders;
drop policy if exists "authenticated_select_sunnah_reminders" on public.sunnah_reminders;
drop policy if exists "authenticated_insert_sunnah_reminders" on public.sunnah_reminders;
drop policy if exists "authenticated_update_sunnah_reminders" on public.sunnah_reminders;
drop policy if exists "authenticated_delete_sunnah_reminders" on public.sunnah_reminders;

-- 6) CREATE POLICIES (safe defaults)
-- adhkar
create policy "anon_select_adhkar"
  on public.adhkar for select to anon using (is_active = true);

create policy "authenticated_select_adhkar"
  on public.adhkar for select to authenticated using (true);

create policy "authenticated_insert_adhkar"
  on public.adhkar for insert to authenticated with check (true);

create policy "authenticated_update_adhkar"
  on public.adhkar for update to authenticated using (true) with check (true);

create policy "authenticated_delete_adhkar"
  on public.adhkar for delete to authenticated using (true);

-- announcements
create policy "anon_select_active_announcements"
  on public.announcements for select to anon
  using (is_active = true and (expires_at is null or expires_at > now()));

create policy "authenticated_select_announcements"
  on public.announcements for select to authenticated using (true);

create policy "authenticated_insert_announcements"
  on public.announcements for insert to authenticated with check (true);

create policy "authenticated_update_announcements"
  on public.announcements for update to authenticated using (true) with check (true);

create policy "authenticated_delete_announcements"
  on public.announcements for delete to authenticated using (true);

-- app_settings
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

-- prayer_times
create policy "anon_select_prayer_times"
  on public.prayer_times for select to anon using (true);

create policy "authenticated_select_prayer_times"
  on public.prayer_times for select to authenticated using (true);

create policy "authenticated_insert_prayer_times"
  on public.prayer_times for insert to authenticated with check (true);

create policy "authenticated_update_prayer_times"
  on public.prayer_times for update to authenticated using (true) with check (true);

create policy "authenticated_delete_prayer_times"
  on public.prayer_times for delete to authenticated using (true);

-- push_subscriptions
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

-- sunnah_reminders
create policy "anon_select_sunnah_reminders"
  on public.sunnah_reminders for select to anon using (is_active = true);

create policy "authenticated_select_sunnah_reminders"
  on public.sunnah_reminders for select to authenticated using (true);

create policy "authenticated_insert_sunnah_reminders"
  on public.sunnah_reminders for insert to authenticated with check (true);

create policy "authenticated_update_sunnah_reminders"
  on public.sunnah_reminders for update to authenticated using (true) with check (true);

create policy "authenticated_delete_sunnah_reminders"
  on public.sunnah_reminders for delete to authenticated using (true);

-- 7) UPDATED_AT TRIGGER FUNCTION + TRIGGERS
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_adhkar on public.adhkar;
create trigger set_updated_at_adhkar
  before update on public.adhkar
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at_announcements on public.announcements;
create trigger set_updated_at_announcements
  before update on public.announcements
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at_prayer_times on public.prayer_times;
create trigger set_updated_at_prayer_times
  before update on public.prayer_times
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at_push_subscriptions on public.push_subscriptions;
create trigger set_updated_at_push_subscriptions
  before update on public.push_subscriptions
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at_sunnah_reminders on public.sunnah_reminders;
create trigger set_updated_at_sunnah_reminders
  before update on public.sunnah_reminders
  for each row execute function public.handle_updated_at();
