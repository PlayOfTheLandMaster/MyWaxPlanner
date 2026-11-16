// The waxing history's fixed values and the words shown for them. The database
// enforces the same lists (CHECK constraints and enums in the initial schema
// migration); vocab.test.ts in this folder checks the two agree.

export const MODES = ["recreational", "race"] as const;
export const STATUSES = ["planned", "completed"] as const;
export const ZONES = ["glide", "grip"] as const;
export const KICK_FEELS = ["slipping", "good", "icing"] as const;
export const METHODS = ["iron", "rub_on", "liquid", "powder", "cork", "spray"] as const;
export const SKIES = ["sun", "partly_cloudy", "overcast", "snowing", "raining", "fog"] as const;
export const TRACKS = ["freshly_groomed", "skied_in", "glazed", "soft"] as const;

export type Mode = (typeof MODES)[number];
export type Status = (typeof STATUSES)[number];
export type Zone = (typeof ZONES)[number];
export type KickFeel = (typeof KICK_FEELS)[number];
export type Method = (typeof METHODS)[number];
export type Sky = (typeof SKIES)[number];
export type Track = (typeof TRACKS)[number];

export const MODE_LABELS: Record<Mode, string> = { recreational: "Recreational", race: "Race day" };
export const STATUS_LABELS: Record<Status, string> = { planned: "Planned", completed: "Done" };
export const ZONE_LABELS: Record<Zone, string> = { glide: "Glide", grip: "Grip" };
export const KICK_FEEL_LABELS: Record<KickFeel, string> = {
  slipping: "Slipping",
  good: "Good",
  icing: "Icing / sticking",
};
export const METHOD_LABELS: Record<Method, string> = {
  iron: "Ironed",
  rub_on: "Rubbed on",
  liquid: "Liquid",
  powder: "Powder",
  cork: "Corked",
  spray: "Spray",
};
export const SKY_LABELS: Record<Sky, string> = {
  sun: "Sun",
  partly_cloudy: "Partly cloudy",
  overcast: "Overcast",
  snowing: "Snowing",
  raining: "Raining",
  fog: "Fog",
};
export const TRACK_LABELS: Record<Track, string> = {
  freshly_groomed: "Freshly groomed",
  skied_in: "Skied-in",
  glazed: "Glazed",
  soft: "Soft",
};

/** Layer roles that belong to each zone, in the order a prep runs. */
export const ZONE_ROLES: Record<Zone, string[]> = {
  glide: ["cleaning", "base", "temperature", "top_coat", "powder", "finish"],
  grip: ["cleaning", "binder", "kick", "cover", "skin_care"],
};

export const RATING_WORDS = ["", "Poor", "Below par", "OK", "Good", "Excellent"] as const;
