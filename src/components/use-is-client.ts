"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false while the page is drawn on the server and during hydration, true
 * afterwards. For values only the browser knows, such as its time zone, so
 * the server's HTML and the first browser render agree.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
