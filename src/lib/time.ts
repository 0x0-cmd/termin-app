import { TZDate } from "@date-fns/tz";
import { addDays, format, parseISO } from "date-fns";

export const DEFAULT_TZ = "Europe/Vienna";

/** "2026-11-26" + "09:30" in Zeitzone → absoluter Zeitpunkt */
export function zonedDateTime(tz: string, date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(TZDate.tz(tz, y, m - 1, d, hh, mm).getTime());
}

/** ISO-Wochentag (1 = Montag … 7 = Sonntag) eines Kalenderdatums */
export function isoWeekday(date: string): number {
  const d = parseISO(date).getDay();
  return d === 0 ? 7 : d;
}

/** Heutiges Kalenderdatum in der Zeitzone als "yyyy-MM-dd" */
export function todayIn(tz: string, now: Date = new Date()): string {
  return format(new TZDate(now.getTime(), tz), "yyyy-MM-dd");
}

/** Kalenderdatum eines Zeitpunkts in der Zeitzone */
export function dateIn(tz: string, at: Date | string): string {
  return format(new TZDate(new Date(at).getTime(), tz), "yyyy-MM-dd");
}

/** Uhrzeit eines Zeitpunkts in der Zeitzone, "HH:mm" */
export function timeIn(tz: string, at: Date | string): string {
  return format(new TZDate(new Date(at).getTime(), tz), "HH:mm");
}

export function addDaysStr(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

/** Montag der Woche des Datums */
export function weekStart(date: string): string {
  return addDaysStr(date, 1 - isoWeekday(date));
}

export function isValidDateStr(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());
}

const WEEKDAYS = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const WEEKDAYS_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
export const weekdayName = (n: number) => WEEKDAYS[n];
export const weekdayShort = (n: number) => WEEKDAYS_SHORT[n];

/** "Donnerstag, 26. November" */
export function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat("de-AT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(date + "T12:00:00Z"),
  );
}

/** "Do, 26.11." */
export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat("de-AT", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
    new Date(date + "T12:00:00Z"),
  );
}

/** "Do., 26. Nov., 09:30" in Zeitzone des Betriebs */
export function formatDateTime(tz: string, at: Date | string): string {
  return new Intl.DateTimeFormat("de-AT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(at));
}

export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** "HH:mm:ss" aus der DB → "HH:mm" */
export const hhmm = (t: string) => t.slice(0, 5);

/** Liegt der Zeitpunkt in der Vergangenheit? (serverseitig pro Request) */
export function isPast(at: string | Date): boolean {
  return new Date(at).getTime() < Date.now();
}
