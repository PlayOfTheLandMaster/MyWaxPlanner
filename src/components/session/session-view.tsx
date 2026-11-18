import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { isExpert } from "@/lib/profile/style";
import { currentUser } from "@/lib/auth/current-user";
import { loadSession, type Conditions, type SessionLayer, type SessionPlan } from "@/lib/history/load";
import { HUMIDITY_LABELS, LAYER_ROLE_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import {
  KICK_FEEL_LABELS,
  METHOD_LABELS,
  MODE_LABELS,
  RATING_WORDS,
  SKY_LABELS,
  TRACK_LABELS,
  DEBRIS_LABELS,
  TRACKS,
  ZONE_LABELS,
} from "@/lib/history/vocab";
import { STAGES, stageOf, type Stage } from "@/lib/history/stage";
import { LocalTime } from "@/components/local-time";
import { BackLink } from "@/components/nav-trail";
import { Photos } from "@/app/(app)/history/[id]/photos";
import { RateForm } from "./rate-form";
import type { SnowInitial } from "@/components/snow-check-form";
import { HUMIDITY_BANDS, SNOW_TYPES } from "@/lib/catalogue/vocab";
import { deleteSession, rateSession } from "@/app/(app)/history/actions";
import { WaxChecklist } from "./wax-checklist";
import { comparePlan, type LayerComparison } from "@/lib/history/plan-compare";
import { changeLayer, finishWaxing, markDone, unfinishWaxing, unmarkDone } from "@/app/(app)/session/actions";

// One page for a waxing session, from plan to rating: Plan → Wax → Ski → Rate.
// The Session tab opens it while a session is under way (/session/[id]) and
// History opens the same page to look back (/history/[id]); only the way back
// differs. What it leads with follows the stage (stageOf).

const card = "flex flex-col gap-3 rounded-xl border border-line bg-surface p-4";
const t = (n: number | null) => (n === null ? null : `${n > 0 ? "+" : ""}${n}`.replace("-", "−"));
const FIT_LABELS: Record<string, string> = { great: "Great fit", good: "Good fit", workable: "Workable" };

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
    c.debris ? (c.debris === "none" ? "No debris" : `Debris: ${DEBRIS_LABELS[c.debris as keyof typeof DEBRIS_LABELS].toLowerCase()}`) : null,
    c.track ? `Track ${TRACK_LABELS[c.track as keyof typeof TRACK_LABELS].toLowerCase()}` : null,
  ].filter((x): x is string => x !== null);
}

export async function SessionView({
  id,
  saved,
  from,
}: {
  id: string;
  saved: string | undefined;
  /** Where the page was opened from, for the way back. */
  from: "session" | "history";
}) {
  const supabase = await createClient();
  const [s, user, who] = await Promise.all([loadSession(supabase, id), currentUser(), loadSkierContext()]);
  // An expert records their own waxes: no wax-along, no step-by-step list.
  const expert = isExpert(who.style);
  if (!s || !user) notFound();

  const photoUrls = s.photos.length
    ? ((await supabase.storage.from("session-photos").createSignedUrls(s.photos.map((p) => p.storage_path), 3600)).data ?? [])
    : [];
  const urlFor = new Map(photoUrls.map((u) => [u.path, u.signedUrl]));

  const stage = stageOf(s, new Date());
  const planned = stage !== "done";
  const classic = s.technique === "classic";
  const steps = s.plan?.steps ?? [];
  // Once skiing has started (or it is time to rate), the waxing is over: the
  // steps stay as a record, but nothing invites waxing again.
  const waxing = stage === "wax";
  const tint = stage === "rate" ? "bg-done border-l-done-edge" : "bg-active border-l-active-edge";
  const compare = comparePlan(s.plan?.picks ?? [], s.layers);

  // The waxes in the box, for swapping a layer while the session is under way.
  const box: BoxWax[] = [];
  if (planned) {
    const { data } = await supabase
      .from("user_products")
      .select("id, product:products!inner (name, category_group, brand:brands (name))")
      .neq("amount_left", "empty");
    for (const r of data ?? []) {
      const p = r.product as unknown as { name: string; category_group: string; brand: { name: string } | null };
      box.push({ id: r.id as string, group: p.category_group, name: p.brand ? `${p.brand.name} ${p.name}` : p.name });
    }
    box.sort((a, b) => a.name.localeCompare(b.name));
  }

  const rateForm = (
    <RateForm
      classic={classic}
      hasLayers={s.layers.length > 0}
      askSnow={s.forecast !== null && s.actual === null}
      initialNotes={s.notes}
      snowInitial={snowStart(s.forecast)}
      layers={s.layers.map((l) => ({
        id: l.id,
        zone: l.zone,
        name: l.product ? [l.product.brand?.name, l.product.name].filter(Boolean).join(" ") : (l.custom_product ?? "Unnamed wax"),
      }))}
      box={box}
      save={rateSession.bind(null, id)}
    />
  );

  const doneLine = s.done_at ? (
    <form action={unmarkDone.bind(null, s.id)} className="flex items-center justify-between gap-3 text-sm">
      <span>
        Marked done <LocalTime iso={s.done_at} />. Rate it when you&apos;re ready.
      </span>
      <button type="submit" className="min-h-11 px-2 text-link underline">
        Undo
      </button>
    </form>
  ) : null;

  return (
    <>
      <BackLink
        fallback={from === "history" ? "/history" : "/plan"}
        fallbackLabel={from === "history" ? "History" : "My Sessions"}
        className="inline-flex min-h-11 items-center self-start text-sm text-link underline"
      />

      {saved && (
        <p role="status" className="rounded-lg border border-accent bg-tile p-3 text-sm">
          {saved === "plan"
            ? "Plan saved. Wax with the steps below; after skiing, rate it here."
            : saved === "rated"
              ? "Thanks — your ratings are saved."
              : saved === "waxed"
                ? "Waxed and ready. After skiing, rate it here."
                : saved === "done"
                  ? "Done. It waits under Unrated sessions on the Session tab until you rate it."
                  : "Session saved."}
        </p>
      )}

      {/* Coloured as on Today: blue while waxing or skiing, green once skied and
          waiting for its rating; a rated session stays plain. One background
          class only (see CLAUDE.md, Tailwind). */}
      <div className={planned ? `flex flex-col gap-3 rounded-xl border border-l-8 border-line p-4 ${tint}` : ""}>
        <div>
          <p className="text-sm text-muted">
            {stage === "rate" ? "Completed ski · " : planned ? "In Progress · " : ""}
            <LocalTime iso={s.occurred_at} />
          </p>
          <h1 className="text-2xl font-bold">{s.event_name ?? s.venue?.name ?? `${TECHNIQUE_LABELS[s.technique]} session`}</h1>
          <p className="text-muted">
            {[s.skier ? `${s.skier.name}'s skis` : null, TECHNIQUE_LABELS[s.technique], MODE_LABELS[s.mode], s.ski?.name, s.event_name ? s.venue?.name : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {s.mode === "race" && (s.event_distance_km || s.event_result) && (
            <p className="text-sm">{[s.event_distance_km ? `${s.event_distance_km} km` : null, s.event_result].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        {planned && <StageStrip stage={stage} />}
      </div>

      {/* Rating: the session's status sits with its title, not in the middle of the page. */}
      {stage === "rate" && s.done_at && doneLine}

      {/* A coach waxing a squad the same way: one session, copied to each pair.
          Here while the session is under way; once rated it sits beside Share a summary. */}
      {s.layers.length > 0 && stage !== "done" && (
        <div className="self-start">
        <Link
          href={`/session/${s.id}/copy`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium active:bg-tile"
        >
          <span aria-hidden>⧉</span> Copy to other skis
        </Link>
        </div>
      )}

      {/* A past session can be today's answer: the same skis, waxes and
          finish as a new session for now, with today's forecast saved. */}
      {stage === "done" && s.layers.length > 0 && (
        <Link
          href={`/history/new?record=1&from=${s.id}`}
          className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
        >
          Use this session data for today&apos;s wax job
        </Link>
      )}

      {stage === "done" && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/session/${s.id}/share`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium active:bg-tile"
          >
            <span aria-hidden>↗</span> Share a summary
          </Link>
          {s.layers.length > 0 && (
            <Link
              href={`/session/${s.id}/copy`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium active:bg-tile"
            >
              <span aria-hidden>⧉</span> Copy to other skis
            </Link>
          )}
        </div>
      )}

      {planned ? (
        <>
          <details open={stage === "wax"} className="rounded-xl border border-line bg-surface">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
              {/* A recorded wax job has no plan: these are the waxes already on the skis. */}
              {expert || !s.plan ? (stage === "wax" ? "Your waxes" : "Waxes") : "The plan"}
              {/* Still waxing: what to apply, and each layer can be swapped or
                  skipped. Once waxed (Ski, Rate) the waxes are on the skis:
                  past tense, and fixed. A change made after all is "I changed
                  something" when rating, which opens the full form. */}
              {s.layers.length
                ? stage === "wax"
                  ? ` - ${s.plan ? "apply " : ""}${s.layers.length} ${s.layers.length === 1 ? "layer" : "layers"}`
                  : ` - ${s.layers.length} ${s.layers.length === 1 ? "layer" : "layers"} applied`
                : ""}
            </summary>
            <div className="flex flex-col gap-4 px-4 pb-4">
              <Layers layers={s.layers} plan={s.plan} compare={compare} change={stage === "wax" ? { sessionId: s.id, box } : null} />
            </div>
          </details>

          {/* Folded by default, just above Start wax-along, which is the way in;
              the full list is here when wanted. An expert has neither. */}
          {/* Gone once rating: the waxing is long done, and the page leads to How did it go?. */}
          {!expert && steps.length > 0 && stage !== "rate" && (
            <details className="rounded-xl border border-line bg-surface">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
                Wax{s.waxed_at || !waxing ? " ✓" : " · step by step"}
              </summary>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <WaxChecklist sessionId={s.id} steps={steps} initialDone={s.wax_steps_done} />
              </div>
            </details>
          )}
          {!expert && steps.length > 0 && waxing && !s.waxed_at && (
            <Link
              href={`/session/${s.id}/wax`}
              className="flex min-h-14 items-center justify-center rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70"
            >
              {s.wax_steps_done.length > 0 ? "Carry on waxing along" : "Start wax-along"}
            </Link>
          )}
          {/* Outside the fold: it is what moves the session on to Ski (and offers Done). */}
          {stage === "rate" ? null : s.waxed_at ? (
            <form action={unfinishWaxing.bind(null, s.id)} className="flex items-center justify-between gap-3 text-sm">
              <span>
                Waxed <LocalTime iso={s.waxed_at} />
              </span>
              <button type="submit" className="min-h-11 px-2 text-link underline">
                Undo
              </button>
            </form>
          ) : waxing ? (
            <form action={finishWaxing.bind(null, s.id)}>
              {/* The same size as Start wax-along above: the two steps of waxing. */}
              <button
                type="submit"
                className="flex min-h-14 w-full items-center justify-center rounded-xl border border-line bg-surface px-4 text-lg font-bold active:bg-tile"
              >
                I&apos;m Done Waxing
              </button>
            </form>
          ) : null}

          {/* "I'm Done Skiing": skied, rating later. Offered only at Ski, so
              there is one "done" button at a time and its name says which
              step it finishes; while waxing it would read as a second "Done
              waxing". A coach with a dozen pairs uses Done Skiing on the
              Session tab's list instead. */}
          {s.done_at ? (
            stage === "rate" ? null : doneLine
          ) : stage === "ski" ? (
            <form action={markDone.bind(null, s.id, "session")} className={card}>
              <p className="text-sm text-muted">Finished? Mark it done and rate it later; it waits under Unrated sessions.</p>
              <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70">
                I&apos;m Done Skiing
              </button>
            </form>
          ) : null}

          {stage !== "rate" && (
            <details id="rate" className="scroll-mt-4 rounded-xl border border-line bg-surface">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
                {stage === "ski" ? "Back already? Rate it" : "Already skied? Rate it"}
              </summary>
              <div className="px-4 pb-4">{rateForm}</div>
            </details>
          )}
        </>
      ) : (
        <>
          <section className={card} aria-labelledby="how">
            <h2 id="how" className="font-semibold">
              How it went
            </h2>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Glide", s.glide_rating],
                  ["Grip", classic ? s.grip_rating : null],
                  ["Durability", s.durability_rating],
                ] as const
              ).map(([name, r]) =>
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

          {/* Rated: folded to one line, so How it went leads. */}
          {s.layers.length > 0 && (
            <details className="rounded-xl border border-line bg-surface">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">
                Waxes - {s.layers.length} {s.layers.length === 1 ? "layer" : "layers"} applied
              </summary>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <Layers layers={s.layers} plan={s.plan} compare={compare} change={null} />
              </div>
            </details>
          )}
        </>
      )}

      {/* A plan's steps are shown as the checklist above; anything else written as finish notes is shown here. */}
      {(s.finish_tags.length > 0 || (s.finish_notes && !(planned && steps.length > 0))) && (
        // Folded once rated, like the waxes above; open while the session is under way.
        <details open={planned} className="rounded-xl border border-line bg-surface">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">Glide Finish</summary>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {s.finish_tags.length > 0 && <p className="text-sm">{s.finish_tags.join(" → ")}</p>}
            {s.finish_notes && !(planned && steps.length > 0) && <p className="whitespace-pre-line text-sm text-muted">{s.finish_notes}</p>}
          </div>
        </details>
      )}

      {/* Folded to one line: the forecast's snow and air temperatures; opens on
          the full forecast and, beside it, what was recorded on the day. */}
      {(s.actual || s.forecast) && (
        <details className="rounded-xl border border-line bg-surface">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2">
            <span className="font-semibold">{s.forecast ? "Forecast at time of session" : "What you recorded on the day"}</span>
            <span className="min-w-0 truncate text-sm text-muted">
              {conditionsLines((s.forecast ?? s.actual)!)
                .slice(0, 2)
                .map((x) => `· ${x}`)
                .join(" ")}
            </span>
          </summary>
          <section className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            {s.forecast && (
              <div>
                {s.actual && <h2 className="font-semibold">Forecast at time of session</h2>}
                <ul className="text-sm">
                  {conditionsLines(s.forecast).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            {s.actual && (
              <div>
                {s.forecast && <h2 className="font-semibold">What you recorded on the day</h2>}
                <ul className="text-sm">
                  {conditionsLines(s.actual).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </details>
      )}

      <Photos
        sessionId={s.id}
        userId={user.id}
        photos={s.photos.map((p) => ({ id: p.id, caption: p.caption, url: urlFor.get(p.storage_path) ?? null }))}
      />

      {/* Rating reads top to bottom: what you did (waxes, finish, forecast and
          photos, above), then how it went, then one Save, the last thing on the page. */}
      {stage === "rate" && (
        <section id="rate" aria-labelledby="rate-h" className="flex scroll-mt-4 flex-col gap-3">
          <h2 id="rate-h" className="text-xl font-bold">
            How did it go?
          </h2>
          {rateForm}
        </section>
      )}

      {/* The two ways on from a past session, filled in the accent so they
          stand out from the cards above (the owner's choice). */}
      {stage !== "rate" && (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/history/${id}/edit`}
            className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-center font-semibold text-on-accent active:opacity-70"
          >
            Edit this record
          </Link>
          <Link
            href={`/history/new?record=1&from=${id}`}
            className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-center font-semibold text-on-accent active:opacity-70"
          >
            Use this session data for today&apos;s wax job
          </Link>
        </div>
      )}

      <details className="rounded-lg border border-line">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-danger">Delete this session</summary>
        <form action={deleteSession.bind(null, id, "/history")} className="flex flex-col gap-2 p-3 pt-0">
          <p className="text-sm text-muted">Its layers, conditions and photos are deleted too. This can&apos;t be undone.</p>
          <button type="submit" className="min-h-11 rounded-lg bg-danger px-4 font-semibold text-on-accent active:opacity-70">
            Yes, delete it
          </button>
        </form>
      </details>
    </>
  );
}

/** Plan ✓ · Wax · Ski · Rate, with the current stage marked. */
export function StageStrip({ stage }: { stage: Stage }) {
  const at = STAGES.findIndex((x) => x.key === stage);
  return (
    <ol aria-label="Where this session is" className="grid grid-cols-4 gap-1 text-center text-xs">
      <li className="rounded-lg bg-tile py-2 text-muted">Plan ✓</li>
      {STAGES.map((x, i) => (
        <li
          key={x.key}
          aria-current={i === at ? "step" : undefined}
          className={`rounded-lg py-2 ${i === at ? "bg-accent font-semibold text-on-accent" : i < at ? "bg-tile text-muted" : "border border-line"}`}
        >
          {x.label}
          {i < at ? " ✓" : ""}
        </li>
      ))}
    </ol>
  );
}

type BoxWax = { id: string; group: string; name: string };

/**
 * The layers by zone. With a plan, each shows why the app picked it and, when
 * a different wax was used, the planned one beside it; planned layers that
 * were left out are listed as skipped. While the session is under way
 * (`change` given) each layer can be swapped for a wax from the box, or skipped.
 */
function Layers({
  layers,
  plan,
  compare,
  change,
}: {
  layers: SessionLayer[];
  plan: SessionPlan | null;
  compare: LayerComparison;
  change: { sessionId: string; box: BoxWax[] } | null;
}) {
  if (layers.length === 0 && compare.skipped.length === 0) return <p className="text-sm text-muted">No layers recorded.</p>;
  return (
    <>
      {(["glide", "grip"] as const).map((zone) => {
        const inZone = layers.filter((l) => l.zone === zone);
        const skipped = compare.skipped.filter((p) => p.zone === zone);
        if (inZone.length === 0 && skipped.length === 0) return null;
        const options = change?.box.filter((b) => b.group === zone) ?? [];
        return (
          <div key={zone} className="flex flex-col gap-2">
            <h3 className="font-semibold">{ZONE_LABELS[zone]}</h3>
            <ol className="flex flex-col gap-3">
              {inZone.map((l) => {
                const why = plan?.reasons.find((r) => r.zone === zone && r.layer_role === l.layer_role);
                const plannedName = compare.swapped.get(l.id);
                return (
                  <li key={l.id} className="text-sm">
                    <p className="font-medium">
                      {l.position}. {l.product ? `${l.product.brand.name} ${l.product.name}` : l.custom_product}
                      {l.product && l.product.fluoro_status !== "fluoro_free" && l.product.fluoro_status !== "unknown" && (
                        <span className="ml-2 rounded-full bg-tile px-2 text-xs text-danger">fluoro</span>
                      )}
                      {!plannedName && why?.fit && <span className="ml-2 rounded-full bg-tile px-2 text-xs">{FIT_LABELS[why.fit] ?? why.fit}</span>}
                    </p>
                    {plannedName && <p className="text-link">Planned: {plannedName}</p>}
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
                    {!plannedName && why?.reason && <p className="text-muted">Why: {why.reason}</p>}
                    {l.scrape_brush_steps && <p className="text-muted">{l.scrape_brush_steps}</p>}
                    {change && (
                      <details className="mt-1">
                        <summary className="flex min-h-11 cursor-pointer items-center text-link">Change</summary>
                        <form action={changeLayer.bind(null, change.sessionId, l.id)} className="flex flex-col gap-2 pb-1">
                          <label className="flex flex-col gap-1 text-sm font-medium">
                            Use instead
                            <select
                              name="wax"
                              defaultValue={l.user_product_id ?? ""}
                              required
                              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
                            >
                              <option value="" disabled>
                                Choose a wax from your box…
                              </option>
                              {options.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                              <option value="skip">Skip this layer</option>
                            </select>
                          </label>
                          <button type="submit" className="min-h-11 rounded-lg border border-line px-4 font-semibold active:bg-tile">
                            Save
                          </button>
                        </form>
                      </details>
                    )}
                  </li>
                );
              })}
              {skipped.map((p, i) => (
                <li key={`skipped-${i}`} className="text-sm text-muted">
                  <p>
                    Skipped: {p.name} <span className="text-xs">({LAYER_ROLE_LABELS[p.layer_role as keyof typeof LAYER_ROLE_LABELS] ?? p.layer_role})</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </>
  );
}

/** The snow questions' starting answers: the forecast's own guesses, else middling ones. */
function snowStart(f: Conditions | null): SnowInitial {
  return {
    snow_temp_c: Math.min(0, f?.snow_temp_c ?? -5),
    snow_humidity_band: oneOf(HUMIDITY_BANDS, f?.snow_humidity_band) ?? "mid",
    snow_type: oneOf(SNOW_TYPES, f?.snow_type) ?? "fine_grained",
    track: oneOf(TRACKS, f?.track),
  };
}

function oneOf<T extends string>(list: readonly T[], v: string | null | undefined): T | null {
  return list.includes(v as T) ? (v as T) : null;
}
