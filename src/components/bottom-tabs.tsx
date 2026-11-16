"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The five tabs from the spec's Screens and navigation section. Phone first:
// waxing happens on a bench with one free hand, so every main screen is one
// tap away and every tab is a full 44px target.

type Tab = { href: string; label: string; icon: React.ReactNode; match: (path: string) => boolean };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Today",
    match: (p) => p === "/",
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    href: "/plan",
    // "Session": planning a wax and, after skiing, rating it are one session.
    // Not "Wax", which would sit beside "Wax box" and invite mix-ups.
    label: "Session",
    match: (p) => p.startsWith("/plan"),
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    match: (p) => p.startsWith("/history"),
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    href: "/wax-box",
    label: "Wax box",
    match: (p) => p.startsWith("/wax-box"),
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M3 8l9-4 9 4v9l-9 4-9-4z" />
        <path d="M3 8l9 4 9-4M12 12v9" />
      </svg>
    ),
  },
  {
    href: "/learn",
    label: "Learn",
    match: (p) => p.startsWith("/learn"),
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z" />
        <path d="M4 21V5M8 7h7" />
      </svg>
    ),
  },
];

export function BottomTabs() {
  return <TabBar pathname={usePathname()} />;
}

/** The bar with no tab marked, drawn while the current path is not yet known. */
export function BottomTabsFallback() {
  return <TabBar pathname={null} />;
}

function TabBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname !== null && tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs active:bg-tile ${
                  active ? "font-semibold text-accent" : "text-muted"
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
