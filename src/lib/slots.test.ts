import { describe, expect, it } from "vitest";
import { computeSlots, type SlotInput } from "./slots";

const base: SlotInput = {
  tz: "Europe/Vienna",
  from: "2026-12-01", // Dienstag
  days: 1,
  durationMin: 30,
  intervalMin: 30,
  minNoticeMin: 0,
  horizonDays: 60,
  staffIds: ["a", "b"],
  openingHours: [{ weekday: 2, opens: "09:00", closes: "11:00" }],
  breaks: [],
  timeOff: [],
  busy: [],
  now: new Date("2026-11-30T00:00:00Z"),
};

const times = (r: ReturnType<typeof computeSlots>) =>
  r[0].slots.map((s) => new Date(s.start).toISOString().slice(11, 16));

describe("computeSlots", () => {
  it("erzeugt Slots innerhalb der Öffnungszeit (Wiener Zeit)", () => {
    // 09:00 Wien = 08:00 UTC im Winter
    expect(times(computeSlots(base))).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });

  it("Termin muss vor Ladenschluss enden", () => {
    const r = computeSlots({ ...base, durationMin: 60 });
    expect(times(r)).toEqual(["08:00", "08:30", "09:00"]);
  });

  it("geschlossene Tage liefern keine Slots", () => {
    expect(computeSlots({ ...base, from: "2026-12-02" })[0].slots).toEqual([]);
  });

  it("belegte Mitarbeiter fallen raus, andere bleiben", () => {
    const r = computeSlots({
      ...base,
      busy: [{ staff_id: "a", starts_at: "2026-12-01T08:00:00Z", ends_at: "2026-12-01T08:30:00Z" }],
    });
    expect(r[0].slots[0].staffIds).toEqual(["b"]);
    expect(r[0].slots[1].staffIds).toEqual(["a", "b"]);
  });

  it("Pause gilt für den ganzen Betrieb", () => {
    const r = computeSlots({ ...base, breaks: [{ weekday: 2, starts: "09:30", ends: "10:00", staff_id: null }] });
    expect(times(r)).toEqual(["08:00", "09:00", "09:30"]);
  });

  it("Urlaub eines Mitarbeiters", () => {
    const r = computeSlots({
      ...base,
      staffIds: ["a"],
      timeOff: [{ staff_id: "a", starts_at: "2026-11-30T23:00:00Z", ends_at: "2026-12-01T23:00:00Z" }],
    });
    expect(r[0].slots).toEqual([]);
  });

  it("Mindestvorlauf wird beachtet", () => {
    const r = computeSlots({ ...base, now: new Date("2026-12-01T07:30:00Z"), minNoticeMin: 60 });
    expect(times(r)).toEqual(["08:30", "09:00", "09:30"]);
  });

  it("Sommerzeit: 09:00 Wien = 07:00 UTC", () => {
    const r = computeSlots({
      ...base,
      from: "2026-06-02",
      now: new Date("2026-06-01T00:00:00Z"),
      intervalMin: 60,
    });
    expect(times(r)[0]).toBe("07:00");
  });
});
