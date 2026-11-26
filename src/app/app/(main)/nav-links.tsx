"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Kalender", icon: "▦" },
  { href: "/app/termin/neu", label: "Neuer Termin", short: "Neu", icon: "＋" },
  { href: "/app/leistungen", label: "Leistungen", icon: "✂︎" },
  { href: "/app/team", label: "Team", icon: "☺︎" },
  { href: "/app/zeiten", label: "Zeiten", icon: "◷" },
];

export function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const path = usePathname();
  return ITEMS.map((it) => {
    const active = it.href === "/app" ? path === "/app" : path.startsWith(it.href);
    return variant === "top" ? (
      <Link
        key={it.href}
        href={it.href}
        className={`rounded-lg px-3 py-1.5 text-sm ${active ? "bg-brand-50 font-semibold text-brand-700" : "text-stone-600 hover:bg-stone-100"}`}
      >
        {it.label}
      </Link>
    ) : (
      <Link key={it.href} href={it.href} className={`flex flex-col items-center py-2 text-[11px] ${active ? "text-brand-700" : "text-stone-500"}`}>
        <span className="text-lg leading-6">{it.icon}</span>
        {it.short ?? it.label}
      </Link>
    );
  });
}
