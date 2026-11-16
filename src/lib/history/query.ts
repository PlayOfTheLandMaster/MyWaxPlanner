import type { createClient } from "@/lib/supabase/server";
import { periodRange, type Filters } from "./filters";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * The History list's question, filters and sort included, so the list and the
 * spreadsheet download can never disagree about which sessions match.
 * `skier` is the resolved skier: the one in the address, or else the one
 * picked on Today ("me", "all" or a skier id).
 */
export function historyQuery(supabase: Client, select: string, f: Filters, skier: string | undefined, now: Date) {
  let query = supabase.from("wax_session_list").select(select);
  const range = periodRange(f.period, now);
  if (range?.from) query = query.gte("occurred_at", range.from);
  if (range?.to) query = query.lt("occurred_at", range.to);
  if (f.technique) query = query.eq("technique", f.technique);
  if (skier === "me") query = query.is("skier_id", null);
  else if (skier && skier !== "all") query = query.eq("skier_id", skier);
  if (f.ski) query = query.eq("ski_id", f.ski);
  if (f.venue) query = query.eq("venue_id", f.venue);
  if (f.mode) query = query.eq("mode", f.mode);
  if (f.status) query = query.eq("status", f.status);
  if (f.snow) query = query.eq("snow_type", f.snow);
  if (f.snowhum) query = query.eq("snow_humidity_band", f.snowhum);
  if (f.airhum) query = query.eq("air_humidity_band", f.airhum);
  if (f.brand) query = query.contains("brand_names", [f.brand]);
  if (f.product) query = query.contains("product_ids", [f.product]);
  if (f.glide) query = query.gte("glide_rating", f.glide);
  if (f.grip) query = query.gte("grip_rating", f.grip);
  if (f.kick) query = query.eq("kick_feel", f.kick);
  if (f.tmin !== undefined) query = query.gte("snow_temp_c", f.tmin);
  if (f.tmax !== undefined) query = query.lte("snow_temp_c", f.tmax);
  if (f.q) query = query.ilike("search_text", `%${f.q.toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  if (f.sort === "glide") query = query.order("glide_rating", { ascending: false, nullsFirst: false });
  if (f.sort === "grip") query = query.order("grip_rating", { ascending: false, nullsFirst: false });
  if (f.sort === "snow_temp") query = query.order("snow_temp_c", { ascending: true, nullsFirst: false });
  // id last, so paging through a long export never skips or repeats a row.
  return query.order("occurred_at", { ascending: false }).order("id");
}
