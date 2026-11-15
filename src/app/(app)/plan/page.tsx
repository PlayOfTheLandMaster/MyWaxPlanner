import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plan · My Wax Planner" };

// Placeholder so the tab bar is complete; the screen itself is a later build.
export default function PlanPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Plan</h1>
      <p className="rounded-xl border border-line bg-surface p-4 text-muted">Plan a wax: ski, grip type, mode, conditions, then RECOMMEND. Arrives with build prompt 5.</p>
    </main>
  );
}
