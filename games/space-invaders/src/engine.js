/**
 * Space Invaders game engine.
 * Pure logic — no DOM, no Canvas, no side effects. Fully testable.
 */

// Pixel art sprites (1 = filled)
export const INVADER_SPRITES = [
  // Type 0 - squid
  [
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [1, 0, 1, 0, 0, 1, 0, 1],
  ],
  // Type 1 - crab
  [
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 0, 0, 0],
  ],
  // Type 2 - octopus
  [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 0],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 1],
  ],
];

export const PLAYER_SPRITE = [
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const SHIELD_SPRITE = [
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
];

export const COLORS = ["#ff4444", "#ff8844", "#ffff44", "#44ff44", "#44ffff"];

export const LASER_COOLDOWN_TIME = 300;
export const LASER_DURATION = 30;

/**
 * Build the pixel-block list for a shield at position (sx, sy).
 */
export function createShieldPixels(sx, sy) {
  const pixels = [];
  const scale = 4;
  for (let r = 0; r < SHIELD_SPRITE.length; r++) {
    for (let c = 0; c < SHIELD_SPRITE[r].length; c++) {
      if (SHIELD_SPRITE[r][c]) {
        pixels.push({ x: sx + c * scale, y: sy + r * scale, w: scale, h: scale });
      }
    }
  }
  return pixels;
}

/**
 * Create initial game state for a new game.
 * @param {number} W - canvas width
 * @param {number} H - canvas height
 */
export function createGameState(W, H) {
  return {
    player: { x: W / 2 - 18, y: H - 50, w: 36, h: 28 },
    score: 0,
    lives: 3,
    level: 1,
    gameStatus: "playing", // 'playing' | 'over'
    ...createLevelState(1, W, H),
  };
}

/**
 * Create per-level state (invaders, bullets, shields, etc.).
 */
export function createLevelState(level, W, H) {
  const invaders = [];
  const rows = 5;
  const cols = 11;
  const spacing = 44;
  const startX = (W - cols * spacing) / 2 + 10;
  const startY = 80;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = r < 1 ? 0 : r < 3 ? 1 : 2;
      const points = r < 1 ? 30 : r < 3 ? 20 : 10;
      invaders.push({
        x: startX + c * spacing,
        y: startY + r * 36,
        type,
        alive: true,
        points,
        frame: 0,
      });
    }
  }

  const shields = [];
  if (level === 1) {
    for (let i = 0; i < 4; i++) {
      const sx = 80 + i * 145;
      shields.push(createShieldPixels(sx, H - 150));
    }
  }

  return {
    invaders,
    bullets: [],
    enemyBullets: [],
    shields,
    particles: [],
    invaderDir: 1,
    invaderSpeed: 0.3 + level * 0.1,
    dropDown: 0,
    shootCooldown: 0,
    enemyShootTimer: 0,
    ufo: null,
    ufoTimer: 600 + Math.random() * 600,
    frameCount: 0,
    laserCharge: 0,
    laserActive: 0,
    laserCooldown: 0,
    laserWidth: 0,
  };
}

/**
 * Create a particle burst at (x, y) with given color and count.
 */
export function createParticles(x, y, color, count) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 20 + Math.random() * 20,
      color,
      size: 1 + Math.random() * 2,
    });
  }
  return particles;
}

/**
 * Run one game tick. Mutates state. Returns an events array describing
 * what happened (e.g. level cleared, game over).
 *
 * @param {object} state - full game state (from createGameState)
 * @param {object} keys  - keys currently held: { ArrowLeft, ArrowRight, ' ', b, ... }
 * @param {number} W     - canvas width
 * @param {number} H     - canvas height
 * @returns {string[]}   - array of event strings: 'level_clear' | 'game_over'
 */
export function update(state, keys, W, H) {
  if (state.gameStatus !== "playing") return [];

  const events = [];
  state.frameCount++;

  // Player movement
  const speed = 5;
  if (keys["ArrowLeft"] || keys["a"])
    state.player.x = Math.max(10, state.player.x - speed);
  if (keys["ArrowRight"] || keys["d"])
    state.player.x = Math.min(W - state.player.w - 10, state.player.x + speed);

  // Player shooting
  if (state.shootCooldown > 0) state.shootCooldown--;
  if ((keys[" "] || keys["ArrowUp"]) && state.shootCooldown <= 0) {
    state.bullets.push({
      x: state.player.x + state.player.w / 2 - 2,
      y: state.player.y - 4,
      w: 4,
      h: 10,
    });
    state.shootCooldown = 15;
  }

  // Bullet movement
  state.bullets = state.bullets.filter((b) => {
    b.y -= 8;
    return b.y > -10;
  });

  state.enemyBullets = state.enemyBullets.filter((b) => {
    b.y += 4;
    return b.y < H + 10;
  });

  // Invader movement
  const aliveInvaders = state.invaders.filter((i) => i.alive);

  if (state.dropDown > 0) {
    for (const inv of aliveInvaders) inv.y += 1;
    state.dropDown--;
    if (state.dropDown === 0) state.invaderDir *= -1;
  } else {
    for (const inv of aliveInvaders) inv.x += state.invaderDir * state.invaderSpeed;
    let hitEdge = false;
    for (const inv of aliveInvaders) {
      if (inv.x < 10 || inv.x > W - 40) {
        hitEdge = true;
        break;
      }
    }
    if (hitEdge) state.dropDown = 16;
  }

  // Speed up as invaders die
  state.invaderSpeed = (0.3 + state.level * 0.1) * (1 + (55 - aliveInvaders.length) * 0.04);

  // Animate invaders
  if (state.frameCount % 30 === 0) {
    for (const inv of state.invaders) inv.frame = 1 - inv.frame;
  }

  // Enemy shooting
  state.enemyShootTimer--;
  if (state.enemyShootTimer <= 0 && aliveInvaders.length > 0) {
    const columns = {};
    for (const inv of aliveInvaders) {
      const col = Math.round(inv.x / 44);
      if (!columns[col] || inv.y > columns[col].y) columns[col] = inv;
    }
    const shooters = Object.values(columns);
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    state.enemyBullets.push({ x: shooter.x + 14, y: shooter.y + 28, w: 3, h: 10 });
    state.enemyShootTimer = Math.max(20, 60 - state.level * 5);
  }

  // UFO
  state.ufoTimer--;
  if (state.ufoTimer <= 0 && !state.ufo) {
    state.ufo = { x: -40, y: 35, dir: 1 };
    if (Math.random() > 0.5) {
      state.ufo.x = W + 40;
      state.ufo.dir = -1;
    }
    state.ufoTimer = 800 + Math.random() * 800;
  }
  if (state.ufo) {
    state.ufo.x += state.ufo.dir * 2;
    if (state.ufo.x < -60 || state.ufo.x > W + 60) state.ufo = null;
  }

  // Bullet vs invader/UFO/shield collisions
  for (const b of state.bullets) {
    for (const inv of state.invaders) {
      if (!inv.alive) continue;
      if (b.x < inv.x + 28 && b.x + b.w > inv.x && b.y < inv.y + 28 && b.y + b.h > inv.y) {
        inv.alive = false;
        b.y = -100;
        state.score += inv.points;
        state.particles.push(...createParticles(inv.x + 14, inv.y + 14, COLORS[inv.type], 12));
      }
    }
    if (
      state.ufo &&
      b.x < state.ufo.x + 30 &&
      b.x + b.w > state.ufo.x &&
      b.y < state.ufo.y + 14 &&
      b.y + b.h > state.ufo.y
    ) {
      state.particles.push(...createParticles(state.ufo.x + 15, state.ufo.y + 7, "#f0f", 20));
      state.score += 100;
      b.y = -100;
      state.ufo = null;
    }
    for (const shield of state.shields) {
      for (let i = shield.length - 1; i >= 0; i--) {
        const s = shield[i];
        if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) {
          shield.splice(i, 1);
          b.y = -100;
          break;
        }
      }
    }
  }

  // Enemy bullet vs player/shield collisions
  for (const b of state.enemyBullets) {
    if (
      b.x < state.player.x + state.player.w &&
      b.x + b.w > state.player.x &&
      b.y < state.player.y + state.player.h &&
      b.y + b.h > state.player.y
    ) {
      b.y = H + 100;
      state.lives--;
      state.particles.push(
        ...createParticles(
          state.player.x + state.player.w / 2,
          state.player.y + state.player.h / 2,
          "#0f0",
          25,
        ),
      );
      if (state.lives <= 0) {
        state.gameStatus = "over";
        events.push("game_over");
        return events;
      }
    }
    for (const shield of state.shields) {
      for (let i = shield.length - 1; i >= 0; i--) {
        const s = shield[i];
        if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y + s.h && b.y + b.h > s.y) {
          shield.splice(i, 1);
          b.y = H + 100;
          break;
        }
      }
    }
  }

  // Invaders touching shields
  for (const inv of aliveInvaders) {
    for (const shield of state.shields) {
      for (let i = shield.length - 1; i >= 0; i--) {
        const s = shield[i];
        if (inv.x < s.x + s.w && inv.x + 28 > s.x && inv.y < s.y + s.h && inv.y + 28 > s.y) {
          shield.splice(i, 1);
        }
      }
    }
  }

  // Laser beam
  if (state.laserCooldown > 0) state.laserCooldown--;
  if (state.laserActive > 0) {
    state.laserActive--;
    state.laserWidth = Math.max(2, 20 * (state.laserActive / LASER_DURATION));
    const beamX = state.player.x + state.player.w / 2;

    for (const inv of state.invaders) {
      if (!inv.alive) continue;
      if (Math.abs(inv.x + 14 - beamX) < state.laserWidth / 2 + 14) {
        inv.alive = false;
        state.score += inv.points;
        state.particles.push(...createParticles(inv.x + 14, inv.y + 14, "#0ff", 15));
      }
    }
    if (state.ufo) {
      if (Math.abs(state.ufo.x + 15 - beamX) < state.laserWidth / 2 + 18) {
        state.particles.push(
          ...createParticles(state.ufo.x + 15, state.ufo.y + 7, "#f0f", 20),
        );
        state.score += 100;
        state.ufo = null;
      }
    }
    for (const shield of state.shields) {
      for (let i = shield.length - 1; i >= 0; i--) {
        const s = shield[i];
        if (s.x + s.w > beamX - state.laserWidth / 2 && s.x < beamX + state.laserWidth / 2) {
          shield.splice(i, 1);
        }
      }
    }
    state.enemyBullets = state.enemyBullets.filter(
      (b) => Math.abs(b.x - beamX) > state.laserWidth / 2 + 2,
    );
  } else if (keys["b"] && state.laserCooldown <= 0) {
    state.laserCharge++;
    if (state.laserCharge >= 20) {
      state.laserActive = LASER_DURATION;
      state.laserCooldown = LASER_COOLDOWN_TIME;
      state.laserCharge = 0;
    }
  } else {
    state.laserCharge = Math.max(0, state.laserCharge - 2);
  }

  // Invaders reached bottom
  const aliveAfterLaser = state.invaders.filter((i) => i.alive);
  for (const inv of aliveAfterLaser) {
    if (inv.y + 28 >= state.player.y) {
      state.gameStatus = "over";
      events.push("game_over");
      return events;
    }
  }

  // Particles
  state.particles = state.particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life--;
    return p.life > 0;
  });

  // Level cleared
  if (aliveAfterLaser.length === 0) {
    events.push("level_clear");
  }

  return events;
}
