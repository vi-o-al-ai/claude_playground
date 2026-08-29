import { describe, it, expect } from "vitest";

import { convertImageToSvg } from "../convert.js";

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

describe("convertImageToSvg", () => {
  it("converts a two-color image into an svg with one path per color", () => {
    const image = makeImage(2, 2, [RED, BLUE, RED, BLUE]);

    const result = convertImageToSvg(image, { maxColors: 8, smoothing: 0 });

    expect(result.svg).toContain('viewBox="0 0 2 2"');
    expect(result.svg).toContain('fill="#ff0000"');
    expect(result.svg).toContain('fill="#0000ff"');
    expect(result.svg.match(/<path /g)).toHaveLength(2);
    expect(result.colorCount).toBe(2);
    expect(result.bytes).toBe(result.svg.length);
  });

  it("produces an empty svg for a fully transparent image", () => {
    const image = makeImage(2, 2, [CLEAR, CLEAR, CLEAR, CLEAR]);

    const result = convertImageToSvg(image, { maxColors: 8, smoothing: 0 });

    expect(result.svg).not.toContain("<path");
    expect(result.colorCount).toBe(0);
  });

  it("respects the maxColors budget", () => {
    const pixels = [];
    for (let i = 0; i < 16; i++) pixels.push([i * 16, 0, 255 - i * 16, 255]);
    const image = makeImage(4, 4, pixels);

    const result = convertImageToSvg(image, { maxColors: 2, smoothing: 0 });

    expect(result.colorCount).toBeLessThanOrEqual(2);
    expect(result.svg.match(/<path /g).length).toBeLessThanOrEqual(2);
  });

  it("smoothing shortens the path for a staircase edge", () => {
    // A diagonal split: red above the diagonal, transparent below.
    const size = 8;
    const pixels = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) pixels.push(x >= y ? RED : CLEAR);
    }
    const image = makeImage(size, size, pixels);

    const crisp = convertImageToSvg(image, { maxColors: 4, smoothing: 0 });
    const smooth = convertImageToSvg(image, { maxColors: 4, smoothing: 1 });

    expect(smooth.svg.length).toBeLessThan(crisp.svg.length);
  });

  it("orders layers by coverage so the dominant color paints first", () => {
    // 3 blue pixels, 1 red pixel.
    const image = makeImage(2, 2, [BLUE, BLUE, BLUE, RED]);

    const result = convertImageToSvg(image, { maxColors: 8, smoothing: 0 });

    expect(result.svg.indexOf("#0000ff")).toBeLessThan(result.svg.indexOf("#ff0000"));
  });
});
