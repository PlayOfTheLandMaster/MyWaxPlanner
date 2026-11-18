"use client";

import { useState } from "react";
import {
  SKI_CATEGORIES,
  SKI_CATEGORY_LABELS,
  TECHNIQUES,
  TECHNIQUE_LABELS,
  type Technique,
} from "@/lib/skis/input";
import type { PlanSki } from "@/lib/recommend/load";
import { AddSkiInline } from "@/components/add-ski-inline";
import { skisLabel } from "@/lib/skiers/possessive";

const field =
  "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base";
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
  me,
  initialSki,
  initialOwner,
  initialTechnique,
  initialGrip,
}: {
  skis: PlanSki[];
  skiers: { id: string; name: string }[];
  /** The account holder's name ("Finn P."). */
  me: string;
  initialSki: string;
  /** "me", a skier id, or "other" (someone with no saved skis). */
  initialOwner: string;
  initialTechnique: Technique | null;
  initialGrip: string;
}) {
  // Pairs added here (Add a pair of skis…) join the list without leaving the plan.
  const [added, setAdded] = useState<PlanSki[]>([]);
  const [adding, setAdding] = useState(false);
  const allSkis = [...skis, ...added];
  const [skiId, setSkiId] = useState(initialSki);
  const [technique, setTechnique] = useState<Technique | null>(
    initialTechnique,
  );
  const ski = allSkis.find((k) => k.id === skiId);
  // Whose skis: narrows the pair list. "me" = the account holder; "other" =
  // someone with no saved skis, so there is no pair to pick.
  const [owner, setOwner] = useState(
    ski ? (ski.skier_id ?? "me") : initialOwner,
  );
  const pairs =
    owner === "other"
      ? []
      : allSkis.filter((k) =>
          owner === "me" ? k.skier_id === null : k.skier_id === owner,
        );

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
            <option value="me">{me}</option>
            {skiers.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
            <option value="other">Other</option>
          </select>
        </label>
      )}
      {pairs.length > 0 && (
        <label className={label}>
          {skisLabel(owner === "me" ? me : skiers.find((k) => k.id === owner)?.name)}
          <select
            name="ski"
            value={skiId}
            onChange={(e) => {
              if (e.target.value === "__add") {
                setAdding(true);
                return;
              }
              setSkiId(e.target.value);
            }}
            className={field}
          >
            <option value="">Select ski</option>
            {pairs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} — {TECHNIQUE_LABELS[k.technique]}
                {k.category
                  ? `, ${SKI_CATEGORY_LABELS[k.category].split(" ")[0].toLowerCase()}`
                  : ""}
              </option>
            ))}
            <option value="__add">Add a pair of skis…</option>
          </select>
        </label>
      )}
      {/* No pairs saved yet for this person: offer to add one here rather than in the Wax box. */}
      {pairs.length === 0 && owner !== "other" && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="-mt-1 inline-flex min-h-11 items-center self-start text-sm text-link underline">
          Add a pair of skis
        </button>
      )}
      {adding && (
        <AddSkiInline
          owner={owner === "me" ? null : owner}
          technique={technique}
          onAdded={(k) => {
            setAdded((ks) => [...ks, { id: k.id, skier_id: k.skier_id, name: k.name, technique: k.technique, category: k.category as PlanSki["category"], grind: k.grind, grip_zone_cm: k.grip_zone_cm }]);
            setSkiId(k.id);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {ski ? (
        <p className="-mt-2 text-sm text-muted">
          {TECHNIQUE_LABELS[ski.technique]}
          {ski.technique === "classic" && ski.category
            ? ` · ${SKI_CATEGORY_LABELS[ski.category]}`
            : ""}
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
