// The getting-started checklist on Today, and the "what next" card each of its
// steps shows once it is done. A new account used to set a home venue and then
// find nothing on the Venues page pointing anywhere else.

export type StepKey = "style" | "venue" | "skiers" | "skis" | "waxes" | "tools";

export type Step = {
  key: StepKey;
  done: boolean;
  label: string;
  href: string;
  /**
   * Someone who only waxes their own skis never adds a skier, so this step
   * must not keep the checklist on Today for ever: it does not count towards
   * "done", and the next-step card offers a way past it.
   */
  optional?: boolean;
};

export type SetupFacts = {
  /** Guided or expert was chosen; `expert` makes the tools step optional. */
  style: "guided" | "expert" | null;
  home: boolean;
  skiers: number;
  skis: number;
  waxes: number;
  tools: number;
};

/**
 * The steps in order. Links carry ?start= so a page knows it was opened from
 * the checklist (Account holds two steps, so its links name which one).
 */
export function setupSteps(f: SetupFacts): Step[] {
  return [
    // First: it decides what Today's main button does, and whether tools matter.
    {
      key: "style",
      done: f.style !== null,
      label: "Choose how you wax",
      href: "/account?start=style#style",
    },
    {
      key: "venue",
      done: f.home,
      label: "Pick a home venue",
      href: "/venues?start=1",
    },
    // Before skis, because each pair is added for a skier.
    {
      key: "skiers",
      done: f.skiers > 0,
      label: "Add skiers you wax for",
      href: "/account?start=skiers#skiers",
      optional: true,
    },
    {
      key: "skis",
      done: f.skis > 0,
      label: "Add your skis",
      href: "/wax-box/skis/new?start=1",
    },
    {
      key: "waxes",
      done: f.waxes > 0,
      label: "Add your waxes",
      href: "/wax-box/add?start=1",
    },
    {
      key: "tools",
      done: f.tools > 0,
      label: "Tick the tools you own",
      href: "/wax-box/tools?start=1",
      // Tools only feed the step-by-step instructions, which an expert skips.
      optional: f.style === "expert",
    },
  ];
}

/**
 * "x of 5 done" counts every step on the list, as the owner reads it. `todo`
 * counts only the required ones: the checklist goes once it is 0, so an
 * optional step left undone never keeps it on Today.
 */
export function progress(steps: Step[]): {
  done: number;
  total: number;
  todo: number;
} {
  const todo = steps.filter((s) => !s.optional && !s.done).length;
  return {
    done: steps.filter((s) => s.done).length,
    total: steps.length,
    todo,
  };
}

export type NextCard =
  | {
      kind: "next";
      doneLabel: string;
      next: Step;
      left: number;
    }
  | { kind: "finished" }
  | null;

// Said once a step is done. Each says the list is never closed: nobody has
// every wax to hand on day one, and a new pair or a new skier comes along later.
const DONE_LABELS: Record<StepKey, string> = {
  style: "Saved. You can change how you wax any time on your Account page.",
  venue: "Home venue set. You can change it, or add more venues, any time from Venues.",
  skiers: "Skier added. Add the rest now, or any time later from your Account page.",
  skis: "Skis added. Add the rest now, or any time later from Wax box → Skis.",
  waxes: "Waxes added. Add the rest now, or any time later from the Wax box: you don’t need them all today.",
  tools: "Tools ticked. You can tick more any time from Wax box → Tools.",
};

/**
 * What the page for `current` should offer: the next step still to do (the
 * first undone one after this, wrapping round), or "all set" when every step
 * that counts is done and the page was opened from the checklist. Nothing
 * while this step itself is still undone, or once setup is long finished.
 */
export function nextCard(steps: Step[], current: StepKey, fromChecklist: boolean): NextCard {
  const i = steps.findIndex((s) => s.key === current);
  if (i < 0 || !steps[i].done) return null;
  const { todo } = progress(steps);
  const order = [...steps.slice(i + 1), ...steps.slice(0, i)];
  const next = todo > 0 ? order.find((s) => !s.done) : undefined;
  if (next) {
    return {
      kind: "next",
      doneLabel: DONE_LABELS[current],
      next,
      left: todo,
    };
  }
  return fromChecklist ? { kind: "finished" } : null;
}
