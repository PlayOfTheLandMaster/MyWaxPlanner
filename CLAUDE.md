# CLAUDE.md

Guidance for Claude Code working in this repository. It records *why*, not
*what*: the README describes the features and the setup, and the code says
what it does. Add something here only when the code alone would mislead.

@AGENTS.md

## The owner

The owner is not a programmer, works on an iPad in **Chrome**, and has no
terminal. Steps you give them name the application first ("**Supabase:** open
SQL Editor…"), never ask them to paste a key or secret into the chat, and
test plans happen on the Vercel preview of the pull request.

The working rhythm:

- change, then `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`;
- commit, push to the work branch, and open a pull request;
- the owner tests the preview, and merges only on their "Merge it";
- after a merge, `git pull origin main` into the work branch and push it.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck    # next typegen && tsc --noEmit — typegen first, or PageProps is missing
npm test             # node:test over src/**/*.test.ts — pure logic only, no database
npm run build
npm run seed         # optional shared catalogue from data/*.csv
```

`supabase/tests/rls_check.sql` is the privacy check: two made-up users, every
rule proved both ways (allowed *and* refused), all rolled back at the end. Run
it against a **local** database only, never the live project.

There is no Prettier config. The code is wrapped at about 140 columns; running
Prettier's default (80) over an existing file rewraps all of it and buries the
real change, so format only new files, with `--print-width 140`. Even at 140
it rewraps the lines in an existing file that already run long, so never run
it on an existing file.

## Next.js 16 here

- `cacheComponents: true` is on, so anything that reads the request
  (`searchParams`, cookies, the signed-in user, the database) must sit inside a
  `<Suspense>`. A page is a thin shell; the async part is a child component.
- Two pieces that must appear together share **one** boundary. The Session
  tab's planned-sessions list once loaded a moment after the card beside it and
  pushed it down the page.
- `PageProps<"/route">` and `RouteContext` are generated types. `refresh()` from
  `next/cache` re-renders the current page after a server action that stays put.
- A server action bound with arguments keeps the form's `FormData` as the last
  one, so bind *every* argument (`deleteSki.bind(null, id, "edit")`). Binding
  one of two optional arguments passes `FormData` in as the second.

## Security model: RLS is the enforcement layer

Every table has Row Level Security, and every user's data is theirs alone.
App-level checks are a second line, never the only one. The app uses only the
RLS-bound Supabase clients; `createServiceClient()` exists and nothing uses it.

- **Sign-up is by invitation, enforced on `auth.users`.** The trigger
  `require_signup_invite` refuses any address not in `signup_invites`. It is in
  the database, not the sign-up form, because the public key ships in the
  browser bundle and anyone can call Supabase's sign-up directly. A fresh
  project therefore refuses its own first sign-up until an address is inserted
  by hand (README, Set up).
- **Admins are rows in `app_admins`**, which only the service role can change.
  They manage the Learn library and the invitation list.
- **Every new table needs explicit `grant`s** as well as policies; without them
  PostgREST says "permission denied", which no policy explains.
- **Add a case to `rls_check.sql`** for every new table: an allow and a deny.
- **A delete or update that RLS refuses is not an error**: PostgREST answers
  204 and touches no rows. The admin's Delete on a shared venue "did nothing"
  for that reason. Where a refusal is possible, add `.select("id")` and check
  that a row came back (`removeVenue`).

## Migrations

The owner cannot run the Supabase CLI. Migrations go live through the Supabase
MCP tools (`apply_migration`), and then two things are easy to forget:

- `apply_migration` records the migration under today's timestamp, not the file
  name's. Update `supabase_migrations.schema_migrations` to the file's version,
  or the order no longer matches `supabase/migrations/`.
- A statement the server wants confirmed (a `drop`, a `delete`, and also
  `alter table … add column` with a `create or replace function`, as the
  debris migration found) makes the MCP call time out. Give the owner the SQL
  to run in **Supabase → SQL Editor** instead (send the migration file), check
  the result, then record the version by hand.
- **Preview and live share one database.** Code that reads a new column fails
  on the preview the moment it is pushed if the migration is not live yet, and
  on the live app if that pull request is merged first. Apply the migration
  before pushing such code, or tell the owner not to merge until it is.
- The live `save_wax_session()` was applied without its comments, so its text
  never matches the migration file. Compare the logic (columns, statements),
  not a hash, before replacing it.

Run the security advisor (`get_advisors`) after any change to the schema.

## Product rules that are easy to break

- **Two ways in, two names, everywhere:** **Plan a wax session** (the app
  suggests) and **Record a wax job** (you enter the waxes). Today once said
  "Plan today's wax" while the Session tab said "Plan a wax", and the full form
  had three names. New entry points use these two names.
  The owner has since reworded what a guided waxer sees: Today's main button
  and the setup note say **Start a wax session**, and the planner's heading
  **Plan a guided wax session**. Expert-facing words keep "Plan a wax
  session". Record a wax job offers no way to suggestions: it is for waxing
  already done.
- **Every wax session starts on Today.** The planner is `/plan/start`, opened
  only from Today (Start a wax session; What would the app suggest? for an
  expert). The **Sessions** tab (`/plan`, titled My Sessions) lists sessions
  under way and starts nothing: it once offered an expert a guided session,
  which the owner found a disconnect. Venues has no Forecast button.
- **Guided or expert** (`profiles.waxing_style`) is asked, never guessed from
  behaviour. Null means not chosen and behaves as guided.
- **Optional checklist steps never keep the checklist open.** `progress().todo`
  counts required steps only; the "x of y done" count shows every step.
- **Each pair of skis is rated on its own.** Copy to other skis makes one
  session per pair and never copies ratings, results or observed conditions.
- **A session's skis belong to its skier.** Forms list only that skier's pairs
  (`skisOf`), and the database fills `skier_id` from the pair.
- **Deleting a session removes only its observed conditions.** Forecast
  conditions and recommendations can be shared by copies.
- **Rating happens on one page, and Save is the last thing on it.** "I changed
  something" (a pull-down per layer) and "Different" (the snow questions) open
  inside the How did it go? card and are saved with the rating. The owner found
  a Save that led on to the full form confusing; do not route a rating through
  `/history/[id]/edit` again.
- **Once waxed, the waxes are fixed** on the session page (no Change, past
  tense). Corrections after skiing go through I changed something.
- **Record a wax job's forecast is worked out on the server at Save**, for the
  date, time and venue saved, never taken from the page: the person may change
  any of them after the page opened. A recorded wax job counts as waxed.
- **Record a wax job starts only once Today has a location and Today's Skiing
  Conditions for it, today** (`recordBlocker` in `lib/snow/check.ts`). Today
  shows its Record buttons greyed with the reason; the Record page itself
  refuses too, because a bookmark or the back button skips Today. "Use this
  session data for today's wax job" opens the same page, so it waits as well.
- **A wax can have two ranges: new snow and old snow** (`old_*` columns,
  `rangeFor` in `lib/wax-box/old-snow.ts`). Old snow is every snow type but
  falling and fresh_set, wet, dirty and man-made included (the owner's call).
  Anything that compares a wax with the snow goes through `rangeFor`, never
  `temp_min_c` directly. A shared catalogue wax cannot be edited, so its
  second range lives with the skier's own snow range (`user_snow_ranges`,
  old_* columns, the "Your snow range" card).
- **Iron temperatures come from the maker, or from the skier.** The shared
  catalogue holds only figures a maker prints (migration 20261218000000 says
  where each came from; a printed range is stored as its lower end). Where
  there is none, a skier enters their own (`user_snow_ranges.iron_temp_c`,
  "Your iron temperature"), which `applySnowRanges` uses only when the
  catalogue is blank. Never fill the catalogue from memory or a shop's page.
  The box is offered only for waxes that are ironed (`IRONED` in
  `wax-box/[id]/page.tsx`). A guide that gives a temperature per recipe or
  per snow condition (Vauhti's 2024–25 guide: UP Polar 150 or 180 °C) is not
  a per-wax figure; the catalogue keeps the cold end. The makers' sites
  (swixsport.com, vauhti.fi, www.toko.ch, rexwax-usa.com, www.rexwax.cz) are
  on this coding environment's allowed hosts for checking a figure. A
  `user_snow_ranges` row may hold only an iron temperature (or only an
  old-snow range): the first table rule demanded a new-snow end and refused
  those saves until 20261219000000.
- **Temperature ranges read warmer end first** ("−1 to −10 °C"), as wax
  packaging prints them: `formatRange`, the engine's reasons, the forecast
  card and History's filter chip. Entry boxes stay From (colder) / To.
- **Venues the admin adds are shared; everyone else's are their own.** A
  trigger (`share_admin_venue`) clears `user_id` on an admin's insert, and a
  second insert policy allows exactly that. It follows the admin role, not an
  address; the owner's own account is the one admin today.
  The admin can also delete a shared venue (Venues page, two taps); a
  security-definer trigger (`keep_venue_name`) first copies its name onto
  every session that named it, other users' included, as `venue_label`.

## Venue search (OpenStreetMap)

- **Nominatim allows one request a second.** The search once sent five at
  once; from Vercel's shared servers the extras were refused, and a refused
  search reads as "nothing found". `osmSlot()` in `lib/weather/forecast.ts`
  queues every Nominatim call a second apart, so a search takes several
  seconds and the Search button says "Searching…". Add words to the search
  only knowing each costs a second.
- **Nominatim matches names, not what a place is.** "Rossland" never finds
  Black Jack Cross Country Ski Club, so the search also looks around the
  first resort or town found (`anchorOf`, a bounded viewbox, about 40 km)
  for "ski", "nordic" and "cross country", keeping only places that are ski
  places by kind. These are English words: a German "Loipe" is not found.
  OpenStreetMap's Overpass API (trails by tag, any language) would be the
  worldwide fix; it was unreachable from the coding session, so it is untried.
- To test the search from a session: `NODE_USE_ENV_PROXY=1
  NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx tsx` a script calling
  `searchPlaces`; plain Node fetch ignores the proxy.

## Forms that take a moment

- **A button that starts slow work says so and takes no more taps.**
  `ConfirmDelete` shows "Deleting…" and disables itself through
  `useFormStatus` (it must be a child of the `<form>`). A Delete that looked
  unchanged for two seconds was tapped again and again.
- **A deploy while a page is open can freeze it** until it is reloaded; the
  owner hit this on the preview while changes were being pushed. Reloading is
  the fix, not a code change.
- **Waxing notes are private; the video library is shared.** Both are on
  the Learn tab, but `learn_notes` is each skier's own (owner-only policies)
  while `learn_videos` is written by admins for everyone. Don't merge them.
  The one exception: an admin may publish their own note (`published`;
  only an admin may set it, by policy), and everyone reads it, read only.
  The writer alone still edits or deletes it.
  A note's text is shown as plain text (`whitespace-pre-wrap`), never as HTML
  or markdown.
- **The how-to guide is `src/lib/learn/how-to.ts`**, and the shareable Claude
  Docs copy (artifact L54pdhQXd8XPcuqfVHq2Kh) is edited by hand to match.
  Update both when a screen changes.

## iPad and Chrome on iOS (WebKit)

- WebKit ignores `height` on a native `<select>`; selects use
  `appearance: none` with a drawn arrow, and text inputs are pinned to 40 px to
  match (`globals.css`, deliberately outside any layer).
- A `<summary>` styled as a plain row still drew a disclosure triangle in
  Chrome on iPad; `summary.list-none` hides it.
- Every tap target is at least 44 px (`min-h-11`).
- A `required` field the browser cannot show (the Classic/Skate radios are
  `sr-only`) blocks submit with no message at all: Save on Record a wax job
  "did nothing". Forms use `noValidate` and show the server's message instead.
- `min-height` beats `height`, so `min-h-11` (44 px) on a select overruled the
  40 px pin and every pull-down stood 4 px taller than the text box beside it.
  The select rule in `globals.css` sets both. Measure a size in a browser
  rather than reading the classes.

## Tailwind

- Two classes setting the same property on one element (`bg-surface` and
  `bg-active`) are decided by their order in the built stylesheet, not in the
  class list, and nothing warns. Today's tinted session cards stayed white for
  that reason. Give an element one class per property.

## Time zones

The server runs in UTC. "Today" and every date shown are the reader's: the
`ReaderZone` component writes the browser's zone to a `tz` cookie and
`readerTimeZone()` reads it on the server. A forecast's times are the venue's
own local time, never the phone's.
