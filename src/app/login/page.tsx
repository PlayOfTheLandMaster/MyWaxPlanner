import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · My Wax Planner" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">My Wax Planner</h1>
        <p className="mt-1 text-muted">Glide and grip plans from your own wax box.</p>
      </div>
      {/* The form reads ?error= from the URL, which is only known at request time. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
