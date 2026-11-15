# Manual database setup (for the Supabase SQL Editor)

These files are the same SQL as `supabase/migrations/`, cut into small pieces so each one can be copied and pasted on a phone or iPad.

Run them **in order** in the Supabase SQL Editor (+ New → paste → Run), waiting for "Success" each time:

1. `01-helpers.sql`
2. `02-catalogue-tables.sql`
3. `03-personal-tables.sql`
4. `04-history-tables.sql`
5. `05-security-rules.sql`
6. `06-grants-and-photos.sql`
7. `07-seed-tools.sql`
8. `08-one-row-per-wax-and-tool.sql`

Files 01–06 joined together are exactly `20261115000000_initial_schema.sql`. Run them only once, on an empty project. If you use `npx supabase db push` instead, skip this folder.
