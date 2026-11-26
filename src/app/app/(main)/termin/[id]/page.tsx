import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/dal";
import { dateIn, formatDateTime, isPast, timeIn } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { STATUS_LABEL, type Appointment } from "@/lib/types";
import { AppointmentForm } from "../appointment-form";
import { deleteAppointment, setAppointmentStatus } from "../../actions";

export const metadata = { title: "Termin" };

type Row = Appointment & {
  customers: { name: string; phone: string | null } | null;
  services: { name: string } | null;
  staff: { name: string } | null;
};

export default async function AppointmentPage({ params, searchParams }: PageProps<"/app/termin/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;
  const { data: a } = await supabase
    .from("appointments")
    .select("*, customers(name, phone), services(name), staff(name)")
    .eq("id", id)
    .maybeSingle<Row>();
  if (!a) notFound();
  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase.from("services").select("id, name, duration_min, price_cents").eq("business_id", business.id).order("sort").order("name"),
    supabase.from("staff").select("id, name").eq("business_id", business.id).order("sort").order("name"),
  ]);
  const past = isPast(a.starts_at);
  const durationMin = Math.round((Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60_000);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href={`/app?ansicht=tag&datum=${dateIn(tz, a.starts_at)}`} className="text-sm text-brand-700">‹ Kalender</Link>
      <div className="card space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{a.customers?.name ?? a.note ?? "Blocker"}</h1>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium">{STATUS_LABEL[a.status]}</span>
        </div>
        <p>{formatDateTime(tz, a.starts_at)}–{timeIn(tz, a.ends_at)} Uhr</p>
        <p className="text-stone-600">{[a.services?.name, a.staff?.name].filter(Boolean).join(" · ")}</p>
        {a.customers?.phone && (
          <p>
            <a className="text-brand-700" href={`tel:${a.customers.phone}`}>{formatPhone(a.customers.phone)}</a>
          </p>
        )}
        <p className="pt-1 text-xs text-stone-500">
          {a.source === "online" ? "Online gebucht" : "Manuell eingetragen"}
          {a.reminder_sent_at ? " · Erinnerung verschickt" : ""}
          {a.confirmed_at ? " · vom Kunden bestätigt" : ""}
        </p>
      </div>

      {sp.fehler === "belegt" && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Die Zeit ist inzwischen anderweitig vergeben.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {a.status === "cancelled" ? (
          <StatusButton id={a.id} status="booked" label="Wiederherstellen" />
        ) : past ? (
          <>
            <StatusButton id={a.id} status="completed" label="Erschienen" />
            <StatusButton id={a.id} status="no_show" label="Nicht erschienen" cls="btn-danger" />
          </>
        ) : (
          <>
            {a.status !== "confirmed" && <StatusButton id={a.id} status="confirmed" label="Als bestätigt markieren" />}
            <StatusButton id={a.id} status="cancelled" label="Absagen" cls="btn-danger" />
          </>
        )}
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Termin bearbeiten</summary>
        <div className="mt-4">
          <AppointmentForm
            services={services ?? []}
            staff={staff ?? []}
            initial={{
              id: a.id,
              service_id: a.service_id,
              staff_id: a.staff_id,
              date: dateIn(tz, a.starts_at),
              time: timeIn(tz, a.starts_at),
              duration: durationMin,
              name: a.customers?.name,
              phone: a.customers?.phone ?? "",
              note: a.note ?? "",
            }}
          />
        </div>
      </details>

      <form action={deleteAppointment}>
        <input type="hidden" name="id" value={a.id} />
        <button className="text-sm text-red-700">Termin endgültig löschen</button>
      </form>
    </div>
  );
}

function StatusButton({ id, status, label, cls = "btn-secondary" }: { id: string; status: string; label: string; cls?: string }) {
  return (
    <form action={setAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`${cls} w-full`}>{label}</button>
    </form>
  );
}
