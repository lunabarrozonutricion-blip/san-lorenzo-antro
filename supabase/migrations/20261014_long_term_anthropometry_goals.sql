-- Planificación de largo plazo de Aplicación SL.
-- Independiente de objective_periods: conserva los objetivos mensuales existentes.
-- Aplicar solo después de revisar y probar en entorno de desarrollo.
create table if not exists public.long_term_anthropometry_goals (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  player_id bigint not null,
  baseline_anthropometry_id bigint,
  baseline_date date,
  target_date date,
  target_muscle_kg numeric,
  target_imo numeric,
  target_z numeric,
  target_adipose_excel_kg numeric,
  target_sum6_equivalent_mm numeric,
  baseline_muscle_kg numeric,
  baseline_imo numeric,
  baseline_z numeric,
  baseline_adipose_excel_kg numeric,
  baseline_sum6_mm numeric,
  created_at timestamptz not null default now(),
  constraint long_term_goal_has_target check (
    target_muscle_kg is not null or target_imo is not null or
    target_z is not null or target_adipose_excel_kg is not null
  ),
  constraint long_term_goal_nonnegative check (
    (target_muscle_kg is null or target_muscle_kg > 0) and
    (target_adipose_excel_kg is null or target_adipose_excel_kg >= 0) and
    (target_sum6_equivalent_mm is null or target_sum6_equivalent_mm >= 0)
  )
);

create index if not exists long_term_goals_owner_player_created_idx
  on public.long_term_anthropometry_goals (owner_id, player_id, created_at desc);

alter table public.long_term_anthropometry_goals enable row level security;

create policy "Read own long-term goals" on public.long_term_anthropometry_goals
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Insert own long-term goals" on public.long_term_anthropometry_goals
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own long-term goals" on public.long_term_anthropometry_goals
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Delete own long-term goals" on public.long_term_anthropometry_goals
  for delete to authenticated using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.long_term_anthropometry_goals to authenticated;
grant usage, select on sequence public.long_term_anthropometry_goals_id_seq to authenticated;
