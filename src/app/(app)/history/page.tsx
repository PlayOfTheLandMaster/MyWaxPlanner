import type { Metadata } from "next";

export const metadata: Metadata = { title: "History · My Wax Planner" };

// Placeholder so the tab bar is complete; the screen itself is a later build.
export default function HistoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">History</h1>
      <p className="rounded-xl border border-line bg-surface p-4 text-muted">Every waxing session, with filters to turn it into your own wax chart. Arrives with build prompt 3.</p>
    </main>
  );
}
