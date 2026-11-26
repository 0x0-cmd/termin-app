import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProvider } from "./provider";

type Args = {
  businessId: string;
  appointmentId: string;
  kind: "confirmation" | "reminder" | "cancellation";
  to: string;
  text: string;
};

/** Sendet eine SMS und protokolliert sie (für SMS-Kontingent und Support). */
export async function sendAndLog(db: SupabaseClient, a: Args): Promise<boolean> {
  const provider = getProvider();
  const res = await provider.send(a.to, a.text);
  const { error } = await db.from("messages").insert({
    business_id: a.businessId,
    appointment_id: a.appointmentId,
    kind: a.kind,
    channel: "sms",
    to_phone: a.to,
    body: a.text,
    provider: provider.name,
    provider_message_id: res.ok ? res.id : null,
    status: res.ok ? "sent" : "failed",
    error: res.ok ? null : res.error,
  });
  if (error) console.error("Nachricht konnte nicht protokolliert werden", error);
  if (!res.ok) console.error(res.error);
  return res.ok;
}
