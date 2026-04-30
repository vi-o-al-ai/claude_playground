import { describe, it, expect } from "vitest";
import { computeCountdown, formatCountdown, pregnancyWeek, DUE_DATE_ISO } from "../countdown.js";

describe("DUE_DATE_ISO", () => {
  it("targets July 1st at 00:00 UTC", () => {
    expect(DUE_DATE_ISO).toMatch(/^\d{4}-07-01T00:00:00\.000Z$/);
  });
});

describe("computeCountdown", () => {
  const due = Date.parse("2026-07-01T00:00:00.000Z");

  it("returns zeros when now equals due date", () => {
    const r = computeCountdown(due, due);
    expect(r).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, arrived: true });
  });

  it("returns arrived=true when past the due date", () => {
    const r = computeCountdown(due + 5000, due);
    expect(r.arrived).toBe(true);
    expect(r.totalMs).toBe(0);
    expect(r.days).toBe(0);
  });

  it("computes a 1-day diff correctly", () => {
    const now = due - 24 * 60 * 60 * 1000;
    const r = computeCountdown(now, due);
    expect(r).toEqual({
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 24 * 60 * 60 * 1000,
      arrived: false,
    });
  });

  it("computes mixed days/hours/minutes/seconds", () => {
    const ms = 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 5 * 60 * 1000 + 6 * 1000;
    const r = computeCountdown(due - ms, due);
    expect(r.days).toBe(3);
    expect(r.hours).toBe(4);
    expect(r.minutes).toBe(5);
    expect(r.seconds).toBe(6);
    expect(r.arrived).toBe(false);
  });

  it("floors fractional seconds", () => {
    const r = computeCountdown(due - 1500, due);
    expect(r.seconds).toBe(1);
    expect(r.minutes).toBe(0);
  });
});

describe("pregnancyWeek", () => {
  const due = Date.parse("2026-07-01T00:00:00.000Z");
  const DAY = 24 * 60 * 60 * 1000;

  it("returns 40 at the due date", () => {
    expect(pregnancyWeek(due, due)).toBe(40);
  });

  it("returns 40 past the due date", () => {
    expect(pregnancyWeek(due + 5 * DAY, due)).toBe(40);
  });

  it("returns 39 one week before due", () => {
    expect(pregnancyWeek(due - 7 * DAY, due)).toBe(39);
  });

  it("returns 31 when 62 days before due (matches Apr 30 -> Jul 1)", () => {
    expect(pregnancyWeek(due - 62 * DAY, due)).toBe(31);
  });

  it("clamps to 0 well before pregnancy start", () => {
    expect(pregnancyWeek(due - 400 * DAY, due)).toBe(0);
  });

  it("returns 0 at the start of pregnancy (~280 days out)", () => {
    expect(pregnancyWeek(due - 280 * DAY, due)).toBe(0);
  });
});

describe("formatCountdown", () => {
  it("zero-pads each unit to two digits", () => {
    const s = formatCountdown({ days: 1, hours: 2, minutes: 3, seconds: 4 });
    expect(s).toBe("01d 02h 03m 04s");
  });

  it("renders triple-digit days without truncation", () => {
    const s = formatCountdown({ days: 123, hours: 0, minutes: 0, seconds: 0 });
    expect(s).toBe("123d 00h 00m 00s");
  });
});
