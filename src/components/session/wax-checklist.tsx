"use client";

import { useState, useTransition } from "react";
import { setWaxStep } from "@/app/(app)/session/actions";

/**
 * The plan's steps as a tick-off list. Ticks are saved on the session
 * (wax_steps_done), so the list, the wax-along mode and every device agree.
 * A tick shows at once and is saved behind it; if the save fails it is taken
 * back and the list says why, so it never claims a step is saved when it is not.
 */
export function WaxChecklist({
  sessionId,
  steps,
  initialDone,
}: {
  sessionId: string;
  steps: { section: string; text: string }[];
  initialDone: number[];
}) {
  const [done, setDone] = useState<number[]>(initialDone);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (i: number) => {
    const on = !done.includes(i);
    setDone((d) => (on ? [...d, i] : d.filter((n) => n !== i)));
    setError(null);
    startTransition(async () => {
      const failed = await setWaxStep(sessionId, i, on);
      if (failed) {
        setDone((d) => (on ? d.filter((n) => n !== i) : [...d, i]));
        setError(failed);
      }
    });
  };

  const sections = [...new Set(steps.map((s) => s.section))];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted" aria-live="polite">
        {done.length} of {steps.length} steps done
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {sections.map((section) => (
        <div key={section || "steps"} className="flex flex-col gap-1">
          {section && <h3 className="text-sm font-semibold">{section}</h3>}
          <ul className="flex flex-col">
            {steps.map((s, i) =>
              s.section !== section ? null : (
                <li key={i}>
                  <label className="flex min-h-11 items-start gap-3 py-1 text-sm">
                    <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} className="mt-0.5 size-5 shrink-0" />
                    <span className={done.includes(i) ? "text-muted line-through" : ""}>{s.text}</span>
                  </label>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
