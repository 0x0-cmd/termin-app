import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "Termin – Online-Buchung für Salons", template: "%s · Termin" },
  description: "Online-Termine und SMS-Erinnerungen für Friseure und Kosmetikstudios. Ohne Provision, Hosting in der EU.",
  applicationName: "Termin",
  appleWebApp: { capable: true, title: "Termin", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
