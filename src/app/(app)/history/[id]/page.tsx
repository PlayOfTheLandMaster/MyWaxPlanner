import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/current-user";
import { loadSession, type Conditions } from "@/lib/history/load";
import { HUMIDITY_LABELS, LAYER_ROLE_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import {
  KICK_FEEL_LABELS,
  METHOD_LABELS,
  MODE_LABELS,
  RATING_WORDS,
  SKY_LABELS,
  TRACK_LABELS,
  ZONE_LABELS,
} from "@/lib/history/vocab";
import { LocalTime } from "@/components/local-time";
import { Photos } from "./photos";
import { deleteSession } from "../actions";

export const metadata: Metadata = { title: "Session · My Wax Planner" };

export default function SessionPage({ params, searchParams }: PageProps<"/history/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Link href="/history" className="inline-flex min-h-11 items-center self-start text-sm text-link underline">
        ← History
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const t = (n: number | null) => (n === null ? null : `${n > 0 ? "+" : ""}${n}`.replace("-", "−"));

function conditionsLines(c: Conditions): string[] {
  return [
    c.snow_temp_c !== null ? `Snow ${t(c.snow_temp_c)} °C${c.snow_temp_estimated ? " (estimated)" : ""}` : null,
    c.air_temp_c !== null ? `Air ${t(c.air_temp_c)} °C` : null,
    c.air_rh_pct !== null ? `Air humidity ${c.air_rh_pct} %` : null,
    c.snow_humidity_band ? `Snow ${HUMIDITY_LABELS[c.snow_humidity_band as keyof typeof HUMIDITY_LABELS].toLowerCase()}` : null,
    c.snow_type ? SNOW_TYPE_LABELS[c.snow_type as keyof typeof SNOW_TYPE_LABELS] : null,
    c.new_snow_cm !== null ? `${c.new_snow_cm} cm new snow` : null,
    c.sky ? SKY_LABELS[c.sky as keyof typeof SKY_LABELS] : null,
    c.wind_kmh !== null ? `Wind ${c.wind_kmh} km/h` : null,
    c.track ? `Track ${TRACK_LABELS[c.track as keyof typeof TRACK_LABELS].toLowerCase()}` : null,
  ].filter((x): x is string => x !== null);
}

async function Detail({
  params,
  searchParams,
}: {
  params: PageProps<"/history/[id]">["params"];
  searchParams: PageProps<"/history/[id]">["searchParams"];
}) {
  const { id } = await params;
  const saved = (await searchParams).saved === "1";
  const supabase = await createClient();
  const [s, user] = await Promise.all([loadSession(supabase, id), currentUser()]);
  if (!s || !user) notFound();

  const photoUrls = s.photos.length
    ? ((await supabase.storage.from("session-photos").createSignedUrls(s.photos.map((p) => p.storage_path), 3600)).data ?? [])
    : [];
  const urlFor = new Map(photoUrls.map((u) => [u.path, u.signedUrl]));

  const ratings = [
    ["Glide", s.glide_rating],
    ["Grip", s.technique === "classic" ? s.grip_rating : null],
    ["Durability", s.durability_rating],
  ] as const;

  return (
    <>
      {saved && (
        <p role="status" className="rounded-lg border border-accent bg-tile p-3 text-sm">
          Session saved.
        </p>
      )}
      <div>
        <p className="text-sm text-muted">
          {s.status === "planned" ? "Planned · " : ""}
          <LocalTime iso={s.occurred_at} />
        </p>
        <h1 className="text-2xl font-bold">{s.event_name ?? s.venue?.name ?? `${TECHNIQUE_LABELS[s.technique]} session`}</h1>
        <p className="text-muted">
          {[TECHNIQUE_LABELS[s.technique], MODE_LABELS[s.mode], s.ski?.name, s.event_name ? s.venue?.name : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {s.mode === "race" && (s.event_distance_km || s.event_result) && (
          <p className="text-sm">{[s.event_distance_km ? `${s.event_distance_km} km` : null, s.event_result].filter(Boolean).join(" · ")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/history/${id}/edit`} className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70">
          Edit
        </Link>
        <Link
          href={`/history/new?from=${id}`}
          className="flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold active:bg-tile"
        >
          Repeat this prep
        </Link>
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4" aria-labelledby="how">
        <h2 id="how" className="font-semibold">How it went</h2>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {ratings.map(([name, r]) =>
            r === null && name === "Grip" ? null : (
              <div key={name} className="rounded-lg bg-tile p-2">
                <dt className="text-xs text-muted">{name}</dt>
                <dd className="text-lg font-semibold">{r ?? "–"}</dd>
                <dd className="text-xs text-muted">{r ? RATING_WORDS[r] : "Not rated"}</dd>
              </div>
            ),
          )}
        </dl>
        {s.kick_feel && <p className="text-sm">Kick: {KICK_FEEL_LABELS[s.kick_feel]}</p>}
        {(s.durability_km || s.durability_hours) && (
          <p className="text-sm">
            Lasted {[s.durability_km ? `${s.durability_km} km` : null, s.durability_hours ? `${s.durability_hours} h` : null].filter(Boolean).join(" / ")}
          </p>
        )}
        {s.notes && <p className="whitespace-pre-line text-sm">{s.notes}</p>}
      </section>

      {(["glide", "grip"] as const).map((zone) => {
        const layers = s.layers.filter((l) => l.zone === zone);
        if (layers.length === 0) return null;
        return (
          <section key={zone} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-semibold">{ZONE_LABELS[zone]}</h2>
            <ol className="flex flex-col gap-2">
              {layers.map((l) => (
                <li key={l.id} className="text-sm">
                  <p className="font-medium">
                    {l.position}. {l.product ? `${l.product.brand.name} ${l.product.name}` : l.custom_product}
                    {l.product && l.product.fluoro_status !== "fluoro_free" && l.product.fluoro_status !== "unknown" && (
                      <span className="ml-2 rounded-full bg-tile px-2 text-xs text-danger">fluoro</span>
                    )}
                  </p>
                  <p className="text-muted">
                    {[
                      l.layer_role ? LAYER_ROLE_LABELS[l.layer_role as keyof typeof LAYER_ROLE_LABELS] : null,
                      l.method ? METHOD_LABELS[l.method as keyof typeof METHOD_LABELS] : null,
                      l.method === "iron" && l.iron_temp_c ? `${l.iron_temp_c} °C` : null,
                      l.passes ? `${l.passes} ${zone === "grip" ? "layers" : "passes"}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {l.scrape_brush_steps && <p className="text-muted">{l.scrape_brush_steps}</p>}
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {(s.finish_tags.length > 0 || s.finish_notes) && (
        <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Finish</h2>
          {s.finish_tags.length > 0 && <p className="text-sm">{s.finish_tags.join(" → ")}</p>}
          {s.finish_notes && <p className="whitespace-pre-line text-sm text-muted">{s.finish_notes}</p>}
        </section>
      )}

      {(s.actual || s.forecast) && (
        <section className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
          {s.forecast && (
            <div>
              <h2 className="font-semibold">Forecast</h2>
              <ul className="text-sm">{conditionsLines(s.forecast).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
          {s.actual && (
            <div>
              <h2 className="font-semibold">Actual conditions</h2>
              <ul className="text-sm">{conditionsLines(s.actual).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      <Photos
        sessionId={s.id}
        userId={user.id}
        photos={s.photos.map((p) => ({ id: p.id, caption: p.caption, url: urlFor.get(p.storage_path) ?? null }))}
      />

      <details className="rounded-lg border border-line">
        <summary className="flex min-h-11 cursor-pointer items-center justify-center px-4 text-danger">Delete this session</summary>
        <form action={deleteSession.bind(null, id)} className="flex flex-col gap-2 p-3 pt-0">
          <p className="text-sm text-muted">Its layers, conditions and photos are deleted too. This can&apos;t be undone.</p>
          <button type="submit" className="min-h-11 rounded-lg bg-danger px-4 font-semibold text-on-accent active:opacity-70">
            Yes, delete it
          </button>
        </form>
      </details>
    </>
  );
}
