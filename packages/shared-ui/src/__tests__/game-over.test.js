// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GameOver } from "../game-over.js";

describe("GameOver", () => {
  let gameOver;

  beforeEach(() => {
    document.body.innerHTML = "";
    gameOver = new GameOver();
  });

  afterEach(() => {
    gameOver.destroy();
  });

  it("creates an overlay element in the DOM", () => {
    const overlay = document.querySelector(".arcade-gameover-overlay");
    expect(overlay).not.toBeNull();
  });

  it("starts hidden", () => {
    expect(gameOver.isOpen).toBe(false);
  });

  it("shows with a title", () => {
    gameOver.show({ title: "You Win!" });
    expect(gameOver.isOpen).toBe(true);
    expect(document.querySelector(".arcade-gameover__title").textContent).toBe("You Win!");
  });

  it("displays stat items", () => {
    gameOver.show({
      title: "Game Over",
      stats: [
        { label: "Time", value: "3:42" },
        { label: "Moves", value: "28" },
        { label: "Score", value: "1500" },
      ],
    });

    const stats = document.querySelectorAll(".arcade-gameover__stat");
    expect(stats).toHaveLength(3);

    expect(stats[0].querySelector(".arcade-gameover__stat-value").textContent).toBe("3:42");
    expect(stats[0].querySelector(".arcade-gameover__stat-label").textContent).toBe("Time");

    expect(stats[1].querySelector(".arcade-gameover__stat-value").textContent).toBe("28");
    expect(stats[1].querySelector(".arcade-gameover__stat-label").textContent).toBe("Moves");

    expect(stats[2].querySelector(".arcade-gameover__stat-value").textContent).toBe("1500");
    expect(stats[2].querySelector(".arcade-gameover__stat-label").textContent).toBe("Score");
  });

  it("renders a restart button that calls onRestart", () => {
    let restarted = false;
    gameOver.show({
      title: "Game Over",
      onRestart: () => (restarted = true),
      restartLabel: "Try Again",
    });

    const btn = document.querySelector(".arcade-gameover__actions .arcade-btn--primary");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Try Again");

    btn.click();
    expect(restarted).toBe(true);
    expect(gameOver.isOpen).toBe(false);
  });

  it("uses default restart label when not specified", () => {
    gameOver.show({ title: "Done", onRestart: () => {} });
    const btn = document.querySelector(".arcade-gameover__actions .arcade-btn--primary");
    expect(btn.textContent).toBe("Play Again");
  });

  it("renders extra buttons", () => {
    let menuClicked = false;
    gameOver.show({
      title: "Win",
      extraButtons: [
        { label: "Main Menu", variant: "secondary", onClick: () => (menuClicked = true) },
      ],
    });

    const btns = document.querySelectorAll(".arcade-gameover__actions button");
    expect(btns).toHaveLength(1);
    expect(btns[0].textContent).toBe("Main Menu");
    expect(btns[0].classList.contains("arcade-btn--secondary")).toBe(true);

    btns[0].click();
    expect(menuClicked).toBe(true);
  });

  it("hides the overlay on restart click", () => {
    gameOver.show({ title: "Over", onRestart: () => {} });
    expect(gameOver.isOpen).toBe(true);

    document.querySelector(".arcade-btn--primary").click();
    expect(gameOver.isOpen).toBe(false);
  });

  it("hide() works when already hidden", () => {
    expect(gameOver.isOpen).toBe(false);
    gameOver.hide();
    expect(gameOver.isOpen).toBe(false);
  });

  it("destroy() removes the overlay from the DOM", () => {
    expect(document.querySelector(".arcade-gameover-overlay")).not.toBeNull();
    gameOver.destroy();
    expect(document.querySelector(".arcade-gameover-overlay")).toBeNull();
  });

  it("clears previous stats when shown again", () => {
    gameOver.show({
      title: "Round 1",
      stats: [
        { label: "Score", value: "100" },
        { label: "Time", value: "1:00" },
      ],
    });
    expect(document.querySelectorAll(".arcade-gameover__stat")).toHaveLength(2);

    gameOver.show({
      title: "Round 2",
      stats: [{ label: "Score", value: "200" }],
    });
    expect(document.querySelectorAll(".arcade-gameover__stat")).toHaveLength(1);
    expect(document.querySelector(".arcade-gameover__stat-value").textContent).toBe("200");
  });

  it("shows without stats or restart button", () => {
    gameOver.show({ title: "Paused" });
    expect(gameOver.isOpen).toBe(true);
    expect(document.querySelectorAll(".arcade-gameover__stat")).toHaveLength(0);
    expect(document.querySelectorAll(".arcade-gameover__actions button")).toHaveLength(0);
  });
});
