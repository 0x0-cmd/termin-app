# Termin – Online-Buchung & SMS-Erinnerungen für kleine Dienstleister

Phase-1-MVP: Buchungsseite pro Betrieb (`/salon-maria`), Handy-Kalender für den Betrieb und automatische
SMS-Erinnerungen 24 h vorher mit Bestätigen-/Absagen-Link. Alles auf Deutsch, Daten in der EU.

**Stack:** Next.js 16 (App Router, PWA-Manifest) · Supabase (Postgres + Auth, Region Frankfurt) ·
SMS über seven.io oder Twilio (austauschbar) · Hosting z. B. Vercel `fra1`.

## Was drin ist

| Bereich | Pfad | Inhalt |
|---|---|---|
| Buchungsseite | `/[slug]` | Leistung → Mitarbeiter (oder „egal“) → freier Termin → Name + Handynummer. Kein Kundenkonto. DSGVO-Einwilligung. |
| Termin-Link | `/t/[token]` | Aus der SMS: Termin ansehen, bestätigen, absagen. |
| Kalender | `/app` | Tag (Zeitraster je Mitarbeiter, Tippen auf freie Zeit = Termin eintragen) und Woche. |
| Termine | `/app/termin/neu`, `/app/termin/[id]` | Für Anrufer per Hand eintragen, verschieben, absagen, „erschienen“/„nicht erschienen“. |
| Leistungen / Team | `/app/leistungen`, `/app/team` | Dauer, Preis, wer bietet was an. Tarif-Limits (Solo 1, Team 5). |
| Zeiten | `/app/zeiten` | Öffnungszeiten, Mittagspause je Wochentag, Urlaub/Abwesenheit (Betrieb oder Mitarbeiter, ganztags oder stundenweise). |
| Einstellungen | `/app/einstellungen` | Buchungslink, SMS-Zähler des Monats, Raster, Vorlauf, Erinnerungszeit. |
| Erinnerungen | `/api/cron/reminders` | Alle 15 Min. aufrufen; verschickt fällige Erinnerungen genau einmal. |

Wichtige Stellen im Code:

- `supabase/migrations/…_init.sql` – Datenmodell, RLS, Schutz gegen Doppelbuchungen (Exclusion-Constraint).
- `src/lib/slots.ts` – Berechnung freier Termine (Öffnungszeiten, Pausen, Urlaub, belegte Termine, Sommerzeit). Tests: `slots.test.ts`.
- `src/lib/messaging/provider.ts` – SMS-Schnittstelle (`MessageProvider`) mit `console`, `seven`, `twilio`. WhatsApp kommt als weiterer Provider dazu.
- `src/lib/booking.ts`, `src/lib/reminders.ts` – Online-Buchung und Erinnerungs-Job.

## Einrichten

1. **Supabase-Projekt** anlegen, Region **Central EU (Frankfurt)**.
2. Migration ausführen: Inhalt von `supabase/migrations/20261126000000_init.sql` im SQL-Editor ausführen
   (oder `supabase link` + `supabase db push`).
3. **Auth:** E-Mail/Passwort aktivieren. Unter *Authentication → URL Configuration* die Site-URL setzen und
   `https://<ihre-domain>/auth/confirm` als Redirect-URL eintragen. E-Mail-Vorlagen auf Deutsch übersetzen.
4. `.env.example` nach `.env.local` kopieren und ausfüllen.
5. `npm install && npm run dev` → http://localhost:3000/registrieren

Mit `SMS_PROVIDER=console` werden SMS nur ins Server-Log geschrieben – ideal zum Testen.

### Erinnerungs-Job einrichten

Den Endpunkt alle 15 Minuten aufrufen, z. B. direkt aus Supabase (Extensions `pg_cron` und `pg_net` aktivieren):

```sql
select cron.schedule('termin-reminders', '*/15 * * * *', $$
  select net.http_get(
    url := 'https://<ihre-domain>/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

Alternativ cron-job.org oder Vercel Cron (Vercel Hobby erlaubt nur 1×/Tag – das reicht nicht).

## Tests

```bash
npm test          # Slot-Berechnung, Telefonnummern
npx tsc --noEmit
npm run lint
```

## Bewusst noch offen (vor dem Livegang)

- Impressum und Datenschutzerklärung ausfüllen und prüfen lassen; AV-Vertrag mit Betrieben, Supabase und seven.io.
- Abo/Bezahlung (Stripe Billing) – Tarif steht derzeit nur als Feld `plan` in der Datenbank; SMS-Kontingent wird gezählt, aber nicht gesperrt.
- Missbrauchsschutz auf der Buchungsseite (Rate-Limit / Captcha).
- WhatsApp-Versand (benötigt freigegebene Vorlagen beim Anbieter).
- Arbeitszeiten je Mitarbeiter (derzeit gelten Öffnungszeiten des Betriebs + Abwesenheiten je Mitarbeiter).
- Phase 2: Anzahlung/Kartenhinterlegung, Warteliste, Buchungsbutton-Widget, Statistik.
