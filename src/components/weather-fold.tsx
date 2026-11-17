import type { ForecastWindow } from "@/lib/weather/forecast";
import { SKY_ICONS, SKY_LABELS } from "@/lib/history/vocab";
import { ForecastCard } from "@/components/forecast-card";
import { fold, foldHead } from "@/components/fold";

const temp = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C";

/**
 * The weather as one folded line, the air temperature and the sky, opening on
 * the full forecast. Today and Plan a wax both use it, so it looks the same.
 */
export function WeatherFold({ w, compact = false }: { w: ForecastWindow; compact?: boolean }) {
  return (
    <details className={fold}>
      <summary className={foldHead}>
        <span aria-hidden className="text-4xl leading-none">
          {SKY_ICONS[w.sky]}
        </span>
        <span className="text-2xl font-bold">{temp(w.air_temp_c)}</span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{SKY_LABELS[w.sky]}</span>
          <span className="block truncate text-sm text-muted">{w.venue.name}</span>
        </span>
      </summary>
      <ForecastCard w={w} compact={compact} bare />
    </details>
  );
}
