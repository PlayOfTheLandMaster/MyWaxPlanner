// The Today page's title: "Today - Tuesday, November 17", the reader's own
// day (the server runs in UTC, so the zone is passed in). Pure, so it can be tested.

export function todayTitle(now: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(now);
  return `Today - ${day}`;
}
