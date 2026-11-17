// The world: everything that moves, spawns, collides and scores. AETHER
// HARVEST — pilot the skiff Kestrel through a drifting starfield, harvest
// star shards, chain them into a combo, dash through golden rings, and do
// not touch the void mines. Every 20 shards the wave rises: faster spawns,
// more mines, and from wave 2 comets streak across the field.
//
// The step is pure simulation on a fixed timestep: given the same seed and
// the same thrust/dash inputs it plays the same game, which is what the
// screenshot scenes rely on.
import {
  COMET,
  COLORS,
  EVENT_HIT,
  EVENT_NONE,
  EVENT_OVER,
  EVENT_POWER,
  EVENT_RING,
  EVENT_WAVE,
  FIELD,
  MINE,
  PLAYER,
  POWERUP,
  RING,
  SHARD,
  WAVE_SHARDS,
} from './config.js';

const TAU = Math.PI * 2;

function edgePoint(rng) {
  const side = rng.int(0, 3);
  const m = 30;
  if (side === 0) return { x: rng.range(m, FIELD.width - m), y: -m };
  if (side === 1) return { x: rng.range(m, FIELD.width - m), y: FIELD.height + m };
  if (side === 2) return { x: -m, y: rng.range(m, FIELD.height - m) };
  return { x: FIELD.width + m, y: rng.range(m, FIELD.height - m) };
}

function driftToward(rng, x, y) {
  const tx = FIELD.width / 2 + rng.range(-260, 260);
  const ty = FIELD.height / 2 + rng.range(-180, 180);
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function createWorld(rng) {
  const state = freshState();

  function freshState() {
    return {
      time: 0,
      score: 0,
      best: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      multiplier: 1,
      lives: PLAYER.lives,
      wave: 1,
      shards: 0,
      rings: 0,
      dashes: 0,
      shake: 0,
      slowTimer: 0,
      magnetTimer: 0,
      shield: false,
      player: {
        x: FIELD.width / 2,
        y: FIELD.height * 0.62,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        invuln: 0,
        dashLeft: 0,
        dashCd: 0,
        thrusting: false,
      },
      shardsList: [],
      mines: [],
      comets: [],
      ringsList: [],
      powerups: [],
      particles: [],
      floaters: [],
      spawnShard: 0.4,
      spawnMine: 1.8,
      spawnComet: 5,
      spawnRing: 6,
      spawnPower: 12,
      over: false,
    };
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = rng.next() * TAU;
      const s = rng.range(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rng.range(0.35, 0.8),
        maxLife: 0.8,
        size: rng.range(2, 5),
        color,
      });
    }
    if (state.particles.length > 320) state.particles.splice(0, state.particles.length - 320);
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
    if (state.floaters.length > 24) state.floaters.shift();
  }

  function spawnShard() {
    const p = edgePoint(rng);
    const d = driftToward(rng, p.x, p.y);
    const speed = SHARD.drift * rng.range(0.7, 1.4);
    state.shardsList.push({
      x: p.x,
      y: p.y,
      vx: d.x * speed,
      vy: d.y * speed,
      r: SHARD.radius,
      spin: rng.range(0, TAU),
      spinSpeed: rng.range(-2.2, 2.2),
      pulse: rng.range(0, TAU),
      active: true,
    });
  }

  function spawnMine() {
    const p = edgePoint(rng);
    const d = driftToward(rng, p.x, p.y);
    const speed = MINE.drift * (1 + (state.wave - 1) * 0.12) * rng.range(0.8, 1.3);
    state.mines.push({
      x: p.x,
      y: p.y,
      vx: d.x * speed,
      vy: d.y * speed,
      r: MINE.radius,
      spin: rng.range(0, TAU),
      spinSpeed: rng.range(-1.4, 1.4),
      pulse: rng.range(0, TAU),
      active: true,
    });
  }

  function spawnComet() {
    const fromLeft = rng.next() < 0.5;
    const y = rng.range(60, FIELD.height - 60);
    const speed = COMET.speed * rng.range(0.9, 1.25);
    state.comets.push({
      x: fromLeft ? -40 : FIELD.width + 40,
      y,
      vx: (fromLeft ? 1 : -1) * speed,
      vy: rng.range(-40, 40),
      r: COMET.radius,
      active: true,
    });
  }

  function spawnRing() {
    state.ringsList.push({
      x: rng.range(140, FIELD.width - 140),
      y: rng.range(140, FIELD.height - 140),
      r: RING.radius,
      life: RING.life,
      spin: rng.range(0, TAU),
      active: true,
    });
  }

  function spawnPowerup() {
    const kind = rng.pick(['shield', 'magnet', 'slow']);
    state.powerups.push({
      x: rng.range(120, FIELD.width - 120),
      y: rng.range(120, FIELD.height - 120),
      r: POWERUP.radius,
      kind,
      life: 12,
      pulse: rng.range(0, TAU),
      active: true,
    });
  }

  function collectShard(shard) {
    shard.active = false;
    state.shards += 1;
    state.combo += 1;
    state.comboTimer = SHARD.comboWindow;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    state.multiplier = Math.min(
      8,
      1 + Math.floor(state.combo / SHARD.comboPerTier),
    );
    const gained = SHARD.value * state.multiplier;
    state.score += gained;
    burst(shard.x, shard.y, COLORS.shard, 10, 160);
    floater(shard.x, shard.y - 14, `+${gained}`, state.multiplier > 1 ? COLORS.shard : COLORS.text);
    const wave = 1 + Math.floor(state.shards / WAVE_SHARDS);
    if (wave > state.wave) {
      state.wave = wave;
      return EVENT_WAVE;
    }
    return EVENT_NONE;
  }

  function hitMine(mine) {
    mine.active = false;
    const p = state.player;
    if (state.shield) {
      state.shield = false;
      p.invuln = 1.2;
      burst(p.x, p.y, COLORS.shield, 22, 260);
      floater(p.x, p.y - 30, 'SHIELD DOWN', COLORS.shield);
      return EVENT_HIT;
    }
    state.lives -= 1;
    state.combo = 0;
    state.multiplier = 1;
    state.comboTimer = 0;
    state.shake = 14;
    p.invuln = PLAYER.invulnAfterHit;
    burst(p.x, p.y, COLORS.mineCore, 26, 300);
    burst(mine.x, mine.y, COLORS.mineCore, 18, 240);
    if (state.lives <= 0) {
      state.over = true;
      return EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function hitComet(comet) {
    comet.active = false;
    return hitMine(comet);
  }

  function stepPlayer(dt, thrust, dash) {
    const p = state.player;
    const slow = state.slowTimer > 0 ? POWERUP.slowFactor : 1;
    const sdt = dt * slow;
    if (dash && p.dashCd <= 0 && p.dashLeft <= 0) {
      p.dashLeft = PLAYER.dashTime;
      p.dashCd = PLAYER.dashCooldown;
      state.dashes += 1;
      const dir = thrust.active
        ? { x: thrust.x, y: thrust.y }
        : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
      p.vx = dir.x * PLAYER.dashSpeed;
      p.vy = dir.y * PLAYER.dashSpeed;
      burst(p.x, p.y, COLORS.player, 12, 200);
    }
    if (p.dashLeft > 0) {
      p.dashLeft -= sdt;
    } else if (thrust.active) {
      p.vx += thrust.x * PLAYER.accel * sdt;
      p.vy += thrust.y * PLAYER.accel * sdt;
      const speed = Math.hypot(p.vx, p.vy);
      const max = PLAYER.maxSpeed;
      if (speed > max) {
        p.vx = (p.vx / speed) * max;
        p.vy = (p.vy / speed) * max;
      }
      p.angle = Math.atan2(thrust.y, thrust.x);
    } else {
      const damp = Math.pow(0.12, sdt);
      p.vx *= damp;
      p.vy *= damp;
    }
    p.x += p.vx * sdt;
    p.y += p.vy * sdt;
    if (p.x < PLAYER.radius) { p.x = PLAYER.radius; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x > FIELD.width - PLAYER.radius) { p.x = FIELD.width - PLAYER.radius; p.vx = -Math.abs(p.vx) * 0.4; }
    if (p.y < PLAYER.radius) { p.y = PLAYER.radius; p.vy = Math.abs(p.vy) * 0.4; }
    if (p.y > FIELD.height - PLAYER.radius) { p.y = FIELD.height - PLAYER.radius; p.vy = -Math.abs(p.vy) * 0.4; }
    if (p.dashCd > 0) p.dashCd -= sdt;
    if (p.invuln > 0) p.invuln -= sdt;
    p.thrusting = thrust.active;
    if (thrust.active && rng.next() < 0.5) {
      state.particles.push({
        x: p.x - Math.cos(p.angle) * 18,
        y: p.y - Math.sin(p.angle) * 18,
        vx: -Math.cos(p.angle) * 90 + rng.range(-20, 20),
        vy: -Math.sin(p.angle) * 90 + rng.range(-20, 20),
        life: 0.35,
        maxLife: 0.35,
        size: rng.range(2, 4),
        color: COLORS.player,
      });
    }
  }

  function stepEntities(dt) {
    const p = state.player;
    const slow = state.slowTimer > 0 ? POWERUP.slowFactor : 1;
    const sdt = dt * slow;

    for (const s of state.shardsList) {
      if (!s.active) continue;
      if (state.magnetTimer > 0) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d = Math.hypot(dx, dy);
        if (d < 320 && d > 1) {
          s.vx += (dx / d) * 900 * sdt;
          s.vy += (dy / d) * 900 * sdt;
        }
      }
      s.x += s.vx * sdt;
      s.y += s.vy * sdt;
      s.spin += s.spinSpeed * sdt;
      s.pulse += sdt * 3;
      if (s.x < -60 || s.x > FIELD.width + 60 || s.y < -60 || s.y > FIELD.height + 60) s.active = false;
    }
    for (const m of state.mines) {
      if (!m.active) continue;
      m.x += m.vx * sdt;
      m.y += m.vy * sdt;
      m.spin += m.spinSpeed * sdt;
      m.pulse += sdt * 3;
      if (m.x < -70 || m.x > FIELD.width + 70 || m.y < -70 || m.y > FIELD.height + 70) m.active = false;
    }
    for (const c of state.comets) {
      if (!c.active) continue;
      c.x += c.vx * sdt;
      c.y += c.vy * sdt;
      if (c.x < -80 || c.x > FIELD.width + 80) c.active = false;
    }
    for (const r of state.ringsList) {
      if (!r.active) continue;
      r.life -= sdt;
      r.spin += sdt * 0.8;
      if (r.life <= 0) r.active = false;
    }
    for (const u of state.powerups) {
      if (!u.active) continue;
      u.life -= sdt;
      u.pulse += sdt * 3;
      if (u.life <= 0) u.active = false;
    }
    for (const part of state.particles) {
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
    }
    state.particles = state.particles.filter((part) => part.life > 0);
    for (const f of state.floaters) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    state.floaters = state.floaters.filter((f) => f.life > 0);
  }

  function stepSpawns(dt) {
    const wave = state.wave;
    state.spawnShard -= dt;
    if (state.spawnShard <= 0) {
      state.spawnShard = Math.max(0.45, SHARD.spawnEvery - wave * 0.05);
      if (state.shardsList.filter((s) => s.active).length < SHARD.maxAlive) spawnShard();
    }
    state.spawnMine -= dt;
    if (state.spawnMine <= 0) {
      state.spawnMine = Math.max(1.4, MINE.spawnEvery - wave * 0.16);
      if (state.mines.filter((m) => m.active).length < Math.min(MINE.maxAlive, 4 + wave)) spawnMine();
    }
    if (wave >= COMET.fromWave) {
      state.spawnComet -= dt;
      if (state.spawnComet <= 0) {
        state.spawnComet = Math.max(3.5, COMET.spawnEvery - wave * 0.4);
        spawnComet();
      }
    }
    state.spawnRing -= dt;
    if (state.spawnRing <= 0) {
      state.spawnRing = RING.spawnEvery;
      if (state.ringsList.filter((r) => r.active).length < 2) spawnRing();
    }
    state.spawnPower -= dt;
    if (state.spawnPower <= 0) {
      state.spawnPower = POWERUP.spawnEvery;
      if (state.powerups.filter((u) => u.active).length < 2) spawnPowerup();
    }
  }

  function stepCollisions() {
    const p = state.player;
    let events = EVENT_NONE;
    const vulnerable = p.invuln <= 0 && p.dashLeft <= 0;

    for (const s of state.shardsList) {
      if (!s.active) continue;
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      if (dx * dx + dy * dy < (PLAYER.radius + s.r) * (PLAYER.radius + s.r)) {
        events |= collectShard(s);
      }
    }
    for (const r of state.ringsList) {
      if (!r.active) continue;
      const dx = p.x - r.x;
      const dy = p.y - r.y;
      const d = Math.hypot(dx, dy);
      if (p.dashLeft > 0 && d < r.r + 10) {
        r.active = false;
        state.rings += 1;
        state.score += RING.bonus;
        p.dashCd = 0;
        burst(r.x, r.y, COLORS.ring, 24, 280);
        floater(r.x, r.y - 20, `RING +${RING.bonus}`, COLORS.ring);
        events |= EVENT_RING;
      }
    }
    for (const u of state.powerups) {
      if (!u.active) continue;
      const dx = p.x - u.x;
      const dy = p.y - u.y;
      if (dx * dx + dy * dy < (PLAYER.radius + u.r + 6) * (PLAYER.radius + u.r + 6)) {
        u.active = false;
        if (u.kind === 'shield') {
          state.shield = true;
          floater(p.x, p.y - 30, 'SHIELD UP', COLORS.shield);
        } else if (u.kind === 'magnet') {
          state.magnetTimer = POWERUP.magnetTime;
          floater(p.x, p.y - 30, 'MAGNET 6s', COLORS.magnet);
        } else {
          state.slowTimer = POWERUP.slowTime;
          floater(p.x, p.y - 30, 'SLOW-MO 5s', COLORS.slow);
        }
        burst(u.x, u.y, COLORS[u.kind], 16, 220);
        events |= EVENT_POWER;
      }
    }
    if (vulnerable) {
      for (const m of state.mines) {
        if (!m.active) continue;
        const dx = p.x - m.x;
        const dy = p.y - m.y;
        if (dx * dx + dy * dy < (PLAYER.radius + m.r - 6) * (PLAYER.radius + m.r - 6)) {
          events |= hitMine(m);
          break;
        }
      }
      if (!(events & EVENT_OVER)) {
        for (const c of state.comets) {
          if (!c.active) continue;
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          if (dx * dx + dy * dy < (PLAYER.radius + c.r - 4) * (PLAYER.radius + c.r - 4)) {
            events |= hitComet(c);
            break;
          }
        }
      }
    }
    return events;
  }

  function reset() {
    const kept = state.best;
    const next = freshState();
    next.best = kept;
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, next);
  }

  return {
    state,
    reset,
    /** Advance one fixed step. thrust: {x,y,active}; dash: boolean. */
    step(dt, thrust, dash, ambient) {
      state.time += dt;
      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
      if (state.slowTimer > 0) state.slowTimer -= dt;
      if (state.magnetTimer > 0) state.magnetTimer -= dt;
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) {
          state.combo = 0;
          state.multiplier = 1;
        }
      }
      if (ambient) {
        stepSpawns(dt);
        stepEntities(dt);
        return EVENT_NONE;
      }
      stepPlayer(dt, thrust, dash);
      stepSpawns(dt);
      stepEntities(dt);
      return stepCollisions();
    },
  };
}
