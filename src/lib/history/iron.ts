// The iron temperature a layer shows when its wax is chosen or changed. Pure,
// so it can be tested. The wax's own figure (the maker's, else the skier's
// own) replaces one that came from the wax before; a number the person typed
// in themselves is never overwritten.

type Ironed = { iron_temp_c: number | null } | undefined;

export function ironForWax(current: string, before: Ironed, next: Ironed): string {
  const fromBefore = before?.iron_temp_c != null ? String(before.iron_temp_c) : "";
  // Typed by hand: something other than the old wax's own figure.
  if (current.trim() !== "" && current.trim() !== fromBefore) return current;
  return next?.iron_temp_c != null ? String(next.iron_temp_c) : "";
}
