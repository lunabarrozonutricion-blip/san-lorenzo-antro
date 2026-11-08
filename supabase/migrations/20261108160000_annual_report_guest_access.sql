-- Acceso invitado: solo la Edge Function (service_role) puede leer este registro.
-- Nunca otorgar SELECT/EXECUTE a anon ni authenticated.
create table if not exists public.annual_report_guest_access (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 password_salt text not null,
 password_hash text not null,
 enabled boolean not null default true,
 failed_attempts integer not null default 0,
 locked_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.annual_report_guest_access enable row level security;
revoke all on public.annual_report_guest_access from public, anon, authenticated;
-- No policies: service_role bypasses RLS only inside server-side Edge Function.
