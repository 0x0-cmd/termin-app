"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createOnlineBooking, getAvailability, type BookingInput, type BookingResult } from "@/lib/booking";
import type { DaySlots } from "@/lib/slots";
import { isValidDateStr } from "@/lib/time";

const UUID = /^[0-9a-f-]{36}$/i;

export async function fetchSlots(
  slug: string,
  serviceId: string,
  staffId: string | null,
  from: string,
): Promise<DaySlots[]> {
  if (!UUID.test(serviceId) || (staffId && !UUID.test(staffId)) || !isValidDateStr(from)) return [];
  const db = createAdminClient();
  const { data: biz } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (!biz) return [];
  const res = await getAvailability(db, biz.id, serviceId, staffId, from, 7);
  return res?.days ?? [];
}

export async function book(input: BookingInput): Promise<BookingResult> {
  if (!UUID.test(input.serviceId) || (input.staffId && !UUID.test(input.staffId))) {
    return { ok: false, error: "Ungültige Auswahl." };
  }
  return createOnlineBooking(input);
}
