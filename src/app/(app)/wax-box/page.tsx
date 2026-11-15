import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AMOUNT_LABELS, CATEGORY_GROUPS, CATEGORY_LABELS, FLUORO_LABELS } from "@/lib/catalogue/labels";
import { loadBox, type BoxRow } from "@/lib/wax-box/load";
import { rangeText } from "@/lib/wax-box/describe";
import { WaxBoxNav } from "@/components/wax-box-nav";

export const metadata: Metadata = { title: "Wax box · My Wax Planner" };

export default function WaxBoxPage({ searchParams }: PageProps<"/wax-box">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Wax box</h1>
      <WaxBoxNav current="waxes" />
      <Link
        href="/wax-box/add"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
      >
        Add a wax
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Box searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Box({ searchParams }: { searchParams: PageProps<"/wax-box">["searchParams"] }) {
  const added = (await searchParams).added;
  const rows = await loadBox(await createClient());

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-4 text-muted">
        Your wax box is empty. Add your waxes one at a time with <strong>Add a wax</strong>.
      </p>
    );
  }

  const byName = (a: BoxRow, b: BoxRow) =>
    `${a.product.brand.name} ${a.product.name}`.localeCompare(`${b.product.brand.name} ${b.product.name}`);

  // The spec's reorder list: anything low or empty, gathered at the top so it
  // can be read out in a shop. Brand-neutral equivalents need a catalogue to
  // suggest from, so for now this names the wax and nothing else.
  const runningLow = rows.filter((r) => r.amount_left === "low" || r.amount_left === "empty").sort(byName);

  return (
    <div className="flex flex-col gap-6">
      {runningLow.length > 0 && (
        <section aria-labelledby="running-low" className="rounded-xl border border-line bg-surface p-3">
          <h2 id="running-low" className="font-semibold">
            Running low <span className="font-normal text-muted">({runningLow.length})</span>
          </h2>
          <ul className="mt-1 text-sm">
            {runningLow.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/wax-box/${r.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 active:bg-tile"
                >
                  <span className="min-w-0 truncate">
                    {r.product.brand.name} {r.product.name}
                  </span>
                  <span className="shrink-0 text-danger">{AMOUNT_LABELS[r.amount_left]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {CATEGORY_GROUPS.map((group) => {
        const inGroup = rows.filter((r) => r.product.category_group === group.key).sort(byName);
        if (inGroup.length === 0) return null;
        return (
          <section key={group.key}>
            <h2 className="mb-2 font-semibold">
              {group.label} <span className="font-normal text-muted">({inGroup.length})</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {inGroup.map((r) => (
                <WaxRow key={r.id} row={r} justAdded={r.id === added} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function WaxRow({ row, justAdded }: { row: BoxRow; justAdded: boolean }) {
  const p = row.product;
  const range = rangeText(p);
  const low = row.amount_left === "low" || row.amount_left === "empty";

  return (
    <li>
      <Link
        href={`/wax-box/${row.id}`}
        aria-current={justAdded ? "true" : undefined}
        className={`block rounded-xl border bg-surface p-3 active:bg-tile ${justAdded ? "border-accent" : "border-line"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">
              {p.brand.name} {p.name}
            </p>
            <p className="text-sm text-muted">{CATEGORY_LABELS[p.category]}</p>
            {range && <p className="text-sm">{range}</p>}
            {p.fluoro_status !== "fluoro_free" && (
              <p className="text-sm text-muted">{FLUORO_LABELS[p.fluoro_status]}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full bg-tile px-2 py-0.5 text-xs font-medium ${low ? "text-danger" : ""}`}>
            {AMOUNT_LABELS[row.amount_left]}
          </span>
        </div>
        {justAdded && <p className="mt-1 text-sm text-link">Just added</p>}
      </Link>
    </li>
  );
}
