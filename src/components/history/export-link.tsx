"use client";

/**
 * "Download as spreadsheet". The browser adds its own time zone at the moment
 * of the tap, so dates in the file match the ones on screen; the server has
 * no other way to know it.
 */
export function ExportLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      onClick={(e) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) e.currentTarget.href = `${href}${href.includes("?") ? "&" : "?"}tz=${encodeURIComponent(tz)}`;
      }}
      className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-line bg-surface px-4 text-sm font-medium active:bg-tile"
    >
      <span aria-hidden>⬇</span> Download as spreadsheet
    </a>
  );
}
