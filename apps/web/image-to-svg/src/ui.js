/**
 * DOM layer: drop zone, conversion controls, side-by-side previews, and
 * download/copy actions. All conversion logic stays in convert.js.
 */

/**
 * Mounts the app UI.
 *
 * @param {HTMLElement} root
 * @param {{onFile?: (file: File) => void, onOptionsChange?: (options: object) => void}} handlers
 * @returns {{getOptions: () => object, setResult: (result: object) => void,
 *   setOriginal: (url: string) => void, setBusy: (busy: boolean) => void,
 *   setError: (message: string) => void}}
 */
export function mount(root, { onFile, onOptionsChange } = {}) {
  root.innerHTML = `
    <header class="app-header">
      <h1>🖼️ Image to SVG</h1>
      <p>Convert raster images into scalable vector SVGs, right in the browser.</p>
    </header>
    <label class="drop-zone" data-role="drop-zone">
      <input type="file" accept="image/*" hidden />
      <span class="drop-zone-hint">Drop an image here, or click to pick one</span>
      <span class="drop-zone-sub">PNG, JPEG, GIF, WebP — nothing leaves your browser</span>
    </label>
    <section class="controls">
      <label class="control">
        <span>Colors <output data-role="colors-value">8</output></span>
        <input type="range" name="colors" min="2" max="32" step="1" value="8" />
      </label>
      <label class="control">
        <span>Smoothing <output data-role="smoothing-value">0.5</output></span>
        <input type="range" name="smoothing" min="0" max="3" step="0.5" value="0.5" />
      </label>
      <label class="control">
        <span>Detail</span>
        <select name="detail">
          <option value="96">Low (96px)</option>
          <option value="192" selected>Medium (192px)</option>
          <option value="384">High (384px)</option>
          <option value="768">Very high (768px)</option>
        </select>
      </label>
      <div class="actions">
        <button type="button" data-role="download" disabled>Download SVG</button>
        <button type="button" data-role="copy" disabled>Copy SVG</button>
      </div>
    </section>
    <p class="status" data-role="status" hidden></p>
    <section class="previews">
      <figure class="preview">
        <figcaption>Original</figcaption>
        <div class="preview-frame checker">
          <img data-role="original-preview" alt="Original image preview" hidden />
        </div>
      </figure>
      <figure class="preview">
        <figcaption>SVG</figcaption>
        <div class="preview-frame checker" data-role="svg-preview"></div>
      </figure>
    </section>
    <p class="stats" data-role="stats"></p>
  `;

  const query = (selector) => root.querySelector(selector);
  const fileInput = query('input[type="file"]');
  const dropZone = query('[data-role="drop-zone"]');
  const colorsInput = query('input[name="colors"]');
  const smoothingInput = query('input[name="smoothing"]');
  const detailSelect = query('select[name="detail"]');
  const downloadButton = query('[data-role="download"]');
  const copyButton = query('[data-role="copy"]');
  const status = query('[data-role="status"]');
  const stats = query('[data-role="stats"]');
  const originalPreview = query('[data-role="original-preview"]');
  const svgPreview = query('[data-role="svg-preview"]');

  let currentResult = null;

  const getOptions = () => ({
    maxColors: Number(colorsInput.value),
    smoothing: Number(smoothingInput.value),
    maxSize: Number(detailSelect.value),
  });

  const syncOutputs = () => {
    query('[data-role="colors-value"]').textContent = colorsInput.value;
    query('[data-role="smoothing-value"]').textContent = smoothingInput.value;
  };

  const optionsChanged = () => {
    syncOutputs();
    if (onOptionsChange) onOptionsChange(getOptions());
  };
  colorsInput.addEventListener("input", optionsChanged);
  smoothingInput.addEventListener("input", optionsChanged);
  detailSelect.addEventListener("change", optionsChanged);

  const pickFile = (file) => {
    if (file && onFile) onFile(file);
  };
  fileInput.addEventListener("change", () => pickFile(fileInput.files?.[0]));
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
    pickFile(event.dataTransfer?.files?.[0]);
  });

  downloadButton.addEventListener("click", () => {
    if (!currentResult) return;
    const blob = new Blob([currentResult.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "image.svg";
    link.click();
    URL.revokeObjectURL(url);
  });

  copyButton.addEventListener("click", async () => {
    if (!currentResult) return;
    try {
      await navigator.clipboard.writeText(currentResult.svg);
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy SVG";
      }, 1200);
    } catch {
      setError("Could not copy to clipboard.");
    }
  });

  const setStatus = (message, isError = false) => {
    status.hidden = !message;
    status.textContent = message ?? "";
    status.classList.toggle("error", isError);
  };

  const setResult = (result) => {
    currentResult = result;
    svgPreview.innerHTML = result.svg;
    downloadButton.disabled = false;
    copyButton.disabled = false;
    stats.textContent =
      `${result.width}×${result.height} px · ${result.colorCount} color` +
      `${result.colorCount === 1 ? "" : "s"} · ${formatBytes(result.bytes)}`;
    setStatus("");
  };

  const setOriginal = (url) => {
    originalPreview.src = url;
    originalPreview.hidden = false;
  };

  const setBusy = (busy) => {
    root.classList.toggle("busy", busy);
    if (busy) setStatus("Converting…");
    else if (!status.classList.contains("error")) setStatus("");
  };

  const setError = (message) => setStatus(message, true);

  syncOutputs();
  return { getOptions, setResult, setOriginal, setBusy, setError };
}

/** Human-readable byte count. */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
