// "Similar to today": History filtered to past sessions in snow like today's
// forecast — within 3 °C, the same snow humidity — best glide first, over all
// seasons. Pure, so it can be tested; the page fetches the forecast.

export function similarQuery(today: { snow_temp_c: number; snow_humidity_band: string }): string {
  return new URLSearchParams({
    period: "all",
    tmin: String(Math.max(-40, Math.floor(today.snow_temp_c - 3))),
    tmax: String(Math.min(0, Math.ceil(today.snow_temp_c + 3))),
    snowhum: today.snow_humidity_band,
    sort: "glide",
  }).toString();
}
