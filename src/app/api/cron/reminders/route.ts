import { NextResponse, type NextRequest } from "next/server";
import { sendDueReminders } from "@/lib/reminders";

// Alle 15 Minuten aufrufen, z. B. per Supabase pg_cron, cron-job.org oder Vercel Cron:
//   Authorization: Bearer $CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendDueReminders();
  return NextResponse.json(result);
}

export const POST = GET;
