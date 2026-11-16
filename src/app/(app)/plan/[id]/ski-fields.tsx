"use client";

import { useState } from "react";
import { SKI_CATEGORIES, SKI_CATEGORY_LABELS, TECHNIQUES, TECHNIQUE_LABELS, type Technique } from "@/lib/skis/input";
import type { PlanSki } from "@/lib/recommend/load";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
const label = "flex flex-col gap-1 text-sm font-medium";
const choice =
  "flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-tile has-[:checked]:font-semibold";

/**
 * Skis, technique and grip type. A chosen pair answers the other two, so they
 * are hidden; skate skis have no grip, so the grip choice only appears for
 * classic. Hidden fields are not submitted, so nothing stale is sent.
 */
export function SkiFields({
  skis,
  skiers,
  initialSki,
  initialOwner,
  initialTechnique,
  initialGrip,
}: {
  skis: PlanSki[];
  skiers: { id: string; name: string }[];
  initialSki: string;
  /** "" = everyone, "me", or a skier id. */
  initialOwner: string;
  initialTechnique: Technique | null;
  initialGrip: string;
}) {
  const [skiId, setSkiId] = useState(initialSki);
  const [technique, setTechnique] = useState<Technique | null>(initialTechnique);
  const ski = skis.find((k) => k.id === skiId);
  // Whose skis: narrows the pair list. "" = everyone, "me" = the account holder.
  const [owner, setOwner] = useState(ski ? (ski.skier_id ?? "me") : initialOwner);
  const pairs = skis.filter((k) => owner === "" || (owner === "me" ? k.skier_id === null : k.skier_id === owner));

  return (
    <>
      {skiers.length > 0 && (
        <label className={label}>
          Whose skis
          <select
            name="owner"
            value={owner}
            onChange={(e) => {
              setOwner(e.target.value);
              setSkiId("");
            }}
            className={field}
          >
            <option value="">Everyone</option>
            <option value="me">Me</option>
            {skiers.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className={label}>
        Skis
        <select name="ski" value={skiId} onChange={(e) => setSkiId(e.target.value)} className={field}>
          <option value="">Select ski</option>
          {pairs.map((k) => (
            <option key={k.id} value={k.id}>
              {owner === "" && k.skier_id ? `${skiers.find((x) => x.id === k.skier_id)?.name ?? ""}: ` : ""}
              {k.name} — {TECHNIQUE_LABELS[k.technique]}
              {k.category ? `, ${SKI_CATEGORY_LABELS[k.category].split(" ")[0].toLowerCase()}` : ""}
            </option>
          ))}
        </select>
      </label>

      {ski ? (
        <p className="-mt-2 text-sm text-muted">
          {TECHNIQUE_LABELS[ski.technique]}
          {ski.technique === "classic" && ski.category ? ` · ${SKI_CATEGORY_LABELS[ski.category]}` : ""}
          {ski.grind ? ` · ${ski.grind} grind` : ""}
        </p>
      ) : (
        <>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">Technique</legend>
            <div className="grid grid-cols-2 gap-2">
              {TECHNIQUES.map((t) => (
                <label key={t} className={choice}>
                  <input
                    type="radio"
                    name="technique"
                    value={t}
                    checked={technique === t}
                    onChange={() => setTechnique(t)}
                    className="sr-only"
                  />
                  {TECHNIQUE_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
          {technique === "classic" && (
            <label className={label}>
              Grip type
              <select name="grip" defaultValue={initialGrip} className={field}>
                {SKI_CATEGORIES.map((g) => (
                  <option key={g} value={g}>
                    {SKI_CATEGORY_LABELS[g]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
    </>
  );
}
