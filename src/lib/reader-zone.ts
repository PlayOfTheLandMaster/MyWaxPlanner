import "server-only";
import { cookies } from "next/headers";
import { safeTimeZone } from "@/lib/history/csv";

/** The reader's time zone from the cookie ReaderZone writes; UTC until it has. */
export async function readerTimeZone(): Promise<string> {
  return safeTimeZone((await cookies()).get("tz")?.value);
}
