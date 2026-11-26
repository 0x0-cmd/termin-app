"use client";

import { useActionState } from "react";
import { saveService, type FormState } from "../actions";
import { FormMessage } from "@/components/form-bits";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number | null;
  active: boolean;
  staffIds: string[];
};

export function ServiceForm({ staff, service }: { staff: { id: string; name: string }[]; service?: Service }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveService, undefined);
  return (
    <form action={action} className="space-y-3">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div>
        <label className="label">Name</label>
        <input name="name" required className="input" placeholder="z. B. Damenhaarschnitt" defaultValue={service?.name} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Dauer (Min.)</label>
          <input name="duration" type="number" min={5} max={600} step={5} required className="input" defaultValue={service?.duration_min ?? 30} />
        </div>
        <div>
          <label className="label">Preis (€)</label>
          <input
            name="price"
            inputMode="decimal"
            className="input"
            placeholder="optional"
            defaultValue={service?.price_cents != null ? (service.price_cents / 100).toFixed(2).replace(".", ",") : ""}
          />
        </div>
      </div>
      <div>
        <label className="label">Beschreibung (optional)</label>
        <input name="description" className="input" defaultValue={service?.description ?? ""} />
      </div>
      {staff.length > 0 && (
        <fieldset>
          <legend className="label">Wer bietet das an?</legend>
          <div className="flex flex-wrap gap-3">
            {staff.map((st) => (
              <label key={st.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="staff" value={st.id} defaultChecked={service ? service.staffIds.includes(st.id) : true} />
                {st.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {service && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={service.active} /> Online buchbar
        </label>
      )}
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending}>{service ? "Speichern" : "Hinzufügen"}</button>
    </form>
  );
}
