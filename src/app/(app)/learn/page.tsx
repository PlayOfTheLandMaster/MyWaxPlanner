import { BackLink } from "@/components/nav-trail";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VIDEO_COLUMNS, isAdmin } from "@/lib/learn/load";
import { LEVEL_LABELS, TOPICS, TOPIC_LABELS, thumbnailUrl, type Topic, type Video } from "@/lib/learn/videos";
import { NOTE_COLUMNS, SECTION_LABELS, groupNotes, preview, searchNotes, splitNotes, type Note } from "@/lib/learn/notes";
import { currentUser } from "@/lib/auth/current-user";
import { DEFAULT_TAB, LEARN_TABS, learnTab } from "@/lib/learn/tabs";

export const metadata: Metadata = { title: "Learn · My Wax Planner" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export default function LearnPage({ searchParams }: PageProps<"/learn">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      {/* A tab, but still reached from somewhere: back to the page you came from, else Today. */}
      <BackLink fallback="/" fallbackLabel="Today" className="-mb-3 inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">Learn</h1>
      {/* Notes and Videos are tabs, each its own list; the tab is in the address, so a link back keeps it. */}
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Tabbed searchParams={searchParams} />
      </Suspense>
      {/* The app's own guide: a plain link at the foot of the page, apart from the tabs'
          lists (mt-auto keeps it at the bottom even when a list is short). The owner's call. */}
      <footer className="mt-auto border-t border-line pt-4">
        <Link href="/learn/how-to" className="inline-flex min-h-11 items-center text-sm text-link underline">
          How to use My Wax Planner
        </Link>
      </footer>
    </main>
  );
}

async function Tabbed({ searchParams }: { searchParams: PageProps<"/learn">["searchParams"] }) {
  const tab = learnTab(one((await searchParams).tab));
  return (
    <>
      <nav aria-label="Learn" className="grid gap-1 rounded-xl bg-tile p-1" style={{ gridTemplateColumns: `repeat(${LEARN_TABS.length}, minmax(0, 1fr))` }}>
        {LEARN_TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === DEFAULT_TAB ? "/learn" : `/learn?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-lg text-sm ${tab === t.key ? "bg-surface font-semibold shadow-sm" : "text-muted"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <section aria-label={LEARN_TABS.find((t) => t.key === tab)?.label} className="flex flex-col gap-3">
        {tab === "notes" && <Notes searchParams={searchParams} />}
        {tab === "videos" && <Library searchParams={searchParams} />}
      </section>
    </>
  );
}

async function Notes({ searchParams }: { searchParams: PageProps<"/learn">["searchParams"] }) {
  const p = await searchParams;
  const nq = one(p.nq)?.trim().slice(0, 60);
  const [{ data, error }, user] = await Promise.all([(await createClient()).from("learn_notes").select(NOTE_COLUMNS), currentUser()]);
  if (error) return <p role="alert" className="text-sm text-danger">Could not read your notes: {error.message}</p>;
  // Row Level Security returns the reader's own notes and every published one.
  const { own: all, shared: allShared } = splitNotes((data ?? []) as Note[], user?.id ?? "");
  const groups = groupNotes(searchNotes(all, nq));
  const shared = searchNotes(allShared, nq);

  return (
    <>
      {one(p.deleted) && (
        <p role="status" className="rounded-lg border border-line bg-surface p-3 text-sm">
          Note deleted.
        </p>
      )}
      <Link
        href="/learn/notes/new"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70"
      >
        Write a note
      </Link>
      {shared.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">
            Shared by the admin <span className="font-normal text-muted">({shared.length})</span>
          </h3>
          <NoteList notes={shared} section />
        </section>
      )}
      {all.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          Keep your own waxing instructions, notes on products, how-tos and trip notes (places to stay, eat and shop) here, as short articles. Only you see them.
        </p>
      ) : (
        <>
          {all.length + allShared.length > 4 && (
            <form method="get" className="flex gap-2">
              <input
                name="nq"
                type="search"
                defaultValue={nq}
                placeholder="Search your notes"
                aria-label="Search your notes"
                className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
              />
              <button type="submit" className="min-h-11 shrink-0 rounded-lg border border-line bg-surface px-4 text-sm font-semibold">
                Search
              </button>
            </form>
          )}
          {groups.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">No notes match &ldquo;{nq}&rdquo;.</p>
          ) : (
            groups.map((g) => (
              <section key={g.section} className="flex flex-col gap-2">
                <h3 className="font-semibold">
                  {SECTION_LABELS[g.section]} <span className="font-normal text-muted">({g.notes.length})</span>
                </h3>
                <NoteList notes={g.notes} />
              </section>
            ))
          )}
        </>
      )}
    </>
  );
}

/** Notes as rows to tap; `section` names each one's section, for the shared list that mixes them. */
function NoteList({ notes, section }: { notes: Note[]; section?: boolean }) {
  return (
    <ul className="flex flex-col gap-1">
      {notes.map((n) => (
        <li key={n.id}>
          <Link
            href={`/learn/notes/${n.id}`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 active:bg-tile"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {n.title}
                {!section && n.published && <span className="ml-2 rounded-full bg-tile px-2 text-xs font-normal">Published</span>}
              </span>
              {(section || n.body) && (
                <span className="block truncate text-sm text-muted">
                  {[section ? SECTION_LABELS[n.section] : null, n.body ? preview(n.body) : null].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            <span aria-hidden className="text-muted">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
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
    return s ? `/learn?tab=videos&${s}` : "/learn?tab=videos";
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
            <input type="hidden" name="tab" value="videos" />
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
