import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  AMOUNT_LABELS,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  FLUORO_LABELS,
  formatRange,
} from "@/lib/catalogue/labels";
import type { FluoroStatus, ProductCategory } from "@/lib/catalogue/vocab";

export const metadata: Metadata = { title: "Wax box · My Wax Planner" };

type BoxRow = {
  id: string;
  amount_left: keyof typeof AMOUNT_LABELS;
  notes: string | null;
  product: {
    name: string;
    category: ProductCategory;
    category_group: string;
    published_temp_min_c: number | null;
    published_temp_max_c: number | null;
    temp_min_c: number | null;
    temp_max_c: number | null;
    fluoro_status: FluoroStatus;
    brand: { name: string; temperature_basis: "air" | "snow" };
  };
};

export default function WaxBoxPage({ searchParams }: PageProps<"/wax-box">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Today
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Wax box</h1>
          <Link
            href="/wax-box/add"
            className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
          >
            Add a wax
          </Link>
        </div>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Box searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Box({ searchParams }: { searchParams: PageProps<"/wax-box">["searchParams"] }) {
  const added = (await searchParams).added;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_products")
    .select(
      `id, amount_left, notes,
       product:products!inner (name, category, category_group, published_temp_min_c, published_temp_max_c,
         temp_min_c, temp_max_c, fluoro_status, brand:brands!inner (name, temperature_basis))`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not read your wax box: {error.message}
      </p>
    );
  }

  const rows = (data ?? []) as unknown as BoxRow[];
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-4 text-muted">
        Your wax box is empty. Add your waxes one at a time with <strong>Add a wax</strong>.
      </p>
    );
  }

  const byName = (a: BoxRow, b: BoxRow) =>
    `${a.product.brand.name} ${a.product.name}`.localeCompare(`${b.product.brand.name} ${b.product.name}`);

  return (
    <div className="flex flex-col gap-6">
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
  const snowRange = formatRange(p.temp_min_c, p.temp_max_c);
  const printed = formatRange(p.published_temp_min_c, p.published_temp_max_c);
  // An air-rated wax without a snow range can't be compared with the others
  // yet; say so instead of showing its air range as if it were comparable.
  const rangeText = snowRange
    ? `${snowRange} snow`
    : printed && p.brand.temperature_basis === "air"
      ? `${printed} air · no snow range yet`
      : null;

  return (
    <li
      className={`rounded-xl border bg-surface p-3 ${justAdded ? "border-accent" : "border-line"}`}
      aria-current={justAdded ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {p.brand.name} {p.name}
          </p>
          <p className="text-sm text-muted">{CATEGORY_LABELS[p.category]}</p>
          {rangeText && <p className="text-sm">{rangeText}</p>}
          {p.fluoro_status !== "fluoro_free" && (
            <p className="text-sm text-muted">{FLUORO_LABELS[p.fluoro_status]}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            row.amount_left === "low" || row.amount_left === "empty" ? "bg-tile text-danger" : "bg-tile"
          }`}
        >
          {AMOUNT_LABELS[row.amount_left]}
        </span>
      </div>
      {justAdded && <p className="mt-1 text-sm text-link">Just added</p>}
    </li>
  );
}
