import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { SKI_CATEGORIES } from "@/lib/skis/input";
import { MODES, MODE_LABELS } from "@/lib/history/vocab";
import { buildRecommendation, draftConditions, loadConditions, loadDefaultMode, loadSkis, type PlanChoice } from "@/lib/recommend/load";
import { decodeDraft } from "@/lib/plan/draft";
import { CATEGORY_TEXT, ROLE_TEXT, type Pick, type Recommendation } from "@/lib/recommend/engine";
import { LocalTime } from "@/components/local-time";
import { savePlan } from "./actions";
import { SavePlanButton } from "./save-plan";
import { SkiFields } from "./ski-fields";
import { SkierBanner } from "@/components/skier-banner";
import { loadSkierContext } from "@/lib/skiers/current";

export const metadata: Metadata = { title: "Plan · My Wax Planner" };

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;
const deg = (n: number | null) => (n === null ? "–" : `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C");

const FAMILIES: [string, string][] = [
  ["any", "Let the app choose"],
  ["hydrocarbon", "Hydrocarbon (conventional)"],
  ["synthetic", "Fluoro-free performance"],
  ["liquid_glider", "Liquid"],
  ["paste_glider", "Paste"],
  ["powder", "Powder"],
];

export default function PlanStepTwo({ params, searchParams }: PageProps<"/plan/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Step params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Step({
  params,
  searchParams,
}: {
  params: PageProps<"/plan/[id]">["params"];
  searchParams: PageProps<"/plan/[id]">["searchParams"];
}) {
  const { id } = await params;
  const p = await searchParams;
  const supabase = await createClient();
  // "draft": conditions not saved yet, carried in the address (?c=) until
  // "Use this plan". Any other id is a plan saved before drafts existed.
  const draft = id === "draft" ? decodeDraft(one(p.c)) : null;
  const [c, skis, defaultMode, who] = await Promise.all([
    id === "draft" ? (draft ? draftConditions(supabase, draft) : Promise.resolve(null)) : loadConditions(supabase, id),
    loadSkis(supabase),
    loadDefaultMode(supabase),
    loadSkierContext(),
  ]);
  const skiers = who.skiers;
  if (!c) notFound();

  const ski = skis.find((k) => k.id === one(p.ski)) ?? null;
  // Whose skis: the pair's owner, else the pull-down, else the skier picked on Today.
  const ownerParam = one(p.owner);
  const owner = ski
    ? (ski.skier_id ?? "me")
    : ownerParam === "other" || ownerParam === "me" || skiers.some((k) => k.id === ownerParam)
      ? (ownerParam as string)
      : who.key;
  const ownerName = owner === "me" ? "Me" : owner === "other" ? "another skier" : (skiers.find((k) => k.id === owner)?.name ?? null);
  const technique = ski?.technique ?? (one(p.technique) === "classic" ? "classic" : one(p.technique) === "skate" ? "skate" : null);
  const gripParam = one(p.grip);
  const gripType = ski ? ski.category : (SKI_CATEGORIES as readonly string[]).includes(gripParam ?? "") ? (gripParam as PlanChoice["gripType"]) : null;
  const mode = one(p.mode) === "race" ? "race" : one(p.mode) === "recreational" ? "recreational" : defaultMode;
  const family = FAMILIES.some(([k]) => k === one(p.family)) ? (one(p.family) as string) : "any";
  const go = one(p.go) === "1" && technique !== null;

  const built = go
    ? await buildRecommendation(supabase, c, { technique: technique!, gripType: technique === "classic" ? (gripType ?? "waxable") : null, mode, family, ski })
    : null;

  return (
    <>
      <div>
        <Link href={c.venue_id ? `/plan?venue=${c.venue_id}` : "/plan"} className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Change conditions
        </Link>
        <h1 className="text-2xl font-bold">Plan a wax</h1>
        <p className="text-sm text-muted">Step 2 of 2: your skis, then RECOMMEND.</p>
      </div>
      <SkierBanner override={ownerName} />

      <section className="rounded-xl border border-line bg-surface p-4 text-sm" aria-label="Conditions">
        <p className="font-semibold">
          {c.venue?.name ?? "Conditions"} · <LocalTime iso={c.observed_at} />
        </p>
        <p>
          Snow {deg(c.snow_temp_c)}
          {c.snow_temp_estimated ? " (estimate)" : ""} · air {deg(c.air_temp_c)} · {c.air_rh_pct ?? "–"} % humidity
        </p>
        <p className="text-muted">
          {[
            c.snow_type ? SNOW_TYPE_LABELS[c.snow_type] : null,
            c.snow_humidity_band ? `${HUMIDITY_LABELS[c.snow_humidity_band].toLowerCase()} snow` : null,
            c.new_snow_cm ? `${c.new_snow_cm} cm new` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>

      <form method="get" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
        <input type="hidden" name="go" value="1" />
        {draft && <input type="hidden" name="c" value={one(p.c)} />}
        <SkiFields
          skis={skis}
          skiers={skiers.map((k) => ({ id: k.id, name: k.name }))}
          initialSki={ski?.id ?? ""}
          initialOwner={owner}
          initialTechnique={technique}
          initialGrip={gripType ?? "waxable"}
        />
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <label key={m} className={choice}>
              <input type="radio" name="mode" value={m} defaultChecked={mode === m} className="sr-only" />
              {MODE_LABELS[m]}
            </label>
          ))}
        </div>
        <label className={label}>
          Glide wax type
          <select name="family" defaultValue={family} className={field}>
            {FAMILIES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-12 rounded-lg bg-accent px-4 text-lg font-bold tracking-wide text-on-accent active:opacity-70">
          RECOMMEND
        </button>
        {one(p.go) === "1" && technique === null && <p className="text-sm text-danger">Choose a pair of skis, or classic or skate.</p>}
      </form>

      {built && (
        <>
          <RecommendationView r={built.result} catalogueSize={built.catalogueSize} mode={mode} />
          <SavePlanButton
            save={savePlan.bind(null, draft ? { draft: one(p.c) ?? "" } : { id: c.id }, {
              technique: built.req.technique,
              gripType: built.req.gripType,
              mode,
              family,
              skiId: ski?.id ?? null,
              owner,
            })}
          />
        </>
      )}
    </>
  );
}

const FIT_TEXT = { great: "Great fit", good: "Good fit", workable: "Workable" } as const;

function PickLine({ pick, owned }: { pick: Pick; owned: boolean }) {
  const p = pick.product;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-medium">
        {p.brand.name} {p.name}
        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${pick.fit === "great" ? "bg-accent text-on-accent" : "bg-tile"}`}>{FIT_TEXT[pick.fit]}</span>
      </p>
      {pick.reasons.length > 0 && <p className="text-sm text-muted">{pick.reasons.join(" · ")}</p>}
      {/* No price for a wax not in the box: the catalogue's prices are from
          one shop, in one currency (mostly US dollars), and would mislead. */}
      {!owned && p.buy_url && (
        <p className="text-sm">
          <a href={p.buy_url} target="_blank" rel="noopener noreferrer" className="text-link underline">
            Where to buy
          </a>
        </p>
      )}
    </div>
  );
}

function RecommendationView({ r, catalogueSize, mode }: { r: Recommendation; catalogueSize: number; mode: string }) {
  return (
    <section aria-labelledby="rec" className="flex flex-col gap-4">
      <h2 id="rec" className="text-xl font-bold">
        Your plan
      </h2>
      {r.warnings.map((w) => (
        <p key={w} role="note" className="rounded-lg border border-line bg-tile p-3 text-sm">
          {w}
        </p>
      ))}

      {(["glide", "grip"] as const).map((zone) => {
        const layers = r.layers.filter((l) => l.zone === zone);
        if (!layers.length) return null;
        return (
          <div key={zone} className="flex flex-col gap-2">
            <h3 className="font-semibold">{zone === "glide" ? "Glide" : "Grip"}</h3>
            <ol className="flex flex-col gap-2">
              {layers.map((l) => (
                <li key={l.role} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{ROLE_TEXT[l.role] ?? l.role}</p>
                  {l.pick ? (
                    <>
                      <p className="text-xs text-muted">From your box</p>
                      <PickLine pick={l.pick} owned />
                    </>
                  ) : (
                    <p className="text-sm">
                      Nothing suitable in your box — you need {l.categories.map((k) => CATEGORY_TEXT[k] ?? k).join(" or ")}.
                    </p>
                  )}
                  {l.market.length > 0 && (
                    <details className="rounded-lg bg-tile p-2">
                      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
                        {l.pick ? "Better options to buy" : "Options to buy"} ({l.market.length})
                      </summary>
                      <ul className="flex flex-col gap-3 p-1">
                        {l.market.map((m) => (
                          <li key={m.product.id}>
                            <PickLine pick={m} owned={false} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {l.note && <p className="text-xs text-muted">{l.note}</p>}
                </li>
              ))}
            </ol>
          </div>
        );
      })}

      {r.carry.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-3 text-sm">
          <p className="font-semibold">Take along</p>
          <ul>
            {r.carry.map((c) => (
              <li key={c.product.id}>
                {c.product.brand.name} {c.product.name} — {c.reasons[0]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.procedure.map((section) => (
        <div key={section.title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">How to do it: {section.title.toLowerCase()}</h3>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
            {section.steps.map((s, i) => (
              <li key={i}>{s.text}</li>
            ))}
          </ol>
        </div>
      ))}

      {r.gaps.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-3 text-sm">
          <p className="font-semibold">Missing from your box</p>
          <ul className="list-disc pl-5">
            {r.gaps.map((g) => (
              <li key={g.text}>{g.text}</li>
            ))}
          </ul>
        </div>
      )}
      {catalogueSize === 0 && (
        <p className="text-xs text-muted">The shared wax catalogue is empty for now, so there are no buying suggestions yet.</p>
      )}
      <p className="text-xs text-muted">
        A starting point worked out from the conditions and your own history, not a guarantee.
        {mode === "race" ? " On race day, test on the snow before the start; only fluoro-free waxes are used." : ""}
      </p>
    </section>
  );
}
