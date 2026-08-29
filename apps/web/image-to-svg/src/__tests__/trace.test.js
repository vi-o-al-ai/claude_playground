import { describe, it, expect } from "vitest";

import { traceMask, simplifyLoop } from "../trace.js";

/**
 * Builds a mask (Uint8Array) from rows of 0/1 digits, e.g. ["10", "01"].
 *
 * @param {string[]} rows
 */
function makeMask(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const mask = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) mask[y * width + x] = row[x] === "1" ? 1 : 0;
  });
  return { mask, width, height };
}

/** Sorts loop points for order-insensitive comparison. */
function sortedPoints(loop) {
  return [...loop].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

describe("traceMask", () => {
  it("returns no loops for an empty mask", () => {
    const { mask, width, height } = makeMask(["00", "00"]);

    expect(traceMask(mask, width, height)).toEqual([]);
  });

  it("traces a single pixel as a unit square", () => {
    const { mask, width, height } = makeMask(["10", "00"]);

    const loops = traceMask(mask, width, height);

    expect(loops).toHaveLength(1);
    expect(sortedPoints(loops[0])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
  });

  it("merges collinear edges: a 2x1 run is a 4-point rectangle", () => {
    const { mask, width, height } = makeMask(["11"]);

    const loops = traceMask(mask, width, height);

    expect(loops).toHaveLength(1);
    expect(sortedPoints(loops[0])).toEqual([
      [0, 0],
      [0, 1],
      [2, 0],
      [2, 1],
    ]);
  });

  it("traces an L-shape as a single 6-point loop", () => {
    const { mask, width, height } = makeMask(["10", "11"]);

    const loops = traceMask(mask, width, height);

    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(6);
  });

  it("keeps diagonally-touching pixels as two separate loops", () => {
    const { mask, width, height } = makeMask(["10", "01"]);

    const loops = traceMask(mask, width, height);

    expect(loops).toHaveLength(2);
    expect(loops[0]).toHaveLength(4);
    expect(loops[1]).toHaveLength(4);
  });

  it("traces a ring as an outer loop plus an inner hole loop", () => {
    const { mask, width, height } = makeMask(["111", "101", "111"]);

    const loops = traceMask(mask, width, height);

    expect(loops).toHaveLength(2);
    const byLength = [...loops].sort((a, b) => spanOf(a) - spanOf(b));
    // Inner hole is the unit square around the center pixel.
    expect(sortedPoints(byLength[0])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ]);
    // Outer boundary is the full 3x3 square.
    expect(sortedPoints(byLength[1])).toEqual([
      [0, 0],
      [0, 3],
      [3, 0],
      [3, 3],
    ]);
  });
});

/** Bounding-box span, used to order loops by size. */
function spanOf(loop) {
  const xs = loop.map((p) => p[0]);
  const ys = loop.map((p) => p[1]);
  return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
}

describe("simplifyLoop", () => {
  const staircase = [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [2, 2],
    [3, 2],
    [3, 3],
    [0, 3],
  ];

  it("returns the loop unchanged at tolerance 0", () => {
    expect(simplifyLoop(staircase, 0)).toEqual(staircase);
  });

  it("collapses a staircase into fewer points at tolerance >= 1", () => {
    const simplified = simplifyLoop(staircase, 1);

    expect(simplified.length).toBeLessThan(staircase.length);
    expect(simplified.length).toBeGreaterThanOrEqual(3);
  });

  it("never simplifies a loop below a triangle", () => {
    const triangle = [
      [0, 0],
      [4, 0],
      [0, 4],
    ];

    expect(simplifyLoop(triangle, 100)).toHaveLength(3);
  });
});
