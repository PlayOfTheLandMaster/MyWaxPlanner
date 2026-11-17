"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Folds every card on the page when the reader leaves it. With Cache
 * Components, Next keeps a page in the DOM (React's <Activity>, hidden) while
 * the reader is elsewhere, so an opened <details> was still open on coming
 * back to Today. A layout effect's cleanup runs as the page is hidden, before
 * anything is painted again, so there is no flash of the old state.
 */
export function FoldOnLeave() {
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const page = marker.current?.closest("main");
    return () => {
      page?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
    };
  }, []);
  return <span ref={marker} hidden />;
}
