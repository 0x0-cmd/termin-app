import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StartForm } from "./start-form";

export const metadata = { title: "Betrieb anlegen" };

export default async function StartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true });
  if (count) redirect("/app");
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-12">
      <h1 className="text-2xl font-bold">Willkommen! Wie heißt Ihr Betrieb?</h1>
      <p className="mt-1 text-stone-600">Das können Sie später jederzeit ändern.</p>
      <StartForm />
    </main>
  );
}
