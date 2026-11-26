"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type AuthState = { error?: string; info?: string } | undefined;

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email") ?? ""),
    password: String(fd.get("password") ?? ""),
  });
  if (error) return { error: "E-Mail oder Passwort ist falsch." };
  redirect("/app");
}

export async function signup(_: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(fd.get("email") ?? ""),
    password,
    options: { emailRedirectTo: `${env.appUrl()}/auth/confirm?next=/app` },
  });
  if (error) return { error: error.message.includes("registered") ? "Diese E-Mail ist schon registriert." : "Registrierung fehlgeschlagen." };
  if (!data.session) return { info: "Fast geschafft: Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen geschickt haben." };
  redirect("/app");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
