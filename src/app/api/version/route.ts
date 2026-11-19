// The version that is live now. An open page compares it with the version it
// was built from and offers a reload when they differ (components/update-bar.tsx).
// connection() keeps it out of the build's prerendering, so no cache answers for it.

import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
