import Link from "next/link";
import { loadSkierContext } from "@/lib/skiers/current";
import { ME } from "@/lib/skiers/load";

/**
 * "For Emma · Change" at the top of screens where whose skis matters. Shown
 * only once the account has skiers. `override` names someone else when the
 * screen is showing them for the moment (a History filter, a Skis chip);
 * `everyone` when it shows all skiers.
 */
export async function SkierBanner({ override, everyone }: { override?: string | null; everyone?: boolean }) {
  const { skiers, current } = await loadSkierContext();
  if (skiers.length === 0) return null;
  const picked = current?.name ?? ME;
  const name = everyone ? "Everyone" : (override ?? picked);
  return (
    <p className="flex min-h-9 flex-wrap items-center gap-x-2 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-tile px-3 py-1 font-semibold">
        <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
        {name === ME ? "My skis" : name === "Everyone" ? "Everyone" : `For ${name}`}
      </span>
      {name !== picked && <span className="text-muted">(you&apos;re waxing for {picked === ME ? "yourself" : picked})</span>}
      <Link href="/#skier" className="text-link underline">
        Change
      </Link>
    </p>
  );
}
