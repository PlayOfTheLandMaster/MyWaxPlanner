import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/current-user";
import { loadVenues } from "@/lib/venues/load";
import { signOut } from "../../login/actions";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings · My Wax Planner" };

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Today
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const supabase = await createClient();
  const [user, venues, profile] = await Promise.all([
    currentUser(),
    loadVenues(supabase),
    supabase.from("profiles").select("home_venue_id, default_mode, display_name").maybeSingle(),
  ]);
  return (
    <>
      <section className="rounded-xl border border-line bg-surface p-4">
        <SettingsForm
          venues={venues.map((v) => ({ id: v.id, name: v.name }))}
          home={(profile.data?.home_venue_id as string | null) ?? null}
          mode={(profile.data?.default_mode as string) ?? "recreational"}
          displayName={(profile.data?.display_name as string | null) ?? null}
        />
      </section>
      <Link href="/venues" className="flex min-h-11 items-center justify-between rounded-xl border border-line bg-surface px-4 active:bg-tile">
        <span>Venues</span>
        <span aria-hidden className="text-muted">→</span>
      </Link>
      <section className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
        <p className="min-w-0 truncate text-sm">
          Signed in as <span className="font-medium">{user?.email}</span>
        </p>
        <form action={signOut}>
          <button type="submit" className="min-h-11 shrink-0 rounded-lg border border-line px-4 active:bg-tile">
            Sign out
          </button>
        </form>
      </section>
    </>
  );
}
