import { Suspense } from "react";
import type { Metadata } from "next";
import { SessionView } from "@/components/session/session-view";

export const metadata: Metadata = { title: "Session · My Wax Planner" };

// Looking back from History: the same session page as the Session tab's,
// with the way back leading to History.
export default function HistorySessionPage({ params, searchParams }: PageProps<"/history/[id]">) {
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
  params: PageProps<"/history/[id]">["params"];
  searchParams: PageProps<"/history/[id]">["searchParams"];
}) {
  const [{ id }, p] = await Promise.all([params, searchParams]);
  const saved = Array.isArray(p.saved) ? p.saved[0] : p.saved;
  return <SessionView id={id} saved={saved} from="history" />;
}
