import { requireBusiness } from "@/lib/dal";
import { isValidDateStr, todayIn } from "@/lib/time";
import { AppointmentForm } from "../appointment-form";

export const metadata = { title: "Neuer Termin" };

export default async function NewAppointmentPage({ searchParams }: PageProps<"/app/termin/neu">) {
  const { supabase, business } = await requireBusiness();
  const sp = await searchParams;
  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase.from("services").select("id, name, duration_min, price_cents").eq("business_id", business.id).eq("active", true).order("sort").order("name"),
    supabase.from("staff").select("id, name").eq("business_id", business.id).eq("active", true).order("sort").order("name"),
  ]);
  const date = isValidDateStr(sp.datum) ? sp.datum : todayIn(business.timezone);
  const time = typeof sp.zeit === "string" && /^\d{2}:\d{2}$/.test(sp.zeit) ? sp.zeit : "09:00";
  const staffId = typeof sp.ma === "string" ? sp.ma : undefined;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-xl font-bold">Termin eintragen</h1>
      <AppointmentForm services={services ?? []} staff={staff ?? []} initial={{ date, time, staff_id: staffId }} />
    </div>
  );
}
