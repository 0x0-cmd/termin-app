"use client";

import { useActionState, useState } from "react";
import { addTimeOff, saveOpeningHours, type FormState } from "../actions";
import { FormMessage } from "@/components/form-bits";
import { weekdayName } from "@/lib/time";

type Day = { weekday: number; open: boolean; opens: string; closes: string; breakStart: string; breakEnd: string };

export function HoursForm({ days }: { days: Day[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveOpeningHours, undefined);
  const [open, setOpen] = useState(() => Object.fromEntries(days.map((d) => [d.weekday, d.open])));
  return (
    <form action={action} className="space-y-3">
      {days.map((d) => (
        <div key={d.weekday} className="border-b border-stone-100 pb-3 last:border-0">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              name={`open_${d.weekday}`}
              checked={open[d.weekday]}
              onChange={(e) => setOpen((o) => ({ ...o, [d.weekday]: e.target.checked }))}
            />
            {weekdayName(d.weekday)}
            {!open[d.weekday] && <span className="text-sm font-normal text-stone-400">geschlossen</span>}
          </label>
          {open[d.weekday] && (
            <div className="mt-2 grid grid-cols-2 gap-2 pl-6 text-sm sm:grid-cols-4">
              <label>
                <span className="text-xs text-stone-500">von</span>
                <input type="time" name={`opens_${d.weekday}`} defaultValue={d.opens} className="input py-1.5" />
              </label>
              <label>
                <span className="text-xs text-stone-500">bis</span>
                <input type="time" name={`closes_${d.weekday}`} defaultValue={d.closes} className="input py-1.5" />
              </label>
              <label>
                <span className="text-xs text-stone-500">Pause von</span>
                <input type="time" name={`break_start_${d.weekday}`} defaultValue={d.breakStart} className="input py-1.5" />
              </label>
              <label>
                <span className="text-xs text-stone-500">Pause bis</span>
                <input type="time" name={`break_end_${d.weekday}`} defaultValue={d.breakEnd} className="input py-1.5" />
              </label>
            </div>
          )}
        </div>
      ))}
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending}>Speichern</button>
    </form>
  );
}

export function TimeOffForm({ staff }: { staff: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addTimeOff, undefined);
  const [partial, setPartial] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="label">Von</span>
          <input type="date" name="from" required className="input" />
        </label>
        <label>
          <span className="label">Bis (inkl.)</span>
          <input type="date" name="to" className="input" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} /> Nur stundenweise
      </label>
      {partial && (
        <div className="grid grid-cols-2 gap-2">
          <input type="time" name="from_time" required className="input" />
          <input type="time" name="to_time" required className="input" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {staff.length > 1 ? (
          <select name="staff_id" className="input">
            <option value="">Ganzer Betrieb</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input type="hidden" name="staff_id" value="" />
        )}
        <input name="reason" placeholder="Grund (optional)" className={`input ${staff.length > 1 ? "" : "col-span-2"}`} />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending}>Eintragen</button>
    </form>
  );
}
