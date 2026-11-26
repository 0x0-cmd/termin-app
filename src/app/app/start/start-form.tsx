"use client";

import { useActionState, useState } from "react";
import { createBusiness, type FormState } from "./actions";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function StartForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createBusiness, undefined);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const shownSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="name">Name des Betriebs</label>
        <input id="name" name="name" required className="input" placeholder="Salon Maria" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="slug">Adresse Ihrer Buchungsseite</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-stone-500">…/</span>
          <input
            id="slug"
            name="slug"
            required
            className="input"
            value={shownSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="owner">Ihr Vorname (erscheint als Mitarbeiter)</label>
        <input id="owner" name="owner" required className="input" placeholder="Maria" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Telefon des Betriebs (optional)</label>
        <input id="phone" name="phone" type="tel" className="input" />
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>Weiter</button>
    </form>
  );
}
