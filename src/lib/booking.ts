import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { computeSlots, type DaySlots } from "./slots";
import { addDaysStr, todayIn } from "./time";
import type { Business, Service, Staff } from "./types";
import { normalizePhone } from "./phone";
import { sendAndLog } from "./messaging/send";
import { confirmationText } from "./messaging/texts";
import { env } from "./env";

export type PublicBusiness = Pick<Business, "id" | "slug" | "name" | "phone" | "address" | "timezone">;
export type PublicData = {
  business: PublicBusiness;
  services: Pick<Service, "id" | "name" | "description" | "duration_min" | "price_cents">[];
  staff: (Pick<Staff, "id" | "name"> & { serviceIds: string[] })[];
};

const PUBLIC_BIZ_COLS = "id, slug, name, phone, address, timezone";

export async function getPublicData(slug: string): Promise<PublicData | null> {
  const db = createAdminClient();
  const { data: business } = await db.from("businesses").select(PUBLIC_BIZ_COLS).eq("slug", slug).maybeSingle();
  if (!business) return null;
  const [{ data: services }, { data: staff }, { data: links }] = await Promise.all([
    db
      .from("services")
      .select("id, name, description, duration_min, price_cents")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("sort")
      .order("name"),
    db.from("staff").select("id, name").eq("business_id", business.id).eq("active", true).order("sort").order("name"),
    db.from("staff_services").select("staff_id, service_id, staff!inner(business_id)").eq("staff.business_id", business.id),
  ]);
  const byStaff = new Map<string, string[]>();
  for (const l of links ?? []) byStaff.set(l.staff_id, [...(byStaff.get(l.staff_id) ?? []), l.service_id]);
  const staffWithServices = (staff ?? []).map((s) => ({ ...s, serviceIds: byStaff.get(s.id) ?? [] }));
  // Leistungen ohne zugeordnete Mitarbeiter sind nicht buchbar
  const bookable = (services ?? []).filter((sv) => staffWithServices.some((st) => st.serviceIds.includes(sv.id)));
  return { business, services: bookable, staff: staffWithServices };
}

/** Freie Termine für eine Leistung, optional eingeschränkt auf einen Mitarbeiter. */
export async function getAvailability(
  db: SupabaseClient,
  businessId: string,
  serviceId: string,
  staffId: string | null,
  from: string,
  days: number,
  now = new Date(),
): Promise<{ days: DaySlots[]; durationMin: number } | null> {
  const { data: biz } = await db.from("businesses").select("*").eq("id", businessId).single<Business>();
  if (!biz) return null;
  const { data: service } = await db
    .from("services")
    .select("id, duration_min, active")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!service || !service.active) return null;

  const { data: links } = await db
    .from("staff_services")
    .select("staff_id, staff!inner(active, business_id)")
    .eq("service_id", serviceId)
    .eq("staff.active", true)
    .eq("staff.business_id", businessId);
  let staffIds = (links ?? []).map((l) => l.staff_id as string);
  if (staffId) staffIds = staffIds.filter((id) => id === staffId);
  if (staffIds.length === 0) return { days: [], durationMin: service.duration_min };

  // Zeitraum großzügig in UTC abfragen (±1 Tag wegen Zeitzonen)
  const rangeStart = addDaysStr(from, -1) + "T00:00:00Z";
  const rangeEnd = addDaysStr(from, days + 1) + "T00:00:00Z";
  const [{ data: openingHours }, { data: breaks }, { data: timeOff }, { data: busy }] = await Promise.all([
    db.from("opening_hours").select("weekday, opens, closes").eq("business_id", businessId),
    db.from("breaks").select("weekday, starts, ends, staff_id").eq("business_id", businessId),
    db
      .from("time_off")
      .select("staff_id, starts_at, ends_at")
      .eq("business_id", businessId)
      .lt("starts_at", rangeEnd)
      .gt("ends_at", rangeStart),
    db
      .from("appointments")
      .select("staff_id, starts_at, ends_at")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .lt("starts_at", rangeEnd)
      .gt("ends_at", rangeStart),
  ]);

  return {
    durationMin: service.duration_min,
    days: computeSlots({
      tz: biz.timezone,
      from,
      days,
      durationMin: service.duration_min,
      intervalMin: biz.slot_interval_min,
      minNoticeMin: biz.min_notice_min,
      horizonDays: biz.booking_horizon_days,
      staffIds,
      openingHours: openingHours ?? [],
      breaks: breaks ?? [],
      timeOff: timeOff ?? [],
      busy: busy ?? [],
      now,
    }),
  };
}

export type BookingInput = {
  slug: string;
  serviceId: string;
  staffId: string | null;
  start: string; // ISO
  name: string;
  phone: string;
  consent: boolean;
};

export type BookingResult =
  | { ok: true; token: string; startsAt: string; staffName: string; serviceName: string }
  | { ok: false; error: string };

/** Online-Buchung: prüft den Slot serverseitig erneut, legt Kunde + Termin an. */
export async function createOnlineBooking(input: BookingInput): Promise<BookingResult> {
  const name = input.name.trim().slice(0, 120);
  const phone = normalizePhone(input.phone);
  if (!name) return { ok: false, error: "Bitte geben Sie Ihren Namen an." };
  if (!phone) return { ok: false, error: "Bitte geben Sie eine gültige Telefonnummer an." };
  if (!input.consent) return { ok: false, error: "Bitte stimmen Sie der Datenverarbeitung zu." };
  const startMs = Date.parse(input.start);
  if (Number.isNaN(startMs)) return { ok: false, error: "Ungültiger Termin." };

  const db = createAdminClient();
  const { data: biz } = await db.from("businesses").select("*").eq("slug", input.slug).maybeSingle<Business>();
  if (!biz) return { ok: false, error: "Betrieb nicht gefunden." };

  const day = todayIn(biz.timezone, new Date(startMs));
  const avail = await getAvailability(db, biz.id, input.serviceId, input.staffId, day, 1);
  const slot = avail?.days[0]?.slots.find((s) => Date.parse(s.start) === startMs);
  if (!avail || !slot) return { ok: false, error: "Dieser Termin ist leider nicht mehr frei. Bitte wählen Sie einen anderen." };
  const staffId = input.staffId ?? slot.staffIds[0];

  const { data: customer, error: custErr } = await db
    .from("customers")
    .upsert({ business_id: biz.id, phone, name }, { onConflict: "business_id,phone" })
    .select("id")
    .single();
  if (custErr || !customer) return { ok: false, error: "Buchung fehlgeschlagen. Bitte versuchen Sie es erneut." };

  const endsAt = new Date(startMs + avail.durationMin * 60_000).toISOString();
  const { data: appt, error } = await db
    .from("appointments")
    .insert({
      business_id: biz.id,
      staff_id: staffId,
      service_id: input.serviceId,
      customer_id: customer.id,
      starts_at: new Date(startMs).toISOString(),
      ends_at: endsAt,
      source: "online",
    })
    .select("id, manage_token, starts_at, staff(name), services(name)")
    .single();
  if (error || !appt) {
    if (error?.code === "23P01") return { ok: false, error: "Dieser Termin wurde gerade vergeben. Bitte wählen Sie einen anderen." };
    console.error(error);
    return { ok: false, error: "Buchung fehlgeschlagen. Bitte versuchen Sie es erneut." };
  }

  const serviceName = (appt.services as unknown as { name: string } | null)?.name ?? "";
  const staffName = (appt.staff as unknown as { name: string } | null)?.name ?? "";

  if (biz.send_confirmation) {
    await sendAndLog(db, {
      businessId: biz.id,
      appointmentId: appt.id,
      kind: "confirmation",
      to: phone,
      text: confirmationText({
        businessName: biz.name,
        tz: biz.timezone,
        startsAt: appt.starts_at,
        serviceName,
        link: manageLink(appt.manage_token),
      }),
    });
  }

  return { ok: true, token: appt.manage_token, startsAt: appt.starts_at, staffName, serviceName };
}

export const manageLink = (token: string) => `${env.appUrl()}/t/${token}`;
