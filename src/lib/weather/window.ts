import "server-only";
import { ForecastError, fetchHours, summarise, venueNow, type ForecastWindow } from "./forecast";
import type { VenueRow } from "@/lib/venues/load";

/** `at` (an exact moment, ISO) wins over `date` and `time` (venue-local). */
export type WindowRequest = { date?: string; time?: string; hours?: number; at?: string };
export type WindowResult =
  | { window: ForecastWindow; date: string; time: string; hours: number; error?: undefined }
  | { window?: undefined; date?: string; time?: string; hours: number; error: string };

/**
 * The forecast for a session at a venue. A missing date or time means "the
 * next whole hour, today, at the venue" — in the venue's time zone.
 */
export async function forecastFor(venue: VenueRow, req: WindowRequest): Promise<WindowResult> {
  const hours = Math.min(8, Math.max(1, req.hours ?? 2));
  if (venue.latitude === null || venue.longitude === null) {
    return { hours, error: `${venue.name} has no position yet, so there is no forecast for it.` };
  }
  try {
    const at = req.at ? Date.parse(req.at) : NaN;
    // A moment days back (a wax job recorded afterwards) needs more of the past.
    const daysBack = Number.isNaN(at) ? 2 : (Date.now() - at) / 86_400_000 + 2;
    const { hours: all, data } = await fetchHours({ ...venue, latitude: venue.latitude, longitude: venue.longitude }, daysBack);
    const now = venueNow(data.utc_offset_seconds);
    // The moment in the venue's own clock, which is how the forecast's hours are labelled.
    const local = Number.isNaN(at) ? null : new Date(at + data.utc_offset_seconds * 1000).toISOString();
    const date = local ? local.slice(0, 10) : req.date && /^\d{4}-\d{2}-\d{2}$/.test(req.date) ? req.date : now.date;
    const time = local ? local.slice(11, 16) : req.time && /^\d{2}:\d{2}$/.test(req.time) ? req.time : now.hour;
    const window = summarise(
      all,
      { id: venue.id, name: venue.name, latitude: venue.latitude, longitude: venue.longitude, elevation_m: venue.elevation_m },
      data,
      `${date}T${time}`,
      hours,
    );
    return { window, date, time, hours };
  } catch (e) {
    if (e instanceof ForecastError) return { hours, error: e.message };
    throw e;
  }
}
