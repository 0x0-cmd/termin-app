import type { NextConfig } from "next";

// Die App ist fast vollständig request-abhängig (Login, Live-Kalender, freie Termine),
// daher bewusst ohne Cache Components.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
};

export default nextConfig;
