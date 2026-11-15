import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VIDEO_COLUMNS, isAdmin } from "@/lib/learn/load";
import { LEVEL_LABELS, TOPIC_LABELS, embedUrl, formatTime, type Video } from "@/lib/learn/videos";
import { deleteVideo } from "../actions";

export const metadata: Metadata = { title: "Video · My Wax Planner" };

export default function VideoPage({ params }: PageProps<"/learn/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/learn" className="inline-flex min-h-11 items-center self-start text-sm text-link underline">
        ← Learn
      </Link>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: { params: PageProps<"/learn/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const [admin, res] = await Promise.all([isAdmin(supabase), supabase.from("learn_videos").select(VIDEO_COLUMNS).eq("id", id).maybeSingle()]);
  if (res.error && res.error.code !== "22P02") throw new Error(`Could not read the video: ${res.error.message}`);
  const v = res.data as Video | null;
  if (!v) notFound();

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line bg-black">
        <iframe
          src={embedUrl(v)}
          title={v.title}
          className="aspect-video w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div>
        <h1 className="text-xl font-bold">{v.title}</h1>
        <p className="text-sm text-muted">
          {[
            v.channel,
            TOPIC_LABELS[v.topic],
            v.technique ? (v.technique === "classic" ? "Classic" : "Skate") : "Classic and skate",
            v.level ? LEVEL_LABELS[v.level] : null,
            v.start_seconds ? `starts at ${formatTime(v.start_seconds)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {v.notes && (
        <section className="rounded-xl border border-line bg-surface p-4">
          <h2 className="mb-1 font-semibold">Notes</h2>
          <p className="whitespace-pre-line text-sm">{v.notes}</p>
        </section>
      )}
      {v.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Tags">
          {v.tags.map((t) => (
            <li key={t}>
              <Link href={`/learn?q=${encodeURIComponent(t)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-3 text-sm">
                #{t}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <a
        href={`https://www.youtube.com/watch?v=${v.youtube_id}${v.start_seconds ? `&t=${v.start_seconds}s` : ""}`}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-sm text-link underline"
      >
        Open in YouTube
      </a>
      {admin && (
        <>
          <Link href={`/learn/${v.id}/edit`} className="flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold active:bg-tile">
            Edit
          </Link>
          <details className="rounded-lg border border-line">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-danger">Remove from the library</summary>
            <form action={deleteVideo.bind(null, v.id)} className="flex flex-col gap-2 p-3 pt-0">
              <p className="text-sm text-muted">Removes it for every user. The video stays on YouTube.</p>
              <button type="submit" className="min-h-11 rounded-lg bg-danger px-4 font-semibold text-on-accent active:opacity-70">
                Yes, remove it
              </button>
            </form>
          </details>
        </>
      )}
    </>
  );
}
