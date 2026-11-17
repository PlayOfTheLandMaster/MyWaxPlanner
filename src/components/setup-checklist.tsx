import Link from "next/link";
import { progress, type Step, type StepKey } from "@/lib/setup/steps";

/**
 * The getting-started checklist: on Today, and on each step's page once that
 * step is done, so a new account always sees where it is in the list rather
 * than a lone "next" button. `next` is drawn as the button to tap.
 */
export function SetupChecklist({
  steps,
  next,
  note,
}: {
  steps: Step[];
  next?: StepKey;
  note?: string;
}) {
  const { done, total } = progress(steps);
  return (
    <>
      <h2 className="font-semibold">
        Getting started{" "}
        <span className="font-normal text-muted">
          · {done} of {total} done
        </span>
      </h2>
      <p className="text-sm text-muted">
        {note ?? "Recommendations come from your own skis, waxes and tools."}
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {steps.map((s) => {
          const isNext = s.key === next;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                aria-current={isNext ? "step" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg ${isNext ? "bg-accent px-3 font-semibold text-on-accent active:opacity-70" : "active:bg-tile"}`}
              >
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${s.done ? "border-accent bg-accent text-on-accent" : isNext ? "border-on-accent" : "border-line"}`}
                >
                  {s.done ? "✓" : ""}
                </span>
                <span
                  className={`min-w-0 flex-1 ${s.done ? "text-muted line-through" : ""}`}
                >
                  {s.label}
                  {s.optional && !s.done && (
                    <span
                      className={`text-sm font-normal ${isNext ? "" : "text-muted"}`}
                    >
                      {" "}
                      · optional
                    </span>
                  )}
                </span>
                {isNext && <span aria-hidden>Next →</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
