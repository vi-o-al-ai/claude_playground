/**
 * End-to-end conversion pipeline: quantize → trace per color → build SVG.
 */

import { quantize } from "./quantize.js";
import { traceMask, simplifyLoop } from "./trace.js";
import { loopsToPathData, buildSvg, rgbToHex } from "./svg.js";

/**
 * Converts an ImageData-like object into an SVG document.
 *
 * @param {{width: number, height: number, data: Uint8ClampedArray}} image
 * @param {{maxColors?: number, smoothing?: number}} [options]
 *   `smoothing` is the simplification tolerance in pixels; 0 keeps crisp
 *   pixel-exact edges.
 * @returns {{svg: string, width: number, height: number, colorCount: number,
 *   bytes: number, palette: string[]}}
 */
export function convertImageToSvg(image, { maxColors = 16, smoothing = 0 } = {}) {
  const { width, height } = image;
  const { palette, indexes } = quantize(image, maxColors);

  const coverage = new Array(palette.length).fill(0);
  for (const idx of indexes) {
    if (idx >= 0) coverage[idx]++;
  }
  const order = palette.map((_, i) => i).sort((a, b) => coverage[b] - coverage[a]);

  const layers = [];
  const mask = new Uint8Array(width * height);
  for (const paletteIndex of order) {
    if (coverage[paletteIndex] === 0) continue;
    for (let i = 0; i < mask.length; i++) mask[i] = indexes[i] === paletteIndex ? 1 : 0;
    let loops = traceMask(mask, width, height);
    if (smoothing > 0) loops = loops.map((loop) => simplifyLoop(loop, smoothing));
    const d = loopsToPathData(loops);
    if (d) layers.push({ color: rgbToHex(palette[paletteIndex]), d });
  }

  const svg = buildSvg({ width, height, layers });
  return {
    svg,
    width,
    height,
    colorCount: layers.length,
    bytes: svg.length,
    palette: layers.map((layer) => layer.color),
  };
}
