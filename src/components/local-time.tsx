"use client";

import { useIsClient } from "./use-is-client";

// A moment shown in the reader's own time zone. The server has no idea where
// the skier is, so the first render (on the server) shows the date in UTC
// and the browser redraws it in local time straight away.

const formats = {
  date: { weekday: "short", day: "numeric", month: "short", year: "numeric" },
  datetime: { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" },
  time: { hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export function LocalTime({ iso, format = "datetime" }: { iso: string; format?: keyof typeof formats }) {
  const client = useIsClient();
  const text = new Intl.DateTimeFormat("en-CA", { ...formats[format], ...(client ? {} : { timeZone: "UTC" }) }).format(
    new Date(iso),
  );
  return <time dateTime={iso}>{text}</time>;
}
