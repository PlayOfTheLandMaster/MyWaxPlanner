"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Tells the server the reader's time zone, in a cookie, so it can work out
 * what "today" is for them (the server runs in UTC). The first visit renders
 * in UTC; once the cookie is new or changed the page refreshes once.
 */
export function ReaderZone() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const current = document.cookie.match(/(?:^|;\s*)tz=([^;]*)/)?.[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
