import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Business } from "./types";

/** Eingeloggter Nutzer + sein Betrieb. Leitet zu /login bzw. /app/start um. */
export const requireBusiness = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle<Business>();
  if (!business) redirect("/app/start");
  return { supabase, user, business };
});

export const RESERVED_SLUGS = new Set([
  "app", "api", "auth", "login", "registrieren", "t", "datenschutz", "impressum", "admin", "hilfe",
  "preise", "agb", "manifest", "icon", "apple-icon", "robots", "sitemap", "termin",
]);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
