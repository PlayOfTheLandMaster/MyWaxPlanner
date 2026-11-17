import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readerTimeZone } from "@/lib/reader-zone";
import { dayIn, readTodayVenue, todayVenueId } from "./today";

/** Today's venue id (picked today, else home) and the reader's day it is for. */
export async function loadTodayVenue(supabase: SupabaseClient): Promise<{ id: string | null; home: string | null; day: string }> {
  const [{ data }, tz] = await Promise.all([
    supabase.from("profiles").select("home_venue_id, current_venue").maybeSingle(),
    readerTimeZone(),
  ]);
  const day = dayIn(new Date(), tz);
  const home = (data?.home_venue_id as string | null) ?? null;
  return { id: todayVenueId(readTodayVenue(data?.current_venue), home, day), home, day };
}
