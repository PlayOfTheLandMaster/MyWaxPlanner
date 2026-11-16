import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BackgroundPhoto } from "@/components/background-photo";
import { NavTrail } from "@/components/nav-trail";
import { ReaderZone } from "@/components/reader-zone";

export const metadata: Metadata = {
  title: "My Wax Planner",
  description: "Brand-neutral cross-country ski waxing plans from your own wax box.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
