"use client";

import { useRef, useState } from "react";

/** The live app's address, which an invited person opens to create an account. */
export const SIGN_UP_LINK = "https://www.mywaxplanner.com";

/**
 * The link to send an invited person, with a Copy link button. The address
 * is also shown as text, so it can be selected by hand where the clipboard
 * is refused.
 */
export function CopyLink() {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const text = useRef<HTMLSpanElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SIGN_UP_LINK);
      setCopied("yes");
    } catch {
      // No clipboard: select the address so a long press offers Copy.
      if (text.current) window.getSelection()?.selectAllChildren(text.current);
      setCopied("no");
    }
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span ref={text} className="min-w-0 select-all break-all rounded-lg bg-tile px-3 py-2 text-sm">
        {SIGN_UP_LINK}
      </span>
      <button type="button" onClick={copy} className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold active:opacity-70">
        {copied === "yes" ? "Copied ✓" : "Copy link"}
      </button>
      {copied === "no" && <span className="text-sm text-muted">Copy it from the box instead.</span>}
    </div>
  );
}
