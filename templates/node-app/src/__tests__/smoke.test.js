import { describe, it, expect } from "vitest";

import { greeting } from "../index.js";

describe("__TITLE__", () => {
  it("has a greeting", () => {
    expect(greeting()).toContain("__TITLE__");
  });
});
