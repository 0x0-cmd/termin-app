"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "../actions";
import { FormMessage } from "@/components/form-bits";
import type { Business } from "@/lib/types";

export function SettingsForm({ business: b }: { business: Business }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="label">Name</span>
        <input name="name" required className="input" defaultValue={b.name} />
      </label>
      <label className="block">
        <span className="label">Adresse der Buchungsseite</span>
        <input name="slug" required className="input" defaultValue={b.slug} />
      </label>
      <label className="block">
        <span className="label">Telefon</span>
        <input name="phone" type="tel" className="input" defaultValue={b.phone ?? ""} />
      </label>
      <label className="block">
        <span className="label">Anschrift</span>
        <input name="address" className="input" defaultValue={b.address ?? ""} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label">Termin-Raster</span>
          <select name="slot_interval_min" className="input" defaultValue={b.slot_interval_min}>
            {[5, 10, 15, 20, 30, 60].map((m) => (
              <option key={m} value={m}>alle {m} Min.</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Vorlauf online (Std.)</span>
          <input name="min_notice_h" type="number" min={0} max={168} className="input" defaultValue={Math.round(b.min_notice_min / 60)} />
        </label>
        <label className="block">
          <span className="label">Buchbar bis (Tage)</span>
          <input name="booking_horizon_days" type="number" min={1} max={365} className="input" defaultValue={b.booking_horizon_days} />
        </label>
        <label className="block">
          <span className="label">Erinnerung (Std. vorher)</span>
          <input name="reminder_hours" type="number" min={1} max={72} className="input" defaultValue={b.reminder_hours} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="send_confirmation" defaultChecked={b.send_confirmation} /> Bei Online-Buchung sofort
        Bestätigungs-SMS senden
      </label>
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending}>Speichern</button>
    </form>
  );
}
