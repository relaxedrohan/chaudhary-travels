-- Production hardening. Run once in Supabase → SQL Editor (after 001–003).
-- Safe to re-run.

-- ── 1. Only real staff accounts, never anonymous sessions ───────────────
-- Supabase gives anonymous sign-ins the `authenticated` role too. If that
-- setting were ever switched on, `using (true)` would let anyone in.
create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['settings', 'buses', 'routes'] loop
    execute format('drop policy if exists "signed in" on public.%I', t);
    execute format('drop policy if exists "staff" on public.%I', t);
    execute format(
      'create policy "staff" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

drop policy if exists "signed in read"   on public.invoices;
drop policy if exists "signed in insert" on public.invoices;
drop policy if exists "signed in update" on public.invoices;
drop policy if exists "signed in delete" on public.invoices;
drop policy if exists "staff" on public.invoices;
create policy "staff" on public.invoices for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.invoices to authenticated;

-- ── 2. History: keep the old version of every edited or deleted invoice ──
create table if not exists public.invoice_history (
  id         bigserial primary key,
  invoice_id uuid not null,
  action     text not null check (action in ('update', 'delete')),
  old_row    jsonb not null,
  changed_by text,
  changed_at timestamptz not null default now()
);
create index if not exists invoice_history_invoice_idx on public.invoice_history (invoice_id);
alter table public.invoice_history enable row level security;  -- no policies: dashboard only
revoke all on public.invoice_history from anon, authenticated;

create or replace function public.log_invoice_change()
returns trigger
language plpgsql
security definer          -- staff can't write the history table directly
set search_path = ''
as $$
begin
  insert into public.invoice_history (invoice_id, action, old_row, changed_by)
  values (old.id, lower(tg_op), to_jsonb(old), auth.jwt() ->> 'email');
  return null;
end;
$$;

drop trigger if exists invoices_history on public.invoices;
create trigger invoices_history
  after update or delete on public.invoices
  for each row execute function public.log_invoice_change();

-- ── 3. Trigger functions are not callable by clients ────────────────────
revoke execute on function public.prepare_invoice()    from public, anon, authenticated;
revoke execute on function public.recalc_invoice()     from public, anon, authenticated;
revoke execute on function public.log_invoice_change() from public, anon, authenticated;
-- recalc_invoice only reads OLD/NEW; it doesn't need owner rights.
alter function public.recalc_invoice() security invoker;

-- ── 4. Settings: the database enforces what the app validates ──────────
do $$
begin
  alter table public.settings add constraint settings_gstin_format
    check (gstin is null or gstin ~ '^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$') not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.settings add constraint settings_sac_format
    check (sac_code is null or sac_code ~ '^\d{4,8}$') not valid;
exception when duplicate_object then null;
end $$;

-- ── 5. One row per route direction, whatever the capitals ──────────────
do $$
begin
  create unique index if not exists routes_direction_unique
    on public.routes (lower(trim(from_place)), lower(trim(to_place)));
exception when unique_violation then
  raise notice 'Duplicate routes exist; remove them in the Table Editor, then re-run this file.';
end $$;
