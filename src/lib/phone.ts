/**
 * Normalisiert Telefonnummern nach E.164. Nationale Nummern ohne Vorwahl
 * werden als österreichisch (+43) behandelt. Gibt null bei ungültiger Eingabe.
 */
export function normalizePhone(input: string, defaultCountry = "43"): string | null {
  let s = input.trim().replace(/[\s\-/().]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (s.startsWith("0")) s = "+" + defaultCountry + s.slice(1);
  else if (!s.startsWith("+")) s = "+" + defaultCountry + s;
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}

/** +436641234567 → +43 664 1234567 (nur Anzeige) */
export function formatPhone(e164: string): string {
  const m = e164.match(/^\+43(\d{3})(\d+)$/);
  return m ? `+43 ${m[1]} ${m[2]}` : e164;
}
