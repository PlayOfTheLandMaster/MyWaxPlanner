import { BackLink } from "@/components/nav-trail";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ContinueList } from "@/components/session/continue-list";

export const metadata: Metadata = { title: "My Sessions · My Wax Planner" };

/**
 * The Sessions tab: sessions under way, to open, wax, ski and rate. Every wax
 * session starts on Today (the owner's call: an expert on the Session tab was
 * once offered a guided session), so nothing here starts one.
 */
export default function SessionsPage({ searchParams }: PageProps<"/plan">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      {/* A tab, but still reached from somewhere: back to the page you came from, else Today. */}
      <BackLink fallback="/" fallbackLabel="Today" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">My Sessions</h1>
      <Suspense fallback={null}>
        <Copied searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <ContinueList
          empty={
            <p className="rounded-xl border border-line bg-surface p-4 text-muted">
              No sessions under way. Wax sessions start on{" "}
              <Link href="/" className="text-link underline">
                Today
              </Link>
              .
            </p>
          }
        />
      </Suspense>
    </main>
  );
}

/** After "Copy to other skis", or Record a wax job's Save: what was made, listed just below. */
async function Copied({ searchParams }: { searchParams: PageProps<"/plan">["searchParams"] }) {
  const q = await searchParams;
  if (q.saved === "recorded") {
    return (
      <p role="status" className="rounded-lg border border-accent bg-tile p-3 text-sm">
        <strong>Wax job saved.</strong> It&apos;s under Current sessions: tap it and mark it Done Skiing after skiing, then rate it.
      </p>
    );
  }
  const n = Number(q.copied);
  if (!Number.isInteger(n) || n < 1) return null;
  return (
    <p role="status" className="rounded-lg border border-accent bg-tile p-3 text-sm">
      Copied to {n} {n === 1 ? "pair" : "pairs"}. Each is under Current sessions: mark it done and rate it on its own.
    </p>
  );
}
