function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt (siehe .env.example)`);
  return value;
}

// Direkte process.env.X-Zugriffe, damit Next die NEXT_PUBLIC_-Werte einsetzen kann.
export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  appUrl: () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};
