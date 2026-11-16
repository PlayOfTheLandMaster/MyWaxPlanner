# Vauhti layering recipes, 2025/2026

Research notes for a possible later "brand recipes" feature. **Nothing in the
app reads this file.** It is a summary in our own words of the layering advice
in Vauhti's *Racing waxes and how to apply those – Cross-Country* (PDF,
October 2025, 25 slides). The waxes themselves are in the shared catalogue
(`supabase/migrations/20261124000000_vauhti_catalogue.sql`). Page numbers refer
to the PDF.

Temperatures are as printed. The PDF does not say whether they are air or snow
temperatures; the catalogue treats them as air temperatures (since
`20261128000000`; they were snow temperatures before).

## Glide: base → middle → top, paraffin and powder (pp. 15–16)

The approximate iron temperature for the top layer is in brackets, where given.

| Band | Base | Middle | Top |
|---|---|---|---|
| +8 to 0 °C | UP Polar (paraffin) | UP Polar Liquid | RACE Red Powder (≈150–180 °C) |
| +8 to 0 °C | UP Polar (paraffin) | UP Polar Liquid | RACE MoS2 Powder (≈180–200 °C) |
| 0 to −4 °C, old snow | RACE LDR White (paraffin) | RACE LDR White Liquid | RACE Pink Powder (≈150–180 °C) |
| 0 to −4 °C, old snow | RACE LDR White (paraffin) | RACE LDR White Liquid | RACE Violet Powder (≈180–200 °C) |
| 0 to −4 °C, new snow | RACE LDR White (paraffin) | RACE LDR White Liquid | RACE Pink Powder (≈150–180 °C) |
| −5 to −18 °C, old snow | RACE LDR Black (paraffin) | RACE LDR White Liquid | RACE Violet Powder (≈150 °C) |
| −5 to −18 °C, old snow | RACE LDR Black (paraffin) | RACE LDR White Liquid | RACE Blue Powder (≈150 °C) |
| −5 to −18 °C, new snow | UP Polar (paraffin) | UP Polar Liquid | RACE Green Powder (≈150 °C) |
| −5 to −18 °C, new snow | UP Polar (paraffin) | UP Polar Liquid | RACE Blue Powder (≈150 °C) |
| −5 to −18 °C, new snow | UP Polar (paraffin) | UP Polar Liquid | RACE C Powder (≈150 °C) |

Suggested tests alongside these:

- **0 to −4 °C:** a mix of RACE MoS2 or RACE Red with RACE Pink and RACE Violet.
- **−5 to −18 °C, old snow:** a mix of RACE MoS2 or RACE Green with Blue and Violet.
- **−5 to −18 °C, new snow:** a mix of RACE C with Green and Blue.
- **Wet and humid snow:** TOP RACE Red Spray as a topping.
- **Dry, cold snow:** the TOP RACE blocks.

The PDF adds that iron temperature affects how the ski feels, and that a hotter iron can pay off in mild, wet snow.

## Glide: liquids only (p. 18)

| Band | Base | Middle | Top |
|---|---|---|---|
| +8 to 0 °C | UP Polar Liquid | RACE Red Liquid | TOP RACE Red Spray |
| 0 to −4 °C, old snow | RACE LDR White Liquid | RACE Violet Liquid | TOP RACE Violet Block |
| 0 to −4 °C, new snow | RACE LDR White Liquid | RACE Pink Liquid | TOP RACE Red Spray |
| −5 to −18 °C, old snow | RACE LDR White Liquid | RACE Blue Liquid | TOP RACE MoS2 Block |
| −5 to −18 °C, new snow | UP Polar Liquid | RACE Green Liquid | TOP RACE Blue Block |

## Glide: "cornerstones" matrix (pp. 14 and 17)

The waxes the PDF builds on for each kind of snow (columns) and weather (rows).
It suggests nothing for warm, wet, new snow.

| | New and fine-grained snow | Old and coarse snow |
|---|---|---|
| **Warm / wet** | — | Paraffin set (p. 14): UP Polar (paraffin and liquid), RACE Red Powder, RACE MoS2 Powder. Liquid set (p. 17): UP Polar Liquid, RACE Red Liquid, TOP RACE Red Spray |
| **Around zero / humid** | Paraffin set: RACE LDR White (paraffin and liquid), RACE Pink Powder. Liquid set: RACE LDR White Liquid, RACE Pink Liquid, TOP RACE Red Spray | Paraffin set: RACE LDR White (paraffin and liquid), RACE Violet Powder, RACE MoS2 Powder. Liquid set: RACE LDR White Liquid, RACE Violet Liquid, TOP RACE Violet Block |
| **Cold / dry** | Paraffin set: UP Polar (paraffin and liquid), RACE Green Powder, RACE C Powder. Liquid set: UP Polar Liquid, RACE Green Liquid, TOP RACE Blue Block | Paraffin set: RACE LDR Black (paraffin), RACE LDR White Liquid, RACE Blue Powder, RACE MoS2 Powder. Liquid set: RACE LDR White Liquid, RACE Blue Liquid, TOP RACE MoS2 Block |

## Glide: how each form goes on (pp. 3, 7–8, 10, 13)

- **Clean & Glide:** apply it to the glide zone, wipe it off, and brush with nylon after a minute or two. Repeat until the cloth stays clean.
- **Paraffins and powders:** iron at roughly 150–200 °C, then scrape lightly while still warm. Once cool, scrape and brush in this order: brass, horsehair, nylon.
- **Liquids:** a generous layer with the sponge applicator, left to dry completely, then brushed in the same brush order.
- **TOP RACE Red Spray:** spray it on, spread with a synthetic cork with fleece, and let it dry.
- **TOP RACE blocks:**
  1. Rub the block on.
  2. Cork with a synthetic cork with felt.
  3. Rub the block on again.
  4. Polish with felt.
  5. Optionally, cork with natural cork.
  6. Brush with nylon.

  A merino roto is an optional tool for this.

## Grip sequences (pp. 24–25)

The PDF's boxes are unlabelled; they are numbered here in the PDF's order.
"Thin" layers are each smoothed with a synthetic cork unless noted.

1. **+3 °C or warmer, wet snow.**
   1. KS Base klister, thin and even; let it cool.
   2. Thin PURE RACE Violet Klister; cool.
   3. Thin PURE RACE LDR Klister; cool.
   4. Thin PURE RACE Red Klister; cool. Use more or less of it to suit the snow.
2. **+2 to 0 °C, moist snow.**
   1. KS Base klister, thin; cool.
   2. Thin PURE RACE Violet Klister; cool.
   3. Thin PURE RACE LDR Klister; cool.
   4. A layer of PURE RACE Red grip wax, smoothed with the thumb.
3. **−1 to −2 °C, new snow.**
   1. GS Base Super (liquid), thin; cool.
   2. 1–2 thin layers of PURE RACE Silver, smoothed with the thumb.
   3. 2–4 layers of PURE RACE Pink (or GT Pink), corked.
4. **−1 to −3 °C, old and coarse artificial snow.**
   1. KS Base (liquid klister), thin; cool.
   2. Thin PURE RACE Blue Klister; cool.
   3. 2 layers of PURE RACE Silver, corked.
5. **−2 to −7 °C, new snow.**
   1. Iron in a thin layer of GS Base AT; let it cool a little.
   2. 1–2 thin layers of PURE RACE LDR, corked.
   3. 3–5 thin layers of PURE RACE Violet, corked.
6. **−2 to −7 °C, old or artificial snow.**
   1. GS Base Super (liquid), thin; cool.
   2. 3–5 thin layers of PURE RACE LDR, corked.
   3. 1–2 thin layers of PURE RACE Violet, corked.
7. **−6 to −12 °C, new snow.**
   1. Iron in a thin layer of GS Base AT; let it cool a little.
   2. 4–5 thin layers of PURE RACE Violet, corked.
   3. Optionally, top with PURE RACE Blue (or GT Carrot), corked.
8. **−12 to −20 °C, new snow.**
   1. Iron in a thin layer of GS Base AT; let it cool a little.
   2. While the base is still warm, add a layer of PURE RACE Blue; smooth it and let it cool.
   3. Another layer of PURE RACE Blue, corked.
   4. 2–4 thin layers of PURE RACE Green (or GT Green), corked.
9. **−7 to −20 °C, old or artificial snow.**
   1. Iron in a thin layer of GS Base Super; let it cool a little.
   2. While the base is still warm, add a layer of PURE RACE LDR; smooth it and let it cool.
   3. 2–4 thin layers of PURE RACE Blue, corked.

GT Pink, GT Green and GT Carrot appear only in these recipes. The PDF gives no
range or description for them, so they are not in the catalogue.

## Notes for building a "brand recipes" feature

- A recipe names specific products, so it must stay **separate from the
  recommendation engine**, which never scores brand. Show recipes as the
  brand's own advice, clearly labelled, next to the neutral plan rather than
  inside it.
- Bands overlap and some appear twice with alternatives (for example
  +8 to 0 °C has two top layers), so a recipe is a list of options, not one
  answer.
- Iron temperatures in the recipes vary by band for the same wax (RACE Violet:
  ≈180–200 °C when mild, ≈150 °C when cold), which is why the catalogue's
  single `iron_temp_c` is left empty for these waxes.
