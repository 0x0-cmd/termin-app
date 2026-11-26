import Link from "next/link";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      <p className="text-sm font-semibold text-brand-600">Für Friseure & Kosmetikstudios</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Weniger Telefon, weniger leere Stühle.</h1>
      <p className="mt-4 text-lg text-stone-600">
        Ihre eigene Buchungsseite, ein Kalender fürs Handy und automatische SMS-Erinnerungen 24 Stunden vor dem Termin
        – mit Bestätigen- und Absagen-Link.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/registrieren" className="btn-primary">
          30 Tage gratis testen
        </Link>
        <Link href="/login" className="btn-secondary">
          Anmelden
        </Link>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ["Kein Marktplatz", "Ihre Kundinnen bleiben Ihre Kundinnen. Keine Provision pro Buchung."],
          ["Einfach", "Leistung → Mitarbeiter → Termin → Name und Telefon. Kein Kundenkonto nötig."],
          ["DSGVO & EU", "Daten in der EU gespeichert, nur das Nötigste wird erfasst."],
        ].map(([t, d]) => (
          <li key={t} className="card">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-stone-600">{d}</p>
          </li>
        ))}
      </ul>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="font-semibold">Solo</p>
          <p className="text-2xl font-bold">19 € / Monat</p>
          <p className="text-sm text-stone-600">1 Person, inkl. 100 SMS</p>
        </div>
        <div className="card">
          <p className="font-semibold">Team</p>
          <p className="text-2xl font-bold">39 € / Monat</p>
          <p className="text-sm text-stone-600">bis 5 Mitarbeiter, inkl. 300 SMS</p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
