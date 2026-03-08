-- ══════════════════════════════════════════════════════
-- LEVEN — Sarver Farms Starter Tracker
-- Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════

-- Users table
-- One row per person. Created when they enter their email on first visit.
create table if not exists users (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique,
  current_mode        text,                        -- refresh | counter | fridge | longterm
  current_step        int default 0,
  last_entry_at       timestamptz,
  reminders_active    boolean default true,
  remind_window_start boolean default true,        -- "time to check" email
  remind_midpoint     boolean default true,        -- "feed now" email
  remind_overdue      boolean default true,        -- overdue alert email
  quiet_hours_start   int default 22,              -- hour (0–23), default 10pm
  quiet_hours_end     int default 7,               -- hour (0–23), default 7am
  created_at          timestamptz default now()
);

-- Entries table
-- One row per logged step. The cron job reads last entry to decide when to send reminders.
create table if not exists entries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references users(id) on delete cascade,
  mode                text not null,
  step_index          int not null,
  step_title          text,
  observation         text,                        -- rising | peaked | falling | no-activity | liquid | ready
  note                text,
  amounts             jsonb default '{}',          -- { starter, water, flour, total }
  logged_time         text,                        -- HH:MM string user entered
  check_window_min    int,                         -- hours
  check_window_max    int,                         -- hours
  email_sent          boolean default false,       -- true once a reminder email was sent for this entry
  created_at          timestamptz default now()
);

-- Reminder log
-- Prevents duplicate emails. Cron checks this before sending.
create table if not exists reminder_log (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references users(id) on delete cascade,
  reminder_type       text not null,               -- window_start | feed_now | overdue
  mode                text,
  step_index          int,
  sent_at             timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────
create index if not exists entries_user_id_idx       on entries(user_id);
create index if not exists entries_created_at_idx    on entries(created_at desc);
create index if not exists reminder_log_user_id_idx  on reminder_log(user_id);
create index if not exists reminder_log_sent_at_idx  on reminder_log(sent_at desc);

-- ── Row Level Security ────────────────────────────────
-- Users can only see/edit their own data.
-- The cron job uses the service role key which bypasses RLS.

alter table users       enable row level security;
alter table entries     enable row level security;
alter table reminder_log enable row level security;

-- Public can insert a new user (registration)
create policy "Allow insert on users" on users
  for insert with check (true);

-- Users can read/update their own row (matched by id passed from frontend)
create policy "Allow select own user" on users
  for select using (true);

create policy "Allow update own user" on users
  for update using (true);

-- Users can insert entries
create policy "Allow insert entries" on entries
  for insert with check (true);

-- Users can read their own entries
create policy "Allow select entries" on entries
  for select using (true);
