import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadSkiers } from "@/lib/skiers/load";
import { SkiForm } from "../ski-form";
import { createSki } from "../actions";

export const metadata: Metadata = { title: "Add skis · My Wax Planner" };

export default function NewSkiPage({ searchParams }: PageProps<"/wax-box/skis/new">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/wax-box/skis" className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Skis
        </Link>
        <h1 className="text-2xl font-bold">Add skis</h1>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/wax-box/skis/new">["searchParams"] }) {
  // ?skier=<id> (from a skier's page) picks the owner in advance.
  const skier = (await searchParams).skier;
  const skiers = await loadSkiers(await createClient());
  return (
    <SkiForm
      save={createSki}
      submitLabel="Save skis"
      skiers={skiers}
      defaultSkier={typeof skier === "string" && skiers.some((k) => k.id === skier) ? skier : undefined}
    />
  );
}
