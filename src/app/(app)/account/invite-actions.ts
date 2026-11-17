"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inviteEmail } from "@/lib/invites/email";

export type InviteState = { error?: string; added?: string };

// Admins only: Row Level Security refuses everyone else, so these need no
// check of their own beyond being signed in.

export async function addInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const email = inviteEmail(form.get("email"));
  if (!email) return { error: "Enter an email address, like anna@example.com." };
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  const { error } = await supabase.from("signup_invites").insert({ email, note, invited_by: data.user.id });
  if (error) {
    if (error.code === "23505") return { error: `${email} is already on the list.` };
    return { error: `Could not add: ${error.message}` };
  }
  revalidatePath("/account");
  return { added: email };
}

/** Takes an address off the list. An account already made with it is not touched. */
export async function removeInvite(email: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  await supabase.from("signup_invites").delete().eq("email", email);
  revalidatePath("/account");
}
