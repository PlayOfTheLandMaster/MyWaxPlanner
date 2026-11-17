// The getting-started checklist on Today, and the "what next" card each of its
// steps shows once it is done. A new account used to set a home venue and then
// find nothing on the Venues page pointing anywhere else.

export type StepKey = "venue" | "skiers" | "skis" | "waxes" | "tools";

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
  home: boolean;
  skiers: number;
  skis: number;
  waxes: number;
  tools: number;
};

/** The steps in order. Links carry ?start=1 so a page knows it was opened from the checklist. */
export function setupSteps(f: SetupFacts): Step[] {
  return [
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
      href: "/account?start=1#skiers",
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
    },
  ];
}

/** How far through the steps that count: the checklist goes once `todo` is 0. */
export function progress(steps: Step[]): {
  done: number;
  total: number;
  todo: number;
} {
  const required = steps.filter((s) => !s.optional);
  const done = required.filter((s) => s.done).length;
  return { done, total: required.length, todo: required.length - done };
}

export type NextCard =
  | {
      kind: "next";
      doneLabel: string;
      next: Step;
      skipTo: Step | null;
      left: number;
    }
  | { kind: "finished" }
  | null;

const DONE_LABELS: Record<StepKey, string> = {
  venue: "Home venue set.",
  skiers: "Skier added.",
  skis: "Skis added.",
  waxes: "Waxes added.",
  tools: "Tools ticked.",
};

/**
 * What the page for `current` should offer: the next step still to do (the
 * first undone one after this, wrapping round), or "all set" when every step
 * that counts is done and the page was opened from the checklist. Nothing
 * while this step itself is still undone, or once setup is long finished.
 * When the next step is optional, `skipTo` is the next required one after it.
 */
export function nextCard(
  steps: Step[],
  current: StepKey,
  fromChecklist: boolean,
): NextCard {
  const i = steps.findIndex((s) => s.key === current);
  if (i < 0 || !steps[i].done) return null;
  const { todo } = progress(steps);
  const order = [...steps.slice(i + 1), ...steps.slice(0, i)];
  const next = todo > 0 ? order.find((s) => !s.done) : undefined;
  if (next) {
    const skipTo = next.optional
      ? (order
          .slice(order.indexOf(next) + 1)
          .find((s) => !s.done && !s.optional) ?? null)
      : null;
    return {
      kind: "next",
      doneLabel: DONE_LABELS[current],
      next,
      skipTo,
      left: todo,
    };
  }
  return fromChecklist ? { kind: "finished" } : null;
}
