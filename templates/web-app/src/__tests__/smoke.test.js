// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { greeting, mount } from "../main.js";

describe("__TITLE__", () => {
  it("has a greeting", () => {
    expect(greeting()).toContain("__TITLE__");
  });

  it("renders into a container", () => {
    const root = document.createElement("div");

    mount(root);

    expect(root.textContent).toBe(greeting());
  });
});
