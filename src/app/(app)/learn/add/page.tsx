import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/learn/load";
import { VideoForm } from "../video-form";
import { saveVideo } from "../actions";

export const metadata: Metadata = { title: "Add a video · My Wax Planner" };

export default function AddVideoPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <Link href="/learn" className="inline-flex min-h-11 items-center text-sm text-link underline">
          ← Learn
        </Link>
        <h1 className="text-2xl font-bold">Add a video</h1>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Form />
      </Suspense>
    </main>
  );
}

async function Form() {
  // Only library editors get the form; the database refuses anyone else anyway.
  if (!(await isAdmin(await createClient()))) redirect("/learn");
  return <VideoForm save={saveVideo.bind(null, null)} submitLabel="Add to library" cancelHref="/learn" />;
}
