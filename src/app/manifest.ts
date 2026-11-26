import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Termin – Kalender für Ihren Betrieb",
    short_name: "Termin",
    description: "Termine, Online-Buchung und SMS-Erinnerungen",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#7c3aed",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
