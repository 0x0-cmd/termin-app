import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, isPast } from "@/lib/time";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/types";
import { cancelAppointment, confirmAppointment } from "./actions";

export const metadata = { title: "Ihr Termin", robots: { index: false } };

type Row = {
  id: string;
  starts_at: string;
  status: AppointmentStatus;
  manage_token: string;
  businesses: { name: string; phone: string | null; address: string | null; timezone: string; slug: string };
  services: { name: string } | null;
  staff: { name: string } | null;
};

export default async function ManagePage({ params, searchParams }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const db = createAdminClient();
  const { data: a } = await db
    .from("appointments")
    .select("id, starts_at, status, manage_token, businesses(name, phone, address, timezone, slug), services(name), staff(name)")
    .eq("manage_token", token)
    .maybeSingle<Row>();
  if (!a) notFound();

  const b = a.businesses;
  const past = isPast(a.starts_at);
  const open = !past && (a.status === "booked" || a.status === "confirmed");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="card space-y-3">
        <p className="text-sm text-stone-500">{b.name}</p>
        <h1 className="text-xl font-bold">{a.services?.name ?? "Termin"}</h1>
        <p className="text-lg">{formatDateTime(b.timezone, a.starts_at)} Uhr</p>
        {a.staff && <p className="text-stone-600">bei {a.staff.name}</p>}
        {b.address && <p className="text-sm text-stone-600">{b.address}</p>}
        <p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
              a.status === "cancelled" ? "bg-red-50 text-red-700" : a.status === "confirmed" ? "bg-green-50 text-green-700" : "bg-stone-100"
            }`}
          >
            {STATUS_LABEL[a.status]}
          </span>
        </p>
        {sp.ok === "bestaetigt" && <p className="text-green-700">Danke, Ihr Termin ist bestätigt.</p>}
        {sp.ok === "abgesagt" && <p className="text-stone-700">Ihr Termin wurde abgesagt.</p>}
        {open && (
          <div className="flex gap-2 pt-2">
            {a.status !== "confirmed" && (
              <form action={confirmAppointment} className="flex-1">
                <input type="hidden" name="token" value={token} />
                <button className="btn-primary w-full">Bestätigen</button>
              </form>
            )}
            <form action={cancelAppointment} className="flex-1">
              <input type="hidden" name="token" value={token} />
              <button className="btn-danger w-full">Absagen</button>
            </form>
          </div>
        )}
        {a.status === "cancelled" && (
          <a href={`/${b.slug}`} className="btn-secondary w-full">
            Neuen Termin buchen
          </a>
        )}
        {b.phone && (
          <p className="pt-2 text-sm text-stone-600">
            Fragen? <a className="text-brand-700" href={`tel:${b.phone}`}>{b.phone}</a>
          </p>
        )}
      </div>
    </main>
  );
}
