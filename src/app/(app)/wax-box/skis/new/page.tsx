import Link from "next/link";
import type { Metadata } from "next";
import { SkiForm } from "../ski-form";
import { createSki } from "../actions";

export const metadata: Metadata = { title: "Add skis · My Wax Planner" };

export default function NewSkiPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/wax-box/skis" className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Skis
        </Link>
        <h1 className="text-2xl font-bold">Add skis</h1>
      </div>
      <SkiForm save={createSki} submitLabel="Save skis" />
    </main>
  );
}
