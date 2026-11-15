import Link from "next/link";

// Waxes, tools and skis: the three halves of the Wax box tab (the spec's
// "Inventory" and "Tools and skis" screens).

const SECTIONS = [
  { href: "/wax-box", label: "Waxes", key: "waxes" },
  { href: "/wax-box/tools", label: "Tools", key: "tools" },
  { href: "/wax-box/skis", label: "Skis", key: "skis" },
] as const;

export function WaxBoxNav({ current }: { current: (typeof SECTIONS)[number]["key"] }) {
  return (
    <nav aria-label="Wax box" className="grid grid-cols-3 gap-1 rounded-xl bg-tile p-1">
      {SECTIONS.map((s) => (
        <Link
          key={s.key}
          href={s.href}
          aria-current={s.key === current ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center rounded-lg text-sm active:opacity-70 ${
            s.key === current ? "bg-surface font-semibold shadow-sm" : "text-muted"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
