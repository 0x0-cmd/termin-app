"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f-]{36}$/i;

async function setStatus(token: string, status: "confirmed" | "cancelled") {
  if (!UUID.test(token)) return;
  const db = createAdminClient();
  const now = new Date().toISOString();
  await db
    .from("appointments")
    .update(status === "confirmed" ? { status, confirmed_at: now } : { status, cancelled_at: now })
    .eq("manage_token", token)
    .in("status", status === "confirmed" ? ["booked"] : ["booked", "confirmed"])
    .gt("starts_at", now);
}

export async function confirmAppointment(fd: FormData) {
  const token = String(fd.get("token"));
  await setStatus(token, "confirmed");
  redirect(`/t/${token}?ok=bestaetigt`);
}

export async function cancelAppointment(fd: FormData) {
  const token = String(fd.get("token"));
  await setStatus(token, "cancelled");
  redirect(`/t/${token}?ok=abgesagt`);
}
