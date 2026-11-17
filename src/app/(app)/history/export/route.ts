import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { parseFilters } from "@/lib/history/filters";
import { historyQuery } from "@/lib/history/query";
import { csvFilename, historyCsv, safeTimeZone, type ExportDetails, type ExportSession } from "@/lib/history/csv";

// "Download as spreadsheet" on History: the sessions the list shows, with the
// same filters and sort, as a CSV file. Every read goes through Row Level
// Security as the signed-in user, so it can only ever contain their own rows.

const PAGE = 1000; // PostgREST's default row cap per request
const MAX_ROWS = 10_000;
const ID_CHUNK = 100; // keeps the "id in (...)" address well under URL limits

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", request.url));

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const f = parseFilters(params);
  const who = await loadSkierContext();
  const skier = f.skier ?? (who.skiers.length > 0 ? who.key : undefined);
  const timeZone = safeTimeZone(request.nextUrl.searchParams.get("tz"));
  const now = new Date();

  const sessions: ExportSession[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await historyQuery(
      supabase,
      "id, occurred_at, status, technique, mode, skier_name, ski_name, venue_name, event_name, glide_rating, grip_rating, durability_rating, kick_feel, snow_temp_c, air_temp_c, snow_type, snow_humidity_band, air_humidity_band",
      f,
      skier,
      now,
      who.seasonStart,
    ).range(from, from + PAGE - 1);
    if (error) return failed(error.message);
    const page = (data ?? []) as unknown as ExportSession[];
    sessions.push(...page);
    if (page.length < PAGE) break;
  }

  const details = new Map<string, ExportDetails>();
  for (let i = 0; i < sessions.length; i += ID_CHUNK) {
    const ids = sessions.slice(i, i + ID_CHUNK).map((s) => s.id);
    const { data, error } = await supabase
      .from("wax_sessions")
      .select(
        "id, event_result, notes, finish_notes, layers:wax_session_layers (zone, position, layer_role, custom_product, product:products (name, brand:brands (name)))",
      )
      .in("id", ids);
    if (error) return failed(error.message);
    for (const row of (data ?? []) as unknown as (ExportDetails & { id: string })[]) details.set(row.id, row);
  }

  return new NextResponse(historyCsv(sessions, details, timeZone, who.me), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(now, timeZone)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function failed(message: string) {
  return new NextResponse(`Could not read your history: ${message}`, {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
