"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CONDITIONS = ["new", "good", "worn", "replace"] as const;

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

/** Ticks or unticks a tool. Returns an error message, or null when it saved. */
export async function setOwned(toolId: string, owned: boolean): Promise<string | null> {
  const { supabase, userId } = await signedIn();
  const { error } = owned
    ? // upsert on the one-row-per-tool constraint, so a double tap is harmless
      await supabase
        .from("user_tools")
        .upsert({ user_id: userId, tool_id: toolId }, { onConflict: "user_id,tool_id", ignoreDuplicates: true })
    : await supabase.from("user_tools").delete().eq("tool_id", toolId);
  if (error) return `Could not save: ${error.message}`;
  refresh();
  return null;
}

export async function setCondition(toolId: string, condition: string): Promise<string | null> {
  const { supabase } = await signedIn();
  const value = (CONDITIONS as readonly string[]).includes(condition) ? condition : null;
  const { error } = await supabase.from("user_tools").update({ condition: value }).eq("tool_id", toolId);
  if (error) return `Could not save: ${error.message}`;
  refresh();
  return null;
}
