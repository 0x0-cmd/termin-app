import Link from "next/link";
import { requireBusiness } from "@/lib/dal";
import {
  addDaysStr, dateIn, formatDateLong, formatDateShort, isValidDateStr, isoWeekday, timeIn, todayIn, weekStart, zonedDateTime,
} from "@/lib/time";
import type { AppointmentStatus, Staff } from "@/lib/types";

export const metadata = { title: "Kalender" };

type Appt = {
  id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: "online" | "manual";
  note: string | null;
  customers: { name: string; phone: string } | null;
  services: { name: string } | null;
};

const HOUR_PX = 64;

export default async function CalendarPage({ searchParams }: PageProps<"/app">) {
  const { supabase, business } = await requireBusiness();
  const sp = await searchParams;
  const tz = business.timezone;
  const view = sp.ansicht === "woche" ? "woche" : "tag";
  const date = isValidDateStr(sp.datum) ? sp.datum : todayIn(tz);
  const staffFilter = typeof sp.ma === "string" ? sp.ma : null;
  const from = view === "woche" ? weekStart(date) : date;
  const days = view === "woche" ? 7 : 1;
  const to = addDaysStr(from, days);

  const [{ data: staffRows }, { data: appts }, { data: hours }, { data: off }] = await Promise.all([
    supabase.from("staff").select("*").eq("business_id", business.id).eq("active", true).order("sort").order("name"),
    supabase
      .from("appointments")
      .select("id, staff_id, starts_at, ends_at, status, source, note, customers(name, phone), services(name)")
      .eq("business_id", business.id)
      .gte("starts_at", zonedDateTime(tz, from, "00:00").toISOString())
      .lt("starts_at", zonedDateTime(tz, to, "00:00").toISOString())
      .order("starts_at")
      .returns<Appt[]>(),
    supabase.from("opening_hours").select("weekday, opens, closes").eq("business_id", business.id),
    supabase
      .from("time_off")
      .select("staff_id, starts_at, ends_at, reason")
      .eq("business_id", business.id)
      .lt("starts_at", zonedDateTime(tz, to, "00:00").toISOString())
      .gt("ends_at", zonedDateTime(tz, from, "00:00").toISOString()),
  ]);
  const allStaff = (staffRows ?? []) as Staff[];
  const staff = staffFilter ? allStaff.filter((s) => s.id === staffFilter) : allStaff;
  const visible = (appts ?? []).filter((a) => !staffFilter || a.staff_id === staffFilter);
  const step = view === "woche" ? 7 : 1;
  const q = (d: string, v = view) => `/app?ansicht=${v}&datum=${d}${staffFilter ? `&ma=${staffFilter}` : ""}`;
  const today = todayIn(tz);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={q(addDaysStr(date, -step))} className="btn-secondary px-3" aria-label="Zurück">‹</Link>
          <Link href={q(today)} className="btn-secondary">Heute</Link>
          <Link href={q(addDaysStr(date, step))} className="btn-secondary px-3" aria-label="Weiter">›</Link>
        </div>
        <div className="flex rounded-xl border border-stone-300 bg-white p-0.5 text-sm">
          {(["tag", "woche"] as const).map((v) => (
            <Link key={v} href={q(date, v)} className={`rounded-lg px-3 py-1.5 ${view === v ? "bg-brand-600 text-white" : ""}`}>
              {v === "tag" ? "Tag" : "Woche"}
            </Link>
          ))}
        </div>
      </div>
      <h1 className="text-lg font-bold">
        {view === "tag" ? formatDateLong(date) : `${formatDateShort(from)} – ${formatDateShort(addDaysStr(from, 6))}`}
      </h1>

      {allStaff.length > 1 && (
        <div className="flex gap-2 overflow-x-auto text-sm">
          <Link href={`/app?ansicht=${view}&datum=${date}`} className={`rounded-full px-3 py-1 ${!staffFilter ? "bg-stone-800 text-white" : "bg-white border"}`}>Alle</Link>
          {allStaff.map((s) => (
            <Link key={s.id} href={`/app?ansicht=${view}&datum=${date}&ma=${s.id}`} className={`whitespace-nowrap rounded-full px-3 py-1 ${staffFilter === s.id ? "bg-stone-800 text-white" : "bg-white border"}`}>
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {view === "tag" ? (
        <DayGrid
          tz={tz}
          date={date}
          staff={staff}
          appts={visible}
          hours={(hours ?? []).filter((h) => h.weekday === isoWeekday(date))}
          off={(off ?? []).filter((o) => !staffFilter || !o.staff_id || o.staff_id === staffFilter)}
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDaysStr(from, i)).map((d) => {
            const list = visible.filter((a) => dateIn(tz, a.starts_at) === d);
            const closed = !(hours ?? []).some((h) => h.weekday === isoWeekday(d));
            return (
              <div key={d} className={`card p-2 ${d === today ? "border-brand-500" : ""}`}>
                <Link href={q(d, "tag")} className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                  {formatDateShort(d)}
                  <span className="text-xs font-normal text-stone-500">{closed ? "zu" : list.filter((a) => a.status !== "cancelled").length || ""}</span>
                </Link>
                <ul className="space-y-1">
                  {list.map((a) => (
                    <li key={a.id}>
                      <Link href={`/app/termin/${a.id}`} className={`block rounded-lg px-2 py-1 text-xs ${apptColor(a.status)}`}>
                        <span className="font-semibold">{timeIn(tz, a.starts_at)}</span> {a.customers?.name ?? a.note ?? "Blocker"}
                        <span className="block truncate opacity-75">
                          {a.services?.name}
                          {allStaff.length > 1 && !staffFilter ? ` · ${allStaff.find((s) => s.id === a.staff_id)?.name ?? ""}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function apptColor(s: AppointmentStatus) {
  switch (s) {
    case "confirmed":
      return "bg-green-100 text-green-900 border border-green-300";
    case "cancelled":
      return "bg-stone-100 text-stone-400 line-through border border-stone-200";
    case "no_show":
      return "bg-red-100 text-red-900 border border-red-300";
    case "completed":
      return "bg-stone-200 text-stone-700 border border-stone-300";
    default:
      return "bg-brand-100 text-brand-700 border border-brand-500/40";
  }
}

function DayGrid({
  tz, date, staff, appts, hours, off,
}: {
  tz: string;
  date: string;
  staff: Staff[];
  appts: Appt[];
  hours: { opens: string; closes: string }[];
  off: { staff_id: string | null; starts_at: string; ends_at: string; reason: string | null }[];
}) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const apptMins = appts.flatMap((a) => [toMin(timeIn(tz, a.starts_at)), toMin(timeIn(tz, a.ends_at)) || 24 * 60]);
  const startH = Math.floor(Math.min(8 * 60, ...hours.map((h) => toMin(h.opens)), ...apptMins) / 60);
  const endH = Math.ceil(Math.max(19 * 60, ...hours.map((h) => toMin(h.closes)), ...apptMins) / 60);
  const dayStart = zonedDateTime(tz, date, `${String(startH).padStart(2, "0")}:00`).getTime();
  const dayEnd = zonedDateTime(tz, date, `${String(endH).padStart(2, "0")}:00`).getTime();
  const y = (ms: number) => ((Math.min(Math.max(ms, dayStart), dayEnd) - dayStart) / 3_600_000) * HOUR_PX;
  const totalH = (endH - startH) * HOUR_PX;
  const hoursList = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const isOpen = (min: number) => hours.some((h) => min >= toMin(h.opens) && min < toMin(h.closes));

  if (staff.length === 0) {
    return <p className="card">Noch keine Mitarbeiter angelegt. <Link className="text-brand-700" href="/app/team">Jetzt anlegen</Link></p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <div className="flex min-w-fit">
        <div className="sticky left-0 z-10 w-12 shrink-0 border-r border-stone-200 bg-white">
          <div className="h-8 border-b border-stone-200" />
          <div className="relative" style={{ height: totalH }}>
            {hoursList.map((h, i) => (
              <span key={h} className="absolute right-1 -translate-y-1/2 text-[11px] text-stone-400" style={{ top: i * HOUR_PX }}>
                {i > 0 ? `${h}:00` : ""}
              </span>
            ))}
          </div>
        </div>
        {staff.map((s) => (
          <div key={s.id} className="min-w-36 flex-1 border-r border-stone-100 last:border-r-0">
            <div className="flex h-8 items-center justify-center border-b border-stone-200 text-sm font-semibold">{s.name}</div>
            <div className="relative" style={{ height: totalH }}>
              {hoursList.flatMap((h, i) =>
                [0, 30].map((m) => {
                  const t = `${String(h).padStart(2, "0")}:${m ? "30" : "00"}`;
                  return (
                    <Link
                      key={t}
                      href={`/app/termin/neu?datum=${date}&zeit=${t}&ma=${s.id}`}
                      aria-label={`Termin um ${t} bei ${s.name} eintragen`}
                      className={`absolute inset-x-0 border-t ${m ? "border-dashed border-stone-100" : "border-stone-200"} ${isOpen(h * 60 + m) ? "" : "bg-stone-50"} hover:bg-brand-50`}
                      style={{ top: i * HOUR_PX + (m ? HOUR_PX / 2 : 0), height: HOUR_PX / 2 }}
                    />
                  );
                }),
              )}
              {off
                .filter((o) => !o.staff_id || o.staff_id === s.id)
                .map((o, i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(45deg,#e7e5e4_0,#e7e5e4_6px,transparent_6px,transparent_12px)] p-1 text-[11px] text-stone-600"
                    style={{ top: y(Date.parse(o.starts_at)), height: y(Date.parse(o.ends_at)) - y(Date.parse(o.starts_at)) }}
                  >
                    {o.reason || "Abwesend"}
                  </div>
                ))}
              {appts
                .filter((a) => a.staff_id === s.id)
                .map((a) => {
                  const top = y(Date.parse(a.starts_at));
                  const height = Math.max(y(Date.parse(a.ends_at)) - top, 20);
                  return (
                    <Link
                      key={a.id}
                      href={`/app/termin/${a.id}`}
                      className={`absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-xs ${apptColor(a.status)} ${a.status === "cancelled" ? "opacity-60" : "z-[1]"}`}
                      style={{ top, height }}
                    >
                      <span className="font-semibold">
                        {timeIn(tz, a.starts_at)} {a.customers?.name ?? a.note ?? "Blocker"}
                      </span>
                      <span className="block truncate">{a.services?.name}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
      {hours.length === 0 && <p className="border-t border-stone-200 p-2 text-center text-xs text-stone-500">Laut Öffnungszeiten geschlossen</p>}
    </div>
  );
}
