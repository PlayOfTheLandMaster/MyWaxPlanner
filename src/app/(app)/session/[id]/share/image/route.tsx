import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadSession } from "@/lib/history/load";
import { safeTimeZone } from "@/lib/history/csv";
import { shareFilename, shareSummary, toShareInput, type ShareSummary } from "@/lib/history/share";

// The session's summary as a picture (PNG, 1080 × 1350: Facebook's portrait
// size), for the share sheet. Read through Row Level Security as the signed-in
// user, so it only ever draws their own session; it is never public.

const W = 1080;
const H = 1350;
const NAVY = "#1d4f91";
const INK = "#14213d";
const MUTED = "#5b6475";
const TILE = "#eef3fa";

export async function GET(request: NextRequest, ctx: RouteContext<"/session/[id]/share/image">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Sign in to share a session.", { status: 401 });
  const s = await loadSession(supabase, id);
  if (!s) return new Response("That session is no longer in your history.", { status: 404 });

  const params = request.nextUrl.searchParams;
  const timeZone = safeTimeZone(params.get("tz"));
  const input = toShareInput(s);
  const summary = shareSummary(input, { notes: params.get("notes") === "1", timeZone });

  return new ImageResponse(<Card s={summary} />, {
    width: W,
    height: H,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${shareFilename(input, timeZone, "png")}"`,
    },
  });
}

function Card({ s }: { s: ShareSummary }) {
  // Long notes are cut so the card never overflows; the PDF has room for all of it.
  const notes = s.notes && s.notes.length > 280 ? `${s.notes.slice(0, 277).trimEnd()}…` : s.notes;
  const many = s.glide.length + s.grip.length > 6;
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "#ffffff", color: INK, fontSize: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", background: NAVY, color: "#ffffff", padding: "56px 72px 44px" }}>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.85, textTransform: "uppercase", letterSpacing: 2 }}>{s.kicker}</div>
        <div style={{ display: "flex", fontSize: s.title.length > 28 ? 60 : 76, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>{s.title}</div>
        {s.place && <div style={{ display: "flex", fontSize: 36, marginTop: 12 }}>{s.place}</div>}
        <div style={{ display: "flex", fontSize: 32, marginTop: 16, opacity: 0.9 }}>{s.date}</div>
        {s.result && <div style={{ display: "flex", fontSize: 40, fontWeight: 700, marginTop: 20 }}>{`Result: ${s.result}`}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 72px 0", gap: 30, overflow: "hidden" }}>
        {s.conditions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {s.conditions.map((c) => (
              <div key={c} style={{ display: "flex", background: TILE, borderRadius: 999, padding: "10px 24px", fontSize: 30 }}>
                {c}
              </div>
            ))}
          </div>
        )}

        {[
          { title: "Glide", rows: s.glide },
          { title: "Grip", rows: s.grip },
        ]
          .filter((z) => z.rows.length > 0)
          .map((z) => (
            <div key={z.title} style={{ display: "flex", flexDirection: "column", gap: many ? 6 : 10 }}>
              <div style={{ display: "flex", fontSize: 28, color: MUTED, textTransform: "uppercase", letterSpacing: 2 }}>{z.title}</div>
              {z.rows.map((r, i) => (
                <div key={i} style={{ display: "flex", fontSize: many ? 30 : 36, lineHeight: 1.25 }}>
                  <span style={{ fontWeight: 700 }}>{r.wax}</span>
                  <span style={{ color: MUTED, marginLeft: 14 }}>{r.role}</span>
                </div>
              ))}
            </div>
          ))}

        {s.ratings.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 28, color: MUTED, textTransform: "uppercase", letterSpacing: 2 }}>How it went</div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {s.ratings.map((r) => (
                <div key={r} style={{ display: "flex", fontSize: 34, marginRight: 40, marginBottom: 6 }}>
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {notes && <div style={{ display: "flex", fontSize: 28, color: MUTED, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>{notes}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", margin: "0 72px", padding: "24px 0 40px", borderTop: `2px solid ${TILE}`, fontSize: 26 }}>
        <span style={{ fontWeight: 700, color: NAVY }}>My Wax Planner</span>
      </div>
    </div>
  );
}
