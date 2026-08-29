import { describe, it, expect } from "vitest";

import { quantize } from "../quantize.js";

/**
 * Builds an ImageData-like object from an array of [r, g, b, a] pixels
 * (row-major).
 *
 * @param {number} width
 * @param {number} height
 * @param {Array<[number, number, number, number]>} pixels
 */
function makeImage(width, height, pixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  });
  return { width, height, data };
}

const RED = [255, 0, 0, 255];
const BLUE = [0, 0, 255, 255];
const CLEAR = [0, 0, 0, 0];

describe("quantize", () => {
  it("maps a solid image to a single exact palette color", () => {
    const image = makeImage(2, 2, [RED, RED, RED, RED]);

    const { palette, indexes } = quantize(image, 8);

    expect(palette).toEqual([[255, 0, 0]]);
    expect(Array.from(indexes)).toEqual([0, 0, 0, 0]);
  });

  it("keeps exact colors when the image has fewer colors than the budget", () => {
    const image = makeImage(2, 2, [RED, BLUE, RED, BLUE]);

    const { palette, indexes } = quantize(image, 8);

    expect(palette).toHaveLength(2);
    expect(palette).toContainEqual([255, 0, 0]);
    expect(palette).toContainEqual([0, 0, 255]);
    // Same input color always maps to the same palette index.
    expect(indexes[0]).toBe(indexes[2]);
    expect(indexes[1]).toBe(indexes[3]);
    expect(indexes[0]).not.toBe(indexes[1]);
  });

  it("reduces a many-color image down to at most maxColors", () => {
    const pixels = [];
    for (let i = 0; i < 16; i++) pixels.push([i * 16, 255 - i * 16, i * 8, 255]);
    const image = makeImage(4, 4, pixels);

    const { palette, indexes } = quantize(image, 4);

    expect(palette.length).toBeLessThanOrEqual(4);
    expect(palette.length).toBeGreaterThan(0);
    for (const idx of indexes) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(palette.length);
    }
  });

  it("marks transparent pixels with index -1 and excludes them from the palette", () => {
    const image = makeImage(2, 2, [RED, CLEAR, CLEAR, RED]);

    const { palette, indexes } = quantize(image, 8);

    expect(palette).toEqual([[255, 0, 0]]);
    expect(Array.from(indexes)).toEqual([0, -1, -1, 0]);
  });

  it("returns an empty palette for a fully transparent image", () => {
    const image = makeImage(2, 1, [CLEAR, CLEAR]);

    const { palette, indexes } = quantize(image, 8);

    expect(palette).toEqual([]);
    expect(Array.from(indexes)).toEqual([-1, -1]);
  });
});
