"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { setWaxStep } from "@/app/(app)/session/actions";
import { timerMinutes } from "@/lib/history/timer";

/**
 * Wax-along: the plan's steps one at a time, in big text, for a bench with
 * waxy hands. "Done — next" ticks the step on the session (the same ticks as
 * the checklist) and moves on. A step that says how long to wait offers a
 * timer. The screen is kept awake while this page is open, where the browser
 * allows it.
 */
export function WaxAlong({
  sessionId,
  steps,
  initialDone,
  finish,
}: {
  sessionId: string;
  steps: { section: string; text: string }[];
  initialDone: number[];
  finish: () => Promise<void>;
}) {
  const firstOpen = steps.findIndex((_, i) => !initialDone.includes(i));
  const [at, setAt] = useState(firstOpen === -1 ? steps.length : firstOpen);
  const [done, setDone] = useState<number[]>(initialDone);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useWakeLock();

  const mark = (i: number, on: boolean) => {
    setDone((d) => (on ? [...new Set([...d, i])] : d.filter((n) => n !== i)));
    setError(null);
    startTransition(async () => {
      const failed = await setWaxStep(sessionId, i, on);
      if (failed) {
        setDone((d) => (on ? d.filter((n) => n !== i) : [...d, i]));
        setError(failed);
      }
    });
  };

  if (at >= steps.length) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-5 text-center">
        <p className="text-5xl" aria-hidden>
          ✓
        </p>
        <h1 className="text-2xl font-bold">All {steps.length} steps done</h1>
        <p className="text-muted">Mark the skis as waxed, and the session will be ready to ski.</p>
        <form action={finish}>
          <button
            type="submit"
            className="min-h-14 w-full rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70"
          >
            Done waxing
          </button>
        </form>
        <button type="button" onClick={() => setAt(steps.length - 1)} className="min-h-11 text-link underline">
          Back to the last step
        </button>
      </div>
    );
  }

  const step = steps[at];
  const minutes = timerMinutes(step.text);
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Step {at + 1} of {steps.length}
          {step.section ? ` · ${step.section}` : ""}
        </span>
        <Link href={`/session/${sessionId}`} className="inline-flex min-h-11 items-center text-link underline">
          Close
        </Link>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-tile" aria-hidden>
        <div className="h-full bg-accent" style={{ width: `${(done.length / steps.length) * 100}%` }} />
      </div>

      <p className="text-2xl leading-snug font-semibold" aria-live="polite">
        {step.text}
      </p>

      {/* key: a new step starts its own timer from scratch. */}
      {minutes !== null && <Timer key={at} minutes={minutes} />}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-auto grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={at === 0}
          onClick={() => setAt(at - 1)}
          className="min-h-14 rounded-xl border border-line bg-surface font-semibold active:bg-tile disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            mark(at, true);
            setAt(at + 1);
          }}
          className="col-span-2 min-h-14 rounded-xl bg-accent px-4 text-lg font-bold text-on-accent active:opacity-70"
        >
          {done.includes(at) ? "Next" : "Done — next"}
        </button>
      </div>
      {done.includes(at) && (
        <button type="button" onClick={() => mark(at, false)} className="min-h-11 self-center text-sm text-link underline">
          Untick this step
        </button>
      )}
    </div>
  );
}

/** A countdown for a step's wait. Runs from a fixed end time, so a slow tab doesn't drift. */
function Timer({ minutes }: { minutes: number }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    if (endAt === null) return;
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt && !buzzed.current) {
        buzzed.current = true;
        try {
          navigator.vibrate?.([300, 150, 300]);
        } catch {
          // No vibration on this device.
        }
      }
    }, 250);
    return () => clearInterval(tick);
  }, [endAt]);

  const left = endAt === null ? minutes * 60_000 : Math.max(0, endAt - now);
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  const over = endAt !== null && left === 0;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${over ? "border-accent bg-tile" : "border-line bg-surface"}`}>
      <p className="text-3xl font-bold tabular-nums" aria-live={over ? "assertive" : "off"}>
        {over ? "Time's up" : `${mm}:${String(ss).padStart(2, "0")}`}
      </p>
      {endAt === null ? (
        <button
          type="button"
          onClick={() => {
            buzzed.current = false;
            const t = Date.now();
            setNow(t);
            setEndAt(t + minutes * 60_000);
          }}
          className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
        >
          Start {minutes}-min timer
        </button>
      ) : (
        <button type="button" onClick={() => setEndAt(null)} className="min-h-11 rounded-lg border border-line px-4 active:bg-tile">
          Reset
        </button>
      )}
    </div>
  );
}

/** Keeps the screen on while waxing, where the browser supports it; nothing happens elsewhere. */
function useWakeLock() {
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Lock> } };
    let lock: Lock | null = null;
    const take = async () => {
      try {
        lock = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        // Not allowed (battery saver, older browser): the screen may dim as usual.
      }
    };
    const again = () => {
      if (document.visibilityState === "visible") void take();
    };
    void take();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      void lock?.release().catch(() => {});
    };
  }, []);
}
