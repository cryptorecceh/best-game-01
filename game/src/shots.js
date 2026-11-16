// The screenshot scenes behind ?shot=start|play|surge|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
//
// The autopilot chases the nearest shard, steers away from any mine close
// ahead, and dashes when a ring lies in its path. The end scene's pilot is
// deliberately careless — it never dodges and never dashes — so it is caught
// out once the mines thicken, as a hurried player is.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const SURGE_SECONDS = 46;
const END_LIMIT_SECONDS = 300;
const SAMPLE = 1 / 30;

function nearestShard(state) {
  let best = null;
  let bestD = Infinity;
  for (const s of state.shardsList) {
    if (!s.active) continue;
    const d = (s.x - state.player.x) ** 2 + (s.y - state.player.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function dangerAhead(state, tx, ty) {
  const p = state.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  for (const m of state.mines) {
    if (!m.active) continue;
    const rx = m.x - p.x;
    const ry = m.y - p.y;
    const along = rx * ux + ry * uy;
    if (along < 0 || along > 190) continue;
    const perp = Math.abs(-ry * ux + rx * uy);
    if (perp < 64) return m;
  }
  for (const c of state.comets) {
    if (!c.active) continue;
    const rx = c.x - p.x;
    const ry = c.y - p.y;
    const along = rx * ux + ry * uy;
    if (along < 0 || along > 260) continue;
    const perp = Math.abs(-ry * ux + rx * uy);
    if (perp < 60) return c;
  }
  return null;
}

/** Steer toward (tx, ty), swerving around whatever dangerAhead names. */
function autopilot(state, dodge) {
  const p = state.player;
  const shard = nearestShard(state);
  let tx = shard ? shard.x : FIELD.width / 2;
  let ty = shard ? shard.y : FIELD.height / 2;
  if (dodge) {
    const threat = dangerAhead(state, tx, ty);
    if (threat) {
      const dx = threat.x - p.x;
      const dy = threat.y - p.y;
      // Swerve perpendicular to the threat, keeping the shard in view.
      const px = -dy;
      const py = dx;
      const side = px * (tx - p.x) + py * (ty - p.y) >= 0 ? 1 : -1;
      tx = p.x + px * side;
      ty = p.y + py * side;
    }
  }
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  let dash = false;
  if (dodge && p.dashCd <= 0) {
    for (const r of state.ringsList) {
      if (!r.active) continue;
      const rx = r.x - p.x;
      const ry = r.y - p.y;
      const dist = Math.hypot(rx, ry);
      const dot = (rx * dx + ry * dy) / (dist * len || 1);
      if (dist < 260 && dot > 0.92) dash = true;
    }
  }
  return { thrust: { x: dx / len, y: dy / len, active: len > 12 }, dash };
}

function playFor(world, seconds, dodge) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilot(world.state, dodge);
    const events = world.step(STEP, input.thrust, input.dash, false);
    if (events & EVENT_OVER) return true;
  }
  return world.state.lives === 0;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    playFor(world, PLAY_SECONDS, true);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'surge') {
    playFor(world, SURGE_SECONDS, true);
    return { screen: world.state.lives === 0 ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    const over = playFor(world, END_LIMIT_SECONDS, false);
    void over;
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, { x: 0, y: 0, active: false }, false, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
