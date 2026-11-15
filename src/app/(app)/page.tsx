import { Suspense } from "react";
import Link from "next/link";
import { currentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

// Today. For now: who is signed in, and the way into the wax box. The forecast,
// "Similar to today" and the Plan a wax button arrive with later build prompts.

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Today</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Account />
        <WaxBox />
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

async function WaxBox() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("user_products")
    .select("id", { count: "exact", head: true });

  return (
    <Link
      href="/wax-box"
      className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 active:bg-tile"
    >
      <span>
        <span className="block font-semibold">Wax box</span>
        <span className="text-sm text-muted">
          {error
            ? "Could not count your waxes"
            : count
              ? `${count} ${count === 1 ? "wax" : "waxes"}`
              : "Empty — add your first wax"}
        </span>
      </span>
      <span aria-hidden className="text-muted">
        →
      </span>
    </Link>
  );
}
