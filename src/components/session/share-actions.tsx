"use client";

import { useState } from "react";

/**
 * "Share picture" hands the summary's PNG to the device's share sheet
 * (Facebook, Messages, Save Image…). Where a browser cannot share files, the
 * picture opens in a new tab instead, to save or share from there.
 * "Save as PDF" opens the print dialog on this page, which prints only the
 * summary; on an iPad, Chrome's Share → Print → pinch out saves a PDF.
 */
export function ShareActions({ imageUrl, filename, title }: { imageUrl: string; filename: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withZone = () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}tz=${encodeURIComponent(tz)}` : imageUrl;
  };

  const share = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(withZone());
      if (!res.ok) throw new Error(await res.text());
      const file = new File([await res.blob()], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        window.open(URL.createObjectURL(file), "_blank");
      }
    } catch (e) {
      // Closing the share sheet without picking anything is not an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error && e.message ? e.message : "Could not make the picture. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
        >
          {busy ? "Making picture…" : "Share picture"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-lg border border-line bg-surface px-4 font-semibold active:bg-tile"
        >
          Save as PDF
        </button>
      </div>
      <a href={imageUrl} target="_blank" rel="noopener" onClick={(e) => (e.currentTarget.href = withZone())} className="inline-flex min-h-11 items-center self-start text-sm text-link underline">
        Open the picture
      </a>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
