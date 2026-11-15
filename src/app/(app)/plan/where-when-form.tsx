"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * The "where and when" form: changing the venue, date, start or length
 * fetches that forecast straight away, so the forecast and the saved
 * conditions below can never belong to a different venue than the one shown.
 * Date and time wait a moment, so the forecast is not fetched mid-typing.
 */
export function WhereWhenForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const form = useRef<HTMLFormElement>(null);

  const go = () => {
    if (!form.current) return;
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form.current)) if (typeof v === "string" && v !== "") params.set(k, v);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  return (
    <form
      ref={form}
      method="get"
      aria-busy={pending}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      onChange={(e) => {
        if (timer.current) clearTimeout(timer.current);
        const isSelect = (e.target as HTMLElement).tagName === "SELECT";
        timer.current = setTimeout(go, isSelect ? 0 : 700);
      }}
    >
      {children}
      <p aria-live="polite" className="text-sm text-muted">
        {pending ? "Getting the forecast…" : ""}
      </p>
    </form>
  );
}
