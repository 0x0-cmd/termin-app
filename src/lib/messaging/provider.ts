/**
 * Schnittstelle für SMS/WhatsApp-Versand. Neue Anbieter (z. B. WhatsApp
 * Business über Twilio oder seven.io) implementieren nur `send`.
 */
export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export interface MessageProvider {
  readonly name: string;
  send(to: string, text: string): Promise<SendResult>;
}

/** Entwicklung: schreibt die Nachricht nur ins Server-Log. */
export class ConsoleProvider implements MessageProvider {
  readonly name = "console";
  async send(to: string, text: string): Promise<SendResult> {
    console.log(`[SMS → ${to}] ${text}`);
    return { ok: true, id: null };
  }
}

/** seven.io (Berlin, EU-Hosting). Doku: https://docs.seven.io/en/rest-api/endpoints/sms */
export class SevenProvider implements MessageProvider {
  readonly name = "seven";
  constructor(
    private apiKey: string,
    private from?: string,
  ) {}
  async send(to: string, text: string): Promise<SendResult> {
    try {
      const res = await fetch("https://gateway.seven.io/api/sms", {
        method: "POST",
        headers: { "X-Api-Key": this.apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ to, text, ...(this.from ? { from: this.from } : {}) }),
      });
      const data = (await res.json().catch(() => null)) as { success?: string; messages?: { id?: string | null }[] } | null;
      if (!res.ok || !data || String(data.success) !== "100") {
        return { ok: false, error: `seven.io: HTTP ${res.status}, Code ${data?.success ?? "?"}` };
      }
      return { ok: true, id: data.messages?.[0]?.id ?? null };
    } catch (e) {
      return { ok: false, error: `seven.io: ${(e as Error).message}` };
    }
  }
}

/** Twilio Programmable Messaging */
export class TwilioProvider implements MessageProvider {
  readonly name = "twilio";
  constructor(
    private accountSid: string,
    private authToken: string,
    private from: string,
  ) {}
  async send(to: string, text: string): Promise<SendResult> {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: this.from, Body: text }),
      });
      const data = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
      if (!res.ok) return { ok: false, error: `Twilio: HTTP ${res.status} ${data?.message ?? ""}`.trim() };
      return { ok: true, id: data?.sid ?? null };
    } catch (e) {
      return { ok: false, error: `Twilio: ${(e as Error).message}` };
    }
  }
}

export function getProvider(): MessageProvider {
  const kind = process.env.SMS_PROVIDER ?? "console";
  if (kind === "seven") {
    const key = process.env.SEVEN_API_KEY;
    if (!key) throw new Error("SEVEN_API_KEY fehlt");
    return new SevenProvider(key, process.env.SMS_SENDER);
  }
  if (kind === "twilio") {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
    if (!sid || !token || !from) throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN und TWILIO_FROM werden benötigt");
    return new TwilioProvider(sid, token, from);
  }
  return new ConsoleProvider();
}
