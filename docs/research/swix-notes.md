# Swix waxing notes

Research notes for a possible later "brand recipes" feature. **Nothing in the
app reads this file.** It is a summary in our own words of Swix's online wax
manual (swixsport.com, US site, read November 2026). The waxes themselves are
in the shared catalogue (`supabase/migrations/20261125000000_swix_catalogue.sql`).

Swix's ranges are treated as **air** temperatures in the catalogue, so these
waxes carry no snow range and are not recommended until one is added.

Pages read:

- Chapter 8, *Post-treatment of new or newly stone-ground skis*
- Chapter 11, *The Pro series*
- Chapter 15, *Application of liquid glide waxes*
- Chapter 17, *Klister application guide*
- Chapter 19, *Application of soft and hard kick waxes*

## Glide: the Pro system (ch. 11)

- **Three levels:** Performance Speed (PS, PSL) for training, High Speed (HS, HSL) for training and shorter races, and Top Speed (TSP, TST, TSL) for racing.
- **Fluoro status:** all of the Pro system is stated fluoro-free.
- **TSP powders** are very hard, so they come only as powder. They cover fine dry to coarse wet snow and resist picking up dirt.
- **TS Turbo blocks** are made to be applied with roto wool. They work alone or on top of other waxes, and are best in fine, new snow.
- **TSL liquid** works alone, but best as a topping, mainly on transformed or moist snow.
- **PS and HS** are ironed in. PS is widely used for base prep; HS glides better than plain hydrocarbon wax in humid snow.
- **One product or layers:** Swix notes a single product often beats a layer-by-layer system, and only testing settles it.
- **Long races:** a hard base (DHP White Marathon powder) under TS powder, Turbo or a liquid.
- **Hand structure:** add it after the base layers and powder, but before any liquid topping.

## Glide: liquids (ch. 15)

1. Spray the liquid onto a felt cork and spread it from tip to tail.
2. Let it dry for at least 15 minutes, indoors above about 15 °C. Drying outside takes longer.
3. Optional, for better durability: a roto fleece at about 1500 RPM, working from tip to tail with light pressure.
4. Brush firmly with a fine nylon hand brush or a nylon roto brush.

Hot-wax the base now and then, and always before using liquids on new or freshly ground skis. In cold snow, put a hard glide wax (PS, HS or Marathon) under the liquid, or TS powder for racing.

## Glide: new or freshly ground skis (ch. 8)

The treatment depends on the base structure: cold-snow (fine) structures need the most work.

- **Fine structure:**
  - A few strokes with Fibertex to remove micro-hairs.
  - Then the same steps as medium.
- **Medium structure:**
  1. Brush with steel or bronze.
  2. Clean with Glide Wax Cleaner on Fiberlene and a fine steel brush, then wipe and let it dry for 5–10 minutes.
  3. Brush tip to tail.
  4. Saturate the base with a soft wax (BP99 or PS10) at about 120 °C, in one continuous pass from tip to tail.
  5. Let it cool for at least 10 minutes, or overnight. Scrape with a sharp plexi and brush 5–10 times.
  6. Iron PS6 in three times at about 140 °C, without scraping in between, and let it cool for at least 10 minutes.
  7. Scrape and brush. Repeat the PS6 cycle at least once more, and more for cold-snow skis.
- **Coarse structure, or a transparent base:**
  1. Do the same cleaning.
  2. Do one PS6 cycle at about 160 °C, then scrape and brush.

  After that, the skis are ready for race wax; liquids are common in these conditions. Iron rarely on these skis, and use BPL to protect the base for travel.

## Grip: hard and soft kick wax (ch. 19)

- **Two lines:** V for recreation and training, VP for competition.
- **Grip zone and base:**
  1. Sand the grip zone (about 60–65 cm) with #120 paper, tip to tail only, after the glide zones are done.
  2. Wipe with Fiberlene.
  3. Iron in a thin base wax (VG035 or VG030) at 80–110 °C and let it cool.
  4. Melt a layer of V30 Blue (or V40 Blue Extra) on top without mixing it in, then cool and cork.
  5. Apply the wax of the day.
- **Hard waxes (0 °C and colder):**
  - Build thin layers like a pyramid: long at first, shortest under the foot.
  - Cork lightly, so some texture stays in the wax.
  - Put the first layers on indoors and the last outdoors.
- **Soft waxes (0 °C and warmer):**
  - The base klister spray KB20C can replace the ironed base.
  - Keep layers thin; soft waxes need fewer, thicker layers than hard ones.
  - Chill the wax first, and cork with a new cork and light pressure until the layer is even.

## Grip: klister (ch. 17)

1. **Prepare the grip zone:** sand it with #100 paper, tip to tail, after the glide zones. Wipe with Fiberlene, and tape the ends of the grip zone.
2. **Base klister:** KB20C spray, smoothed by thumb at once and left to dry for 5 minutes; or KX20, ironed in carefully, which lasts a little longer.
3. **Middle layer:** KX35 or KX30 (KX35N or KX45N are also suggested) in a fishbone pattern. Warm it lightly with a heat gun, rub it even with the thumb and let it cool. This layer holds the top layer in place and helps wear.
4. **Klister of the day:** chosen for the conditions, warmed, rubbed even, and the groove scraped clean. The top layer should be thicker than the base and middle layers together.
5. **Covering against icing (optional):**
   - Once the klister is cold, add at least three thin hardwax layers outdoors, corking gently between them.
   - The hardwax is usually a little harder than the temperature suggests.
   - The usual klisters to cover are KX40S, KX35N, KX45N and K22. The usual covering waxes are VP40, VP45, VP50 and VP55.

Other tips:
- Apply klister indoors at room temperature, with a warmed tube.
- Wax klister shorter than hardwax on skis used for both.
- To mix two klisters, lay them in alternate fishbone strings and smooth them together.
- Before re-waxing, dry the old klister with a heat gun or by hand, never an iron.
- A fine "orange skin" of imprints after skiing means the klister is working.

## Notes for building a "brand recipes" feature

- As with Vauhti, show these as Swix's own advice, clearly labelled, beside the neutral plan, never inside the engine's scoring.
- The iron temperatures above depend on the job (PS6 at about 140 °C or 160 °C, a base wax at 80–110 °C), which is why the catalogue's single `iron_temp_c` is empty for Swix waxes.
