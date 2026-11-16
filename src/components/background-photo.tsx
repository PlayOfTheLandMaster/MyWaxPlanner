"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

// Finn's own trail photos, faint behind every screen. Each time a new page is
// opened the next photo fades in. Cards stay solid, so text never sits on a
// photo. Location data was stripped from the files when they were resized.
const PHOTOS = [
  "canmore-snowmaking",
  "dolomites-track",
  "rockies-trail",
  "dolomites-peaks",
  "rockies-river-track",
  "dolomites-meadow",
  "rockies-river-gorge",
  "dolomites-forest",
  "rockies-sun",
];

export function BackgroundPhoto() {
  const pathname = usePathname();
  // React's pattern for state that follows a prop: when the page changes,
  // move to the next photo during render (no effect, no flash).
  const [shown, setShown] = useState({ path: pathname, index: 0 });
  if (shown.path !== pathname) setShown({ path: pathname, index: (shown.index + 1) % PHOTOS.length });

  const src = `/backgrounds/${PHOTOS[shown.index]}.webp`;
  const next = `/backgrounds/${PHOTOS[(shown.index + 1) % PHOTOS.length]}.webp`;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden">
      {/* key: a new element per photo, so the fade-in runs each time. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- a decorative, pre-sized background */}
      <img key={src} src={src} alt="" className="background-photo size-full object-cover" />
      {/* The next photo, loaded quietly so the following page shows it at once. */}
      <link rel="prefetch" as="image" href={next} />
    </div>
  );
}
