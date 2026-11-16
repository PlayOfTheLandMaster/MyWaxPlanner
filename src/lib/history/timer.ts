// How long a procedure step says to wait, for the wax-along timer. Pure and
// tested. A range ("10–15 minutes") gives its longer end, which is the safe
// side for drying and cooling; a step without minutes gives none.

export function timerMinutes(text: string): number | null {
  const m = text.match(/(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?\s*(?:minutes|minute|mins?)\b/i);
  if (!m) return null;
  const n = Number(m[2] ?? m[1]);
  return n > 0 && n <= 180 ? n : null;
}
