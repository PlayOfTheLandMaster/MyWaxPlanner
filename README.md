# My Wax Planner

A brand-neutral cross-country ski waxing planner: glide and grip recommendations from your own wax box, plus a filterable waxing history.

Stack: Next.js (App Router) + Supabase + Vercel.

The full product spec is in [docs/xc-wax-app-spec.md](docs/xc-wax-app-spec.md). Build it phase by phase using the build prompts in the spec's last section.

## What is built so far

**Sign-up by invitation.** Only email addresses on the invitation list can create an account. The rule lives in the database: a trigger on `auth.users` (`require_signup_invite`, migration `20261206000000_signup_invites.sql`) refuses any other address, so it holds even for a sign-up sent straight to Supabase with the public key. Admins (rows in `app_admins`) manage the list from the **Invitations** card on Account: add an address with an optional note, see who has joined, remove one not yet used. The card shows the sign-up link (https://www.mywaxplanner.com) with a **Copy link** button to send to the person invited; they tap **New here? Create an account** with the address added. A refused sign-up gets a plain sentence rather than Supabase's "Database error saving new user" (`src/lib/invites/email.ts`, tested). Existing accounts are untouched.

**Getting started.** A new account sees a checklist on Today: **Choose how you wax**, **Pick a home venue**, **Add skiers you wax for** (optional), **Add your skis**, **Add your waxes**, **Tick the tools you own** (optional for experts). Once a step is done, its own page shows the same checklist with the step ticked and the next one as the button, and each says the list can be added to later; when every required step is done the checklist goes for good (`src/lib/setup/`, tested; `components/setup-checklist.tsx`, `components/setup-next.tsx`). Checklist links carry `?start=` so a page knows it was opened from the list. With setup done, Today prompts when the skier picked has no skis of their own ("Anna E. has no skis yet").

**Guided or expert** (`profiles.waxing_style`, migration `20261205000000_waxing_style.sql`; `src/lib/profile/style.ts`). Asked once, changeable on Account under **How you wax**; unset counts as guided. Today shows it under the title, beside who is waxing ("Anna S." or "Waxing for Emma"), as a **Guided mode** or **Expert mode** pill that leads to Account. The app uses two names for its two ways in, everywhere:

- **Plan a wax session:** the app suggests waxes for the conditions (the plan and recommendation below). Today's main button for a guided waxer (**Start a wax session**), and **What would the app suggest?** for an expert. Both open the planner (`/plan/start`), headed **Plan a guided wax session** for a guided waxer and **Plan a wax session** for an expert, with the button **Apply the above to start a guided session**. Every wax session starts on Today.
- **Record a wax job:** you enter the waxes yourself (`/history/new?record=1`). Today's main button for an expert, with **What would the app suggest?** underneath; for a guided waxer, "Already waxed? Record a wax job". The form is set to now, the skier picked and Today's venue (the home venue from the Session tab). Its **Forecast at time of session** card follows the date, time and venue as they are changed (`history/record-form.tsx` asks `recordForecast` again); on Save the server works the forecast out once more for what was saved and stores it as the session's forecast (`src/lib/history/record.ts`, tested). The weather service covers about three months back to six days ahead (`past_days` up to 92); outside that the card says **No forecast for that date** and none is saved. A layer's wax list ends with **Add a wax…**: search the shared catalogue and your own waxes and tap **Add & use**, or add a new wax by maker, name and type; either goes into your wax box and is picked for the layer (`history/add-layer-wax.tsx`, `lib/wax-box/create.ts`, shared with Add a wax). "Just type the name for this job" keeps a one-off wax out of the box. Each wax job recorded here is new; a past session's own **Use this session data for today's wax job** opens it copied (skis, layers and finish). A recorded wax job counts as already waxed (`waxed_at` is set), so Save goes to the Sessions tab ("Wax job saved. It's under Current sessions…") with the session ready to ski; the form asks no rating (that is the rating step, after skiing). Today lists no sessions: they are all on the Sessions tab. For an expert, and for any session without a plan, session pages drop wax-along and the step-by-step list, and "The plan" reads "Your waxes" (just "Waxes" once waxed).

**Copy to other skis** (`/session/[id]/copy`): a coach waxing a squad the same way. Every pair of the same technique, grouped by skier, with Tick all and a per-skier All. Each ticked pair gets its own planned session with the same layers, finish, venue and forecast: at the same time when the source is planned, for now when it is finished. Ratings and results stay behind (`src/lib/history/copy.ts`, tested). The copies land under Current sessions.

**Skis** can be deleted straight from the Skis list (one tap asks, a second deletes; `components/confirm-delete.tsx`, shared with planned sessions). **Back links:** every page has one, the four tabs included: to the page you came from, else Today (`src/lib/nav/trail.ts`).

**Your name:** creating an account asks for a first name and the initial of your last name, so two people called Anna show as "Anna S." and "Anna K.". The name is shown wherever the app used to say "Me": the skier picker, the banners, whose skis, History's filters, Compare and the spreadsheet (`src/lib/profile/name.ts`, tested). It is stored in `profiles.first_name` and `profiles.last_initial`, filled in from the sign-up form by `handle_new_user()` (migration `20261202000000_user_names.sql`, which also split older accounts' optional display name). It can be changed on Account. An account with no name yet still says "Me", and Today asks for one. Skiers are added the same way, first name and last initial, and saved as one name ("Anna S."), so two skiers called Anna can be told apart; an older skier keeps their name until it is next edited. Choosing who you are waxing for is one line on every screen, Today included ("For Anna S. · Change"); **Change** opens the picker in place. Up to six skiers, each has a button; a coach with a bigger squad gets their own name, the skier picked now and the most recently picked as buttons, plus a search for everyone else (`src/lib/skiers/quick.ts`, tested). Recent picks are remembered on the device.

**Learn from history** (phase 3):

- **Download as spreadsheet** on History (`/history/export`): the sessions the list shows, with the same filters and sort (`src/lib/history/query.ts` builds both), as a CSV file that opens in Numbers, Google Sheets or Excel. One row per session: date and time in your own time zone, skier, technique, skis, venue, event and result, snow and air temperature, snow type and humidity, the glide and grip waxes by layer, the ratings and the notes (`src/lib/history/csv.ts`, tested). Temperatures stay numbers so they sort and chart; text a spreadsheet would run as a formula is defused.
- **Share a summary** on a finished session (`/session/[id]/share`): date, venue (and event, distance and result on race days), conditions (debris included), the glide and grip waxes by layer, and the ratings, with your notes only if you tick **Include my notes**. Skier names and skis are never included (`src/lib/history/share.ts`, tested). **Share picture** makes a 1080 × 1350 PNG (`/session/[id]/share/image`, drawn with `next/og`) and hands it to the iPad's share sheet for Facebook, Messages or Photos; **Save as PDF** prints just the summary, on white paper whatever the screen's theme. The picture is made for the signed-in owner only; nothing becomes public.
- **Compare sessions** (`/history/compare`): tick two to four sessions and see them side by side: when and where, conditions, the glide and grip waxes lined up by layer, and how it went. Rows where the sessions differ are shaded and bold (`src/lib/history/compare.ts`, tested). The picker is a plain form, so the choice lives in the address (`?ids=…`).
- **Insights** (`/history/insights`), for the skier picked on Today, glide or grip: how each wax rated across snow temperatures (one dot per session, darker for a better rating, with a table view), your best wax in each temperature band, and the waxes you use most (`src/lib/history/insights.ts`, tested). The charts are plain SVG and HTML, with no chart library; the rating colours are one blue in five steps, checked for colour-blind readers in light and dark mode (`--rate-1` … `--rate-5` in `globals.css`). Charts appear after three rated sessions with a snow temperature.

**Session flow** — planning and logging are one session:

- **The Sessions tab** (`/plan`, titled My Sessions) only lists sessions under way: nothing starts there (planning and Record a wax job are on Today). It shows **Current sessions** (planned for today or later, with what comes next) and **Unrated sessions** (marked done skiing, or planned on an earlier day, and not rated yet; `done_at`, migration `20261203000000_session_done.sql`), each with Delete. "Today" is the reader's own: the browser writes its time zone to a `tz` cookie (`ReaderZone`) and the server reads it (`src/lib/reader-zone.ts`, grouping in `src/lib/history/groups.ts`, tested). History is for looking back; "Log a session" is gone from History and Today.
- **Nothing is saved until "Use this plan".** Step 1's conditions travel to step 2 in the address (`src/lib/plan/draft.ts`, checked again on the way in), and "Use this plan" saves the conditions, the recommendation and the session together. Older plan links that point at saved conditions still work.
- **One session page** (`/session/[id]`, the same page as `/history/[id]`): a Plan ✓ · Wax · Ski · Rate strip (`src/lib/history/stage.ts`), the plan with why each layer was picked, the steps as a tick-off checklist (ticks saved on the session, so every device agrees), and the **How did it go?** card built in — folded away before skiing. A rated session shows how it went, with **Edit this record** and **Use this session data for today's wax job** under it. `/history/[id]/rate` now forwards to the session page.
- **Rating reads top to bottom, Save last.** Once skied: "Marked done · Undo" under the title, then what was done (waxes, finish, forecast, photos), then **How did it go?** and its one Save. **I changed something** opens a pull-down per layer on the card (kept, a wax from the box, or skipped) and **Different** opens the snow questions from Today's Skiing Conditions there too; both are saved with the rating, which never leads on to the full form (`rateSession`; adding a layer is Edit this record afterwards). Rated from Today (`?from=today`), Save goes back to Today with "Rating saved."
- **Once waxed, the waxes are fixed:** "Waxes - 1 layer applied", with no Change under the layers (I changed something, when rating, is the way to correct them).
- **Wax-along** (`/session/[id]/wax`): the plan's steps one per screen in big text, with **Done — next** ticking each step on the session. A step that says how long to wait ("let it dry 10–15 minutes") offers a countdown timer (`src/lib/history/timer.ts`) that buzzes at zero where the device can. The screen stays awake while it is open, where the browser allows it. **Done waxing** (here or on the session page, with Undo) moves the session to Ski.
- **Planned versus used:** while a session is still at Wax, each layer has **Change** — swap the wax for another from your box, or skip the layer. The page then shows "Planned: …" beside the wax you used and lists skipped layers (`src/lib/history/plan-compare.ts`); the plan itself stays in the session's recommendation.
- Migration `20261130000000_wax_along.sql` adds `wax_steps_done` and `waxed_at` to `wax_sessions`.

**Build prompt 5** — the recommendation:

- **Plan step 2** (`/plan/[conditions]`): pick a pair of skis (or technique and grip type), recreational or race, and a glide wax type, then **RECOMMEND**.
- **The engine** (`src/lib/recommend/engine.ts`, pure and tested) reads the `rules` table to decide the layers and wax categories, scores every wax on snow temperature, snow type, humidity, category weight and your own past ratings in similar snow (brand never counts), picks the best from your box, offers up to three better ones from the shared catalogue, and writes the procedure using only tools you own. Race plans only use fluoro-free waxes. Classic waxable plans suggest a warmer and a colder kick wax to carry.
- **Use this plan** stores the recommendation and a planned session in History, linked to the forecast conditions. After skiing, **How did it go?** (from Today or the session) rates it in a few taps and marks it done; a session counts as done once it has any rating.
- Default rules are seeded by `20261119000000_default_rules.sql`; tune them by editing rows.
- *Add a wax* starts with Glide · Grip · Cleaners · Consumables, so the type list is short.

**Build prompt 4** — forecasts for where and when you ski:

- **Venues** (`/venues`): shared venues (the seeded Calgary, Bow Valley and Kananaskis ones, plus any the admin adds: migration `20261215000000_admin_venues_shared.sql` saves an admin's new venue with no owner) and your own, which only you see (place search, "I'm at the venue now", or coordinates), and a home venue. The place search asks OpenStreetMap and GeoNames by name and, when the name is a town or a hill, also looks for ski places within about 40 km of it ("Rossland" finds Black Jack Cross Country Ski Club). OpenStreetMap is asked one request a second, as its usage policy requires, so a search takes several seconds (`searchPlaces` in `src/lib/weather/forecast.ts`).
- **Plan step 1** (`/plan/start`, opened from Today): the venue's hourly forecast for your session window from [Open-Meteo](https://open-meteo.com) at the trail's elevation and in the venue's time zone — never the phone's location — with an estimated snow temperature, snowball-test and snow-type guesses you confirm, saved as forecast conditions.
- **Today**: the home venue's forecast and *Plan a wax session*. **Days similar to today** is the first choice in History's **Filter**: it fills Period, the snow range (within 3 °C of today's forecast), snow humidity and best-glide order, and a second tap puts them back (`history/similar-option.tsx`, `src/lib/history/similar.ts`).
- Open-Meteo is free for non-commercial use without a key; a paid version of the app needs their commercial plan.

**Build prompt 3** — the waxing history:

- Log, edit, delete and *repeat* sessions: layers from your box (or typed), finish steps in the order tapped (repeats allowed, Undo last and Clear), actual conditions with the snowball test and **Debris** (None, Needles, Leaves, Dirt; `conditions.debris`, migration `20261211000000_debris.sql`), ratings, race details and photos (private `session-photos` bucket).
- Saved in one transaction by the `save_wax_session()` database function, which runs as the signed-in user so Row Level Security applies.
- History list (`/history`) with filters in the address bar, chips, sorting, seasons and saved filters, read from the `wax_session_list` view.

**Build prompt 2** — the Wax box and the tab bar:

- **A five-tab bar** along the bottom: Today, Session, History, Wax box, Learn.
- **Wax box** has three sections, switched at the top: **Waxes**, **Tools** and **Skis**.
- **Waxes:** your waxes grouped by Glide, Grip, Cleaners and Consumables, with anything low or empty gathered under **Running low** at the top. Tap a wax to change how much is left (one tap), add notes, edit it, or remove it from the box. **Photo** on a wax's page takes a picture of the container (camera or library), shrunk on the device to about 1200 px and kept in the private `wax-photos` bucket (migration `20261212000000_wax_photos.sql`); it shows as a thumbnail beside the wax on the list, and goes when the wax is removed from the box. A wax you remove stays saved, and **Add a wax → Find a wax you've added before** puts it back without retyping. Waxes from a shared catalogue, if you ever load one, can be found there too, but not edited.
- **Tools:** the checklist from the spec, grouped as scrapers, hand brushes, roto brushes, irons, cork and fibertex, and bench tools. Tick what you own and, if you like, how worn it is. Later, waxing plans will only use ticked tools.
- **Skis:** add, edit and delete your pairs: name, classic or skate, grip type (classic only), grip zone length (waxable only), brand, model, base, grind, flex and notes. Deleting a pair keeps its waxing history. A known cross-country maker's logo (Fischer, Atomic, Rossignol, Salomon, Madshus, Peltonen and others) shows beside the pair on the list and on its page: the brand typed is matched to the maker's website and the browser loads that site's icon from Google's public favicon service (`src/lib/skis/brand-logo.ts`, tested). Only the maker's website is sent; an unknown brand shows no logo.

**Build prompt 1** — the foundation:

- **Sign in and create an account** (email and password, with Supabase's email confirmation). Every screen except sign-in needs an account.
- **Every table in the spec's Data model**, plus `wax_session_layers` and `wax_session_photos` from the history section, in [`supabase/migrations/`](supabase/migrations/).
- **Row Level Security on every table.** Your skis, wax box, venues, conditions, plans and history are visible only to you. So are any brands and waxes you type in. The shared `tools` and `rules` lists, and the optional shared brand and product catalogue, can be read by anyone signed in and changed by nobody but the seed script.
- **Wax box, built one wax at a time.** *Add a wax* asks for the brand, name, type, temperature range, fluoro status and how much is left; snow types, humidity, iron temperature and notes are under *More details*. A brand you haven't used before asks once whether it rates by air or snow temperature. The wax box lists your waxes by Glide, Grip, Cleaners and Consumables.
- **A private photo bucket** (`session-photos`) for session photos, where each user can only reach their own folder.
- **The tools catalogue**, filled in from the spec's Tools checklist (28 tools).
- **An optional catalogue loader**, `npm run seed`, for loading a shared list of brands and products from CSV. You don't need it: the wax box works without it.
- A placeholder **Today** screen that shows who is signed in and links to the wax box.

**Learn tabs.** Learn has tabs at the top, each its own list: **Notes** (the default) and **Videos** (`?tab=videos`). They are listed in `src/lib/learn/tabs.ts`; a new tab is an entry there and a component on the page. The How to use guide sits at the foot of the page.

**My waxing notes** (`/learn`, `/learn/notes/…`): each skier's own short articles (waxing instructions, notes on products, how-tos, accommodation, restaurants, shops, other; migration `20261221000000` added the three trip sections), listed by section on the Learn tab, newest edit first, with a search once there are more than four. Tap one to read it; Edit and Delete (two taps) are on its page. Plain text, line breaks kept. Private to their writer by Row Level Security (table `learn_notes`, migration `20261220000000_learn_notes.sql`), except that an admin can **Publish to all users** one of their own (migration `20261222000000`): every user then reads it, read only, under *Shared by the admin*, and only the admin can edit, unpublish or delete it; the rules are in `src/lib/learn/notes.ts`, tested.

**How to use** (`/learn/how-to`): a brief guide in the app, reached from the top of Learn and from Account, one fold per part (getting started, Today, starting and recording a wax job, rating, the wax box, venues, for the admin, history). Its text is in `src/lib/learn/how-to.ts`, also the source of the shareable copy, so update it with the screens.

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
5. **Supabase (website):** open **Authentication → URL Configuration**. Set **Site URL** to where the app runs (`http://localhost:3000` for now), and add `http://localhost:3000/auth/confirm` under **Redirect URLs**. Add your live address in the same two places once you deploy.
6. **Supabase (website):** sign-up is by invitation, and a new project has nobody on the list, so let yourself in first. Open **SQL Editor** and run this with your own address:
   ```sql
   insert into public.signup_invites (email) values ('you@example.com');
   ```
   After you have created your account (step 7), make yourself the admin who manages invitations:
   ```sql
   insert into public.app_admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
7. **Terminal:** start the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, create an account, then tap **Wax box → Add a wax**.

### Deploying to Vercel

**Vercel (website):** import the GitHub repository, and under **Settings → Environment Variables** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, ticked for **Production** and **Preview** (a preview without them shows "Internal Server Error"). Do **not** add `SUPABASE_SECRET_KEY` to Vercel: only the seed script uses it, and the seed script runs on your computer.

The live app runs at **https://www.mywaxplanner.com** (the bare domain forwards to it). Its sign-up emails come from `noreply@mywaxplanner.com` through Resend: **Supabase → Authentication → Emails → SMTP Settings** holds Resend's server (`smtp.resend.com`, port 465, user `resend`, an API key as the password), and the domain's DNS carries Resend's DKIM, SPF and DMARC records. Supabase's own mailer allows only two emails an hour, which is not enough for sign-ups. The first emails from a new domain can land in Spam.

## Adding waxes

Each wax you add is saved for you alone. The next time you add a wax, brands you've used before are suggested as you type, and adding the same wax twice tells you it's already in your box.

**Two ranges.** Some waxes print one range for new snow and another for old or transformed snow (Swix kick waxes, e.g. −1 to −7 °C falling, −3 to −10 °C old). *Add a wax* has an optional **Second range: old or transformed snow**, open for grip waxes and under *More details* for others (migration `20261213000000_old_snow_range.sql`). Suggestions use it on fine-grained, transformed, icy, wet, dirty or man-made snow and the first range on falling or fresh snow (`src/lib/wax-box/old-snow.ts`, tested); the list shows both.

**Iron temperatures.** The shared catalogue carries the iron temperature only where the maker publishes one: Swix on each product page, Vauhti in its cross-country guide (150–200 °C, stored as 150), Toko in its Hot Wax manual by colour (130 / 140 / 150 °C); Rex publishes none for the waxes listed. A printed range is stored as its lower end. Migration `20261218000000_catalogue_iron_temps.sql` lists every source. Where the catalogue is blank, a skier enters their own on the wax's page (**Your iron temperature**, `user_snow_ranges.iron_temp_c`, migration `20261217000000`); plans and the wax-along use it, but never over the maker's figure. On *Add a wax* the iron temperature box sits beside the ranges. **Your iron temperature** is offered only for waxes that are ironed (solid and powder glide waxes, top coats, base prep and grip binders), not for liquids, pastes, sprays, kick waxes or klisters. Vauhti's older *Waxing Guide 2024–2025* gives temperatures per race recipe rather than per wax (UP Polar 150 °C on cold days, 180 °C on warmer ones; powders "approx. 150–160 °C"), so the catalogue keeps the cold end; Rex's 2008 Racing Guide covers only older fluoro waxes, none of them in the catalogue.

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
| `old_published_temp_min_c`, `old_published_temp_max_c` | | a second printed range, for old or transformed snow (e.g. Swix kick waxes) |
| `old_snow_temp_min_c`, `old_snow_temp_max_c` | | that second range as **snow** temperature |
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
npm test            # the pure-logic tests (lib/**/*.test.ts); no database needed
npm run seed        # load the catalogue (see above)
```

**Privacy rules check.** [`supabase/tests/rls_check.sql`](supabase/tests/rls_check.sql) signs in as two made-up users and checks 80 rules: what each can do with their own data, that neither can see or change the other's, and that nobody can sign up without an invitation or manage invitations without being an admin. It undoes everything when it finishes. Run it only against a local database (`npx supabase start`, which needs Docker), never against your live project:

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
| `src/lib/setup/` | The getting-started checklist and what each step's page offers next |
| `src/lib/profile/` | Your name, and how you wax (guided or expert) |
| `src/lib/history/` | History: the list's query, the spreadsheet, Share, Compare, Insights, Record a wax job and Copy to other skis |
| `src/lib/invites/` | The app's half of sign-up by invitation |
| `src/lib/nav/trail.ts` | Where each back link goes |
| `src/lib/supabase/` | The two Supabase connections: `client.ts` for the browser, `server.ts` for the server. Both obey the privacy rules; `createServiceClient()` in `server.ts` does not, and nothing in the app uses it yet |
| `src/components/` | The bottom tab bar, the Waxes / Tools / Skis switcher, the skier picker, the getting-started checklist, the session page and the two-tap Delete |
| `src/app/(app)/wax-box/` | Waxes (list, add, a wax's page, edit), `tools/` and `skis/`, each with its own `actions.ts` |
| `src/lib/wax-box/` | Reading the wax box, the wax search, and the temperature line on each wax |
| `src/lib/skis/` | What a ski save may contain |
| `src/lib/catalogue/` | The rules a wax must pass (shared by *Add a wax* and the CSV loader), the allowed values, and the words shown for them |
| `scripts/seed-catalogue.mts` | The `npm run seed` command |
