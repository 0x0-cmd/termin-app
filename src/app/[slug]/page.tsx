import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicData } from "@/lib/booking";
import { BookingFlow } from "./booking-flow";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicData(slug);
  return data ? { title: `Termin buchen – ${data.business.name}` } : {};
}

export default async function BookingPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const data = await getPublicData(slug);
  if (!data) notFound();
  const { business } = data;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-6 pb-16">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{business.name}</h1>
        {business.address && <p className="text-sm text-stone-600">{business.address}</p>}
        {business.phone && (
          <a href={`tel:${business.phone}`} className="text-sm text-brand-700">
            {business.phone}
          </a>
        )}
      </header>
      {data.services.length === 0 ? (
        <p className="card text-stone-600">Online-Buchung ist derzeit nicht verfügbar. Bitte rufen Sie uns an.</p>
      ) : (
        <BookingFlow data={data} />
      )}
      <p className="mt-10 text-center text-xs text-stone-400">
        <Link href="/datenschutz">Datenschutz</Link> · <Link href="/impressum">Impressum</Link>
      </p>
    </main>
  );
}
