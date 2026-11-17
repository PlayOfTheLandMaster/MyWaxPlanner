import { BackLink } from "@/components/nav-trail";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VIDEO_COLUMNS, isAdmin } from "@/lib/learn/load";
import { LEVEL_LABELS, TOPICS, TOPIC_LABELS, thumbnailUrl, type Topic, type Video } from "@/lib/learn/videos";

export const metadata: Metadata = { title: "Learn · My Wax Planner" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export default function LearnPage({ searchParams }: PageProps<"/learn">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      {/* A tab, but still reached from somewhere: back to the page you came from, else Today. */}
      <BackLink fallback="/" fallbackLabel="Today" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">Learn</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Library searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Library({ searchParams }: { searchParams: PageProps<"/learn">["searchParams"] }) {
  const p = await searchParams;
  const topic = (TOPICS as readonly string[]).includes(one(p.topic) ?? "") ? (one(p.topic) as Topic) : undefined;
  const technique = ["classic", "skate"].includes(one(p.technique) ?? "") ? one(p.technique) : undefined;
  const q = one(p.q)?.trim().slice(0, 60);

  const supabase = await createClient();
  const [admin, all] = await Promise.all([
    isAdmin(supabase),
    supabase.from("learn_videos").select(VIDEO_COLUMNS).order("title"),
  ]);
  if (all.error) {
    return <p role="alert" className="text-sm text-danger">Could not read the videos: {all.error.message}</p>;
  }
  const videos = (all.data ?? []) as Video[];
  const needle = q?.toLowerCase();
  const shown = videos.filter(
    (v) =>
      (!topic || v.topic === topic) &&
      // A video for both techniques shows under either.
      (!technique || v.technique === null || v.technique === technique) &&
      (!needle || [v.title, v.channel, v.notes, ...v.tags].join(" ").toLowerCase().includes(needle)),
  );
  const href = (change: Record<string, string | undefined>) => {
    const s = new URLSearchParams(
      Object.entries({ topic, technique, q, ...change }).filter((e): e is [string, string] => !!e[1]),
    ).toString();
    return s ? `/learn?${s}` : "/learn";
  };
  const usedTopics = TOPICS.filter((t) => videos.some((v) => v.topic === t));

  return (
    <>
      {admin && (
        <Link href="/learn/add" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70">
          Add a video
        </Link>
      )}

      {videos.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-muted">
          {admin ? "No videos yet. Add the first one: paste a YouTube link and pick its topic." : "Videos on cleaning, waxing and care are coming soon."}
        </p>
      ) : (
        <>
          <form method="get" className="flex gap-2">
            {topic && <input type="hidden" name="topic" value={topic} />}
            {technique && <input type="hidden" name="technique" value={technique} />}
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search videos and notes"
              aria-label="Search videos"
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
            />
            <button type="submit" className="min-h-11 shrink-0 rounded-lg border border-line bg-surface px-4 text-sm font-semibold">
              Search
            </button>
          </form>

          <nav aria-label="Topics" className="flex flex-wrap gap-2">
            {[undefined, ...usedTopics].map((t) => (
              <Link
                key={t ?? "all"}
                href={href({ topic: t })}
                aria-current={topic === t ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${topic === t ? "border-accent bg-tile font-semibold" : "border-line bg-surface"}`}
              >
                {t ? TOPIC_LABELS[t] : "All topics"}
              </Link>
            ))}
          </nav>
          <nav aria-label="Technique" className="grid grid-cols-3 gap-1 rounded-xl bg-tile p-1">
            {[
              [undefined, "Both"],
              ["classic", "Classic"],
              ["skate", "Skate"],
            ].map(([t, l]) => (
              <Link
                key={l}
                href={href({ technique: t })}
                aria-current={technique === t ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center rounded-lg text-sm ${technique === t ? "bg-surface font-semibold shadow-sm" : "text-muted"}`}
              >
                {l}
              </Link>
            ))}
          </nav>

          {shown.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-muted">No videos match. Try another topic or search.</p>
          ) : (
            (topic ? [topic] : usedTopics).map((t) => {
              const list = shown.filter((v) => v.topic === t);
              if (!list.length) return null;
              return (
                <section key={t} className="flex flex-col gap-2">
                  <h2 className="font-semibold">
                    {TOPIC_LABELS[t]} <span className="font-normal text-muted">({list.length})</span>
                  </h2>
                  <ul className="flex flex-col gap-1">
                    {list.map((v) => (
                      <li key={v.id}>
                        <Link href={`/learn/${v.id}`} className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-surface p-1.5 active:bg-tile">
                          {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
                          <img src={thumbnailUrl(v.youtube_id)} alt="" className="aspect-video w-20 shrink-0 rounded-md object-cover" loading="lazy" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{v.title}</span>
                            <span className="block truncate text-xs text-muted">
                              {[v.channel, v.technique ? (v.technique === "classic" ? "Classic" : "Skate") : null, v.level ? LEVEL_LABELS[v.level] : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </>
      )}
    </>
  );
}
