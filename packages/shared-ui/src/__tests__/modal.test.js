// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Modal } from "../modal.js";

describe("Modal", () => {
  let modal;

  beforeEach(() => {
    document.body.innerHTML = "";
    modal = new Modal();
  });

  afterEach(() => {
    modal.destroy();
  });

  it("creates an overlay element in the DOM", () => {
    const overlay = document.querySelector(".arcade-modal-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute("role")).toBe("dialog");
    expect(overlay.getAttribute("aria-modal")).toBe("true");
  });

  it("starts hidden", () => {
    expect(modal.isOpen).toBe(false);
    const overlay = document.querySelector(".arcade-modal-overlay");
    expect(overlay.classList.contains("active")).toBe(false);
  });

  it("shows with title and message", () => {
    modal.show({ title: "You Win!", message: "Great job!" });

    expect(modal.isOpen).toBe(true);
    expect(document.querySelector(".arcade-modal__title").textContent).toBe("You Win!");
    expect(document.querySelector(".arcade-modal__message").textContent).toBe("Great job!");
  });

  it("renders action buttons", () => {
    let clicked = false;
    modal.show({
      title: "Test",
      buttons: [
        { label: "OK", variant: "primary", onClick: () => (clicked = true) },
        { label: "Cancel", variant: "secondary", onClick: () => {} },
      ],
    });

    const buttons = document.querySelectorAll(".arcade-modal__actions button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("OK");
    expect(buttons[0].classList.contains("arcade-btn--primary")).toBe(true);
    expect(buttons[1].textContent).toBe("Cancel");
    expect(buttons[1].classList.contains("arcade-btn--secondary")).toBe(true);

    buttons[0].click();
    expect(clicked).toBe(true);
  });

  it("auto-closes after button click by default", () => {
    modal.show({
      title: "Test",
      buttons: [{ label: "OK", onClick: () => {} }],
    });

    expect(modal.isOpen).toBe(true);
    document.querySelector(".arcade-modal__actions button").click();
    expect(modal.isOpen).toBe(false);
  });

  it("does not auto-close when autoClose is false", () => {
    modal.show({
      title: "Test",
      buttons: [{ label: "OK", onClick: () => {}, autoClose: false }],
    });

    document.querySelector(".arcade-modal__actions button").click();
    expect(modal.isOpen).toBe(true);
  });

  it("hides on backdrop click", () => {
    modal.show({ title: "Test" });
    expect(modal.isOpen).toBe(true);

    const overlay = document.querySelector(".arcade-modal-overlay");
    overlay.click();
    expect(modal.isOpen).toBe(false);
  });

  it("does not hide when clicking inside the modal box", () => {
    modal.show({ title: "Test" });
    const box = document.querySelector(".arcade-modal");
    box.click();
    expect(modal.isOpen).toBe(true);
  });

  it("hides on Escape key", () => {
    modal.show({ title: "Test" });
    expect(modal.isOpen).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(modal.isOpen).toBe(false);
  });

  it("hide() can be called when already hidden", () => {
    expect(modal.isOpen).toBe(false);
    modal.hide();
    expect(modal.isOpen).toBe(false);
  });

  it("destroy() removes the overlay from the DOM", () => {
    expect(document.querySelector(".arcade-modal-overlay")).not.toBeNull();
    modal.destroy();
    expect(document.querySelector(".arcade-modal-overlay")).toBeNull();
  });

  it("supports HTML in message", () => {
    modal.show({ title: "Test", message: "<strong>Bold</strong> text" });
    const msg = document.querySelector(".arcade-modal__message");
    expect(msg.innerHTML).toContain("<strong>Bold</strong>");
  });

  it("renders plain text without innerHTML when no HTML tags", () => {
    modal.show({ title: "Test", message: "Plain text" });
    const msg = document.querySelector(".arcade-modal__message");
    expect(msg.textContent).toBe("Plain text");
  });

  it("injects styles only once across multiple instances", () => {
    const modal2 = new Modal();
    const styleElements = document.querySelectorAll("style");
    const modalStyles = Array.from(styleElements).filter((s) =>
      s.textContent.includes("arcade-modal-overlay"),
    );
    expect(modalStyles).toHaveLength(1);
    modal2.destroy();
  });
});
