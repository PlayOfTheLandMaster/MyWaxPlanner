import type { ForecastWindow } from "@/lib/weather/forecast";
import { HUMIDITY_LABELS, SNOW_TYPE_LABELS } from "@/lib/catalogue/labels";
import { SKY_LABELS } from "@/lib/history/vocab";

const deg = (n: number) => `${n > 0 ? "+" : ""}${n}`.replace("-", "−") + " °C";
const hhmm = (local: string) => local.slice(11, 16);

/** The forecast for a session window, as the skier will meet it. */
export function ForecastCard({ w, compact = false }: { w: ForecastWindow; compact?: boolean }) {
  const [cold, warm] = w.snow_temp_range;
  const endLabel = `${String((Number(w.start.slice(11, 13)) + w.hours.length) % 24).padStart(2, "0")}:${w.start.slice(14, 16)}`;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4" aria-label={`Forecast for ${w.venue.name}`}>
      <div>
        <p className="text-sm text-muted">
          {w.venue.name} · {w.elevation_m} m · {w.start.slice(0, 10)} {hhmm(w.start)}–{endLabel} local
        </p>
        <p className="text-3xl font-bold">
          {deg(w.air_temp_c)} <span className="text-base font-normal text-muted">air at start</span>
        </p>
        <p className="text-sm">
          {SKY_LABELS[w.sky]} · {deg(w.air_temp_min_c)} to {deg(w.air_temp_max_c)} while out
          {w.overnight_low_c !== null ? ` · night low ${deg(w.overnight_low_c)}` : ""}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-tile p-2">
          <dt className="text-xs text-muted">Snow temperature (estimate)</dt>
          <dd className="font-semibold">{cold === warm ? deg(cold) : `${deg(cold)} to ${deg(warm)}`}</dd>
        </div>
        <div className="rounded-lg bg-tile p-2">
          <dt className="text-xs text-muted">Air humidity</dt>
          <dd className="font-semibold">
            {w.air_rh_pct} % · {HUMIDITY_LABELS[w.air_humidity_band].toLowerCase()}
          </dd>
        </div>
        <div className="rounded-lg bg-tile p-2">
          <dt className="text-xs text-muted">New snow, last 24 h</dt>
          <dd className="font-semibold">
            {w.new_snow_cm} cm{w.snowfall_during_cm > 0 ? ` (+${w.snowfall_during_cm} while out)` : ""}
          </dd>
        </div>
        <div className="rounded-lg bg-tile p-2">
          <dt className="text-xs text-muted">Likely snow</dt>
          <dd className="font-semibold">
            {SNOW_TYPE_LABELS[w.snow_type].split(",")[0]}, {HUMIDITY_LABELS[w.snow_humidity_band].toLowerCase()}
          </dd>
        </div>
      </dl>

      {!compact && (
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <caption className="sr-only">Hour by hour</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="p-1 text-left font-normal">Hour</th>
                <th scope="col" className="p-1 font-normal">Air</th>
                <th scope="col" className="p-1 font-normal">Humidity</th>
                <th scope="col" className="p-1 font-normal">Snow</th>
                <th scope="col" className="p-1 font-normal">Cloud</th>
                <th scope="col" className="p-1 font-normal">Wind</th>
              </tr>
            </thead>
            <tbody>
              {w.hours.map((h) => (
                <tr key={h.time} className="border-t border-line">
                  <th scope="row" className="p-1 text-left font-medium">{hhmm(h.time)}</th>
                  <td className="p-1">{deg(Math.round(h.temp_c * 10) / 10)}</td>
                  <td className="p-1">{Math.round(h.rh_pct)} %</td>
                  <td className="p-1">{h.snowfall_cm > 0 ? `${h.snowfall_cm} cm` : "–"}</td>
                  <td className="p-1">{Math.round(h.cloud_pct)} %</td>
                  <td className="p-1">{Math.round(h.wind_kmh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">
        Air forecast from <a href="https://open-meteo.com/" className="underline">Open-Meteo</a>. Snow figures are estimates; check them on the trail.
      </p>
    </section>
  );
}
