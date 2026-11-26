export const metadata = { title: "Datenschutz" };

export default function Datenschutz() {
  return (
    <main className="prose mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <h1 className="text-2xl font-bold">Datenschutzerklärung</h1>
      <p className="mt-2 text-sm text-amber-700">Entwurf – vor dem Livegang rechtlich prüfen lassen.</p>
      <div className="mt-6 space-y-4 text-stone-700">
        <p>
          <strong>Was wir speichern:</strong> Wenn Sie einen Termin buchen, speichern wir Ihren Namen, Ihre
          Telefonnummer und den gebuchten Termin. Mehr nicht. Es gibt kein Kundenkonto und keine Werbe-Cookies.
        </p>
        <p>
          <strong>Wofür:</strong> Um den Termin zu verwalten und Ihnen eine Bestätigung und eine Erinnerung per SMS zu
          schicken (Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung).
        </p>
        <p>
          <strong>Wer ist verantwortlich:</strong> Der Betrieb, bei dem Sie buchen. Wir verarbeiten die Daten in seinem
          Auftrag (Auftragsverarbeitung nach Art. 28 DSGVO).
        </p>
        <p>
          <strong>Wo:</strong> Datenbank bei Supabase in einem Rechenzentrum in der EU. SMS-Versand über einen
          EU-Anbieter (seven.io, Deutschland).
        </p>
        <p>
          <strong>Wie lange:</strong> Termindaten werden gespeichert, solange der Betrieb sie für die Terminverwaltung
          braucht. [Löschfrist festlegen]
        </p>
        <p>
          <strong>Ihre Rechte:</strong> Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Beschwerde bei
          der Datenschutzbehörde (dsb.gv.at). Wenden Sie sich dafür an den Betrieb oder an uns.
        </p>
      </div>
    </main>
  );
}
