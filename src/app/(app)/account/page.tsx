import { Suspense } from "react";
import Link from "next/link";
import { displayName } from "@/lib/profile/name";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/current-user";
import { loadVenues } from "@/lib/venues/load";
import { loadSkiers } from "@/lib/skiers/load";
import { signOut } from "../../login/actions";
import { SettingsForm } from "./settings-form";
import { SkierForm } from "./skier-form";
import { addSkier } from "./skier-actions";
import { birthYears, describeBody, type Body } from "@/lib/skiers/body";

export const metadata: Metadata = { title: "Account · My Wax Planner" };

const card = "rounded-xl border border-line bg-surface p-4";

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <BackLink fallback="/" />
        <h1 className="text-2xl font-bold">Account</h1>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const supabase = await createClient();
  const [user, venues, skiers, profile, skis] = await Promise.all([
    currentUser(),
    loadVenues(supabase),
    loadSkiers(supabase),
    supabase.from("profiles").select("home_venue_id, default_mode, first_name, last_initial, birth_year, birth_month, weight_kg").maybeSingle(),
    supabase.from("skis").select("skier_id"),
  ]);
  const pairs = (id: string | null) => (skis.data ?? []).filter((k) => k.skier_id === id).length;
  const plural = (n: number) => `${n} ${n === 1 ? "pair" : "pairs"}`;
  const me: Body = {
    birth_year: (profile.data?.birth_year as number | null) ?? null,
    birth_month: (profile.data?.birth_month as number | null) ?? null,
    weight_kg: profile.data?.weight_kg == null ? null : Number(profile.data.weight_kg),
  };
  const years = birthYears();

  return (
    <>
      <section className={card} aria-labelledby="skiers">
        <h2 id="skiers" className="font-semibold">
          Skiers
        </h2>
        <p className="text-sm text-muted">
          People whose skis you wax — your athletes or your kids. When you add skis, choose whose they are; plans and history then
          show each skier&apos;s pairs. Your wax box and tools are shared across them.
        </p>
        <ul className="my-3 flex flex-col divide-y divide-line">
          <li className="flex min-h-11 items-center justify-between gap-3">
            <span>
              {displayName(profile.data?.first_name as string | null, profile.data?.last_initial as string | null)}{" "}
              <span className="text-sm text-muted">· {[plural(pairs(null)), describeBody(me)].filter(Boolean).join(" · ")}</span>
            </span>
            <Link href="/wax-box/skis?skier=me" className="text-sm text-link underline">
              Skis
            </Link>
          </li>
          {skiers.map((k) => (
            <li key={k.id} className="flex min-h-11 items-center justify-between gap-3">
              <Link href={`/account/skiers/${k.id}`} className="min-w-0 py-2">
                <span className="block truncate font-medium">{k.name}</span>
                <span className="block truncate text-sm text-muted">{[plural(pairs(k.id)), describeBody(k), k.notes].filter(Boolean).join(" · ")}</span>
              </Link>
              <Link href={`/wax-box/skis?skier=${k.id}`} className="shrink-0 text-sm text-link underline">
                Skis
              </Link>
            </li>
          ))}
        </ul>
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">Add a skier</summary>
          <div className="pt-2">
            <SkierForm save={addSkier} submitLabel="Add skier" years={years} />
          </div>
        </details>
      </section>

      <section className={card} aria-labelledby="prefs">
        <h2 id="prefs" className="mb-3 font-semibold">
          You and preferences
        </h2>
        <SettingsForm
          venues={venues.map((v) => ({ id: v.id, name: v.name }))}
          home={(profile.data?.home_venue_id as string | null) ?? null}
          mode={(profile.data?.default_mode as string) ?? "recreational"}
          firstName={(profile.data?.first_name as string | null) ?? null}
          lastInitial={(profile.data?.last_initial as string | null) ?? null}
          me={me}
          years={years}
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
