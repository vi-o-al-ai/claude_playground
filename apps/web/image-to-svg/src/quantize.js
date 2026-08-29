/**
 * Median-cut color quantization over an ImageData-like object.
 *
 * Pixels with alpha < 128 are treated as transparent: they get index -1 and
 * never contribute to the palette, so PNG cutouts vectorize cleanly.
 */

const CHANNELS = ["r", "g", "b"];

/**
 * Quantizes an image to at most `maxColors` colors.
 *
 * @param {{width: number, height: number, data: Uint8ClampedArray}} image
 * @param {number} maxColors
 * @returns {{palette: Array<[number, number, number]>, indexes: Int32Array}}
 *   `palette[indexes[i]]` is the quantized color of pixel i; -1 means
 *   transparent.
 */
export function quantize(image, maxColors) {
  const { width, height, data } = image;
  const n = width * height;
  const indexes = new Int32Array(n).fill(-1);

  // Histogram of opaque colors, keyed by packed 24-bit rgb.
  const counts = new Map();
  const keys = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const key = (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
    keys[i] = key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return { palette: [], indexes };

  const colors = [...counts.entries()].map(([key, count]) => ({
    key,
    count,
    r: (key >> 16) & 255,
    g: (key >> 8) & 255,
    b: key & 255,
  }));

  const colorToIndex = new Map();
  let palette;
  if (colors.length <= maxColors) {
    palette = colors.map((c) => [c.r, c.g, c.b]);
    colors.forEach((c, i) => colorToIndex.set(c.key, i));
  } else {
    const boxes = medianCut(colors, maxColors);
    palette = boxes.map(averageColor);
    boxes.forEach((box, i) => {
      for (const c of box) colorToIndex.set(c.key, i);
    });
  }

  for (let i = 0; i < n; i++) {
    if (keys[i] !== -1) indexes[i] = colorToIndex.get(keys[i]);
  }
  return { palette, indexes };
}

/** Splits the color set into `maxColors` boxes along the widest channel. */
function medianCut(colors, maxColors) {
  const boxes = [colors];
  while (boxes.length < maxColors) {
    let boxIndex = -1;
    let bestRange = 0;
    let bestChannel = "r";
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (const ch of CHANNELS) {
        let min = 255;
        let max = 0;
        for (const c of box) {
          if (c[ch] < min) min = c[ch];
          if (c[ch] > max) max = c[ch];
        }
        if (max - min > bestRange) {
          bestRange = max - min;
          boxIndex = i;
          bestChannel = ch;
        }
      }
    });
    if (boxIndex === -1) break;
    const box = boxes[boxIndex];
    box.sort((a, b) => a[bestChannel] - b[bestChannel]);
    const mid = Math.floor(box.length / 2);
    boxes.splice(boxIndex, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes;
}

/** Pixel-count-weighted average color of a box. */
function averageColor(box) {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (const c of box) {
    r += c.r * c.count;
    g += c.g * c.count;
    b += c.b * c.count;
    total += c.count;
  }
  return [Math.round(r / total), Math.round(g / total), Math.round(b / total)];
}
