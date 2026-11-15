# XC Ski Wax App — Product Spec

Nov 14, 2026 · Finn Pedersen

## Overview

The app gives intermediate to elite cross-country skiers a complete, brand-neutral waxing plan for glide and grip, built from their own inventory and learned from their own history.

- **Users:** intermediate to elite classic and skate skiers, plus club and masters wax techs who prep several pairs.
- **Brand-neutral:** every major brand is in one catalogue (Swix, Toko, Rode, Start, Vauhti, Rex, Holmenkol, Maplus, Star, SkiGo, KUU and others). No brand is ranked above another without a reason the user can see.
- **Two modes:** *Recreational* gives a durable, simple prep with few layers. *Race day* gives a layered prep (base, temperature wax, top coat, optional liquid or powder) and only race-legal (fluoro-free) products.
- **Core loop:** conditions in, recommendation out, ski it, log the result, and the next recommendation improves.
- **Stack:** Next.js (App Router) + Supabase (Postgres, Auth, Storage, Row Level Security) + Vercel. Weather from Open-Meteo (free, no key) with Environment Canada as an option.
- **Units:** °C by default, °F as a user setting.

## Data model

These core Supabase tables cover the app; session layers are detailed in the history section. The shared catalogue is read-only to users; everything else is per-user and locked by Row Level Security on `user_id`.

| Table | Purpose | Key fields |
| --- | --- | --- |
| `profiles` | User settings | units (°C/°F), default mode (rec/race), home venue, skill level |
| `skis` | User's pairs | name, technique (classic/skate), category (waxable, skin, zero, hairies), brand, model, base material, grind/structure, flex, grip zone length (cm), notes |
| `brands` | Catalogue | name, temperature basis (air or snow), website |
| `products` | Catalogue of all waxes and liquids | brand, name, SKU, category, form, temp_min/max °C (normalized to snow temp), snow types, humidity band, fluoro status, layer role, iron temp °C, price, buy URL, active/discontinued |
| `user_products` | User's inventory | product (or custom entry), quantity/level, purchase date, notes |
| `tools` | Catalogue of tools | type (scraper, groove scraper, brush, roto brush, iron, cork, fibertex, structure tool, profile), sub-type (brass, steel, nylon, horsehair, boar, combi), size |
| `user_tools` | User's tools | tool, condition, notes |
| `venues` | Places skied | name, lat/long, elevation (m), typical snow (natural, man-made), user-owned or shared |
| `conditions` | Forecast and observed snapshots | venue, timestamp, air temp, snow temp, air RH %, snow humidity band, snow type, new-snow cm, sky, wind, source (forecast/observed) |
| `rules` | Recommendation logic | technique, layer role, conditions ranges, product category, procedure template, weight |
| `recommendations` | Saved plans | ski, conditions, mode, chosen products per layer, procedure steps, inventory gaps |
| `wax_sessions` | Waxing history | see the history section |

- Product temperature ranges are stored as published and as a normalized snow-temperature range, so brands that rate by air temperature can be compared fairly.
- `fluoro_status` values: fluoro-free, low, high, unknown. Race mode filters to fluoro-free only.

## Inventory

Users build their wax box by searching the catalogue and tapping Add; anything missing can be added as a custom product and flagged for catalogue review.

**Product categories**

- Glide: base/prep wax, hydrocarbon (conventional) paraffin, synthetic/fluoro-free performance wax, liquid glider, paste, powder, top coat/spray
- Grip: hardwax, klister, binder (hardwax binder, base klister), grip spray/liquid, skin care (skin wax, skin spray, skin cleaner)
- Solvents and cleaners: base cleaner, wax remover, fluoro remover, skin cleaner, citrus solvent
- Consumables: fibertex, fiberlene, cork, sandpaper, structure tool inserts

**Fields per product (pre-filled from the catalogue)**

Brand, name, category, form, temperature range (as published and normalized), snow types, humidity band, fluoro status, layer role, iron temperature, amount left (full, half, low, empty).

**Tools checklist**

- Scrapers: plexi (3 mm, 5 mm), groove scraper, metal scraper
- Hand brushes: brass, steel, combi, nylon (stiff, soft), horsehair, boar/natural, polishing
- Roto brushes: brass/steel, nylon, horsehair, cork, polishing; drill and handle size
- Other: wax iron (and temperature control), waxing profile/bench, vise, structure/rill tool (with insert sizes), heat gun, grip-zone tape

**Inventory rules**

- The recommendation engine only builds procedures with tools the user owns. If a step needs a missing tool, it offers a fallback (hand brush instead of roto) and lists the tool under Suggested purchases.
- Low or empty products trigger a reorder suggestion with brand-neutral equivalents.

## Conditions input

Conditions are pre-filled from the forecast for the chosen venue and time, then the skier confirms or overrides what only they can see. Glide and grip share this one step.

| Input | Source | Choices / units |
| --- | --- | --- |
| Venue and start time | User | saved venues, or current location |
| Air temperature | Forecast (Open-Meteo hourly) | °C at start, plus min/max over the session |
| Overnight low | Forecast | °C, used to judge refreezing and snow hardness |
| Air humidity | Forecast | RH %, shown as dry (<50), medium (50–80), humid (>80) |
| Snow temperature | Estimated, user can override | °C; never above 0 °C; estimated from air temp, overnight low, sun and cloud |
| Snow humidity | User (snowball test) | dry 0–25 %, mid 20–35 %, wet 30–100 % (Swix bands) |
| Snow type | User, with forecast hint | falling/fresh covering tracks; fresh, freshly set; fine-grained older; transformed/coarse-grained; icy/glazed; wet/corn; dirty/pollen; man-made |
| New snow in last 24 h | Forecast | cm |
| Sky and wind | Forecast | sun, overcast, wind km/h |
| Track | User | freshly groomed, skied-in, glazed, soft |

- The snowball test gets a short guided prompt with pictures: does the snow fall apart, form a loose ball, or pack into a wet ball?
- After a session the same form is shown again as *Actual conditions*, so forecast and reality can be compared in the history.
- Race mode adds the race start time and asks for an on-snow thermometer reading if the skier has one.

## Glide wizard

Classic and skate share one glide engine with a technique switch; classic adds a grip-type step first, because it sets where glide wax goes and which products are safe near the kick zone.

**Steps, in order**

1. Ski: pick a pair from the user's skis (technique, base material and structure fill in from the ski record).
2. Classic only, grip type: waxable, skin, zero, hairies/crown. This sets the glide zones (tips and tails) and whether skin treatment applies.
3. Mode: recreational or race day.
4. Conditions: confirm or override (see Conditions input).
5. Product family wanted: let the app choose, or limit to conventional hydrocarbon, synthetic/fluoro-free performance, liquid, paste, powder.
6. Base material: confirm (e.g. sintered race base, extruded base, grade if known).
7. Structure: fine, medium, coarse, universal, or custom grind name; the app flags a mismatch (for example, fine structure on wet coarse-grained snow).
8. Rills / hand structure: none, or tool and insert (e.g. 0.5, 0.75, 1.0 mm), and whether to apply them full-length or tip and tail only.
9. Skin treatment (classic skin skis only): skin cleaner, skin wax or spray, matched to conditions.

**Output**

- Layers in order: cleaning/prep, base wax, temperature wax, top coat or liquid, optional powder.
- For each layer: product from inventory (or a gap), iron temperature, number of passes, cooling time, and scrape and brush steps.
- A finish step: brushing order (for example brass or steel, then nylon, then horsehair, then polishing), roto brush passes and speed if owned, fibertex or buffing, and when to add rills.
- Classic: masking or taping of the grip zone, and a reminder to keep glide products off it.

## Grip wizard

Grip runs only for classic waxable skis; skin, zero and hairies skis skip to a short skin- or base-care step, using the grip type already answered in the glide wizard.

**Steps, in order**

1. Ski and grip type (skipped if already answered).
2. Mode: recreational or race day.
3. Conditions: shared with glide; snow temperature, snow humidity and snow type carry most weight for grip.
4. Grip base: sanded grip zone (grit), new or already waxed, grip zone length in cm from the ski record.
5. Snow abrasiveness: soft new snow, normal, abrasive/icy or man-made (sets binder and number of layers).
6. Expected change during the session: stable, warming, cooling (sets a backup wax to carry).

**Output**

- Base layer: binder (ironed hardwax binder or base klister) and when to skip it.
- Kick layers: hardwax or klister, number of thin layers, corking between each, and how far each layer extends.
- Covering layer: e.g. a hardwax over klister for transitional snow.
- On-snow adjustments: "slipping" goes warmer, longer or thicker; "icing or sticking" goes colder or shorter, and the product to carry for each.
- Race mode: a test plan with two or three candidate grip set-ups for the skier or tech to try on snow.

## Recommendation engine and the RECOMMEND button

The RECOMMEND button returns, for each layer, the best match from the user's inventory plus up to three marketplace options, with the full procedure and a short reason for each choice.

**How a product is scored (per layer)**

1. Filter: right technique and layer role; race mode keeps fluoro-free only; tools needed are owned (or flagged).
2. Temperature fit: overlap of the product's normalized snow-temperature range with the forecast range; products whose sweet spot is centred on the forecast score highest.
3. Snow-type fit: fine/new, transformed/coarse, wet, dirty or abrasive.
4. Humidity fit: dry, mid or wet band.
5. Mode fit: durability weighted up for recreational, speed weighted up for race day.
6. Personal history: products the user rated 4–5 in similar conditions get a boost; ones rated 1–2 are pushed down.

**Recommendation card**

- *From your box:* the top inventory match per layer, with a fit score (Great, Good, Workable) and the reason ("–8 to –2 °C, fine new snow, dry").
- *Better options to buy:* up to three products from any brand that beat the inventory match, sorted by fit then price, with buy links.
- *Procedure:* the full numbered steps from the glide or grip wizard, built only with owned tools.
- *Save* creates a planned entry in the waxing history, ready to be completed after skiing.

**Rules storage**

Rules live in the `rules` table, not in code, so they can be tuned without a redeploy. Each rule pairs a range of conditions with a layer role, a product category and a procedure template.

**Neutrality and safety**

- No paid placement. If affiliate links are used later, they are labelled and never change the ranking.
- Fluoro products in the user's box are shown with a warning in race mode and excluded from race plans.
- Every card ends with a short note that recommendations are a starting point and race day needs on-snow testing.

## Waxing history and navigation filters

The history is the app's main advantage: every session records what was applied, what the snow actually was, and how the skis ran. Strong filters turn it into a personal wax chart.

**Fields per session (`wax_sessions` + `wax_session_layers`)**

| Field | Type | Notes |
| --- | --- | --- |
| Date and time | timestamp | defaults to now |
| Status | planned / completed | a saved recommendation starts as planned |
| Technique | classic / skate | |
| Ski | link to `skis` | |
| Mode | recreational / race | race adds event name, distance, result |
| Venue | link to `venues` | |
| Forecast conditions | link to `conditions` | captured at planning time |
| Actual conditions | link to `conditions` | entered after skiing |
| Layers | one row each | zone (glide/grip), order, product, method (iron, rub-on, liquid, powder, cork), iron temp °C, passes, scrape/brush steps |
| Finish | text + tags | brushes and roto used, rills tool and insert |
| Glide rating | 1–5 | |
| Grip rating | 1–5 | classic only |
| Durability | 1–5 | how long it lasted (km or hours) |
| Kick feel | slipping / good / icing | classic only |
| Notes and photos | text, images | Supabase Storage |

**Filters (combinable, shown as chips above the list)**

- Date: this season, last 30 days, custom range, or by season (e.g. 2025–26)
- Technique, ski, venue, mode
- Actual snow temperature range (slider, °C) and air temperature range
- Snow type, snow humidity band, air humidity band
- Product or brand used, layer role, fluoro status
- Rating: glide ≥ n, grip ≥ n, kick feel
- Forecast vs actual: show only sessions where they differed by more than 3 °C or a snow-type change
- Free-text search across notes and event names

**Sort and views**

- Sort by date (newest first by default), glide rating, grip rating, or snow temperature.
- *Saved filters*, e.g. "Canmore, –5 to –10 °C, race, glide ≥ 4".
- *Similar to today:* one tap filters history to sessions within ±3 °C snow temperature with the same snow type and humidity band, best-rated first.
- *Compare:* pick two or three sessions side by side (conditions, layers, ratings).
- *Repeat this prep:* copy a past session into a new plan, checking inventory first.

**Insights (phase 2)**

- A chart of glide rating against snow temperature, coloured by product, to show each skier's own best ranges.
- Top products per snow type, and product usage and cost per season.
- Export to CSV.

## Care and learning

A Learn section holds short, step-by-step guides with an embedded video for each, linked from every procedure step so a skier can tap "how?" mid-wax.

- **Cleaning:** hot scraping (cleaning with soft wax), base cleaner and when to avoid it, grip zone cleaning, removing old fluoro before race season, skin cleaning.
- **Glide waxing:** iron temperature and speed, layering, cooling times, scraping edges and grooves, brushing order, roto brushing safety and direction, rills.
- **Grip waxing:** sanding the grip zone, binder, thin hardwax layers and corking, klister in the cold and warm, finding the kick zone (paper test).
- **Storage:** end-of-day care, summer storage wax, ski bags and temperature, strapping skis without crushing camber.
- **Tools:** brush care, sharpening plexi scrapers, cleaning roto brushes.

**Videos**

Embed brands' and federations' YouTube videos rather than hosting them, tagged by topic and brand. Your own videos can be added later through Supabase Storage or a video host.

## Screens and navigation

A five-tab bottom bar (phone first, since waxing happens on the bench) gets to every main screen in one tap.

| Tab | Screen | What it does |
| --- | --- | --- |
| Today | Home | venue forecast, "Similar to today" from history, big Plan a wax button |
| Plan | Wizard | ski → grip type → mode → conditions → glide/grip questions → RECOMMEND |
| Plan | Recommendation card | inventory pick + market options per layer, procedure, Save |
| Plan | Wax-along mode | one step per screen, large text, timers for cooling, "how?" video links |
| History | List | filter chips, sort, saved filters, compare, repeat |
| History | Session detail | conditions forecast vs actual, layers, ratings, notes, photos |
| History | Post-ski check-in | actual conditions + ratings; prompted by notification a few hours after a planned session |
| Wax box | Inventory | products by category, levels, reorder list |
| Wax box | Tools and skis | tools checklist, ski pairs and their specs |
| Learn | Guides | cleaning, waxing, storage, tools, videos |

- Settings (units, default mode, venues, account) sits under a profile icon on Today.
- Works offline for viewing inventory, history and saved plans (wax rooms often have poor signal).

## Phasing, open questions and build prompts

Build the inventory and history first, since they are useful on day one even before the recommendation rules are tuned.

**Phases**

1. **MVP:** auth, skis, inventory (catalogue of 4–5 brands, about 150 products), conditions from Open-Meteo, waxing history with filters, Learn with embedded videos.
2. **Recommend:** rules table, glide and grip wizards, RECOMMEND card, inventory gaps, wax-along mode.
3. **Learn from history:** personal boosts in scoring, Similar to today, Compare, Insights charts, CSV export.
4. **Grow:** full catalogue, club/team accounts sharing a wax box, venue snow reports, marketplace links.

**Open questions**

- [ ] Who maintains the product catalogue, and how often (brands release new lines each autumn)?
- [ ] Which brands go in the MVP catalogue first?
- [ ] Free app, one-time purchase, or subscription with a free tier?
- [ ] Affiliate links: yes or no, given the brand-neutral promise?
- [ ] Web app only (installable PWA) or native wrappers later?
- [ ] How to estimate snow temperature: a simple formula first, or a model trained on users' logged readings later?

**Build prompts for Claude Code (one per phase)**

1. "Create a Next.js App Router + Supabase project for an XC ski wax app. Add Supabase Auth, and create the tables in the Data model section with Row Level Security on user_id. Seed `brands` and `products` from a CSV I'll provide."
2. "Build the Wax box: catalogue search, add to inventory, amount-left levels, tools checklist, and skis CRUD. Phone-first layout with a five-tab bottom bar."
3. "Build the waxing history: session form with layers, forecast and actual conditions, ratings, photos to Supabase Storage. Add the list with combinable filter chips, sorting, saved filters and URL-encoded filter state."
4. "Add Open-Meteo hourly forecasts per venue, the conditions form with snowball-test prompt, and a snow-temperature estimate the user can override."
5. "Build the rules-based recommendation engine from the `rules` table, the glide and grip wizards, and the RECOMMEND card with inventory match, up to three market options, and procedure steps limited to owned tools."
