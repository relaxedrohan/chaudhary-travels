# Invoice generator

Bus ticket invoices with GST. Next.js static site on GitHub Pages, data in Supabase.

## Setup

1. **Supabase** — create a free project, then:
   - SQL Editor → run each file in [`supabase/migrations`](supabase/migrations), in order
     (`001` → `004`). Choose *Run without limit* if asked. Every file is safe to re-run.
   - Authentication → Sign In / Providers → turn off **Allow new users to sign up**.
   - Authentication → Users → **Add user** for each person (email + password, tick *Auto confirm*).
2. **Local** — copy `.env.example` to `.env.local`, fill in the project URL and publishable key
   (Project Settings → API), then `npm install && npm run dev`.
3. **GitHub Pages** — in the repo: Settings → Pages → Source: **GitHub Actions**.
   Settings → Secrets → Actions: add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
   Push to `main` to deploy.

## Export for the CA

Invoices → pick a date range → **Export CSV**. The file has the GST split for every invoice
in that range.

## Invoice history

Every edit and delete keeps the previous version in the `invoice_history` table
(Table Editor, dashboard only), with who changed it and when.

## Notes

- Invoice numbers are `DDMMYYYY-NNN` (IST), restarting at 001 each day.
- GST is worked back from the ticket price using the rate in Settings at the time of saving.
- Edits keep the invoice number, date and original GST rate; a new price re-splits the GST.
- Only signed-in staff can read or change data; anonymous sessions are refused by the database.
