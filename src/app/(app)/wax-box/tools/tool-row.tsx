"use client";

import { useState, useTransition } from "react";
import { setCondition, setOwned } from "./actions";

const CONDITION_LABELS: Record<string, string> = {
  "": "Condition…",
  new: "New",
  good: "Good",
  worn: "Worn",
  replace: "Needs replacing",
};

/**
 * One line of the checklist. The tick changes at once and saves behind it; if
 * the save fails, the tick goes back and the row says why, so the screen never
 * claims a tool is saved when it is not.
 */
export function ToolRow({
  toolId,
  name,
  owned: savedOwned,
  condition: savedCondition,
}: {
  toolId: string;
  name: string;
  owned: boolean;
  condition: string | null;
}) {
  const [owned, setOwnedState] = useState(savedOwned);
  const [condition, setConditionState] = useState(savedCondition ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="py-1">
      <div className="flex items-center justify-between gap-3">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
          <input
            type="checkbox"
            checked={owned}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.checked;
              setOwnedState(next);
              setError(null);
              startTransition(async () => {
                const failed = await setOwned(toolId, next);
                if (failed) {
                  setOwnedState(!next);
                  setError(failed);
                }
                if (!next) setConditionState("");
              });
            }}
            className="size-5 shrink-0"
          />
          <span className="min-w-0">{name}</span>
        </label>
        {owned && (
          <select
            aria-label={`Condition of ${name}`}
            value={condition}
            disabled={pending}
            onChange={(e) => {
              const previous = condition;
              const next = e.target.value;
              setConditionState(next);
              setError(null);
              startTransition(async () => {
                const failed = await setCondition(toolId, next);
                if (failed) {
                  setConditionState(previous);
                  setError(failed);
                }
              });
            }}
            className="min-h-11 shrink-0 rounded-lg border border-line bg-surface px-2 text-sm"
          >
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
