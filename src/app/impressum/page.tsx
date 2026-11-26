export const metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <h1 className="text-2xl font-bold">Impressum</h1>
      <p className="mt-4 text-stone-600">
        {/* TODO: Angaben nach § 5 ECG / § 25 MedienG ergänzen */}
        Firmenname, Anschrift, E-Mail, UID-Nummer, Gewerbebehörde – bitte vor dem Livegang ergänzen.
      </p>
    </main>
  );
}
