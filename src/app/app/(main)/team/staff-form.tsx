"use client";

import { useActionState } from "react";
import { saveStaff, type FormState } from "../actions";
import { FormMessage } from "@/components/form-bits";

export function StaffForm({ staff }: { staff?: { id: string; name: string; active: boolean } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStaff, undefined);
  return (
    <form action={action} className="space-y-2">
      {staff && <input type="hidden" name="id" value={staff.id} />}
      <div className="flex gap-2">
        <input name="name" required className="input" placeholder="Name" defaultValue={staff?.name} />
        <button className="btn-primary shrink-0" disabled={pending}>{staff ? "Speichern" : "Hinzufügen"}</button>
      </div>
      {staff && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={staff.active} /> Aktiv (im Kalender und online buchbar)
        </label>
      )}
      <FormMessage state={state} />
    </form>
  );
}
