# My Wax Planner

A brand-neutral cross-country ski waxing planner: glide and grip recommendations from your own wax box, plus a filterable waxing history.

Stack: Next.js (App Router) + Supabase + Vercel.

The full product spec is in [docs/xc-wax-app-spec.md](docs/xc-wax-app-spec.md). Build it phase by phase using the build prompts in the spec's last section.

## What is built so far

**Build prompt 1** — the foundation:

- **Sign in and create an account** (email and password, with Supabase's email confirmation). Every screen except sign-in needs an account.
- **Every table in the spec's Data model**, plus `wax_session_layers` and `wax_session_photos` from the history section, in [`supabase/migrations/`](supabase/migrations/).
- **Row Level Security on every table.** Your skis, wax box, venues, conditions, plans and history are visible only to you. So are any brands and waxes you type in. The shared `tools` and `rules` lists, and the optional shared brand and product catalogue, can be read by anyone signed in and changed by nobody but the seed script.
- **Wax box, built one wax at a time.** *Add a wax* asks for the brand, name, type, temperature range, fluoro status and how much is left; snow types, humidity, iron temperature and notes are under *More details*. A brand you haven't used before asks once whether it rates by air or snow temperature. The wax box lists your waxes by Glide, Grip, Cleaners and Consumables.
- **A private photo bucket** (`session-photos`) for session photos, where each user can only reach their own folder.
- **The tools catalogue**, filled in from the spec's Tools checklist (28 tools).
- **An optional catalogue loader**, `npm run seed`, for loading a shared list of brands and products from CSV. You don't need it: the wax box works without it.
- A placeholder **Today** screen that shows who is signed in and links to the wax box.

## Set up

You need a free [Supabase](https://supabase.com) project and Node.js 22 or later.

1. **Supabase (website):** create a project. Then open **Project Settings → API Keys** and keep the tab open; you need the publishable key and the secret key. The project URL is under **Project Settings → Data API**.
2. **Terminal:** in this folder, install the packages:
   ```bash
   npm install
   ```
3. **Terminal:** make your settings file from the template, then open `.env.local` in a text editor and paste in the URL and the two keys:
   ```bash
   cp .env.example .env.local
   ```
   The secret key can bypass every privacy rule. It stays in `.env.local`, which git ignores. Never share it or commit it.
4. **Terminal:** connect this folder to your Supabase project and create the tables. `link` asks for the project's database password.
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   The project ref is the part of the project URL before `.supabase.co`.
5. **Supabase (website):** open **Authentication → URL Configuration**. Set **Site URL** to where the app runs (`http://localhost:3000` for now), and add `http://localhost:3000/auth/confirm` under **Redirect URLs**. Add your Vercel address in the same two places once you deploy.
6. **Terminal:** start the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, create an account, then tap **Wax box → Add a wax**.

### Deploying to Vercel

**Vercel (website):** import the GitHub repository, and under **Settings → Environment Variables** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do **not** add `SUPABASE_SECRET_KEY` to Vercel: only the seed script uses it, and the seed script runs on your computer.

## Adding waxes

Each wax you add is saved for you alone. The next time you add a wax, brands you've used before are suggested as you type, and adding the same wax twice tells you it's already in your box.

**Air versus snow temperature.** Recommendations compare snow temperatures. If a brand rates its waxes by snow temperature, the range you type is used as it is. If it rates by air temperature, the form also offers a snow-temperature range. The app won't convert air to snow on its own, because the conversion depends on sun, humidity and the night before. Leave the snow range blank if you don't know it: the wax is still saved, the wax box says "no snow range yet", and it won't be recommended until it has one.

Temperatures are entered in °C for now.

## The optional catalogue CSVs

You can skip this section. It is only for loading a ready-made list of brands and products that every user can pick from.

The loader reads two files: `data/brands.csv` and `data/products.csv`. Both contain only their header row for now, ready for your data. `data/brands.example.csv` and `data/products.example.csv` show the format with invented products.

```bash
npm run seed -- --check     # check the files; writes nothing, needs no database
npm run seed                # check, then add or update every row
npm run seed -- --brands path/to/brands.csv --products path/to/products.csv
```

- **Every row is checked before anything is written.** One bad row means nothing is saved, and every problem is listed with its line number.
- **Running it again is safe.** Brands are matched by name and products by brand + name, so a second run updates rows instead of duplicating them.
- **Nothing is ever deleted.** To retire a product, set its `active` column to `no`; anyone who already has it in their wax box keeps it.

**brands.csv**

| Column | Required | What goes in it |
| --- | --- | --- |
| `name` | yes | e.g. `Swix` |
| `temperature_basis` | yes | `air` or `snow`: how the brand rates its waxes |
| `website` | | |

**products.csv**

| Column | Required | What goes in it |
| --- | --- | --- |
| `brand` | yes | must match a name in brands.csv (or one already loaded) |
| `name` | yes | |
| `category` | yes | glide: `base_prep` `hydrocarbon` `synthetic` `liquid_glider` `paste_glider` `powder` `top_coat` · grip: `hardwax` `klister` `binder` `grip_spray` `skin_care` · cleaners: `base_cleaner` `wax_remover` `fluoro_remover` `skin_cleaner` `citrus_solvent` · consumables: `fibertex` `fiberlene` `cork` `sandpaper` `structure_insert` |
| `sku` | | |
| `form` | | `block` `liquid` `spray` `paste` `powder` `tube` `gel` `sheet` `roll` `insert` `other` |
| `published_temp_min_c`, `published_temp_max_c` | | the range printed on the product, in °C |
| `snow_temp_min_c`, `snow_temp_max_c` | | the same range as **snow** temperature (see below) |
| `snow_types` | | any of `falling` `fresh_set` `fine_grained` `transformed` `icy` `wet` `dirty` `man_made`, separated by `;` |
| `humidity_bands` | | any of `dry` `mid` `wet`, separated by `;` |
| `fluoro_status` | | `fluoro_free` `low` `high` `unknown` (blank means unknown) |
| `layer_roles` | | any of `cleaning` `base` `temperature` `top_coat` `powder` `binder` `kick` `cover` `skin_care` `finish`, separated by `;` |
| `iron_temp_c` | | 80–180 |
| `price`, `currency` | | e.g. `24.95`, `CAD` |
| `buy_url` | | must start with `https://` |
| `active` | | `yes` (or blank) or `no` |

Spellings are forgiving: `Fluoro-free`, `Fresh Set` and `fresh_set` all work, and so do minus signs pasted from a PDF (`–8`).

The same air-versus-snow rule applies here: for a brand rated by snow temperature leave the `snow_temp_` columns blank and the published range is copied across; for one rated by air temperature, fill them in or the product loads without a snow range and a warning names it.

## Commands

```bash
npm run dev         # the app, at http://localhost:3000
npm run build       # production build
npm run lint
npm run typecheck
npm test            # the CSV loader's tests; no database needed
npm run seed        # load the catalogue (see above)
```

**Privacy rules check.** [`supabase/tests/rls_check.sql`](supabase/tests/rls_check.sql) signs in as two made-up users and checks 36 rules: what each can do with their own data, and that neither can see or change the other's. It undoes everything when it finishes. Run it only against a local database (`npx supabase start`, which needs Docker), never against your live project:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/rls_check.sql
```

## How the code is laid out

| Path | What it is |
| --- | --- |
| `supabase/migrations/` | The database: tables, privacy rules, photo bucket, tools list |
| `src/proxy.ts` | Keeps the sign-in cookie fresh (Next.js 16 renamed `middleware.ts` to `proxy.ts`) |
| `src/app/(app)/` | Screens that need an account. `layout.tsx` sends signed-out visitors to `/login` |
| `src/app/login/`, `src/app/auth/confirm/` | Sign in, create account, and the email confirmation link |
| `src/lib/supabase/` | The two Supabase connections: `client.ts` for the browser, `server.ts` for the server. Both obey the privacy rules; `createServiceClient()` in `server.ts` does not, and nothing in the app uses it yet |
| `src/app/(app)/wax-box/` | The wax box list, *Add a wax*, and the action that saves it |
| `src/lib/catalogue/` | The rules a wax must pass (shared by *Add a wax* and the CSV loader), the allowed values, and the words shown for them |
| `scripts/seed-catalogue.mts` | The `npm run seed` command |
