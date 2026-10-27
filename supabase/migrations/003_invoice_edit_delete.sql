-- Lets signed-in users edit and delete invoices. Run once in Supabase → SQL Editor.
-- Safe to re-run.

alter table public.invoices add column if not exists updated_at timestamptz;
alter table public.invoices add column if not exists updated_by_email text;

-- On edit: keep the invoice's identity (number, date, GST rate, creator) and
-- recompute the tax split from the new total, the same way as on insert.
create or replace function public.recalc_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tax numeric(10,2);
begin
  new.invoice_no       := old.invoice_no;
  new.invoice_date     := old.invoice_date;
  new.gst_rate         := old.gst_rate;
  new.tax_type         := old.tax_type;
  new.sac_code         := old.sac_code;
  new.created_by       := old.created_by;
  new.created_by_email := old.created_by_email;
  new.created_at       := old.created_at;

  new.taxable_value := round(new.total_amount / (1 + new.gst_rate / 100), 2);
  tax               := new.total_amount - new.taxable_value;
  if new.tax_type = 'IGST' then
    new.igst := tax;  new.cgst := 0;  new.sgst := 0;
  else
    new.cgst := round(tax / 2, 2);  new.sgst := tax - new.cgst;  new.igst := 0;
  end if;

  new.updated_at       := now();
  new.updated_by_email := auth.jwt() ->> 'email';
  return new;
end;
$$;

drop trigger if exists invoices_recalc on public.invoices;
create trigger invoices_recalc
  before update on public.invoices
  for each row execute function public.recalc_invoice();

grant update, delete on public.invoices to authenticated;

drop policy if exists "signed in update" on public.invoices;
create policy "signed in update" on public.invoices for update to authenticated using (true) with check (true);

drop policy if exists "signed in delete" on public.invoices;
create policy "signed in delete" on public.invoices for delete to authenticated using (true);
