// The Learn library: YouTube videos with Finn's notes. Pure helpers here;
// reading and saving happen in the pages and actions.

export const TOPICS = [
  "cleaning",
  "glide",
  "grip_hardwax",
  "grip_klister",
  "skins",
  "brushing",
  "structure",
  "race_prep",
  "storage",
  "tools",
] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<Topic, string> = {
  cleaning: "Cleaning",
  glide: "Glide waxing",
  grip_hardwax: "Grip – hardwax",
  grip_klister: "Grip – klister",
  skins: "Skins",
  brushing: "Brushing & roto",
  structure: "Structure & rills",
  race_prep: "Race prep",
  storage: "Storage",
  tools: "Tools",
};

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const LEVEL_LABELS: Record<(typeof LEVELS)[number], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export type Video = {
  id: string;
  youtube_id: string;
  title: string;
  channel: string | null;
  topic: Topic;
  technique: "classic" | "skate" | null;
  level: (typeof LEVELS)[number] | null;
  start_seconds: number;
  notes: string | null;
  tags: string[];
};

/**
 * The video id and start time from anything YouTube gives you to share:
 * youtu.be/ID?t=95, youtube.com/watch?v=ID&t=1m35s, /shorts/ID, /embed/ID,
 * /live/ID, m.youtube.com and music.youtube.com links, or a bare 11-character id.
 */
export function parseYouTube(input: string): { id: string; start: number } | null {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return { id: text, start: 0 };
  let url: URL;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1, 12);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/.exec(url.pathname)?.[1] ?? null;
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return { id, start: parseTime(url.searchParams.get("t") ?? url.searchParams.get("start") ?? "") ?? 0 };
}

/** "95", "95s", "1m35s", "1:35" or "1:02:03" as seconds; null if it is none of those. */
export function parseTime(value: string): number | null {
  const v = value.trim();
  if (v === "") return null;
  if (/^\d+s?$/.test(v)) return parseInt(v, 10);
  const hms = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v);
  if (hms && (hms[1] || hms[2] || hms[3])) return (+(hms[1] ?? 0)) * 3600 + (+(hms[2] ?? 0)) * 60 + +(hms[3] ?? 0);
  const colon = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(v);
  if (colon) return (+(colon[1] ?? 0)) * 3600 + +colon[2] * 60 + +colon[3];
  return null;
}

/** 95 → "1:35", 3723 → "1:02:03". */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export const thumbnailUrl = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

/** YouTube's privacy-enhanced player: no tracking cookies until the video is played. */
export const embedUrl = (v: Pick<Video, "youtube_id" | "start_seconds">) =>
  `https://www.youtube-nocookie.com/embed/${v.youtube_id}?rel=0${v.start_seconds ? `&start=${v.start_seconds}` : ""}`;
