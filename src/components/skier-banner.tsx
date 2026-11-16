import { loadSkierContext } from "@/lib/skiers/current";
import { FALLBACK } from "@/lib/profile/name";
import { SkierPicker } from "./skier-picker";

/**
 * "For Emma · Change" at the top of screens where whose skis matters. Shown
 * only once the account has skiers. `override` names someone else when the
 * screen is showing them for the moment (a History filter, a Skis chip);
 * `everyone` when it shows all skiers.
 */
export async function SkierBanner({
  override,
  everyone,
  returnTo,
}: {
  override?: string | null;
  everyone?: boolean;
  /** Where to land after picking, when this page's address names a skier of its own. */
  returnTo?: string;
}) {
  const { skiers, current, key, me } = await loadSkierContext();
  if (skiers.length === 0) return null;
  const picked = current?.name ?? me;
  const name = everyone ? "Everyone" : (override ?? picked);
  return (
    // Keyed on the picked skier, so the picker folds shut again once a pick lands.
    <details key={key} className="group">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-2 text-sm [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-tile px-3 py-1 font-semibold">
          <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
          {name === FALLBACK ? "My skis" : name === "Everyone" ? "Everyone" : `For ${name}`}
        </span>
        {name !== picked && <span className="text-muted">(you&apos;re waxing for {current ? picked : "yourself"})</span>}
        <span className="text-link underline group-open:hidden">Change</span>
        <span className="hidden text-link underline group-open:inline">Close</span>
      </summary>
      <div className="flex flex-col gap-2 pt-2">
        <p className="text-sm text-muted">Waxing for</p>
        <SkierPicker skiers={skiers} current={key} me={me} returnTo={returnTo} />
      </div>
    </details>
  );
}
