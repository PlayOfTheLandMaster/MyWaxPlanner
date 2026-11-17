"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const linkError = useSearchParams().get("error");

  const state = mode === "sign-in" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <form action={mode === "sign-in" ? signInAction : signUpAction} className="flex flex-col gap-4">
      {mode === "sign-up" && (
        <p className="text-sm text-muted">By invitation: use the email address your invitation was sent to.</p>
      )}
      {mode === "sign-up" && (
        // The initial tells two people with the same first name apart; it is
        // shown as "Anna S." wherever the app names you.
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
            First name
            <input
              name="first_name"
              defaultValue={signUpState.first_name}
              autoComplete="given-name"
              maxLength={40}
              required
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
            Last initial
            <input
              name="last_initial"
              defaultValue={signUpState.last_initial}
              autoComplete="family-name"
              maxLength={1}
              required
              className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base uppercase"
            />
          </label>
        </div>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          defaultValue={state.email}
          autoComplete="email"
          required
          className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={mode === "sign-up" ? 8 : undefined}
          required
          className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {!state.error && linkError && (
        <p role="alert" className="text-sm text-danger">
          That link did not work. It may have expired — try signing in, or create the account again.
        </p>
      )}
      {state.message && <p className="text-sm">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent active:opacity-70 disabled:opacity-50"
      >
        {pending ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        className="min-h-11 text-sm text-link underline active:opacity-70"
      >
        {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
