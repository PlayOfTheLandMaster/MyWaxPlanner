// Where a session is in its day: Plan → Wax → Ski → Rate → done. Pure, so
// the session page and Today agree and it can be tested.

export type Stage = "wax" | "ski" | "rate" | "done";

/** How long a session is assumed to last before it is time to rate it (Today uses the same). */
export const SKI_HOURS = 3;

export function stageOf(
  s: { status: "planned" | "completed"; occurred_at: string; waxed_at?: string | null },
  now: Date,
): Stage {
  if (s.status === "completed") return "done";
  const start = Date.parse(s.occurred_at);
  // Waxed already ("Done waxing"): next is skiing, even before the start time.
  if (Number.isNaN(start) || now.getTime() < start) return s.waxed_at ? "ski" : "wax";
  if (now.getTime() < start + SKI_HOURS * 3600_000) return "ski";
  return "rate";
}

export const STAGES: { key: Exclude<Stage, "done">; label: string }[] = [
  { key: "wax", label: "Wax" },
  { key: "ski", label: "Ski" },
  { key: "rate", label: "Rate" },
];
