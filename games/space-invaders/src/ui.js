/**
 * Space Invaders UI controller.
 * Handles canvas rendering, input, and game loop.
 */
import {
  INVADER_SPRITES,
  PLAYER_SPRITE,
  COLORS,
  LASER_COOLDOWN_TIME,
  LASER_DURATION,
  createGameState,
  createLevelState,
  update,
} from "./engine.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlaySub = document.getElementById("overlay-sub");
const overlayBtn = document.getElementById("overlay-btn");

const W = 640,
  H = 700;
canvas.width = W;
canvas.height = H;

const keys = {};
let state = null;

// ---- Input ----

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));

// ---- Overlay ----

function showOverlay(title, sub, btn) {
  overlayTitle.textContent = title;
  overlaySub.textContent = sub;
  overlayBtn.textContent = btn;
  overlay.style.display = "block";
}

window.startGame = function () {
  overlay.style.display = "none";
  state = createGameState(W, H);
};

// Show start screen
showOverlay("SPACE INVADERS", "Arrow keys to move, Space to shoot, B for laser beam", "PLAY");

// ---- Drawing ----

function drawSprite(sprite, x, y, scale, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      if (sprite[r][c]) {
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = "#333";
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137 + i * i * 31) % W;
    const sy = (i * 199 + i * i * 17) % H;
    ctx.fillRect(sx, sy, 1, 1);
  }

  if (!state || state.gameStatus !== "playing") {
    if (state) drawHUD();
    return;
  }

  // Shields
  ctx.fillStyle = "#0f0";
  for (const shield of state.shields) {
    for (const s of shield) {
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
  }

  // Invaders
  for (const inv of state.invaders) {
    if (!inv.alive) continue;
    const color = COLORS[inv.type];
    const sprite = INVADER_SPRITES[inv.type];
    drawSprite(sprite, inv.x, inv.y, 3.5, color);
  }

  // UFO
  if (state.ufo) {
    const ufoColor = `hsl(${(state.frameCount * 5) % 360}, 100%, 60%)`;
    ctx.fillStyle = ufoColor;
    ctx.beginPath();
    ctx.ellipse(state.ufo.x + 15, state.ufo.y + 5, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(state.ufo.x + 15, state.ufo.y, 8, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = `${ufoColor}44`;
    ctx.beginPath();
    ctx.ellipse(state.ufo.x + 15, state.ufo.y + 5, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player
  drawSprite(PLAYER_SPRITE, state.player.x, state.player.y, 4, "#0f0");

  // Bullets
  ctx.fillStyle = "#fff";
  for (const b of state.bullets) ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = "#ff4444";
  for (const b of state.enemyBullets) {
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "#ff8844";
    ctx.fillRect(b.x - 1, b.y + b.h, b.w + 2, 2);
    ctx.fillStyle = "#ff4444";
  }

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = p.life / 40;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Laser beam
  const beamX = state.player.x + state.player.w / 2;
  if (state.laserActive > 0) {
    const intensity = state.laserActive / LASER_DURATION;
    ctx.save();
    ctx.globalAlpha = intensity * 0.3;
    ctx.fillStyle = "#0ff";
    ctx.fillRect(beamX - state.laserWidth * 1.5, 0, state.laserWidth * 3, state.player.y);
    ctx.globalAlpha = intensity * 0.8;
    ctx.fillStyle = "#fff";
    ctx.fillRect(beamX - state.laserWidth / 2, 0, state.laserWidth, state.player.y);
    ctx.globalAlpha = intensity;
    ctx.fillStyle = "#aff";
    ctx.fillRect(beamX - state.laserWidth / 4, 0, state.laserWidth / 2, state.player.y);
    ctx.restore();
  } else if (state.laserCharge > 0) {
    const chargePct = state.laserCharge / 20;
    ctx.save();
    ctx.globalAlpha = 0.4 + chargePct * 0.6;
    ctx.fillStyle = "#0ff";
    ctx.beginPath();
    ctx.arc(beamX, state.player.y - 2, 4 + chargePct * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Laser cooldown bar
  if (state.laserCooldown > 0) {
    const pct = state.laserCooldown / LASER_COOLDOWN_TIME;
    ctx.fillStyle = "#333";
    ctx.fillRect(W - 110, H - 12, 100, 6);
    ctx.fillStyle = "#066";
    ctx.fillRect(W - 110, H - 12, 100 * (1 - pct), 6);
    ctx.fillStyle = "#088";
    ctx.font = '10px "Courier New"';
    ctx.textAlign = "right";
    ctx.fillText("LASER", W - 114, H - 6);
  } else if (state.laserActive <= 0) {
    ctx.fillStyle = "#0ff";
    ctx.font = '10px "Courier New"';
    ctx.textAlign = "right";
    ctx.fillText("[B] LASER READY", W - 10, H - 6);
  }

  // Ground line
  ctx.fillStyle = "#0f0";
  ctx.fillRect(0, H - 16, W, 1);

  drawHUD();
}

function drawHUD() {
  if (!state) return;
  ctx.fillStyle = "#0f0";
  ctx.font = '18px "Courier New"';
  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${state.score}`, 16, 26);
  ctx.textAlign = "center";
  ctx.fillText(`LEVEL ${state.level}`, W / 2, 26);
  ctx.textAlign = "right";

  ctx.fillText("LIVES:", W - 100, 26);
  for (let i = 0; i < state.lives; i++) {
    drawSprite(PLAYER_SPRITE, W - 80 + i * 25, 14, 2, "#0f0");
  }
}

// ---- Game loop ----

function loop() {
  if (state) {
    const events = update(state, keys, W, H);
    for (const ev of events) {
      if (ev === "game_over") {
        showOverlay("GAME OVER", `Final Score: ${state.score}`, "RETRY");
      } else if (ev === "level_clear") {
        state.level++;
        const levelState = createLevelState(state.level, W, H);
        Object.assign(state, levelState);
      }
    }
  }
  draw();
  requestAnimationFrame(loop);
}

loop();
