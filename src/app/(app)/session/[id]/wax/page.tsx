import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadSession } from "@/lib/history/load";
import { WaxAlong } from "@/components/session/wax-along";
import { finishWaxing } from "../../actions";

export const metadata: Metadata = { title: "Wax along · My Wax Planner" };

// The plan's steps one at a time, for the waxing bench.
export default function WaxAlongPage({ params }: PageProps<"/session/[id]/wax">) {
  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Along params={params} />
      </Suspense>
    </main>
  );
}

async function Along({ params }: { params: PageProps<"/session/[id]/wax">["params"] }) {
  const { id } = await params;
  const s = await loadSession(await createClient(), id);
  if (!s) notFound();
  // Only a session made from a plan has steps to wax along with.
  if (!s.plan || s.plan.steps.length === 0) redirect(`/session/${id}`);
  return <WaxAlong sessionId={id} steps={s.plan.steps} initialDone={s.wax_steps_done} finish={finishWaxing.bind(null, id)} />;
}
