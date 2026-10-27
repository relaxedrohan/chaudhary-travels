-- Adds a free-text name to buses (e.g. "Volvo sleeper"). Run once in Supabase → SQL Editor.
alter table public.buses add column if not exists name text;
