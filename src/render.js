// Everything the player sees: the starfield, the entities, the HUD and the
// four screens (title, play, paused, game over). All art is drawn with the
// canvas API — no image files — so the game ships as code alone.
import { COLORS, FIELD, PLAYER, RING, SHARD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

// Fixed background dressing, laid out once per renderer so the stars never jump.
function makeStars() {
  const stars = [];
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: next() * FIELD.width,
      y: next() * FIELD.height,
      r: 0.6 + next() * 1.7,
      depth: 0.25 + next() * 0.75,
      phase: next() * TAU,
    });
  }
  return stars;
}

const NEBULAE = [
  { x: 210, y: 150, r: 260, color: 'rgba(88, 60, 180, 0.20)' },
  { x: 1080, y: 620, r: 300, color: 'rgba(20, 110, 140, 0.18)' },
  { x: 950, y: 130, r: 200, color: 'rgba(180, 60, 110, 0.13)' },
  { x: 180, y: 680, r: 220, color: 'rgba(40, 80, 180, 0.14)' },
];

function drawStar(ctx, x, y, r, rot, color, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
  ctx.restore();
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255, 93, 115, 0.18)';
  ctx.strokeStyle = '#ff5d73';
  ctx.lineWidth = 1.6;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');
  const stars = makeStars();

  function drawBackground(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, COLORS.bgTop);
    g.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const n of NEBULAE) {
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rg.addColorStop(0, n.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(time * 1.4 + s.phase);
      ctx.globalAlpha = tw * s.depth;
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShard(s) {
    const pulse = 1 + 0.12 * Math.sin(s.pulse);
    drawStar(ctx, s.x, s.y, s.r * pulse, s.spin, COLORS.shard, true);
    ctx.fillStyle = COLORS.shardCore;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.4, 0, TAU);
    ctx.fill();
  }

  function drawMine(m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.spin);
    ctx.fillStyle = COLORS.mine;
    ctx.strokeStyle = '#3a3a52';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      const a2 = ((i + 0.5) / 8) * TAU;
      ctx.lineTo(Math.cos(a) * (m.r + 7), Math.sin(a) * (m.r + 7));
      ctx.lineTo(Math.cos(a2) * (m.r - 2), Math.sin(a2) * (m.r - 2));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const core = 5 + 1.6 * Math.sin(m.pulse);
    ctx.save();
    ctx.shadowColor = COLORS.mineCore;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.mineCore;
    ctx.beginPath();
    ctx.arc(m.x, m.y, core, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawComet(c) {
    const len = 90;
    const nx = -c.vx;
    const ny = -c.vy;
    const nl = Math.hypot(nx, ny) || 1;
    const grad = ctx.createLinearGradient(
      c.x, c.y,
      c.x + (nx / nl) * len, c.y + (ny / nl) * len,
    );
    grad.addColorStop(0, 'rgba(155, 231, 255, 0.9)');
    grad.addColorStop(1, 'rgba(155, 231, 255, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + (nx / nl) * len, c.y + (ny / nl) * len);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = COLORS.comet;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawRing(r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.spin);
    ctx.globalAlpha = Math.min(1, r.life / 2);
    ctx.strokeStyle = COLORS.ring;
    ctx.lineWidth = 5;
    ctx.setLineDash([26, 14]);
    ctx.shadowColor = COLORS.ring;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r.r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, r.life / 2) * 0.9;
    ctx.fillStyle = COLORS.ring;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DASH +250', r.x, r.y);
    ctx.restore();
  }

  function drawPowerup(u) {
    const color = COLORS[u.kind];
    const pulse = 1 + 0.15 * Math.sin(u.pulse);
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.globalAlpha = Math.min(1, u.life / 2);
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(4, 8, 24, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU + Math.PI / 6;
      const px = Math.cos(a) * u.r * pulse;
      const py = Math.sin(a) * u.r * pulse;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, u.life / 2);
    ctx.fillStyle = color;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = u.kind === 'shield' ? 'S' : u.kind === 'magnet' ? 'M' : 'T';
    ctx.fillText(label, u.x, u.y + 1);
    ctx.restore();
  }

  function drawPlayer(p, state) {
    const blink = p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (blink) ctx.globalAlpha = 0.35;
    ctx.rotate(p.angle);
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 16;
    // Hull: a swept dart.
    ctx.fillStyle = COLORS.playerHull;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    // Sail: the arc that catches the aether wind.
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-2, 0, 13, -1.2, 1.2);
    ctx.stroke();
    ctx.fillStyle = '#0b1030';
    ctx.beginPath();
    ctx.arc(4, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (state.shield) {
      ctx.save();
      ctx.strokeStyle = COLORS.shield;
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(state.time * 5);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = COLORS.shield;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 27, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (p.dashLeft > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = COLORS.player;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const part of state.particles) {
      ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px system-ui, sans-serif';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('SCORE', 28, 34);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(String(state.score), 28, 68);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 28, 92);
    // Wave badge, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10, 16, 44, 0.72)';
    roundRect(ctx, FIELD.width / 2 - 64, 18, 128, 34, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = COLORS.player;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave}`, FIELD.width / 2, 41);
    // Combo pill, under the wave badge.
    if (state.combo >= 2) {
      const w = 150;
      ctx.fillStyle = 'rgba(255, 211, 77, 0.16)';
      roundRect(ctx, FIELD.width / 2 - w / 2, 60, w, 30, 15);
      ctx.fill();
      ctx.strokeStyle = COLORS.shard;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = COLORS.shard;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.multiplier}  ·  ${state.combo}`, FIELD.width / 2, 80);
      const frac = Math.max(0, state.comboTimer / SHARD.comboWindow);
      ctx.fillStyle = COLORS.shard;
      ctx.fillRect(FIELD.width / 2 - w / 2 + 8, 86, (w - 16) * frac, 3);
    }
    // Lives, top right.
    for (let i = 0; i < PLAYER.lives; i += 1) {
      drawHeart(ctx, FIELD.width - 40 - i * 34, 44, 26, i < state.lives);
    }
    // Dash cooldown, bottom centre.
    const p = state.player;
    const ready = p.dashCd <= 0;
    const frac = ready ? 1 : 1 - p.dashCd / PLAYER.dashCooldown;
    ctx.textAlign = 'center';
    ctx.fillStyle = ready ? COLORS.player : COLORS.dim;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(ready ? 'DASH READY — SPACE / RIGHT-CLICK' : 'DASH RECHARGING', FIELD.width / 2, FIELD.height - 44);
    ctx.fillStyle = 'rgba(125, 249, 255, 0.2)';
    roundRect(ctx, FIELD.width / 2 - 90, FIELD.height - 36, 180, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = ready ? COLORS.player : COLORS.dim;
    roundRect(ctx, FIELD.width / 2 - 90, FIELD.height - 36, 180 * frac, 7, 3.5);
    ctx.fill();
    // Active power-up timers, bottom left.
    let ty = FIELD.height - 30;
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px system-ui, sans-serif';
    if (state.shield) {
      ctx.fillStyle = COLORS.shield;
      ctx.fillText('◈ SHIELD', 28, ty);
      ty -= 22;
    }
    if (state.magnetTimer > 0) {
      ctx.fillStyle = COLORS.magnet;
      ctx.fillText(`◎ MAGNET ${state.magnetTimer.toFixed(0)}s`, 28, ty);
      ty -= 22;
    }
    if (state.slowTimer > 0) {
      ctx.fillStyle = COLORS.slow;
      ctx.fillText(`◔ SLOW-MO ${state.slowTimer.toFixed(0)}s`, 28, ty);
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(4, 8, 26, 0.78)';
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.shard;
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('A  L I T T L E  S K I F F  ·  A  B I G  S K Y', FIELD.width / 2, 176);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 26;
    ctx.fillText('AETHER', FIELD.width / 2, 268);
    ctx.fillText('HARVEST', FIELD.width / 2, 352);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.dim;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Harvest star shards. Chain combos. Dash through golden rings.', FIELD.width / 2, 396);
    ctx.fillText('Never touch a void mine.', FIELD.width / 2, 426);
    panel(FIELD.width / 2 - 330, 470, 660, 150);
    ctx.fillStyle = COLORS.text;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('WASD / ARROWS — steer      ·      HOLD MOUSE — steer to cursor', FIELD.width / 2, 512);
    ctx.fillText('SPACE / RIGHT-CLICK — dash (invulnerable, refills in rings)', FIELD.width / 2, 544);
    ctx.fillText('P — pause      ·      M — mute      ·      S / M / T — shield, magnet, slow-mo', FIELD.width / 2, 576);
    ctx.fillStyle = COLORS.player;
    ctx.font = 'bold 24px system-ui, sans-serif';
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS ENTER OR CLICK TO START', FIELD.width / 2, 668);
    ctx.globalAlpha = 1;
    if (best > 0) {
      ctx.fillStyle = COLORS.shard;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`BEST  ${best}`, FIELD.width / 2, 706);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(2, 2, 8, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 8);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press P or click to keep harvesting', FIELD.width / 2, FIELD.height / 2 + 34);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(2, 2, 8, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 320, 168, 640, 420);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText('THE AETHER', FIELD.width / 2, 248);
    ctx.fillText('CLAIMS YOU', FIELD.width / 2, 306);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('FINAL SCORE', FIELD.width / 2, 356);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillText(String(state.score), FIELD.width / 2, 420);
    ctx.fillStyle = state.score > best ? COLORS.shard : COLORS.dim;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(
      state.score > best ? '★ NEW BEST ★' : `BEST  ${Math.max(best, state.score)}`,
      FIELD.width / 2, 456,
    );
    ctx.fillStyle = COLORS.dim;
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(
      `Shards ${state.shards}   ·   Wave ${state.wave}   ·   Best combo x${Math.max(1, Math.min(8, 1 + Math.floor(state.maxCombo / 4)))} (${state.maxCombo})   ·   Rings ${state.rings}`,
      FIELD.width / 2, 500,
    );
    ctx.fillStyle = COLORS.player;
    ctx.font = 'bold 22px system-ui, sans-serif';
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS R OR CLICK TO HARVEST AGAIN', FIELD.width / 2, 552);
    ctx.globalAlpha = 1;
  }

  return {
    draw(state, screen, best) {
      ctx.save();
      if (state.shake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * state.shake,
          (Math.random() - 0.5) * state.shake,
        );
      }
      drawBackground(state.time);
      for (const r of state.ringsList) if (r.active) drawRing(r);
      for (const s of state.shardsList) if (s.active) drawShard(s);
      for (const m of state.mines) if (m.active) drawMine(m);
      for (const c of state.comets) if (c.active) drawComet(c);
      for (const u of state.powerups) if (u.active) drawPowerup(u);
      drawParticles(state);
      if (screen !== SCREEN_TITLE) drawPlayer(state.player, state);
      drawFloaters(state);
      ctx.restore();
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      if (screen === SCREEN_PAUSED) drawPaused();
      if (screen === SCREEN_OVER) drawOver(state, best);
    },
  };
}
