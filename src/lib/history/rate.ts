// The short "How did it go?" card: what it may contain. Pure, so it can be
// tested; the action that saves it is in app/(app)/history/actions.ts.

import { KICK_FEELS, type KickFeel } from "./vocab";

export type RatingInput = {
  glide_rating: number | null;
  grip_rating: number | null;
  kick_feel: KickFeel | null;
  notes: string | null;
  /** "forecast": the forecast becomes the actual conditions. "different": the card's snow questions do. */
  snow: "forecast" | "different" | null;
  /** "changed": the card's own wax pull-downs say what was swapped or skipped. */
  waxed: "planned" | "changed" | null;
};

export type RatingResult = { rating: RatingInput; error?: undefined } | { rating?: undefined; error: string };

const oneToFive = (v: FormDataEntryValue | null): number | null | "invalid" => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : "invalid";
};

export function readRating(form: FormData, classic: boolean): RatingResult {
  const glide = oneToFive(form.get("glide_rating"));
  const grip = classic ? oneToFive(form.get("grip_rating")) : null;
  if (glide === "invalid" || grip === "invalid") return { error: "Ratings go from 1 to 5." };

  const kickRaw = classic ? String(form.get("kick_feel") ?? "") : "";
  const kick = (KICK_FEELS as readonly string[]).includes(kickRaw) ? (kickRaw as KickFeel) : null;

  // A rating is what makes the session done, so the card needs at least one.
  if (glide === null && grip === null && kick === null) {
    return { error: classic ? "Rate the glide, the grip or the kick." : "Rate the glide." };
  }

  const snow = String(form.get("snow") ?? "");
  const waxed = String(form.get("waxed") ?? "");
  const notes = String(form.get("notes") ?? "").trim();

  return {
    rating: {
      glide_rating: glide,
      grip_rating: grip,
      kick_feel: kick,
      notes: notes === "" ? null : notes,
      snow: snow === "forecast" || snow === "different" ? snow : null,
      waxed: waxed === "planned" || waxed === "changed" ? waxed : null,
    },
  };
}

/**
 * Where to go after saving: back to Today when the session was opened from
 * there, else the session. Changed waxes and different snow are both answered
 * on the rating card itself, so nothing leads on to the full form.
 */
export function afterRating(id: string, back: "today" | "session" = "session"): string {
  return back === "today" ? "/?saved=rated" : `/session/${id}?saved=rated`;
}
