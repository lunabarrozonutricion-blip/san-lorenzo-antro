-- Preparación del Informe Anual compartido (no habilita acceso público).
-- Los invitados nunca consultarán esta tabla directamente: se servirá una
-- representación limitada mediante una función autenticada por clave.
create table if not exists public.annual_report_notes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_year integer not null check (report_year between 2020 and 2100),
  interventions text not null default '',
  conclusions text not null default '',
  updated_at timestamptz not null default now(),
  primary key (owner_id, report_year)
);
alter table public.annual_report_notes enable row level security;
revoke all on public.annual_report_notes from anon;
grant select, insert, update, delete on public.annual_report_notes to authenticated;
create policy "annual_report_notes_owner_select" on public.annual_report_notes
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "annual_report_notes_owner_insert" on public.annual_report_notes
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "annual_report_notes_owner_update" on public.annual_report_notes
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "annual_report_notes_owner_delete" on public.annual_report_notes
  for delete to authenticated using (owner_id = (select auth.uid()));
-- La clave se verificará exclusivamente en el servidor, con hash y límites
-- de intentos. Nunca se guardará en localStorage ni en código cliente.
