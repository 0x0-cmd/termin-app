import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Service-Role-Client: umgeht RLS. Nur serverseitig für die öffentliche
 * Buchungsseite, den Termin-Link und den Erinnerungs-Job verwenden.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
