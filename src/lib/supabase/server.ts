import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";

/** Supabase-Client mit der Sitzung des eingeloggten Betriebs (RLS greift). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // In Server Components nicht setzbar; die Proxy-Datei erneuert die Sitzung.
        }
      },
    },
  });
}
