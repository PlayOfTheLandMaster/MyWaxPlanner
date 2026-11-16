"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readName } from "@/lib/profile/name";

// `email` is handed back so the form can keep it: React empties a form after
// its action runs, and retyping an address after a wrong password is a chore.
export type AuthState = { error?: string; message?: string; email?: string; first_name?: string; last_initial?: string };

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One message for every failure: saying which half was wrong tells a
  // stranger which email addresses have accounts.
  if (error) return { error: "That email and password did not match an account.", email };

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Enter an email and a password.", email };

  // The name rides along in the account's metadata; the database copies it
  // into the profile when the account is created (handle_new_user).
  const kept = { email, first_name: String(formData.get("first_name") ?? ""), last_initial: String(formData.get("last_initial") ?? "") };
  const name = readName(formData);
  if ("error" in name) return { error: name.error, ...kept };
  if (password.length < 8) return { error: "Use a password of at least 8 characters.", ...kept };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm`, data: name },
  });
  if (error) return { error: error.message, ...kept };

  // With email confirmation on (Supabase's default for a hosted project) there
  // is no session yet: the person has to click the link first.
  if (!data.session) {
    return { message: "Check your email for a link to finish creating your account.", email };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
