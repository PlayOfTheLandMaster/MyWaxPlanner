import { setCurrentSkier } from "@/lib/skiers/actions";

/**
 * One tap picks who is being waxed for; Session, History and Skis all follow.
 * Used on Today and inside every screen's skier banner, so picking never
 * leaves the page. `returnTo` is where to land afterwards when the page's own
 * address would otherwise keep showing someone else (a History filter).
 */
export function SkierPicker({
  skiers,
  current,
  me,
  returnTo,
}: {
  skiers: { id: string; name: string }[];
  current: string;
  /** The account holder's name, for their own button. */
  me: string;
  returnTo?: string;
}) {
  return (
    <form action={setCurrentSkier} className="flex flex-wrap gap-2">
      {returnTo && <input type="hidden" name="return" value={returnTo} />}
      {[{ id: "me", name: me }, ...skiers].map((k) => {
        const on = current === k.id;
        return (
          <button
            key={k.id}
            type="submit"
            name="skier"
            value={k.id}
            aria-pressed={on}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${on ? "border-accent bg-accent font-semibold text-on-accent" : "border-line bg-surface active:bg-tile"}`}
          >
            {k.name}
          </button>
        );
      })}
    </form>
  );
}
