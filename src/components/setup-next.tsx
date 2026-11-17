import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadSetupSteps } from "@/lib/setup/load";
import { nextCard, type StepKey } from "@/lib/setup/steps";

/**
 * On a getting-started page, once its step is done: what to do next, so a new
 * account is never left on a page with nowhere obvious to go. Renders nothing
 * while the step is undone or once setup is long finished.
 */
export function SetupNext({
  step,
  searchParams,
}: {
  step: StepKey;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <Card step={step} searchParams={searchParams} />
    </Suspense>
  );
}

async function Card({
  step,
  searchParams,
}: {
  step: StepKey;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const fromChecklist = (await searchParams).start === "1";
  const card = nextCard(
    await loadSetupSteps(await createClient()),
    step,
    fromChecklist,
  );
  if (!card) return null;
  return (
    <section
      aria-label="Getting started"
      className="flex flex-col gap-3 rounded-xl border border-accent bg-tile p-4"
    >
      {card.kind === "next" ? (
        <>
          <p className="text-sm">
            <span className="font-semibold">{card.doneLabel}</span>{" "}
            <span className="text-muted">
              {card.left === 1 ? "One step left." : `${card.left} steps left.`}
            </span>
          </p>
          <Link
            href={card.next.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
          >
            Next: {card.next.label} →
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">
            You’re set up. Recommendations now use your own skis, waxes and
            tools.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
          >
            Back to Today →
          </Link>
        </>
      )}
      {card.kind === "next" && (
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center self-center text-sm text-link underline"
        >
          Back to Today
        </Link>
      )}
    </section>
  );
}
