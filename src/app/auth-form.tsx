"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "./auth-actions";

export function AuthForm({
  action,
  mode,
}: {
  action: (s: AuthState, fd: FormData) => Promise<AuthState>;
  mode: "login" | "signup";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-5 py-16">
      <Link href="/" className="text-sm font-semibold text-brand-600">
        Termin
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{mode === "login" ? "Anmelden" : "Konto für Ihren Betrieb anlegen"}</h1>
      {mode === "signup" && <p className="mt-1 text-sm text-stone-600">30 Tage gratis, keine Bindung.</p>}
      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">E-Mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Passwort</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="input"
          />
        </div>
        {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        {state?.info && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{state.info}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {mode === "login" ? "Anmelden" : "Registrieren"}
        </button>
      </form>
      <p className="mt-6 text-sm text-stone-600">
        {mode === "login" ? (
          <>Noch kein Konto? <Link className="text-brand-700" href="/registrieren">Jetzt registrieren</Link></>
        ) : (
          <>Schon registriert? <Link className="text-brand-700" href="/login">Anmelden</Link></>
        )}
      </p>
    </main>
  );
}
