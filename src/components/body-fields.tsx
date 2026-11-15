import { MONTHS, type Body } from "@/lib/skiers/body";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

/** Birth year, birth month and weight: optional, the same for a skier and for you. */
export function BodyFields({ initial, years }: { initial?: Partial<Body>; years: number[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Birth year
        <select name="birth_year" defaultValue={initial?.birth_year ?? ""} className={field}>
          <option value="">—</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Month
        <select name="birth_month" defaultValue={initial?.birth_month ?? ""} className={field}>
          <option value="">—</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Weight (kg)
        <input
          name="weight_kg"
          type="number"
          inputMode="decimal"
          min={10}
          max={250}
          step={0.1}
          defaultValue={initial?.weight_kg ?? ""}
          className={field}
        />
      </label>
    </div>
  );
}
