// The date in the Today page's title, "Tuesday, November 17": the reader's
// own day (the server runs in UTC, so the zone is passed in). Pure, so it can be tested.

export function todayDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(now);
}
