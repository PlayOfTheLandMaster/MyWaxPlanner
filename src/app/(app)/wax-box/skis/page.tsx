import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { WaxBoxNav } from "@/components/wax-box-nav";
import { ME, loadSkiers } from "@/lib/skiers/load";
import { SKI_CATEGORY_LABELS, TECHNIQUE_LABELS, type SkiCategory, type Technique } from "@/lib/skis/input";

export const metadata: Metadata = { title: "Skis · My Wax Planner" };

type Ski = {
  id: string;
  skier_id: string | null;
  name: string;
  technique: Technique;
  category: SkiCategory | null;
  brand: string | null;
  model: string | null;
  grind: string | null;
};

export default function SkisPage({ searchParams }: PageProps<"/wax-box/skis">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Wax box</h1>
      <WaxBoxNav current="skis" />
      <Link
        href="/wax-box/skis/new"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
      >
        Add skis
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <SkiList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SkiList({ searchParams }: { searchParams: PageProps<"/wax-box/skis">["searchParams"] }) {
  const wanted = (await searchParams).skier;
  const supabase = await createClient();
  const [skiers, { data, error }] = await Promise.all([
    loadSkiers(supabase),
    supabase
      .from("skis")
      .select("id, skier_id, name, technique, category, brand, model, grind")
      .order("technique")
      .order("name"),
  ]);
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not read your skis: {error.message}
      </p>
    );
  }
  const all = (data ?? []) as Ski[];
  if (all.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-4 text-muted">
        No skis yet. Add each pair you wax, so plans know their technique, grip type and grind.
      </p>
    );
  }

  // Grouped by owner: me first, then each skier A–Z. A chip shows one owner.
  const owners = [{ id: "me", name: ME }, ...skiers].filter((o) =>
    all.some((k) => (o.id === "me" ? k.skier_id === null : k.skier_id === o.id)),
  );
  const pick = typeof wanted === "string" ? wanted : undefined;
  const shown = owners.filter((o) => !pick || o.id === pick);

  return (
    <div className="flex flex-col gap-5">
      {owners.length > 1 && (
        <nav aria-label="Owner" className="flex flex-wrap gap-2">
          {[{ id: undefined as string | undefined, name: "Everyone" }, ...owners].map((o) => (
            <Link
              key={o.id ?? "all"}
              href={o.id ? `/wax-box/skis?skier=${o.id}` : "/wax-box/skis"}
              aria-current={pick === o.id ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${pick === o.id ? "border-accent bg-tile font-semibold" : "border-line bg-surface"}`}
            >
              {o.name}
            </Link>
          ))}
        </nav>
      )}
      {shown.map((o) => (
        <section key={o.id}>
          {owners.length > 1 && <h2 className="mb-2 font-semibold">{o.name}</h2>}
          <SkiRows skis={all.filter((k) => (o.id === "me" ? k.skier_id === null : k.skier_id === o.id))} />
        </section>
      ))}
    </div>
  );
}

function SkiRows({ skis }: { skis: Ski[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {skis.map((s) => (
        <li key={s.id}>
          <Link
            href={`/wax-box/skis/${s.id}`}
            className="block rounded-xl border border-line bg-surface p-3 active:bg-tile"
          >
            <p className="truncate font-medium">{s.name}</p>
            <p className="truncate text-sm text-muted">
              {[
                TECHNIQUE_LABELS[s.technique],
                s.category ? SKI_CATEGORY_LABELS[s.category] : null,
                [s.brand, s.model].filter(Boolean).join(" ") || null,
                s.grind,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
