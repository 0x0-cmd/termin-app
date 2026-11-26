import { requireBusiness } from "@/lib/dal";
import { ServiceForm } from "./service-form";
import { deleteService } from "../actions";

export const metadata = { title: "Leistungen" };

export default async function ServicesPage({ searchParams }: PageProps<"/app/leistungen">) {
  const { supabase, business } = await requireBusiness();
  const sp = await searchParams;
  const [{ data: services }, { data: staff }, { data: links }] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", business.id).order("sort").order("name"),
    supabase.from("staff").select("id, name").eq("business_id", business.id).eq("active", true).order("sort").order("name"),
    supabase.from("staff_services").select("staff_id, service_id"),
  ]);
  const staffList = staff ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Leistungen</h1>
        {sp.neu && (
          <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
            Ihr Betrieb ist angelegt. Tragen Sie jetzt Ihre Leistungen mit Dauer und Preis ein – danach ist Ihre
            Buchungsseite bereit.
          </p>
        )}
      </div>
      <section className="card">
        <h2 className="mb-3 font-semibold">Neue Leistung</h2>
        <ServiceForm staff={staffList} />
      </section>
      <ul className="space-y-3">
        {(services ?? []).map((s) => (
          <li key={s.id} className="card">
            <details>
              <summary className="flex cursor-pointer items-center justify-between gap-2">
                <span>
                  <span className={`font-semibold ${s.active ? "" : "text-stone-400 line-through"}`}>{s.name}</span>
                  <span className="ml-2 text-sm text-stone-500">
                    {s.duration_min} Min.
                    {s.price_cents != null ? ` · ${(s.price_cents / 100).toLocaleString("de-AT", { style: "currency", currency: "EUR" })}` : ""}
                  </span>
                </span>
                <span className="text-sm text-brand-700">Bearbeiten</span>
              </summary>
              <div className="mt-4 space-y-3">
                <ServiceForm
                  staff={staffList}
                  service={{ ...s, staffIds: (links ?? []).filter((l) => l.service_id === s.id).map((l) => l.staff_id) }}
                />
                <form action={deleteService}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="text-sm text-red-700">Leistung löschen</button>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
