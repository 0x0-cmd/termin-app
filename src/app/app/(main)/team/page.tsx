import { requireBusiness } from "@/lib/dal";
import { StaffForm } from "./staff-form";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const { supabase, business } = await requireBusiness();
  const { data: staff } = await supabase.from("staff").select("*").eq("business_id", business.id).order("sort").order("name");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Team</h1>
      <ul className="space-y-3">
        {(staff ?? []).map((s) => (
          <li key={s.id} className="card">
            <StaffForm staff={s} />
          </li>
        ))}
      </ul>
      <section className="card">
        <h2 className="mb-3 font-semibold">Mitarbeiter hinzufügen</h2>
        <StaffForm />
        <p className="mt-2 text-xs text-stone-500">Neue Mitarbeiter bieten zunächst alle Leistungen an. Das lässt sich unter Leistungen ändern.</p>
      </section>
    </div>
  );
}
