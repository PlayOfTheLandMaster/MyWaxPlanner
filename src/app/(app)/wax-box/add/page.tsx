import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AddWaxForm, type KnownBrand } from "./add-wax-form";

export const metadata: Metadata = { title: "Add a wax · My Wax Planner" };

export default function AddWaxPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/wax-box" className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Wax box
        </Link>
        <h1 className="text-2xl font-bold">Add a wax</h1>
        <p className="mt-1 text-sm text-muted">
          Copy what&apos;s on the label. Only the brand, name and type are needed; the temperature range is what
          recommendations use most.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <FormWithBrands />
      </Suspense>
    </main>
  );
}

async function FormWithBrands() {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("name, temperature_basis").order("name");
  // A brand can be in the shared catalogue and typed by the user too; list it once.
  const seen = new Set<string>();
  const brands: KnownBrand[] = [];
  for (const b of data ?? []) {
    const key = b.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    brands.push(b);
  }
  return <AddWaxForm brands={brands} />;
}
