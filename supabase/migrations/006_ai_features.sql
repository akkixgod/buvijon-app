-- Migration 006: AI features
-- 1. child_insights — per-child weekly summary cache
-- 2. app_classifications — shared LLM-classified app categories + risk levels

-- ============================================================
-- 1. CHILD WEEKLY INSIGHTS
-- ============================================================

create table if not exists child_insights (
  child_id      uuid not null references children(id) on delete cascade,
  week_start    date not null,
  summary       text not null,
  recommendation text not null,
  trend         text not null check (trend in ('improving','worsening','stable')),
  generated_at  timestamptz not null default now(),
  primary key (child_id, week_start)
);

create index if not exists idx_child_insights_recent
  on child_insights(child_id, week_start desc);

alter table child_insights enable row level security;

drop policy if exists "Parents read own children insights" on child_insights;
create policy "Parents read own children insights" on child_insights
  for select using (
    exists (
      select 1 from children c
      where c.id = child_insights.child_id and c.parent_id = auth.uid()
    )
  );

-- Direct INSERT/UPDATE blocked — only via service-role Edge Function.
drop policy if exists "No direct insert insights" on child_insights;
create policy "No direct insert insights" on child_insights
  for insert with check (false);

drop policy if exists "No direct update insights" on child_insights;
create policy "No direct update insights" on child_insights
  for update using (false);

-- ============================================================
-- 2. APP CLASSIFICATIONS (shared cache)
-- ============================================================

create table if not exists app_classifications (
  app_name      text primary key,
  display_name  text not null,
  category      text not null check (category in (
    'social','game','video','education','messenger','browser','utility','other'
  )),
  risk_level    text not null check (risk_level in ('low','medium','high')),
  reasoning     text,
  classified_at timestamptz not null default now()
);

alter table app_classifications enable row level security;

drop policy if exists "All authed users read classifications" on app_classifications;
create policy "All authed users read classifications" on app_classifications
  for select using (auth.role() = 'authenticated');

drop policy if exists "No direct insert classifications" on app_classifications;
create policy "No direct insert classifications" on app_classifications
  for insert with check (false);

drop policy if exists "No direct update classifications" on app_classifications;
create policy "No direct update classifications" on app_classifications
  for update using (false);
