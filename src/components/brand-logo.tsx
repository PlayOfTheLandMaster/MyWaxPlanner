"use client";

import { useState } from "react";
import { brandLogoUrl } from "@/lib/skis/brand-logo";

/**
 * A ski maker's logo, or nothing: an unknown brand, or a logo that does not
 * load (offline, or the service is down), leaves no gap and no broken image.
 */
export function BrandLogo({ brand, size = "size-10" }: { brand: string | null; size?: string }) {
  const [failed, setFailed] = useState(false);
  const src = brandLogoUrl(brand);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small third-party icon, not worth Next's image pipeline
    <img
      src={src}
      alt={`${brand} logo`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${size} shrink-0 rounded-lg border border-line bg-white object-contain p-1`}
    />
  );
}
