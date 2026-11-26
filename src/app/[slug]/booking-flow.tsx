"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { PublicData } from "@/lib/booking";
import type { DaySlots } from "@/lib/slots";
import { addDaysStr, formatDateLong, formatPrice, todayIn, weekdayShort, isoWeekday, timeIn, formatDateTime } from "@/lib/time";
import { book, fetchSlots } from "./actions";

type Step = "service" | "staff" | "time" | "details" | "done";
const ANY = "any";

export function BookingFlow({ data }: { data: PublicData }) {
  const { business, services, staff } = data;
  const tz = business.timezone;
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffChoice, setStaffChoice] = useState<string>(ANY);
  const [weekFrom, setWeekFrom] = useState(() => todayIn(tz));
  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token: string; startsAt: string; staffName: string } | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const staffForService = useMemo(
    () => (serviceId ? staff.filter((s) => s.serviceIds.includes(serviceId)) : []),
    [serviceId, staff],
  );
  const staffId = staffChoice === ANY ? null : staffChoice;

  // Freie Termine laden, sobald Leistung/Mitarbeiter/Woche feststehen
  useEffect(() => {
    if (step !== "time" || !serviceId) return;
    let cancelled = false;
    startTransition(async () => {
      const res = await fetchSlots(business.slug, serviceId, staffId, weekFrom);
      if (cancelled) return;
      setDays(res);
      setDate((d) => (d && res.some((x) => x.date === d && x.slots.length) ? d : (res.find((x) => x.slots.length)?.date ?? null)));
    });
    return () => {
      cancelled = true;
    };
  }, [step, serviceId, staffId, weekFrom, business.slug]);

  function chooseService(id: string) {
    setServiceId(id);
    setStart(null);
    setDays(null);
    const available = staff.filter((s) => s.serviceIds.includes(id));
    if (available.length <= 1) {
      setStaffChoice(available[0]?.id ?? ANY);
      setStep("time");
    } else {
      setStaffChoice(ANY);
      setStep("staff");
    }
  }

  const today = todayIn(tz);
  const selectedDay = days?.find((d) => d.date === date);

  if (step === "done" && result) {
    return (
      <div className="card text-center">
        <p className="text-4xl">✓</p>
        <h2 className="mt-2 text-xl font-bold">Termin gebucht</h2>
        <p className="mt-2 text-stone-700">
          {service?.name} bei {result.staffName}
          <br />
          <strong>{formatDateTime(tz, result.startsAt)} Uhr</strong>
        </p>
        <p className="mt-4 text-sm text-stone-600">
          Sie bekommen eine SMS mit einem Link, über den Sie den Termin bestätigen oder absagen können.
        </p>
        <a href={`/t/${result.token}`} className="btn-secondary mt-4">
          Termin ansehen
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Steps step={step} hasStaffStep={staffForService.length > 1} />

      {step === "service" && (
        <ul className="space-y-2">
          {services.map((s) => (
            <li key={s.id}>
              <button onClick={() => chooseService(s.id)} className="card flex w-full items-center justify-between text-left hover:border-brand-500">
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="text-sm text-stone-600">
                    {s.duration_min} Min.{s.description ? ` · ${s.description}` : ""}
                  </span>
                </span>
                <span className="font-semibold whitespace-nowrap">{formatPrice(s.price_cents)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === "staff" && (
        <div className="space-y-2">
          <BackButton onClick={() => setStep("service")} />
          {[{ id: ANY, name: "Egal – nächster freier Termin" }, ...staffForService].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setStaffChoice(s.id);
                setStart(null);
                setDays(null);
                setStep("time");
              }}
              className="card block w-full text-left font-semibold hover:border-brand-500"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {step === "time" && (
        <div className="space-y-4">
          <BackButton onClick={() => setStep(staffForService.length > 1 ? "staff" : "service")} />
          <p className="text-sm text-stone-600">
            {service?.name} · {service?.duration_min} Min.
            {staffId ? ` · ${staff.find((s) => s.id === staffId)?.name}` : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary px-3"
              aria-label="Vorherige Woche"
              disabled={weekFrom <= today || pending}
              onClick={() => setWeekFrom((w) => (addDaysStr(w, -7) < today ? today : addDaysStr(w, -7)))}
            >
              ‹
            </button>
            <div className="grid flex-1 grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, i) => addDaysStr(weekFrom, i)).map((d) => {
                const n = days?.find((x) => x.date === d)?.slots.length ?? 0;
                return (
                  <button
                    key={d}
                    disabled={!n}
                    onClick={() => setDate(d)}
                    className={`rounded-xl py-2 text-center text-xs ${
                      d === date ? "bg-brand-600 text-white" : n ? "bg-white border border-stone-200" : "text-stone-300"
                    }`}
                  >
                    <span className="block">{weekdayShort(isoWeekday(d))}</span>
                    <span className="block text-base font-semibold">{Number(d.slice(8))}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn-secondary px-3" aria-label="Nächste Woche" disabled={pending} onClick={() => setWeekFrom((w) => addDaysStr(w, 7))}>
              ›
            </button>
          </div>

          {pending || !days ? (
            <p className="py-8 text-center text-stone-500">Freie Termine werden geladen …</p>
          ) : !selectedDay ? (
            <p className="card text-center text-stone-600">In dieser Woche ist leider nichts frei. Bitte eine Woche weiter schauen.</p>
          ) : (
            <div>
              <p className="mb-2 font-semibold">{formatDateLong(selectedDay.date)}</p>
              <div className="grid grid-cols-4 gap-2">
                {selectedDay.slots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => {
                      setStart(s.start);
                      setStep("details");
                    }}
                    className="rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-semibold hover:border-brand-500"
                  >
                    {timeIn(tz, s.start)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "details" && start && (
        <form
          className="space-y-4"
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              const res = await book({
                slug: business.slug,
                serviceId: serviceId!,
                staffId,
                start,
                name: String(fd.get("name") ?? ""),
                phone: String(fd.get("phone") ?? ""),
                consent: fd.get("consent") === "on",
              });
              if (res.ok) {
                setResult(res);
                setStep("done");
              } else {
                setError(res.error);
              }
            });
          }}
        >
          <BackButton onClick={() => setStep("time")} />
          <div className="card bg-brand-50">
            <p className="font-semibold">{service?.name}</p>
            <p className="text-sm text-stone-700">{formatDateTime(tz, start)} Uhr</p>
          </div>
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required autoComplete="name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Handynummer
            </label>
            <input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="0664 1234567" className="input" />
            <p className="mt-1 text-xs text-stone-500">Für die Bestätigung und die Erinnerung per SMS.</p>
          </div>
          <label className="flex items-start gap-2 text-sm text-stone-700">
            <input type="checkbox" name="consent" required className="mt-1" />
            <span>
              Ich bin einverstanden, dass {business.name} meinen Namen und meine Telefonnummer für diesen Termin speichert
              und mir SMS dazu schickt. <a href="/datenschutz" className="underline" target="_blank">Datenschutz</a>
            </span>
          </label>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
            {pending ? "Wird gebucht …" : "Verbindlich buchen"}
          </button>
        </form>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-brand-700">
      ‹ Zurück
    </button>
  );
}

function Steps({ step, hasStaffStep }: { step: Step; hasStaffStep: boolean }) {
  const all: [Step, string][] = [
    ["service", "Leistung"],
    ...(hasStaffStep ? ([["staff", "Mitarbeiter"]] as [Step, string][]) : []),
    ["time", "Termin"],
    ["details", "Ihre Daten"],
  ];
  const idx = all.findIndex(([s]) => s === step);
  return (
    <ol className="flex gap-1 text-xs">
      {all.map(([s, label], i) => (
        <li key={s} className={`flex-1 border-t-4 pt-1 ${i <= idx ? "border-brand-600 text-stone-900" : "border-stone-200 text-stone-400"}`}>
          {label}
        </li>
      ))}
    </ol>
  );
}
