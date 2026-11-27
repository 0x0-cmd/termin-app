"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RESERVED_SLUGS, slugify } from "@/lib/dal";

export type FormState = { error?: string } | undefined;

export async function createBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(fd.get("name") ?? "").trim();
  const slug = slugify(String(fd.get("slug") ?? "") || name);
  const owner = String(fd.get("owner") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim() || null;
  if (!name || !owner) return { error: "Bitte Name des Betriebs und Ihren Vornamen angeben." };
  if (slug.length < 3) return { error: "Die Adresse braucht mindestens 3 Zeichen." };
  if (RESERVED_SLUGS.has(slug)) return { error: "Diese Adresse ist reserviert. Bitte eine andere wählen." };

  const { data: biz, error } = await supabase
    .from("businesses")
    .insert({ owner_id: user.id, name, slug, phone })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Diese Adresse ist schon vergeben. Bitte eine andere wählen." };
    console.error("createBusiness", error);
    return { error: "Speichern fehlgeschlagen." };
  }

  // Startwerte: Inhaber als Mitarbeiter, Öffnungszeiten Di–Fr 9–18, Sa 9–13, Mittagspause 12–13
  await supabase.from("staff").insert({ business_id: biz.id, name: owner });
  await supabase.from("opening_hours").insert([
    ...[2, 3, 4, 5].map((weekday) => ({ business_id: biz.id, weekday, opens: "09:00", closes: "18:00" })),
    { business_id: biz.id, weekday: 6, opens: "09:00", closes: "13:00" },
  ]);
  await supabase
    .from("breaks")
    .insert([2, 3, 4, 5].map((weekday) => ({ business_id: biz.id, weekday, starts: "12:00", ends: "13:00" })));

  redirect("/app/leistungen?neu=1");
}
