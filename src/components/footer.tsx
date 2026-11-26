import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 flex gap-4 text-sm text-stone-500">
      <Link href="/impressum">Impressum</Link>
      <Link href="/datenschutz">Datenschutz</Link>
    </footer>
  );
}
