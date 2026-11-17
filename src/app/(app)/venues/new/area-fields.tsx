"use client";

import { useState } from "react";
import { COUNTRIES, provincesOf } from "@/lib/venues/search-area";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";

/**
 * Country and Province / state for the place search. Canada and the US list
 * their provinces and states; anywhere else the region is typed.
 */
export function AreaFields({ country: initialCountry, province: initialProvince }: { country: string; province: string }) {
  const [country, setCountry] = useState(initialCountry);
  const [province, setProvince] = useState(initialProvince);
  const list = provincesOf(country || null);

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Country
        <select
          name="country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setProvince("");
          }}
          className={field}
        >
          <option value="">Any country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Province / state
        {list.length > 0 ? (
          <select name="province" value={province} onChange={(e) => setProvince(e.target.value)} className={field}>
            <option value="">Any</option>
            {list.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <input
            name="province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Any"
            autoComplete="off"
            maxLength={60}
            className={field}
          />
        )}
      </label>
    </div>
  );
}
