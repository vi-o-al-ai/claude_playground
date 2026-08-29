/**
 * Image to SVG entry point: wires the UI to the conversion pipeline.
 * Pure logic lives in quantize.js / trace.js / svg.js / convert.js.
 */

import "./style.css";
import { mount } from "./ui.js";
import { fileToImageData } from "./loader.js";
import { convertImageToSvg } from "./convert.js";

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function start() {
  const root = document.querySelector("#app");
  if (!root) return;

  let currentFile = null;
  let originalUrl = null;
  let runId = 0;

  const convert = async () => {
    if (!currentFile) return;
    const id = ++runId;
    ui.setBusy(true);
    try {
      const options = ui.getOptions();
      const image = await fileToImageData(currentFile, options.maxSize);
      if (id !== runId) return; // a newer conversion superseded this one
      const result = convertImageToSvg(image, options);
      if (id !== runId) return;
      ui.setResult(result);
    } catch (err) {
      console.error("Conversion failed:", err);
      ui.setError(`Could not convert that file: ${err.message}`);
    } finally {
      if (id === runId) ui.setBusy(false);
    }
  };

  const ui = mount(root, {
    onFile: (file) => {
      currentFile = file;
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      originalUrl = URL.createObjectURL(file);
      ui.setOriginal(originalUrl);
      convert();
    },
    onOptionsChange: debounce(convert, 200),
  });
}

if (typeof document !== "undefined") start();
