import { Suspense } from "react";
import { currentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

// Today. For now it confirms the plumbing works end to end: who is signed in,
// and that the catalogue is reachable through Row Level Security. The forecast,
// "Similar to today" and the Plan a wax button arrive with later build prompts.

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Today</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Account />
        <Catalogue />
      </Suspense>
    </main>
  );
}

async function Account() {
  const user = await currentUser();
  return (
    <section className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
      <p className="min-w-0 truncate">
        Signed in as <span className="font-medium">{user?.email}</span>
      </p>
      <form action={signOut}>
        <button type="submit" className="min-h-11 shrink-0 rounded-lg border border-line px-4 active:bg-tile">
          Sign out
        </button>
      </form>
    </section>
  );
}

async function Catalogue() {
  const supabase = await createClient();
  const [brands, products, tools] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("tools").select("*", { count: "exact", head: true }),
  ]);
  const failed = brands.error ?? products.error ?? tools.error;

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="font-semibold">Catalogue</h2>
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          Could not read the catalogue: {failed.message}
        </p>
      ) : (
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Count label="Brands" value={brands.count ?? 0} />
          <Count label="Products" value={products.count ?? 0} />
          <Count label="Tools" value={tools.count ?? 0} />
        </dl>
      )}
      {!failed && (products.count ?? 0) === 0 && (
        <p className="mt-3 text-sm text-muted">
          No products yet. Load them with <code>npm run seed</code> (see the README).
        </p>
      )}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-tile p-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-bold">{value}</dd>
    </div>
  );
}
