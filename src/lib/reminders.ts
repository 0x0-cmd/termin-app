import "server-only";
import { createAdminClient } from "./supabase/admin";
import { sendAndLog } from "./messaging/send";
import { reminderText } from "./messaging/texts";
import { manageLink } from "./booking";

type Row = {
  id: string;
  business_id: string;
  starts_at: string;
  created_at: string;
  manage_token: string;
  businesses: { name: string; timezone: string; reminder_hours: number };
  customers: { phone: string } | null;
  services: { name: string } | null;
};

/**
 * Verschickt fällige Erinnerungen (Standard: 24 h vorher). Wird regelmäßig
 * (z. B. alle 15 Minuten) von /api/cron/reminders aufgerufen.
 * Termine, die erst innerhalb des Erinnerungsfensters gebucht wurden, bekommen
 * keine extra Erinnerung – sie haben gerade die Buchungsbestätigung erhalten.
 */
export async function sendDueReminders(now = new Date()) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("appointments")
    .select(
      "id, business_id, starts_at, created_at, manage_token, businesses!inner(name, timezone, reminder_hours), customers(phone), services(name)",
    )
    .in("status", ["booked"])
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lt("starts_at", new Date(now.getTime() + 72 * 3_600_000).toISOString())
    .returns<Row[]>();
  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  for (const a of data ?? []) {
    const start = Date.parse(a.starts_at);
    const windowStart = start - a.businesses.reminder_hours * 3_600_000;
    if (now.getTime() < windowStart) continue; // noch nicht fällig
    const bookedInsideWindow = Date.parse(a.created_at) > windowStart;

    // Termin "beanspruchen", damit parallele Läufe nicht doppelt senden
    const { data: claimed } = await db
      .from("appointments")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", a.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (!claimed?.length) continue;

    if (bookedInsideWindow || !a.customers?.phone) {
      skipped++;
      continue;
    }
    const ok = await sendAndLog(db, {
      businessId: a.business_id,
      appointmentId: a.id,
      kind: "reminder",
      to: a.customers.phone,
      text: reminderText({
        businessName: a.businesses.name,
        tz: a.businesses.timezone,
        startsAt: a.starts_at,
        serviceName: a.services?.name ?? null,
        link: manageLink(a.manage_token),
      }),
    });
    if (ok) sent++;
    else await db.from("appointments").update({ reminder_sent_at: null }).eq("id", a.id); // nächster Lauf versucht es erneut
  }
  return { checked: data?.length ?? 0, sent, skipped };
}
