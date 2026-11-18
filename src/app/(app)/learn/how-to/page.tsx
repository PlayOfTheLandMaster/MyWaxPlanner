import type { Metadata } from "next";
import { BackLink } from "@/components/nav-trail";
import { GUIDE } from "@/lib/learn/how-to";

export const metadata: Metadata = { title: "How to use · My Wax Planner" };

// The brief guide, one fold per part of the app. Static: no request reads, so
// no Suspense is needed (see CLAUDE.md, cacheComponents).
export default function HowToPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <BackLink fallback="/learn" fallbackLabel="Learn" className="-mb-2 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <div>
        <h1 className="text-2xl font-bold">How to use My Wax Planner</h1>
        <p className="text-sm text-muted">The short version. Tap a part to open it.</p>
      </div>
      {GUIDE.map((s, i) => (
        <details key={s.id} id={s.id} open={i === 0} className="rounded-xl border border-line bg-surface">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold">{s.title}</summary>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {s.intro && <p className="text-sm text-muted">{s.intro}</p>}
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
              {s.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </details>
      ))}
    </main>
  );
}
