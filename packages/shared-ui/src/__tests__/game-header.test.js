// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { GameHeader } from "../game-header.js";

describe("GameHeader", () => {
  let header;

  beforeEach(() => {
    document.body.innerHTML = "";
    // Reset style injection between tests
  });

  it("creates a header element with correct class", () => {
    header = new GameHeader({ title: "Sudoku" });
    expect(header.el.tagName).toBe("HEADER");
    expect(header.el.classList.contains("arcade-game-header")).toBe(true);
  });

  it("displays the game title", () => {
    header = new GameHeader({ title: "Tic-Tac-Toe" });
    const title = header.el.querySelector(".arcade-game-header__title");
    expect(title.textContent).toBe("Tic-Tac-Toe");
  });

  it("renders a back link to the arcade", () => {
    header = new GameHeader({ title: "Test" });
    const back = header.el.querySelector(".arcade-game-header__back");
    expect(back.tagName).toBe("A");
    expect(back.getAttribute("href")).toBe("../arcade-hub/index.html");
    expect(back.textContent).toContain("Arcade");
  });

  it("allows custom arcade URL", () => {
    header = new GameHeader({ title: "Test", arcadeUrl: "/home" });
    const back = header.el.querySelector(".arcade-game-header__back");
    expect(back.getAttribute("href")).toBe("/home");
  });

  it("renders toggle settings", () => {
    let toggled = false;
    header = new GameHeader({
      title: "Test",
      settings: [{ label: "Dark Mode", type: "toggle", onChange: (v) => (toggled = v) }],
    });

    const label = header.el.querySelector(".arcade-game-header__toggle");
    expect(label).not.toBeNull();
    expect(label.textContent).toContain("Dark Mode");

    const checkbox = label.querySelector("input[type=checkbox]");
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    expect(toggled).toBe(true);
  });

  it("respects initial checked state on toggle", () => {
    header = new GameHeader({
      title: "Test",
      settings: [{ label: "Sound", type: "toggle", checked: true, onChange: () => {} }],
    });

    const checkbox = header.el.querySelector("input[type=checkbox]");
    expect(checkbox.checked).toBe(true);
  });

  it("renders multiple settings", () => {
    header = new GameHeader({
      title: "Test",
      settings: [
        { label: "Dark Mode", type: "toggle", onChange: () => {} },
        { label: "Sound", type: "toggle", onChange: () => {} },
      ],
    });

    const toggles = header.el.querySelectorAll(".arcade-game-header__toggle");
    expect(toggles).toHaveLength(2);
  });

  it("mounts into a container when provided", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    header = new GameHeader({ title: "Test", container });
    expect(container.firstChild).toBe(header.el);
  });

  it("setTitle() updates the heading text", () => {
    header = new GameHeader({ title: "Before" });
    expect(header.el.querySelector(".arcade-game-header__title").textContent).toBe("Before");

    header.setTitle("After");
    expect(header.el.querySelector(".arcade-game-header__title").textContent).toBe("After");
  });
});
