import type { MetadataRoute } from "next";

// What a phone uses when the app is installed (Android Chrome: Install app;
// iPad and iPhone read the Apple settings in layout.tsx and apple-icon.png).
// Standalone means no browser bar: no address bar and no reload arrow, which is
// why the update bar (components/update-bar.tsx) matters most there.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Wax Planner",
    short_name: "Wax Planner",
    description: "Cross-country ski waxing plans from your own wax box.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The page colour (--page in globals.css), so the splash screen and the bars match the app.
    background_color: "#f4f6f9",
    theme_color: "#f4f6f9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed square: Android cuts its own shape (circle, squircle) out of it.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
