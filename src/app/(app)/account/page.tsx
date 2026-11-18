import { Suspense } from "react";
import Link from "next/link";
import { displayName } from "@/lib/profile/name";
import { BackLink } from "@/components/nav-trail";
import type { Metadata } from "next";
import { SetupNext } from "@/components/setup-next";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth/current-user";
import { loadVenues } from "@/lib/venues/load";
import { loadSkiers } from "@/lib/skiers/load";
import { signOut } from "../../login/actions";
import { SettingsForm } from "./settings-form";
import { SkierForm } from "./skier-form";
import { addSkier } from "./skier-actions";
import { setWaxingStyle } from "./actions";
import { seasonStart } from "@/lib/history/filters";
import { removeInvite } from "./invite-actions";
import { InviteForm } from "./invite-form";
import { ConfirmDelete } from "@/components/confirm-delete";
import { STYLE_LABELS, WAXING_STYLES, readStyle } from "@/lib/profile/style";
import { birthYears, describeBody, type Body } from "@/lib/skiers/body";

export const metadata: Metadata = { title: "Account · My Wax Planner" };

const card = "rounded-xl border border-line bg-surface p-4";

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <BackLink fallback="/" />
        <h1 className="text-2xl font-bold">Account</h1>
        <Link href="/learn/how-to" className="inline-flex min-h-11 items-center text-sm text-link underline">
          How to use My Wax Planner
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Account searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Account({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const start = (await searchParams).start;
  const supabase = await createClient();
  const [user, venues, skiers, profile, skis] = await Promise.all([
    currentUser(),
    loadVenues(supabase),
    loadSkiers(supabase),
    supabase.from("profiles").select("home_venue_id, default_mode, waxing_style, season_start_month, first_name, last_initial, birth_year, birth_month, weight_kg").maybeSingle(),
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
      {/* Account holds two checklist steps; the link that opened it says which. */}
      <SetupNext step={start === "style" ? "style" : "skiers"} searchParams={searchParams} />
      <section className={card} aria-labelledby="style">
        <h2 id="style" className="scroll-mt-4 font-semibold">
          How you wax
        </h2>
        <p className="text-sm text-muted">Change it any time. It decides what Today&apos;s main button does.</p>
        <div className="mt-3 flex flex-col gap-2">
          {WAXING_STYLES.map((s) => {
            const on = (readStyle(profile.data?.waxing_style) ?? null) === s;
            return (
              <form key={s} action={setWaxingStyle.bind(null, s)}>
                <button
                  type="submit"
                  aria-pressed={on}
                  className={`flex min-h-11 w-full flex-col items-start rounded-lg border px-4 py-2 text-left active:bg-tile ${on ? "border-accent bg-tile" : "border-line bg-surface"}`}
                >
                  <span className="font-semibold">
                    {on ? "✓ " : ""}
                    {STYLE_LABELS[s].title}
                  </span>
                  <span className="text-sm text-muted">{STYLE_LABELS[s].detail}</span>
                </button>
              </form>
            );
          })}
        </div>
      </section>
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
            <span className="flex shrink-0 gap-4 text-sm">
              <a href="#prefs" className="inline-flex min-h-11 items-center text-link underline">
                Edit
              </a>
              <Link href="/wax-box/skis?skier=me" className="inline-flex min-h-11 items-center text-link underline">
                Skis
              </Link>
            </span>
          </li>
          {skiers.map((k) => (
            <li key={k.id} className="flex min-h-11 items-center justify-between gap-3">
              <Link href={`/account/skiers/${k.id}`} className="min-w-0 py-2">
                <span className="block truncate font-medium">{k.name}</span>
                <span className="block truncate text-sm text-muted">{[plural(pairs(k.id)), describeBody(k), k.notes].filter(Boolean).join(" · ")}</span>
              </Link>
              {/* The name opens the editor too; "Edit" says so out loud. */}
              <span className="flex shrink-0 gap-4 text-sm">
                <Link href={`/account/skiers/${k.id}`} className="inline-flex min-h-11 items-center text-link underline" aria-label={`Edit ${k.name}`}>
                  Edit
                </Link>
                <Link href={`/wax-box/skis?skier=${k.id}`} className="inline-flex min-h-11 items-center text-link underline">
                  Skis
                </Link>
              </span>
            </li>
          ))}
        </ul>
        {/* Opened already when the getting-started checklist sent you here. */}
        <details open={start === "skiers" && skiers.length === 0}>
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">Add a skier</summary>
          <div className="pt-2">
            <SkierForm save={addSkier} submitLabel="Add skier" years={years} />
          </div>
        </details>
      </section>

      <section className={card} aria-labelledby="prefs">
        <h2 id="prefs" className="mb-3 scroll-mt-4 font-semibold">
          Your Preferences
        </h2>
        <SettingsForm
          venues={venues.map((v) => ({ id: v.id, name: v.name }))}
          home={(profile.data?.home_venue_id as string | null) ?? null}
          mode={(profile.data?.default_mode as string) ?? "recreational"}
          firstName={(profile.data?.first_name as string | null) ?? null}
          lastInitial={(profile.data?.last_initial as string | null) ?? null}
          me={me}
          years={years}
          seasonStart={seasonStart(profile.data?.season_start_month)}
        />
      </section>

      <Link href="/venues" className="flex min-h-11 items-center justify-between rounded-xl border border-line bg-surface px-4 active:bg-tile">
        <span>Venues</span>
        <span aria-hidden className="text-muted">→</span>
      </Link>

      <Invitations />

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

/**
 * Admins only: who may create an account. Sign-up is by invitation, enforced
 * by the database, so an address has to be on this list before its owner can
 * sign up. Nothing shows for anyone else: the list is not theirs to read.
 */
async function Invitations() {
  const supabase = await createClient();
  const { data: admin } = await supabase.from("app_admins").select("user_id").maybeSingle();
  if (!admin) return null;
  const { data } = await supabase.from("signup_invites").select("email, note, created_at, used_at").order("created_at", { ascending: false });
  const invites = (data ?? []) as { email: string; note: string | null; created_at: string; used_at: string | null }[];
  return (
    <section className={card} aria-labelledby="invites">
      <h2 id="invites" className="font-semibold">
        Invitations
      </h2>
      <p className="text-sm text-muted">
        Only these email addresses can create an account. Add someone, then send them the link. Existing accounts are not affected.
      </p>
      {invites.length > 0 && (
        <ul className="my-3 flex flex-col divide-y divide-line">
          {invites.map((i) => (
            <li key={i.email} className="flex min-h-11 items-center justify-between gap-3 py-1">
              <span className="min-w-0">
                <span className="block truncate font-medium">{i.email}</span>
                <span className="block truncate text-sm text-muted">
                  {[i.used_at ? "Joined" : "Not joined yet", i.note].filter(Boolean).join(" · ")}
                </span>
              </span>
              {!i.used_at && <ConfirmDelete action={removeInvite.bind(null, i.email)} label={i.email} />}
            </li>
          ))}
        </ul>
      )}
      <details open={invites.length === 0}>
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">Invite someone</summary>
        <div className="pt-2">
          <InviteForm />
        </div>
      </details>
    </section>
  );
}
