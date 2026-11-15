import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SkierForm } from "../../skier-form";
import { birthYears, describeBody } from "@/lib/skiers/body";
import { deleteSkier, updateSkier } from "../../skier-actions";

export const metadata: Metadata = { title: "Skier · My Wax Planner" };

export default function SkierPage({ params }: PageProps<"/account/skiers/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <Link href="/account" className="inline-flex min-h-11 items-center self-start text-sm text-link underline">
        ← Account
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Skier params={params} />
      </Suspense>
    </main>
  );
}

async function Skier({ params }: { params: PageProps<"/account/skiers/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: skier, error }, skis] = await Promise.all([
    supabase.from("skiers").select("id, name, notes, birth_year, birth_month, weight_kg").eq("id", id).maybeSingle(),
    supabase.from("skis").select("id, name").eq("skier_id", id).order("name"),
  ]);
  if (error && error.code !== "22P02") throw new Error(`Could not read the skier: ${error.message}`);
  if (!skier) notFound();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">{skier.name}</h1>
        {describeBody(skier) && <p className="text-muted">{describeBody(skier)}</p>}
      </div>
      <section className="rounded-xl border border-line bg-surface p-4">
        <SkierForm save={updateSkier.bind(null, id)} initial={skier} submitLabel="Save" years={birthYears()} />
      </section>
      <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
        <h2 className="font-semibold">Skis</h2>
        {(skis.data ?? []).length === 0 ? (
          <p className="text-sm text-muted">No skis yet.</p>
        ) : (
          <ul className="flex flex-col">
            {(skis.data ?? []).map((k) => (
              <li key={k.id}>
                <Link href={`/wax-box/skis/${k.id}`} className="flex min-h-11 items-center text-link underline">
                  {k.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/wax-box/skis/new?skier=${id}`}
          className="flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold active:bg-tile"
        >
          Add skis for {skier.name}
        </Link>
        <Link href={`/history?skier=${id}&period=all`} className="self-start text-sm text-link underline">
          {skier.name}&apos;s waxing history
        </Link>
      </section>
      <details className="rounded-lg border border-line">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-danger">Remove {skier.name}</summary>
        <form action={deleteSkier.bind(null, id)} className="flex flex-col gap-2 p-3 pt-0">
          <p className="text-sm text-muted">Their skis and waxing history are kept, listed as yours.</p>
          <button type="submit" className="min-h-11 rounded-lg bg-danger px-4 font-semibold text-on-accent active:opacity-70">
            Yes, remove
          </button>
        </form>
      </details>
    </>
  );
}
