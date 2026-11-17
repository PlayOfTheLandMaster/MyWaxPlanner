// How the account holder likes to wax. Asked once (on the getting-started
// checklist) and changeable in Account, rather than guessed from behaviour:
// a mode that flips by itself is more confusing than a question.

export const WAXING_STYLES = ["guided", "expert"] as const;
export type WaxingStyle = (typeof WAXING_STYLES)[number];

export const STYLE_LABELS: Record<WaxingStyle, { title: string; detail: string }> = {
  guided: {
    title: "Guide me",
    detail: "Suggested waxes for the conditions, with step-by-step instructions.",
  },
  expert: {
    title: "I know what I’m doing",
    detail: "Pick your own waxes and record them; suggestions stay one tap away.",
  },
};

/** The stored value, or null when it was never chosen (treated as guided). */
export function readStyle(v: unknown): WaxingStyle | null {
  return typeof v === "string" && (WAXING_STYLES as readonly string[]).includes(v) ? (v as WaxingStyle) : null;
}

export const isExpert = (s: WaxingStyle | null) => s === "expert";
