// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { mount } from "../ui.js";

describe("ui mount", () => {
  it("renders the drop zone, controls, and disabled actions", () => {
    const root = document.createElement("div");

    mount(root, {});

    expect(root.querySelector('input[type="file"]')).toBeTruthy();
    expect(root.querySelector('[data-role="drop-zone"]')).toBeTruthy();
    expect(root.querySelector('input[name="colors"]')).toBeTruthy();
    expect(root.querySelector('input[name="smoothing"]')).toBeTruthy();
    expect(root.querySelector('[data-role="download"]').disabled).toBe(true);
    expect(root.querySelector('[data-role="copy"]').disabled).toBe(true);
  });

  it("exposes the current option values", () => {
    const root = document.createElement("div");

    const ui = mount(root, {});
    root.querySelector('input[name="colors"]').value = "6";
    root.querySelector('input[name="smoothing"]').value = "2";

    expect(ui.getOptions()).toMatchObject({ maxColors: 6, smoothing: 2 });
  });

  it("enables actions and shows the preview when a result arrives", () => {
    const root = document.createElement("div");

    const ui = mount(root, {});
    ui.setResult({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"></svg>',
      colorCount: 3,
      bytes: 64,
      width: 2,
      height: 2,
    });

    expect(root.querySelector('[data-role="download"]').disabled).toBe(false);
    expect(root.querySelector('[data-role="copy"]').disabled).toBe(false);
    expect(root.querySelector('[data-role="svg-preview"]').innerHTML).toContain("<svg");
    expect(root.querySelector('[data-role="stats"]').textContent).toContain("3");
  });

  it("notifies when a file is picked", () => {
    const root = document.createElement("div");
    const onFile = vi.fn();

    mount(root, { onFile });
    const input = root.querySelector('input[type="file"]');
    const file = new File(["x"], "pic.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change"));

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("notifies when an option changes", () => {
    const root = document.createElement("div");
    const onOptionsChange = vi.fn();

    mount(root, { onOptionsChange });
    const colors = root.querySelector('input[name="colors"]');
    colors.value = "12";
    colors.dispatchEvent(new Event("input"));

    expect(onOptionsChange).toHaveBeenCalled();
  });
});
