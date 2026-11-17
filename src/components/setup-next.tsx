import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadSetupSteps } from "@/lib/setup/load";
import { nextCard, type StepKey } from "@/lib/setup/steps";
import { SetupChecklist } from "./setup-checklist";

type Params = Promise<Record<string, string | string[] | undefined>>;

/**
 * On a getting-started page, once its step is done: the checklist itself, with
 * this step ticked and the next one as the button, so a new account sees where
 * it is in the list rather than being left on a page with nowhere obvious to
 * go. Nothing while the step is undone or once setup is long finished.
 */
export function SetupNext({ step, searchParams }: { step: StepKey; searchParams: Params }) {
  return (
    <Suspense fallback={null}>
      <Card step={step} searchParams={searchParams} />
    </Suspense>
  );
}

async function Card({ step, searchParams }: { step: StepKey; searchParams: Params }) {
  const fromChecklist = (await searchParams).start !== undefined;
  const steps = await loadSetupSteps(await createClient());
  const card = nextCard(steps, step, fromChecklist);
  if (!card) return null;
  return (
    <section aria-label="Getting started" className="flex flex-col gap-1 rounded-xl border border-accent bg-tile p-4">
      {card.kind === "next" ? (
        <>
          <SetupChecklist steps={steps} next={card.next.key} note={card.doneLabel} />
          <Link href="/" className="inline-flex min-h-11 items-center justify-center self-center text-sm text-link underline">
            Back to Today
          </Link>
        </>
      ) : (
        <>
          <SetupChecklist steps={steps} note="You’re set up. Recommendations now use your own skis, waxes and tools." />
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
          >
            Back to Today →
          </Link>
        </>
      )}
    </section>
  );
}
