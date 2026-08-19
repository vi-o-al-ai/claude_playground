import { describe, it, expect } from "vitest";
import { derivePort, PORT_RANGE_START, PORT_RANGE_END } from "../lib/ports.mjs";

// The ten project directory names that currently exist in the monorepo.
// derivePort() must produce a distinct port for each of them so that every
// dev server can run simultaneously without fighting over a port.
const CURRENT_PROJECTS = [
  "arcade-hub",
  "in-a-nutshell",
  "solitaire",
  "space-invaders",
  "splendor",
  "sudoku",
  "tic-tac-toe",
  "apple-music-to-youtube",
  "baby-countdown",
  "timeline-tracker",
];

describe("derivePort", () => {
  it("is deterministic — the same name always yields the same port", () => {
    for (const name of CURRENT_PROJECTS) {
      expect(derivePort(name)).toBe(derivePort(name));
    }
    expect(derivePort("solitaire")).toBe(derivePort("solitaire"));
  });

  it("exposes the advertised range", () => {
    expect(PORT_RANGE_START).toBe(3100);
    expect(PORT_RANGE_END).toBe(3499);
  });

  it("returns an integer inside [3100, 3499] for arbitrary names", () => {
    const names = [
      ...CURRENT_PROJECTS,
      "",
      "a",
      "z".repeat(200),
      "Some-Mixed_Case.Name",
      "123",
      "émoji-🎮-name",
      "../../etc/passwd",
      ...Array.from({ length: 500 }, (_, i) => `project-${i}`),
    ];

    for (const name of names) {
      const port = derivePort(name);
      expect(Number.isInteger(port), `${name} -> ${port}`).toBe(true);
      expect(port).toBeGreaterThanOrEqual(PORT_RANGE_START);
      expect(port).toBeLessThanOrEqual(PORT_RANGE_END);
    }
  });

  it("produces no collisions across the current project names", () => {
    const ports = CURRENT_PROJECTS.map(derivePort);
    expect(new Set(ports).size).toBe(CURRENT_PROJECTS.length);
  });

  it("produces different ports for names differing by one character", () => {
    expect(derivePort("sudoku")).not.toBe(derivePort("sudokv"));
  });

  it("rejects non-string input", () => {
    expect(() => derivePort(undefined)).toThrow();
    expect(() => derivePort(42)).toThrow();
  });
});
