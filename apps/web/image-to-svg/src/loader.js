/**
 * Browser-only image decoding: turns a File into ImageData, downscaled so
 * the longest side is at most `maxDim` (tracing cost grows with pixel count).
 */

/**
 * @param {File|Blob} file
 * @param {number} [maxDim]
 * @returns {Promise<ImageData>}
 */
export async function fileToImageData(file, maxDim = 192) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    bitmap.close();
  }
}
