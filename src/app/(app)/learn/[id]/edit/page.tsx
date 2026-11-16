import { Suspense } from "react";
import { BackLink } from "@/components/nav-trail";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VIDEO_COLUMNS, isAdmin } from "@/lib/learn/load";
import type { Video } from "@/lib/learn/videos";
import { VideoForm } from "../../video-form";
import { saveVideo } from "../../actions";

export const metadata: Metadata = { title: "Edit video · My Wax Planner" };

export default function EditVideoPage({ params }: PageProps<"/learn/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <BackLink fallback="/learn" className="inline-flex min-h-11 items-center self-start text-sm text-link underline" />
      <h1 className="text-2xl font-bold">Edit video</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form params={params} />
      </Suspense>
    </main>
  );
}

async function Form({ params }: { params: PageProps<"/learn/[id]/edit">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) redirect(`/learn/${id}`);
  const { data } = await supabase.from("learn_videos").select(VIDEO_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  return <VideoForm save={saveVideo.bind(null, id)} initial={data as Video} submitLabel="Save changes" cancelHref={`/learn/${id}`} />;
}
