-- Invoice generator schema. Run once in Supabase → SQL Editor.
-- Safe to re-run: every statement is idempotent.

-- ── Tables ──────────────────────────────────────────────────────────────

create table if not exists public.settings (
  id            int primary key default 1 check (id = 1),  -- single row
  business_name text,
  address       text,
  gstin         text,
  state         text,
  gst_rate      numeric(5,2) not null default 5 check (gst_rate between 0 and 28),
  tax_type      text not null default 'CGST_SGST' check (tax_type in ('CGST_SGST', 'IGST')),
  sac_code      text default '9964'
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.buses (
  id            uuid primary key default gen_random_uuid(),
  bus_number    text not null check (length(trim(bus_number)) > 0),
  operator_name text,
  created_at    timestamptz not null default now()
);

create table if not exists public.routes (
  id          uuid primary key default gen_random_uuid(),
  from_place  text not null check (length(trim(from_place)) > 0),
  to_place    text not null check (length(trim(to_place)) > 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.invoice_counters (
  day      date primary key,
  last_no  int not null
);

create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  invoice_no       text not null unique,
  invoice_date     date not null,
  customer_name    text not null check (length(trim(customer_name)) > 0),
  customer_phone   text not null check (customer_phone ~ '^\d{10}$'),
  total_amount     numeric(10,2) not null check (total_amount > 0),
  -- Trip details are copied as text so later bus/route edits never change old invoices.
  bus_number       text,
  operator_name    text,
  route_from       text,
  route_to         text,
  travel_date      date,
  seat_no          text,
  -- Filled by the trigger below; anything the client sends is overwritten.
  gst_rate         numeric(5,2) not null,
  tax_type         text not null,
  sac_code         text,
  taxable_value    numeric(10,2) not null,
  cgst             numeric(10,2) not null,
  sgst             numeric(10,2) not null,
  igst             numeric(10,2) not null,
  created_by       uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at       timestamptz not null default now()
);

create index if not exists invoices_created_at_idx on public.invoices (created_at desc);
create index if not exists invoices_invoice_date_idx on public.invoices (invoice_date);

-- ── Invoice number + GST trigger ────────────────────────────────────────

create or replace function public.prepare_invoice()
returns trigger
language plpgsql
security definer          -- needs settings + counters regardless of the caller's RLS
set search_path = public
as $$
declare
  s     public.settings;
  d     date := (now() at time zone 'Asia/Kolkata')::date;
  n     int;
  tax   numeric(10,2);
begin
  select * into s from public.settings where id = 1;

  -- Atomic per-day counter: concurrent inserts can't get the same number.
  insert into public.invoice_counters (day, last_no) values (d, 1)
  on conflict (day) do update set last_no = invoice_counters.last_no + 1
  returning last_no into n;

  new.invoice_date := d;
  new.invoice_no   := to_char(d, 'DDMMYYYY') || '-' || lpad(n::text, greatest(3, length(n::text)), '0');

  -- Price includes GST: work backwards to the taxable value.
  new.gst_rate      := s.gst_rate;
  new.tax_type      := s.tax_type;
  new.sac_code      := s.sac_code;
  new.taxable_value := round(new.total_amount / (1 + s.gst_rate / 100), 2);
  tax               := new.total_amount - new.taxable_value;
  if s.tax_type = 'IGST' then
    new.igst := tax;  new.cgst := 0;  new.sgst := 0;
  else
    new.cgst := round(tax / 2, 2);  new.sgst := tax - new.cgst;  new.igst := 0;
  end if;

  new.created_by       := auth.uid();
  new.created_by_email := auth.jwt() ->> 'email';
  new.created_at       := now();
  return new;
end;
$$;

drop trigger if exists invoices_prepare on public.invoices;
create trigger invoices_prepare
  before insert on public.invoices
  for each row execute function public.prepare_invoice();

-- ── Access: signed-in users only (tightened further in 004_hardening.sql) ──

alter table public.settings         enable row level security;
alter table public.buses            enable row level security;
alter table public.routes           enable row level security;
alter table public.invoices         enable row level security;
alter table public.invoice_counters enable row level security;  -- no policies: trigger only

revoke all on public.settings, public.buses, public.routes, public.invoices, public.invoice_counters
  from anon, authenticated;

grant select, insert, update         on public.settings to authenticated;
grant select, insert, update, delete on public.buses    to authenticated;
grant select, insert, update, delete on public.routes   to authenticated;
-- update/delete are granted here too, so re-running this file never strips them;
-- the row policies that allow edits and deletes come from 003/004.
grant select, insert, update, delete on public.invoices to authenticated;

drop policy if exists "signed in" on public.settings;
create policy "signed in" on public.settings for all to authenticated using (true) with check (true);

drop policy if exists "signed in" on public.buses;
create policy "signed in" on public.buses for all to authenticated using (true) with check (true);

drop policy if exists "signed in" on public.routes;
create policy "signed in" on public.routes for all to authenticated using (true) with check (true);

drop policy if exists "signed in read" on public.invoices;
create policy "signed in read" on public.invoices for select to authenticated using (true);

drop policy if exists "signed in insert" on public.invoices;
create policy "signed in insert" on public.invoices for insert to authenticated with check (true);
