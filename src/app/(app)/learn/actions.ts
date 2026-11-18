"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEVELS, TOPICS, parseTime, parseYouTube } from "@/lib/learn/videos";

export type VideoFormState = { error?: string };

/** Title and channel from YouTube's public oEmbed endpoint (no key needed). */
async function youTubeDetails(id: string): Promise<{ title: string; channel: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return data.title ? { title: data.title, channel: data.author_name ?? "" } : null;
  } catch {
    return null;
  }
}

export async function saveVideo(id: string | null, _prev: VideoFormState, form: FormData): Promise<VideoFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const link = parseYouTube(String(form.get("url") ?? ""));
  if (!link) return { error: "That doesn't look like a YouTube link. Use Share → Copy link in YouTube and paste it here." };

  const topic = String(form.get("topic") ?? "");
  if (!(TOPICS as readonly string[]).includes(topic)) return { error: "Choose a topic." };
  const technique = ["classic", "skate"].includes(String(form.get("technique"))) ? String(form.get("technique")) : null;
  const level = (LEVELS as readonly string[]).includes(String(form.get("level"))) ? String(form.get("level")) : null;
  const startText = String(form.get("start") ?? "").trim();
  const start = startText === "" ? link.start : parseTime(startText);
  if (start === null) return { error: "Start at should look like 1:45, or be left empty." };

  let title = String(form.get("title") ?? "").trim();
  let channel = String(form.get("channel") ?? "").trim();
  if (!title || !channel) {
    const details = await youTubeDetails(link.id);
    title ||= details?.title ?? "";
    channel ||= details?.channel ?? "";
  }
  if (!title) return { error: "YouTube didn't give a title for that video (it may be private). Type one in." };

  const row = {
    youtube_id: link.id,
    title: title.slice(0, 200),
    channel: channel.slice(0, 120) || null,
    topic,
    technique,
    level,
    start_seconds: start,
    notes: String(form.get("notes") ?? "").trim() || null,
    tags: String(form.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12),
  };

  const result = id
    ? await supabase.from("learn_videos").update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from("learn_videos").insert({ ...row, created_by: auth.user.id }).select("id").single();
  if (result.error) {
    if (result.error.code === "23505") return { error: "That video is already in the library." };
    if (result.error.code === "42501") return { error: "Only the library's editors can add or change videos." };
    return { error: `Could not save the video: ${result.error.message}` };
  }
  if (!result.data) return { error: "That video is no longer in the library." };
  revalidatePath("/learn");
  redirect(`/learn/${result.data.id}`);
}

export async function deleteVideo(id: string) {
  const supabase = await createClient();
  await supabase.from("learn_videos").delete().eq("id", id);
  revalidatePath("/learn");
  redirect("/learn?tab=videos");
}
