"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { backLabel, previous, record } from "@/lib/nav/trail";

// The trail lives in sessionStorage, so it survives a reload but belongs to
// this tab only. Storage can be unavailable (private modes); then the trail
// lasts until the page is reloaded, and back links use their fallbacks.

const KEY = "mwp-trail";
const EMPTY: string[] = [];
let trail: string[] | null = null;
const listeners = new Set<() => void>();

function current(): string[] {
  if (trail === null) {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
      trail = Array.isArray(saved) ? saved.filter((u): u is string => typeof u === "string" && u.startsWith("/")) : [];
    } catch {
      trail = [];
    }
  }
  return trail;
}

function visit(url: string) {
  const next = record(current(), url);
  if (next.length === trail?.length && next.every((u, i) => u === trail?.[i])) return;
  trail = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the in-memory trail still works.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Records each page visited. Mounted once, in the root layout. */
export function NavTrail() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    visit(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);
  return null;
}

/**
 * A link back to the page the person came from — Cancel buttons and the
 * "← …" links at the top of pages. Falls back to `fallback` when they arrived
 * some other way (a bookmark, a fresh tab).
 */
export function BackLink({
  fallback,
  fallbackLabel,
  className = "inline-flex min-h-11 items-center text-sm text-link underline",
  children,
}: {
  fallback: string;
  /** Name for the fallback page when the usual one ("History") is not right. */
  fallbackLabel?: string;
  className?: string;
  /** Replaces the "← Name" text, e.g. "Cancel". */
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const visited = useSyncExternalStore(subscribe, current, () => EMPTY);
  const target = previous(visited, pathname) ?? fallback;
  const label = target === fallback && fallbackLabel ? fallbackLabel : backLabel(target);
  return (
    <Link href={target} className={className}>
      {children ?? `← ${label}`}
    </Link>
  );
}
