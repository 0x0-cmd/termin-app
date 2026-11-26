"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness, RESERVED_SLUGS, slugify } from "@/lib/dal";
import { normalizePhone } from "@/lib/phone";
import { isValidDateStr, weekdayName, zonedDateTime } from "@/lib/time";
import { sendAndLog } from "@/lib/messaging/send";
import { confirmationText } from "@/lib/messaging/texts";
import { manageLink } from "@/lib/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentStatus } from "@/lib/types";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const TIME = /^\d{2}:\d{2}$/;

// ---------------------------------------------------------------------------
// Termine
// ---------------------------------------------------------------------------
export async function saveAppointment(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();
  const id = str(fd, "id") || null;
  const staffId = str(fd, "staff_id");
  const serviceId = str(fd, "service_id") || null;
  const date = str(fd, "date");
  const time = str(fd, "time");
  const duration = Number(str(fd, "duration"));
  const name = str(fd, "name");
  const phoneRaw = str(fd, "phone");
  const note = str(fd, "note") || null;
  const sendSms = fd.get("send_sms") === "on";

  if (!staffId) return { error: "Bitte einen Mitarbeiter wählen." };
  if (!isValidDateStr(date) || !TIME.test(time)) return { error: "Bitte Datum und Uhrzeit angeben." };
  if (!Number.isFinite(duration) || duration < 5 || duration > 600) return { error: "Dauer zwischen 5 und 600 Minuten." };
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Die Telefonnummer ist ungültig." };
  if (!name && !note) return { error: "Bitte Kundenname oder eine Notiz angeben." };

  let customerId: string | null = null;
  if (name) {
    if (phone) {
      const { data, error } = await supabase
        .from("customers")
        .upsert({ business_id: business.id, name, phone }, { onConflict: "business_id,phone" })
        .select("id")
        .single();
      if (error) return { error: "Kunde konnte nicht gespeichert werden." };
      customerId = data.id;
    } else {
      const { data, error } = await supabase.from("customers").insert({ business_id: business.id, name }).select("id").single();
      if (error) return { error: "Kunde konnte nicht gespeichert werden." };
      customerId = data.id;
    }
  }

  const start = zonedDateTime(business.timezone, date, time);
  const row = {
    business_id: business.id,
    staff_id: staffId,
    service_id: serviceId,
    customer_id: customerId,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + duration * 60_000).toISOString(),
    note,
  };

  // Bei Verschiebung soll die Erinnerung für die neue Zeit erneut verschickt werden
  let reset = {};
  if (id) {
    const { data: prev } = await supabase.from("appointments").select("starts_at").eq("id", id).single();
    if (prev && Date.parse(prev.starts_at) !== start.getTime()) reset = { reminder_sent_at: null, confirmed_at: null };
  }
  const res = id
    ? await supabase
        .from("appointments")
        .update({ ...row, ...reset })
        .eq("id", id)
        .select("id, manage_token, starts_at")
        .single()
    : await supabase
        .from("appointments")
        .insert({ ...row, source: "manual" })
        .select("id, manage_token, starts_at")
        .single();
  if (res.error) {
    if (res.error.code === "23P01") return { error: "Zu dieser Zeit hat der Mitarbeiter schon einen Termin." };
    console.error(res.error);
    return { error: "Speichern fehlgeschlagen." };
  }

  if (!id && sendSms && phone) {
    const svc = serviceId ? (await supabase.from("services").select("name").eq("id", serviceId).single()).data : null;
    await sendAndLog(createAdminClient(), {
      businessId: business.id,
      appointmentId: res.data.id,
      kind: "confirmation",
      to: phone,
      text: confirmationText({
        businessName: business.name,
        tz: business.timezone,
        startsAt: res.data.starts_at,
        serviceName: svc?.name ?? null,
        link: manageLink(res.data.manage_token),
      }),
    });
  }

  revalidatePath("/app");
  redirect(`/app?ansicht=tag&datum=${date}`);
}

export async function setAppointmentStatus(fd: FormData) {
  const { supabase } = await requireBusiness();
  const id = str(fd, "id");
  const status = str(fd, "status") as AppointmentStatus;
  if (!["booked", "confirmed", "cancelled", "no_show", "completed"].includes(status)) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("appointments")
    .update({
      status,
      ...(status === "cancelled" ? { cancelled_at: now } : {}),
      ...(status === "confirmed" ? { confirmed_at: now } : {}),
    })
    .eq("id", id);
  if (error?.code === "23P01") {
    // Reaktivieren eines abgesagten Termins, dessen Zeit inzwischen vergeben ist
    redirect(`/app/termin/${id}?fehler=belegt`);
  }
  revalidatePath("/app");
  redirect(`/app/termin/${id}`);
}

export async function deleteAppointment(fd: FormData) {
  const { supabase } = await requireBusiness();
  await supabase.from("appointments").delete().eq("id", str(fd, "id"));
  revalidatePath("/app");
  redirect("/app");
}

// ---------------------------------------------------------------------------
// Leistungen
// ---------------------------------------------------------------------------
export async function saveService(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();
  const id = str(fd, "id") || null;
  const name = str(fd, "name");
  const duration = Number(str(fd, "duration"));
  const priceRaw = str(fd, "price").replace(",", ".");
  const price = priceRaw ? Math.round(Number(priceRaw) * 100) : null;
  const staffIds = fd.getAll("staff").map(String);
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!Number.isFinite(duration) || duration < 5 || duration > 600) return { error: "Dauer zwischen 5 und 600 Minuten." };
  if (price != null && (!Number.isFinite(price) || price < 0)) return { error: "Ungültiger Preis." };

  const row = {
    business_id: business.id,
    name,
    description: str(fd, "description") || null,
    duration_min: duration,
    price_cents: price,
    active: id ? fd.get("active") === "on" : true,
  };
  const res = id
    ? await supabase.from("services").update(row).eq("id", id).select("id").single()
    : await supabase.from("services").insert(row).select("id").single();
  if (res.error) return { error: "Speichern fehlgeschlagen." };
  const serviceId = res.data.id;

  await supabase.from("staff_services").delete().eq("service_id", serviceId);
  if (staffIds.length) {
    await supabase.from("staff_services").insert(staffIds.map((staff_id) => ({ staff_id, service_id: serviceId })));
  }
  revalidatePath("/app/leistungen");
  return { ok: id ? "Gespeichert." : `„${name}“ angelegt.` };
}

export async function deleteService(fd: FormData) {
  const { supabase } = await requireBusiness();
  await supabase.from("services").delete().eq("id", str(fd, "id"));
  revalidatePath("/app/leistungen");
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
export async function saveStaff(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();
  const id = str(fd, "id") || null;
  const name = str(fd, "name");
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!id) {
    const { count } = await supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("active", true);
    if (business.plan === "solo" && (count ?? 0) >= 1) return { error: "Im Solo-Tarif ist 1 Person enthalten. Für mehr bitte auf Team wechseln." };
    if ((count ?? 0) >= 5) return { error: "Im Team-Tarif sind bis zu 5 Mitarbeiter enthalten." };
    const { data, error } = await supabase.from("staff").insert({ business_id: business.id, name }).select("id").single();
    if (error) return { error: "Speichern fehlgeschlagen." };
    // Neue Mitarbeiter bieten standardmäßig alle Leistungen an
    const { data: services } = await supabase.from("services").select("id").eq("business_id", business.id);
    if (services?.length) await supabase.from("staff_services").insert(services.map((s) => ({ staff_id: data.id, service_id: s.id })));
  } else {
    const { error } = await supabase.from("staff").update({ name, active: fd.get("active") === "on" }).eq("id", id);
    if (error) return { error: "Speichern fehlgeschlagen." };
  }
  revalidatePath("/app/team");
  return { ok: "Gespeichert." };
}

// ---------------------------------------------------------------------------
// Öffnungszeiten, Pausen, Urlaub
// ---------------------------------------------------------------------------
export async function saveOpeningHours(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();
  const hours: { business_id: string; weekday: number; opens: string; closes: string }[] = [];
  const breaks: { business_id: string; weekday: number; starts: string; ends: string }[] = [];
  for (let wd = 1; wd <= 7; wd++) {
    if (fd.get(`open_${wd}`) !== "on") continue;
    const opens = str(fd, `opens_${wd}`);
    const closes = str(fd, `closes_${wd}`);
    if (!TIME.test(opens) || !TIME.test(closes) || closes <= opens) return { error: `Ungültige Öffnungszeit am ${weekdayName(wd)}.` };
    const bs = str(fd, `break_start_${wd}`);
    const be = str(fd, `break_end_${wd}`);
    if (bs || be) {
      if (!TIME.test(bs) || !TIME.test(be) || be <= bs || bs < opens || be > closes) {
        return { error: "Die Pause muss innerhalb der Öffnungszeit liegen." };
      }
      // Öffnungszeit am Stück speichern, Pause separat (für spätere Auswertungen klarer)
      breaks.push({ business_id: business.id, weekday: wd, starts: bs, ends: be });
    }
    hours.push({ business_id: business.id, weekday: wd, opens, closes });
  }
  await supabase.from("opening_hours").delete().eq("business_id", business.id);
  await supabase.from("breaks").delete().eq("business_id", business.id).is("staff_id", null);
  if (hours.length) {
    const { error } = await supabase.from("opening_hours").insert(hours);
    if (error) return { error: "Speichern fehlgeschlagen." };
  }
  if (breaks.length) await supabase.from("breaks").insert(breaks);
  revalidatePath("/app/zeiten");
  return { ok: "Öffnungszeiten gespeichert." };
}

export async function addTimeOff(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();
  const staffId = str(fd, "staff_id") || null;
  const from = str(fd, "from");
  const to = str(fd, "to") || from;
  if (!isValidDateStr(from) || !isValidDateStr(to) || to < from) return { error: "Bitte gültige Daten wählen." };
  const fromTime = str(fd, "from_time");
  const toTime = str(fd, "to_time");
  const partial = TIME.test(fromTime) && TIME.test(toTime);
  const startsAt = zonedDateTime(business.timezone, from, partial ? fromTime : "00:00");
  const endsAt = partial
    ? zonedDateTime(business.timezone, to, toTime)
    : zonedDateTime(business.timezone, to, "00:00").getTime() + 86_400_000;
  const { error } = await supabase.from("time_off").insert({
    business_id: business.id,
    staff_id: staffId,
    starts_at: startsAt.toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    reason: str(fd, "reason") || null,
  });
  if (error) return { error: "Speichern fehlgeschlagen. Ende muss nach Beginn liegen." };
  revalidatePath("/app/zeiten");
  return { ok: "Abwesenheit eingetragen." };
}

export async function deleteTimeOff(fd: FormData) {
  const { supabase } = await requireBusiness();
  await supabase.from("time_off").delete().eq("id", str(fd, "id"));
  revalidatePath("/app/zeiten");
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------
export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, business } = await requireBusiness();
  const slug = slugify(str(fd, "slug"));
  if (slug.length < 3) return { error: "Die Adresse braucht mindestens 3 Zeichen." };
  if (RESERVED_SLUGS.has(slug)) return { error: "Diese Adresse ist reserviert." };
  const { error } = await supabase
    .from("businesses")
    .update({
      name: str(fd, "name"),
      slug,
      phone: str(fd, "phone") || null,
      address: str(fd, "address") || null,
      slot_interval_min: Number(str(fd, "slot_interval_min")),
      min_notice_min: Number(str(fd, "min_notice_h")) * 60,
      booking_horizon_days: Number(str(fd, "booking_horizon_days")),
      reminder_hours: Number(str(fd, "reminder_hours")),
      send_confirmation: fd.get("send_confirmation") === "on",
    })
    .eq("id", business.id);
  if (error) {
    if (error.code === "23505") return { error: "Diese Adresse ist schon vergeben." };
    return { error: "Speichern fehlgeschlagen. Bitte Eingaben prüfen." };
  }
  revalidatePath("/app", "layout");
  return { ok: "Gespeichert." };
}
