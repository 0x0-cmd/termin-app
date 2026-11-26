import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["0664 123 45 67", "+436641234567"],
    ["+43 664/1234567", "+436641234567"],
    ["0043 664 1234567", "+436641234567"],
    ["+49 151 23456789", "+4915123456789"],
    ["664 1234567", "+436641234567"],
  ])("%s → %s", (i, o) => expect(normalizePhone(i)).toBe(o));
  it("lehnt Unsinn ab", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("12")).toBeNull();
  });
});
