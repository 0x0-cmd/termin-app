import { formatDateTime } from "../time";

type Ctx = { businessName: string; tz: string; startsAt: string; serviceName: string | null; link: string };

// Kurz halten: 160 Zeichen (GSM-7) = 1 SMS. Umlaute erzwingen UCS-2 (70 Zeichen),
// daher bewusst ohne Umlaute/Sonderzeichen formuliert.
const when = (c: Ctx) => formatDateTime(c.tz, c.startsAt).replace(/\./g, "").replace(/ä/g, "ae");

export function confirmationText(c: Ctx): string {
  return `${c.businessName}: Ihr Termin am ${when(c)} ist gebucht. Absagen/Details: ${c.link}`;
}

export function reminderText(c: Ctx): string {
  return `Erinnerung ${c.businessName}: Termin am ${when(c)}. Bitte bestaetigen oder absagen: ${c.link}`;
}
