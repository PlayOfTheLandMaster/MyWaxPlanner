import { Suspense } from "react";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { loadSkierContext } from "@/lib/skiers/current";
import { SkiForm } from "../ski-form";
import { createSki } from "../actions";

export const metadata: Metadata = { title: "Add skis · My Wax Planner" };

export default function NewSkiPage({ searchParams }: PageProps<"/wax-box/skis/new">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <BackLink fallback="/wax-box/skis" />
        <h1 className="text-2xl font-bold">Add skis</h1>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/wax-box/skis/new">["searchParams"] }) {
  // ?skier=<id> (from a skier's page) picks the owner in advance; otherwise
  // the skier picked on Today.
  const skier = (await searchParams).skier;
  const { skiers, current } = await loadSkierContext();
  return (
    <SkiForm
      save={createSki}
      submitLabel="Save skis"
      skiers={skiers}
      defaultSkier={typeof skier === "string" && skiers.some((k) => k.id === skier) ? skier : skier === "me" ? undefined : current?.id}
    />
  );
}
