import { Suspense } from "react";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS } from "@/lib/catalogue/labels";
import { loadBox, loadBrands, loadProducts } from "@/lib/wax-box/load";
import { searchWaxes } from "@/lib/wax-box/search";
import { rangeText } from "@/lib/wax-box/describe";
import { WaxForm } from "../wax-form";
import { addKnownWax, addWax } from "../actions";

export const metadata: Metadata = { title: "Add a wax · My Wax Planner" };

export default function AddWaxPage({ searchParams }: PageProps<"/wax-box/add">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <BackLink fallback="/wax-box" />
        <h1 className="text-2xl font-bold">Add a wax</h1>
      </div>

      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Find searchParams={searchParams} />
      </Suspense>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">A new wax</h2>
          <p className="mt-1 text-sm text-muted">
            Copy what&apos;s on the label. Only the brand, name and type are needed; the temperature range is what
            recommendations use most.
          </p>
        </div>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <NewWaxForm />
        </Suspense>
      </section>
    </main>
  );
}

/**
 * Finding a wax that is already known: one the user typed in before and later
 * took out of the box, or one from the shared catalogue if one has been loaded.
 * A plain GET form, so it works before the page's JavaScript has loaded.
 */
async function Find({ searchParams }: { searchParams: PageProps<"/wax-box/add">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();

  const supabase = await createClient();
  const [products, box] = await Promise.all([loadProducts(supabase), loadBox(supabase)]);
  const inBox = new Set(box.map((r) => r.product.id));

  // Nothing to find until there is something not already in the box.
  if (products.every((p) => inBox.has(p.id))) return null;

  const results = searchWaxes(products, q, inBox);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      <h2 className="font-semibold">Find a wax you&apos;ve added before</h2>
      <form role="search" action="/wax-box/add" className="flex gap-2">
        <label className="sr-only" htmlFor="wax-search">
          Brand, name or type
        </label>
        <input
          id="wax-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Brand, name or type"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-page px-3 text-base"
        />
        <button type="submit" className="min-h-11 shrink-0 rounded-lg border border-line px-4 active:bg-tile">
          Search
        </button>
      </form>

      {q && results.length === 0 && (
        <p className="text-sm text-muted">Nothing matches “{q}” — add it as a new wax below.</p>
      )}

      {results.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {results.map((p) => {
            const range = rangeText(p);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.brand.name} {p.name}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {CATEGORY_LABELS[p.category]}
                    {range ? ` · ${range}` : ""}
                  </p>
                </div>
                <form action={addKnownWax.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent active:opacity-70"
                  >
                    Add
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

async function NewWaxForm() {
  const brands = await loadBrands(await createClient());
  return <WaxForm brands={brands} save={addWax} submitLabel="Add to wax box" />;
}
