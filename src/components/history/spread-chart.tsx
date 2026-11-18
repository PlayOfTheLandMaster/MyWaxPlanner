import { tempDomain, type WaxSpread, type Zone } from "@/lib/history/insights";
import { temp } from "@/lib/history/share";

export function Legend() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span>Rating</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="inline-flex items-center gap-1">
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="6" style={{ fill: `var(--rate-${n})` }} />
          </svg>
          {n}
        </span>
      ))}
    </p>
  );
}

/**
 * A strip per wax: snow temperature left (cold) to right (warm), one dot per
 * session, coloured by its rating and carrying its number. Dots that land on the same temperature
 * are lifted apart so none hides another. Each dot carries a tooltip.
 */
export function SpreadChart({ spread, zone }: { spread: WaxSpread[]; zone: Zone }) {
  const [lo, hi] = tempDomain(spread);
  const W = 360;
  const PAD = 10;
  const x = (t: number) => PAD + ((t - lo) / (hi - lo)) * (W - 2 * PAD);
  const step = hi - lo > 20 ? 5 : 2;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);

  return (
    // A track per wax, separated by a hairline: the old per-row gridlines broke at
    // every wax name and read as dashes. The rating is written in its dot, not
    // left to a shade of blue, where 4 and 5 looked alike (the owner's "messy").
    <figure className="flex flex-col rounded-xl border border-line bg-surface px-3 pt-1 pb-3">
      <div className="flex flex-col divide-y divide-line">
        {spread.map((w) => {
          // Lift dots that share a temperature (to the half degree) into rows.
          const seen = new Map<number, number>();
          const placed = w.points.map((pt) => {
            const k = Math.round(pt.temp * 2);
            const n = seen.get(k) ?? 0;
            seen.set(k, n + 1);
            return { ...pt, lift: n };
          });
          const rows = Math.max(1, ...placed.map((p) => p.lift + 1));
          // The track sits just under the name; each lifted dot adds a 20-unit row above it.
          const H = 24 + (rows - 1) * 20;
          const base = H - 12;
          return (
            <div key={w.name} className="flex flex-col gap-0.5 py-2">
              <p className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium">{w.name}</span>
                <span className="shrink-0 text-muted tabular-nums">
                  {w.points.length} {w.points.length === 1 ? "session" : "sessions"} · avg {w.average}
                </span>
              </p>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                role="img"
                aria-label={`${w.name}: ${w.points.map((p) => `${temp(p.temp)} rated ${p.rating}`).join(", ")}`}
              >
                {/* The track, with a short tick at each temperature mark; 0 °C a little taller. */}
                <line x1={PAD} x2={W - PAD} y1={base} y2={base} style={{ stroke: "var(--line)" }} strokeWidth={2} strokeLinecap="round" />
                {ticks.map((t) => (
                  <line
                    key={t}
                    x1={x(t)}
                    x2={x(t)}
                    y1={base - (t === 0 ? 7 : 4)}
                    y2={base + (t === 0 ? 7 : 4)}
                    style={{ stroke: t === 0 ? "var(--muted)" : "var(--line)" }}
                    strokeWidth={t === 0 ? 2 : 1.5}
                  />
                ))}
                {placed.map((pt) => (
                  <g key={pt.session}>
                    <circle cx={x(pt.temp)} cy={base - pt.lift * 20} r={8.5} style={{ fill: `var(--rate-${pt.rating})`, stroke: "var(--surface)" }} strokeWidth={2} />
                    <text
                      x={x(pt.temp)}
                      y={base - pt.lift * 20 + 3.5}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                      // Light dots (1–2) take dark figures; darker ones, light.
                      style={{ fill: pt.rating >= 3 ? "var(--surface)" : "var(--ink)" }}
                    >
                      {pt.rating}
                    </text>
                    <title>{`${w.name}: snow ${temp(pt.temp)}, ${zone} ${pt.rating}/5`}</title>
                  </g>
                ))}
              </svg>
            </div>
          );
        })}
      </div>
      <svg viewBox={`0 0 ${W} 18`} className="mt-1 w-full" aria-hidden>
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={13} textAnchor="middle" fontSize={11} style={{ fill: t === 0 ? "var(--ink)" : "var(--muted)" }}>
            {t === 0 ? "0 °C" : temp(t).replace(" °C", "°")}
          </text>
        ))}
      </svg>
      <figcaption className="flex justify-between text-xs text-muted">
        <span>← colder</span>
        <span>warmer →</span>
      </figcaption>
    </figure>
  );
}
