import { Suspense } from "react";
import type { Metadata } from "next";
import { SessionView } from "@/components/session/session-view";

export const metadata: Metadata = { title: "Session · My Wax Planner" };

// A session under way, opened from the Session tab, Today or "Use this plan".
// History opens the same page at /history/[id] to look back.
export default function SessionPage({ params, searchParams }: PageProps<"/session/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <View params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function View({
  params,
  searchParams,
}: {
  params: PageProps<"/session/[id]">["params"];
  searchParams: PageProps<"/session/[id]">["searchParams"];
}) {
  const [{ id }, p] = await Promise.all([params, searchParams]);
  const saved = Array.isArray(p.saved) ? p.saved[0] : p.saved;
  // Opened from Today (?from=today): a rating returns there.
  return <SessionView id={id} saved={saved} from="session" back={p.from === "today" ? "today" : "session"} />;
}
