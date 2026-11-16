"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Picks who is being waxed for ("me" or a skier id). Every screen follows. */
export async function setCurrentSkier(form: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const value = String(form.get("skier") ?? "");
  await supabase
    .from("profiles")
    .update({ current_skier_id: UUID.test(value) ? value : null })
    .eq("id", data.user.id);
  revalidatePath("/", "layout");
  // Picked from a screen's own banner: stay there (without a filter that
  // would keep showing the previous skier). Only same-site paths.
  const back = String(form.get("return") ?? "");
  if (back.startsWith("/") && !back.startsWith("//")) redirect(back);
}
