"use client";

import { useActionState, useState } from "react";
import type { CopyState } from "./actions";

type Group = { key: string; name: string; skis: { id: string; name: string }[] };

/** Ticks grouped by skier, with "All" per skier and for everyone. */
export function CopyForm({
  action,
  groups,
  technique,
}: {
  action: (prev: CopyState, data: FormData) => Promise<CopyState>;
  groups: Group[];
  technique: string;
}) {
  const [state, submit, pending] = useActionState<CopyState, FormData>(action, {});
  const all = groups.flatMap((g) => g.skis.map((k) => k.id));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (ids: string[], on: boolean) =>
    setPicked((p) => {
      const n = new Set(p);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  const allOn = all.length > 0 && all.every((id) => picked.has(id));

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{technique} skis only.</p>
        <button type="button" onClick={() => toggle(all, !allOn)} className="min-h-11 px-2 text-sm text-link underline">
          {allOn ? "Untick all" : "Tick all"}
        </button>
      </div>
      {groups.map((g) => {
        const ids = g.skis.map((k) => k.id);
        const groupOn = ids.every((id) => picked.has(id));
        return (
          <fieldset key={g.key} className="rounded-xl border border-line bg-surface p-3">
            <legend className="sr-only">{g.name}</legend>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{g.name}</p>
              {ids.length > 1 && (
                <button type="button" onClick={() => toggle(ids, !groupOn)} className="min-h-11 px-2 text-sm text-link underline">
                  {groupOn ? "None" : "All"}
                </button>
              )}
            </div>
            <ul className="flex flex-col">
              {g.skis.map((k) => (
                <li key={k.id}>
                  <label className="flex min-h-11 items-center gap-3 active:bg-tile">
                    <input
                      type="checkbox"
                      name="ski"
                      value={k.id}
                      checked={picked.has(k.id)}
                      onChange={(e) => toggle([k.id], e.target.checked)}
                      className="size-5 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 truncate">{k.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || picked.size === 0}
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
      >
        {pending
          ? "Copying…"
          : picked.size === 0
            ? "Tick the pairs to copy to"
            : `Copy to ${picked.size} ${picked.size === 1 ? "pair" : "pairs"}`}
      </button>
    </form>
  );
}
