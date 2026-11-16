# Catalogue sources and the yearly refresh

Where every product in the **shared catalogue** came from, the decisions taken
for each brand, and how to refresh it once a year. Brands bring out new lines
each autumn (the spec's first open question), so a refresh before the season,
around **October**, catches them.

The catalogue is written only by database changes in `supabase/migrations/`.
Each brand's change says what it added and why; this file is the index.

## Sources

| Brand | Source | How it was read | Read | Database change | Rows |
|---|---|---|---|---|---|
| Vauhti | [Racing waxes and how to apply those – Cross-Country (PDF)](https://vauhti.fi/wp-content/uploads/VAUHTI-RACING-WAXES-AND-HOW-TO-APPLY-THOSE-%E2%80%93-Cross-Country-1.pdf) | PDF, page by page as images; ranges confirmed on the packaging photos | 2026-11-15 | `20261124000000_vauhti_catalogue.sql`, then `20261128000000_vauhti_air_temperatures.sql` | 42 |
| Swix | [Pro series](https://swixsport.com/us/article/wax-manual/pro-series) | web page text | 2026-11-15 | `20261125000000_swix_catalogue.sql` | 17 + 4 |
| Swix | [Application of liquid glide waxes](https://swixsport.com/us/article/wax-manual/application-of-liquid-glide-waxes) | web page text | 2026-11-15 | same | (fluoro status of the liquids) |
| Swix | [Klister application guide](https://swixsport.com/us/article/wax-manual/klister-application-guide) | web page text | 2026-11-15 | same | 12 |
| Swix | [Application of base wax and kick wax](https://swixsport.com/us/article/wax-manual/application-of-base-wax-and-kick-wax) | web page text | 2026-11-15 | same | 16 |
| Swix | [Post-treatment of new skis](https://swixsport.com/us/article/wax-manual/post-treatment-of-new-skis) | web page text | 2026-11-15 | same | 2 |
| Toko | [All Ski Waxes, Professional filter](https://www.toko.ch/en/wax-tools/all-ski-waxes/?tx_product_productlist%5Bfiltered%5D=1&tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=3) | web page text | 2026-11-15 | `20261126000000_toko_rex_catalogue.sql` | 29 |
| Toko | [All Ski Waxes, Amateur filter](https://www.toko.ch/en/wax-tools/all-ski-waxes/?tx_product_productlist%5Bfiltered%5D=1&tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=2) | PDF saved by the owner (the site refuses automated requests) | 2026-11-15 | `20261127000000_toko_amateur_rex_kick.sql` | 17 new |
| Toko | [All Ski Waxes, Beginner filter](https://www.toko.ch/en/wax-tools/all-ski-waxes/?tx_product_productlist%5Bfiltered%5D=1&tx_product_productlist%5Bfilter%5D%5BtargetGroup%5D=1) | **not read yet** | — | — | — |
| Rex | [Glide collection](https://rexwax-usa.com/collections/glide) | the shop's product data (`/collections/glide/products.json`) | 2026-11-15 | `20261126000000_toko_rex_catalogue.sql` | 16 |
| Rex | [Kick wax collection](https://rexwax-usa.com/collections/kick-wax) | the shop's product data (`/collections/kick-wax/products.json`) | 2026-11-15 | `20261127000000_toko_amateur_rex_kick.sql` | 18 |

Research notes kept beside the catalogue (nothing in the app reads them):
`docs/research/vauhti-recipes.md` and `docs/research/swix-notes.md`.

## Decisions per brand

These hold for future refreshes unless the owner changes them.

| Brand | Ranges are | Fluoro-free when | Notes |
|---|---|---|---|
| Vauhti | **air** (changed from snow in `20261128000000`): no snow range, so not recommended | the grip section is titled fluorocarbon-free; glide waxes stay `unknown` | Iron temperatures are kept in the recipes notes, not the catalogue. Grip recipes are numbered 1–9. |
| Swix | **air** temperatures: no snow range, so not recommended | the Pro system (TSP, TS Turbo, PS, HS, TSL/HSL/PSL), as stated | One row per wax, whatever the package size. Waxes only named in passing are left out. |
| Toko | **air** | the text says "fluor-free" or "PFC free" | Toko's own pages give no prices. Plant-based Natural waxes are filed as paraffin. Express Grip & Glide is a glide liquid. Kits are left out. |
| Rex | **air** | the text says "fluor free", "non-fluor" or "non-fluorinated"; NF/NFX names alone don't count | Price is the lowest-priced size, in USD. |

Every brand is air-rated, so no shared wax carries a snow range. A skier
enters their own on a catalogue wax's page in the wax box ("Your snow range",
table `user_snow_ranges`, `20261129000000`). Plans use it for that skier
only, and the shared row is never changed.

Rules for every brand:
- Facts only, in our own words.
- A value the source doesn't state is left empty or `unknown`, never guessed.
- Anything inferred from a description is said to be inferred in the database change.
- Every row goes in only after the owner has seen a table of it and said OK.

## Yearly refresh checklist

1. **Re-read each source above.** New lines often appear on the same pages. Check the brand's site for a newer PDF (Vauhti publishes one per season).
2. **Read tables and labels from the layout**, not just extracted text. For PDFs, read each page as an image.
3. **Compare with the catalogue.** In the Supabase SQL editor, list a brand's shared products:
   ```sql
   select p.name, p.published_temp_min_c, p.published_temp_max_c, p.fluoro_status, p.price, p.active
   from products p join brands b on b.id = p.brand_id
   where b.name = 'Swix' and b.created_by is null
   order by p.name;
   ```
4. **Sort the differences** into three groups:
   - new products;
   - changed facts (ranges, fluoro status, prices);
   - products no longer listed.
5. **Show the owner a table** of each group and wait for OK.
6. **Write one new database change** for the refresh:
   - insert new products;
   - update changed facts;
   - set `active = false` on discontinued products. Never delete them, because wax boxes and history may hold them.
7. **Test it on a local database** with every change applied in order, including running it twice. Then run `npm test`, `npm run lint`, `npm run build` and `supabase/tests/rls_check.sql`.
8. **Apply it** to the Supabase project and set its version in `supabase_migrations.schema_migrations` to the file's timestamp. Then compare a checksum of the live rows with the local test. Sort with `order by p.name collate "C"` in the checksum: Supabase and a local Postgres can sort names that differ only in capitals differently, which changes the checksum without any difference in the data.
9. **Update this file:** the dates, the database changes and the row counts.

### Network access for a cloud session

Cloud sessions can only reach hosts their environment allows. The
"Wax and vacation planners" environment allows `vauhti.fi`, `swixsport.com`,
`brav-cms.imgix.net` (Swix's images), `www.toko.ch` and `rexwax-usa.com`. A
new brand's site needs adding there first. Toko's site refuses automated
requests, so its lists come in as PDFs saved by hand.
