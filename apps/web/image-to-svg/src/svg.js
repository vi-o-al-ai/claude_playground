/**
 * SVG document generation from traced loops.
 */

/**
 * Formats an rgb triple as a lowercase hex color.
 *
 * @param {[number, number, number]} rgb
 * @returns {string}
 */
export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

/** Formats a coordinate with at most 2 decimals and no trailing zeros. */
function fmt(n) {
  return String(Math.round(n * 100) / 100);
}

/**
 * Renders loops as a single path-data string (`M … Z` per loop). Holes are
 * expressed by loop orientation together with fill-rule="evenodd".
 *
 * @param {Array<Array<[number, number]>>} loops
 * @returns {string}
 */
export function loopsToPathData(loops) {
  return loops
    .map(
      (loop) => loop.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`).join("") + "Z",
    )
    .join("");
}

/**
 * Builds a standalone SVG document.
 *
 * @param {{width: number, height: number, layers: Array<{color: string, d: string}>}} spec
 * @returns {string}
 */
export function buildSvg({ width, height, layers }) {
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
  const paths = layers.map(
    (layer) => `  <path fill="${layer.color}" fill-rule="evenodd" d="${layer.d}"/>`,
  );
  return [open, ...paths, "</svg>"].join("\n") + "\n";
}
