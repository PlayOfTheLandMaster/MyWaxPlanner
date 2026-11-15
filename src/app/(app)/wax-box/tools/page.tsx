import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { WaxBoxNav } from "@/components/wax-box-nav";
import { ToolRow } from "./tool-row";

export const metadata: Metadata = { title: "Tools · My Wax Planner" };

// The spec's Tools checklist, in its order. Recommendations will build
// procedures only with ticked tools, and offer a fallback for the rest.
const SECTIONS: { label: string; types: string[] }[] = [
  { label: "Scrapers", types: ["scraper", "groove_scraper"] },
  { label: "Hand brushes", types: ["brush"] },
  { label: "Roto brushes", types: ["roto_brush"] },
  { label: "Irons", types: ["iron"] },
  { label: "Cork and fibertex", types: ["cork", "fibertex"] },
  { label: "Bench and other tools", types: ["profile", "vise", "structure_tool", "heat_gun", "tape", "other"] },
];

type Tool = { id: string; type: string; name: string };

export default function ToolsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-bold">Wax box</h1>
      <WaxBoxNav current="tools" />
      <p className="text-sm text-muted">
        Tick the tools you own. Waxing plans will only ask you to use tools that are ticked.
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Checklist />
      </Suspense>
    </main>
  );
}

async function Checklist() {
  const supabase = await createClient();
  const [tools, mine] = await Promise.all([
    supabase.from("tools").select("id, type, name").order("name"),
    supabase.from("user_tools").select("tool_id, condition"),
  ]);
  if (tools.error || mine.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not read the tools: {(tools.error ?? mine.error)?.message}
      </p>
    );
  }

  const owned = new Map((mine.data ?? []).map((t) => [t.tool_id as string, t.condition as string | null]));
  const all = (tools.data ?? []) as Tool[];
  const count = all.filter((t) => owned.has(t.id)).length;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm">
        {count} of {all.length} ticked
      </p>
      {SECTIONS.map((section) => {
        const inSection = all.filter((t) => section.types.includes(t.type));
        if (inSection.length === 0) return null;
        return (
          <section key={section.label} className="rounded-xl border border-line bg-surface px-3 py-2">
            <h2 className="py-1 font-semibold">{section.label}</h2>
            <ul className="divide-y divide-line">
              {inSection.map((t) => (
                <ToolRow
                  key={t.id}
                  toolId={t.id}
                  name={t.name}
                  owned={owned.has(t.id)}
                  condition={owned.get(t.id) ?? null}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
