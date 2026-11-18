import { Suspense } from "react";
import Link from "next/link";
import { BackLink } from "@/components/nav-trail";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/current-user";
import {
  AMOUNT_LABELS,
  CATEGORY_LABELS,
  FLUORO_LABELS,
  FORM_LABELS,
  HUMIDITY_LABELS,
  LAYER_ROLE_LABELS,
  SNOW_TYPE_LABELS,
  formatRange,
} from "@/lib/catalogue/labels";
import type { HumidityBand, LayerRole, ProductForm, SnowType } from "@/lib/catalogue/vocab";
import { loadBoxRow, waxPhotoUrls } from "@/lib/wax-box/load";
import { WaxPhoto } from "./wax-photo";
import { rangeText } from "@/lib/wax-box/describe";
import { clearSnowRange, removeFromBox, saveNotes, saveSnowRange, setAmount } from "../actions";
import { NotesForm } from "./notes-form";
import { SnowRangeForm } from "./snow-range-form";

export const metadata: Metadata = { title: "Wax · My Wax Planner" };

export default function WaxPage({ params }: PageProps<"/wax-box/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <BackLink fallback="/wax-box" className="inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Wax params={params} />
      </Suspense>
    </main>
  );
}

async function Wax({ params }: { params: PageProps<"/wax-box/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const [row, user] = await Promise.all([loadBoxRow(supabase, id), currentUser()]);
  if (!row || !user) notFound();
  const photoUrl = row.photo_path ? ((await waxPhotoUrls(supabase, [row.photo_path])).get(row.photo_path) ?? null) : null;

  const p = row.product;
  const own = p.created_by === user?.id;
  const printed = formatRange(p.published_temp_min_c, p.published_temp_max_c);

  const details: [string, string | null][] = [
    ["Type", CATEGORY_LABELS[p.category]],
    ["Form", p.form ? FORM_LABELS[p.form as ProductForm] : null],
    ["Snow temperature", rangeText(p)],
    [`As printed (${p.brand.temperature_basis} temperature)`, printed],
    [`Old or transformed snow, as printed (${p.brand.temperature_basis})`, formatRange(p.old_published_temp_min_c ?? null, p.old_published_temp_max_c ?? null)],
    ["Snow types", p.snow_types.map((s) => SNOW_TYPE_LABELS[s as SnowType]).join(", ") || null],
    ["Snow humidity", p.humidity_bands.map((h) => HUMIDITY_LABELS[h as HumidityBand]).join(", ") || null],
    ["Used as", p.layer_roles.map((r) => LAYER_ROLE_LABELS[r as LayerRole]).join(", ") || null],
    ["Fluoro", FLUORO_LABELS[p.fluoro_status]],
    ["Iron temperature", p.iron_temp_c !== null ? `${p.iron_temp_c} °C` : null],
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">
          {p.brand.name} {p.name}
        </h1>
        {!own && <p className="mt-1 text-sm text-muted">From the shared catalogue</p>}
      </div>

      <WaxPhoto boxId={row.id} userId={user.id} url={photoUrl} name={`${p.brand.name} ${p.name}`} />

      <form action={setAmount.bind(null, row.id)} className="flex flex-col gap-2">
        <p className="text-sm font-medium" id="amount-label">
          How much is left?
        </p>
        <div role="group" aria-labelledby="amount-label" className="grid grid-cols-4 gap-2">
          {(Object.keys(AMOUNT_LABELS) as (keyof typeof AMOUNT_LABELS)[]).map((a) => (
            <button
              key={a}
              type="submit"
              name="amount_left"
              value={a}
              aria-pressed={row.amount_left === a}
              className={`min-h-11 rounded-lg border text-sm active:bg-tile ${
                row.amount_left === a ? "border-accent bg-tile font-semibold" : "border-line bg-surface"
              }`}
            >
              {AMOUNT_LABELS[a]}
            </button>
          ))}
        </div>
      </form>

      <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {/* A shared wax can't be edited, so the skier keeps their own snow range
          for it; a wax they typed in has its snow range on its Edit form. */}
      {!own && (
        <SnowRangeForm
          printed={printed}
          yours={p.snow_range_is_yours ? { temp_min_c: p.temp_min_c, temp_max_c: p.temp_max_c } : null}
          save={saveSnowRange.bind(null, p.id)}
          clear={clearSnowRange.bind(null, p.id)}
        />
      )}

      <NotesForm initial={row.notes} save={saveNotes.bind(null, row.id)} />

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        {own && (
          <Link
            href={`/wax-box/${row.id}/edit`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 active:bg-tile"
          >
            Edit this wax
          </Link>
        )}
        {/* A two-step remove that needs no JavaScript: open, then confirm. */}
        <details className="rounded-lg border border-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-danger">
            Remove from wax box
          </summary>
          <form action={removeFromBox.bind(null, row.id)} className="flex flex-col gap-2 p-3 pt-0">
            <p className="text-sm text-muted">
              {own
                ? "It stays saved, so you can find it again under Add a wax → Find a wax you've added before."
                : "You can add it back from Add a wax at any time."}
            </p>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-danger px-4 font-semibold text-on-accent active:opacity-70"
            >
              Yes, remove it
            </button>
          </form>
        </details>
      </div>
    </>
  );
}
