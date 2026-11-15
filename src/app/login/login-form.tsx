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
