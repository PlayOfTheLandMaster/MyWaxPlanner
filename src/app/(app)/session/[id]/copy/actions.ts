"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadSkierContext } from "@/lib/skiers/current";
import { copyPayload, copyTargets, pickedSkis } from "@/lib/history/copy";
import { loadCopy } from "./load";

export type CopyState = { error?: string };

/** One planned session per picked pair, each with the same waxing. */
export async function copySession(id: string, _prev: CopyState, form: FormData): Promise<CopyState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ source, skis }, who] = await Promise.all([loadCopy(supabase, id), loadSkierContext()]);
  if (!source) return { error: "That session is no longer in your history." };
  const targets = copyTargets(skis, source, who.skiers, who.me);
  const picked = pickedSkis(form.getAll("ski"), targets);
  if (picked.length === 0) return { error: "Tick at least one pair of skis." };

  const now = new Date();
  let made = 0;
  for (const skiId of picked) {
    const p = copyPayload(source, skiId, now);
    const { error } = await supabase.rpc("save_wax_session", { p_id: null, p_session: p.session, p_actual: null, p_layers: p.layers });
    if (error) {
      return {
        error:
          made > 0
            ? `Copied to ${made} ${made === 1 ? "pair" : "pairs"}, then stopped: ${error.message}`
            : `Could not copy: ${error.message}`,
      };
    }
    made++;
  }
  revalidatePath("/plan");
  revalidatePath("/history");
  redirect(`/plan?copied=${made}`);
}
