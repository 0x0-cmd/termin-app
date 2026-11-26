import { addDaysStr, isoWeekday, zonedDateTime } from "./time";

export type OpeningHour = { weekday: number; opens: string; closes: string };
export type Break = { weekday: number; starts: string; ends: string; staff_id: string | null };
export type TimeOff = { staff_id: string | null; starts_at: string; ends_at: string };
export type Busy = { staff_id: string; starts_at: string; ends_at: string };

export type SlotInput = {
  tz: string;
  from: string; // yyyy-MM-dd (inkl.)
  days: number;
  durationMin: number;
  intervalMin: number;
  minNoticeMin: number;
  horizonDays: number;
  staffIds: string[]; // Mitarbeiter, die die Leistung anbieten (bereits gefiltert)
  openingHours: OpeningHour[];
  breaks: Break[];
  timeOff: TimeOff[];
  busy: Busy[];
  now: Date;
};

export type Slot = { start: string; staffIds: string[] };
export type DaySlots = { date: string; slots: Slot[] };

type Interval = [number, number];

const overlaps = (a: Interval, b: Interval) => a[0] < b[1] && b[0] < a[1];

/**
 * Berechnet freie Startzeiten. Ein Slot ist frei für einen Mitarbeiter, wenn
 * der gesamte Termin in eine Öffnungszeit fällt und weder Pause, Urlaub noch
 * ein bestehender Termin überlappt.
 */
export function computeSlots(input: SlotInput): DaySlots[] {
  const { tz, durationMin, intervalMin, staffIds } = input;
  const durMs = durationMin * 60_000;
  const earliest = input.now.getTime() + input.minNoticeMin * 60_000;
  const latest = input.now.getTime() + input.horizonDays * 86_400_000;

  const offByStaff = (staffId: string): Interval[] =>
    input.timeOff
      .filter((t) => t.staff_id === null || t.staff_id === staffId)
      .map((t) => [Date.parse(t.starts_at), Date.parse(t.ends_at)]);
  const busyByStaff = (staffId: string): Interval[] =>
    input.busy.filter((b) => b.staff_id === staffId).map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)]);

  const blockedCache = new Map<string, Interval[]>();
  const blocked = (staffId: string) => {
    let v = blockedCache.get(staffId);
    if (!v) {
      v = [...offByStaff(staffId), ...busyByStaff(staffId)];
      blockedCache.set(staffId, v);
    }
    return v;
  };

  const result: DaySlots[] = [];
  for (let i = 0; i < input.days; i++) {
    const date = addDaysStr(input.from, i);
    const wd = isoWeekday(date);
    const slots: Slot[] = [];
    const seen = new Map<number, Slot>();

    for (const oh of input.openingHours.filter((o) => o.weekday === wd)) {
      const open = zonedDateTime(tz, date, oh.opens).getTime();
      const close = zonedDateTime(tz, date, oh.closes).getTime();
      for (let t = open; t + durMs <= close; t += intervalMin * 60_000) {
        if (t < earliest || t > latest) continue;
        const iv: Interval = [t, t + durMs];
        const free = staffIds.filter((sid) => {
          const dayBreaks = input.breaks.filter(
            (b) => b.weekday === wd && (b.staff_id === null || b.staff_id === sid),
          );
          for (const b of dayBreaks) {
            const bi: Interval = [zonedDateTime(tz, date, b.starts).getTime(), zonedDateTime(tz, date, b.ends).getTime()];
            if (overlaps(iv, bi)) return false;
          }
          return !blocked(sid).some((x) => overlaps(iv, x));
        });
        if (free.length === 0) continue;
        const existing = seen.get(t);
        if (existing) {
          for (const s of free) if (!existing.staffIds.includes(s)) existing.staffIds.push(s);
        } else {
          const slot = { start: new Date(t).toISOString(), staffIds: free };
          seen.set(t, slot);
          slots.push(slot);
        }
      }
    }
    slots.sort((a, b) => a.start.localeCompare(b.start));
    result.push({ date, slots });
  }
  return result;
}
