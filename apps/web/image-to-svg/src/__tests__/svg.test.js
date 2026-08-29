import { describe, it, expect } from "vitest";

import { loopsToPathData, buildSvg, rgbToHex } from "../svg.js";

describe("rgbToHex", () => {
  it("formats channels as a lowercase hex color", () => {
    expect(rgbToHex([255, 0, 0])).toBe("#ff0000");
    expect(rgbToHex([0, 128, 255])).toBe("#0080ff");
    expect(rgbToHex([0, 0, 0])).toBe("#000000");
  });
});

describe("loopsToPathData", () => {
  it("renders a loop as an absolute closed path", () => {
    const d = loopsToPathData([
      [
        [0, 0],
        [2, 0],
        [2, 1],
        [0, 1],
      ],
    ]);

    expect(d).toBe("M0 0L2 0L2 1L0 1Z");
  });

  it("concatenates multiple loops into one path", () => {
    const d = loopsToPathData([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      [
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 3],
      ],
    ]);

    expect(d).toBe("M0 0L1 0L1 1L0 1ZM2 2L3 2L3 3L2 3Z");
  });

  it("trims fractional coordinates to at most 2 decimals", () => {
    const d = loopsToPathData([
      [
        [0, 0],
        [1.5, 0],
        [1.333333, 2.100001],
      ],
    ]);

    expect(d).toBe("M0 0L1.5 0L1.33 2.1Z");
  });
});

describe("buildSvg", () => {
  const layers = [
    { color: "#ff0000", d: "M0 0L2 0L2 2L0 2Z" },
    { color: "#0000ff", d: "M2 0L4 0L4 2L2 2Z" },
  ];

  it("produces a standalone svg document with a viewBox", () => {
    const svg = buildSvg({ width: 4, height: 2, layers });

    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 4 2"');
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("renders one evenodd path per layer with its fill color", () => {
    const svg = buildSvg({ width: 4, height: 2, layers });

    expect(svg.match(/<path /g)).toHaveLength(2);
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('fill="#0000ff"');
    expect(svg).toContain('fill-rule="evenodd"');
  });

  it("renders no paths when there are no layers", () => {
    const svg = buildSvg({ width: 4, height: 2, layers: [] });

    expect(svg).not.toContain("<path");
  });
});
