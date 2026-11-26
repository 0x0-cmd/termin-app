"use client";

import { useActionState, useState } from "react";
import { saveAppointment, type FormState } from "../actions";
import { FormMessage } from "@/components/form-bits";
import { formatPrice } from "@/lib/time";

type Props = {
  services: { id: string; name: string; duration_min: number; price_cents: number | null }[];
  staff: { id: string; name: string }[];
  initial: {
    id?: string;
    service_id?: string | null;
    staff_id?: string;
    date: string;
    time: string;
    duration?: number;
    name?: string;
    phone?: string;
    note?: string;
  };
};

export function AppointmentForm({ services, staff, initial }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAppointment, undefined);
  const [serviceId, setServiceId] = useState(initial.service_id ?? services[0]?.id ?? "");
  const [duration, setDuration] = useState(
    initial.duration ?? services.find((s) => s.id === (initial.service_id ?? services[0]?.id))?.duration_min ?? 30,
  );
  const [phone, setPhone] = useState(initial.phone ?? "");

  return (
    <form action={action} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label className="label" htmlFor="service_id">Leistung</label>
        <select
          id="service_id"
          name="service_id"
          className="input"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            const s = services.find((x) => x.id === e.target.value);
            if (s) setDuration(s.duration_min);
          }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_min} Min.{s.price_cents != null ? `, ${formatPrice(s.price_cents)}` : ""})
            </option>
          ))}
          <option value="">Sonstiges / Zeit blockieren</option>
        </select>
      </div>
      {staff.length > 1 ? (
        <div>
          <label className="label" htmlFor="staff_id">Mitarbeiter</label>
          <select id="staff_id" name="staff_id" className="input" defaultValue={initial.staff_id ?? staff[0]?.id}>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="staff_id" value={initial.staff_id ?? staff[0]?.id ?? ""} />
      )}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 sm:col-span-1">
          <label className="label" htmlFor="date">Datum</label>
          <input id="date" name="date" type="date" required className="input" defaultValue={initial.date} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="time">Uhrzeit</label>
          <input id="time" name="time" type="time" step={300} required className="input" defaultValue={initial.time} />
        </div>
        <div>
          <label className="label" htmlFor="duration">Min.</label>
          <input id="duration" name="duration" type="number" min={5} max={600} step={5} required className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="name">Kundin / Kunde</label>
        <input id="name" name="name" className="input" autoComplete="off" defaultValue={initial.name} />
      </div>
      <div>
        <label className="label" htmlFor="phone">Handynummer (für SMS-Erinnerung)</label>
        <input id="phone" name="phone" type="tel" className="input" placeholder="0664 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="note">Notiz</label>
        <textarea id="note" name="note" rows={2} className="input" defaultValue={initial.note} />
      </div>
      {!initial.id && phone && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="send_sms" defaultChecked /> Bestätigung per SMS schicken
        </label>
      )}
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Speichert …" : initial.id ? "Änderungen speichern" : "Termin eintragen"}
      </button>
    </form>
  );
}
