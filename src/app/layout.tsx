import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BackgroundPhoto } from "@/components/background-photo";
import { NavTrail } from "@/components/nav-trail";
import { ReaderZone } from "@/components/reader-zone";

export const metadata: Metadata = {
  title: "My Wax Planner",
  description: "Brand-neutral cross-country ski waxing plans from your own wax box.",
  // Add to Home Screen on iPad and iPhone: opens without Safari's or Chrome's bars,
  // under this name and with apple-icon.png (app/manifest.ts is the Android half).
  appleWebApp: { capable: true, title: "Wax Planner", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The browser's and the installed app's bars take the page colour (--page), light and dark.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d131b" },
  ],
};

// System fonts on purpose: next/font/google downloads from Google while the
// build runs, so a build can fail for a reason no code change explains.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <BackgroundPhoto />
        </Suspense>
        <Suspense fallback={null}>
          <NavTrail />
        </Suspense>
        <ReaderZone />
        {children}
      </body>
    </html>
  );
}
