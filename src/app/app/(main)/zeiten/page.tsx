import { requireBusiness } from "@/lib/dal";
import { dateIn, formatDateShort, hhmm, timeIn } from "@/lib/time";
import { HoursForm, TimeOffForm } from "./forms";
import { deleteTimeOff } from "../actions";

export const metadata = { title: "Öffnungszeiten & Urlaub" };

export default async function TimesPage() {
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;
  const [{ data: hours }, { data: breaks }, { data: staff }, { data: off }] = await Promise.all([
    supabase.from("opening_hours").select("weekday, opens, closes").eq("business_id", business.id),
    supabase.from("breaks").select("weekday, starts, ends").eq("business_id", business.id).is("staff_id", null),
    supabase.from("staff").select("id, name").eq("business_id", business.id).eq("active", true).order("sort").order("name"),
    supabase
      .from("time_off")
      .select("id, staff_id, starts_at, ends_at, reason")
      .eq("business_id", business.id)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at"),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const wd = i + 1;
    const h = (hours ?? []).find((x) => x.weekday === wd);
    const b = (breaks ?? []).find((x) => x.weekday === wd);
    return {
      weekday: wd,
      open: !!h,
      opens: h ? hhmm(h.opens) : "09:00",
      closes: h ? hhmm(h.closes) : "18:00",
      breakStart: b ? hhmm(b.starts) : "",
      breakEnd: b ? hhmm(b.ends) : "",
    };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card">
        <h1 className="mb-3 text-xl font-bold">Öffnungszeiten & Pausen</h1>
        <HoursForm days={days} />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Urlaub & Abwesenheit</h2>
        <TimeOffForm staff={staff ?? []} />
        <ul className="mt-4 divide-y divide-stone-100">
          {(off ?? []).map((o) => {
            const endIncl = new Date(Date.parse(o.ends_at) - 1);
            const fullDays = timeIn(tz, o.starts_at) === "00:00" && timeIn(tz, o.ends_at) === "00:00";
            const from = dateIn(tz, o.starts_at);
            const to = dateIn(tz, endIncl);
            return (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">
                    {formatDateShort(from)}
                    {fullDays ? (from !== to ? ` – ${formatDateShort(to)}` : "") : ` ${timeIn(tz, o.starts_at)} – ${from !== dateIn(tz, o.ends_at) ? formatDateShort(dateIn(tz, o.ends_at)) + " " : ""}${timeIn(tz, o.ends_at)}`}
                  </span>
                  <span className="text-stone-500">
                    {" · "}
                    {o.staff_id ? (staff ?? []).find((s) => s.id === o.staff_id)?.name : "ganzer Betrieb"}
                    {o.reason ? ` · ${o.reason}` : ""}
                  </span>
                </span>
                <form action={deleteTimeOff}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-red-700" aria-label="Löschen">✕</button>
                </form>
              </li>
            );
          })}
          {!off?.length && <li className="py-2 text-sm text-stone-500">Keine Abwesenheiten geplant.</li>}
        </ul>
      </section>
    </div>
  );
}
