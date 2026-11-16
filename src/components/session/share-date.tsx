"use client";

import { useIsClient } from "@/components/use-is-client";
import { shareDate } from "@/lib/history/share";

/** The session's date in the reader's own time zone; the server only knows UTC. */
export function ShareDate({ iso, fallback }: { iso: string; fallback: string }) {
  const client = useIsClient();
  return <p className="opacity-90">{client ? shareDate(iso, Intl.DateTimeFormat().resolvedOptions().timeZone) : fallback}</p>;
}
