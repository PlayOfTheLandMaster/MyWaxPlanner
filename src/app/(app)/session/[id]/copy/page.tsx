import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/nav-trail";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { copyTargets } from "@/lib/history/copy";
import { TECHNIQUE_LABELS } from "@/lib/skis/input";
import { loadCopy } from "./load";
import { copySession } from "./actions";
import { CopyForm } from "./copy-form";

export const metadata: Metadata = { title: "Copy to other skis · My Wax Planner" };

// A coach waxing a squad the same way: tick the pairs, and each gets its own
// planned session with this waxing, to mark done and rate on its own.
export default function CopyPage({ params }: PageProps<"/session/[id]/copy">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Copy params={params} />
      </Suspense>
    </main>
  );
}

async function Copy({ params }: { params: PageProps<"/session/[id]/copy">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ source, skis }, who] = await Promise.all([loadCopy(supabase, id), loadSkierContext()]);
  if (!source) notFound();
  const groups = copyTargets(skis, source, who.skiers, who.me);
  const technique = TECHNIQUE_LABELS[source.technique as "classic"] ?? source.technique;

  return (
    <>
      <div>
        <BackLink fallback={`/session/${id}`}>✕ Cancel</BackLink>
        <h1 className="text-2xl font-bold">Copy to other skis</h1>
        <p className="text-sm text-muted">
          Each pair you tick gets its own session with the same waxes and finish
          {source.status === "planned" ? ", at the same time" : ", planned for now"}. Mark each done and rate it on its own.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          No other {technique.toLowerCase()} skis to copy to. Add pairs under Wax box → Skis.
        </p>
      ) : (
        <CopyForm
          action={copySession.bind(null, id)}
          groups={groups.map((g) => ({ key: g.owner ?? "me", name: g.name, skis: g.skis.map((k) => ({ id: k.id, name: k.name })) }))}
          technique={technique}
        />
      )}
    </>
  );
}
