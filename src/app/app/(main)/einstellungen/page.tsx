import { requireBusiness } from "@/lib/dal";
import { env } from "@/lib/env";
import { SettingsForm } from "./settings-form";
import { logout } from "@/app/auth-actions";

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const { supabase, business, user } = await requireBusiness();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: smsCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("status", "sent")
    .gte("created_at", monthStart.toISOString());
  const link = `${env.appUrl()}/${business.slug}`;
  const included = business.plan === "team" ? 300 : 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card space-y-2">
        <h1 className="text-xl font-bold">Ihre Buchungsseite</h1>
        <a href={`/${business.slug}`} target="_blank" className="block break-all font-mono text-brand-700">{link}</a>
        <p className="text-sm text-stone-600">
          Diesen Link auf Website, Instagram-Bio und Google-Unternehmensprofil eintragen.
        </p>
      </section>

      <section className="card">
        <p className="text-sm text-stone-600">SMS diesen Monat</p>
        <p className="text-2xl font-bold">
          {smsCount ?? 0} <span className="text-base font-normal text-stone-500">von {included} inklusive</span>
        </p>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Betrieb</h2>
        <SettingsForm business={business} />
      </section>

      <section className="card flex items-center justify-between text-sm">
        <span className="text-stone-600">Angemeldet als {user.email}</span>
        <form action={logout}>
          <button className="btn-secondary">Abmelden</button>
        </form>
      </section>
    </div>
  );
}
