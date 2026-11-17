// AETHER HARVEST — tuning and palette. One place for every number the
// world and the renderer agree on, so a balance change is a one-line edit.
export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const BEST_KEY = 'aether-harvest-best';

export const PLAYER = {
  radius: 16,
  accel: 2600,
  maxSpeed: 360,
  dashSpeed: 980,
  dashTime: 0.22,
  dashCooldown: 1.6,
  invulnAfterHit: 1.6,
  lives: 3,
};

export const SHARD = {
  radius: 13,
  value: 10,
  comboWindow: 2.5,
  comboPerTier: 4,
  maxMultiplier: 8,
  spawnEvery: 0.9,
  maxAlive: 26,
  drift: 26,
};

export const MINE = {
  radius: 20,
  spawnEvery: 2.6,
  maxAlive: 9,
  drift: 42,
};

export const COMET = {
  radius: 15,
  speed: 520,
  spawnEvery: 7,
  fromWave: 2,
};

export const RING = {
  radius: 52,
  bonus: 250,
  spawnEvery: 11,
  life: 9,
};

export const POWERUP = {
  radius: 16,
  spawnEvery: 19,
  magnetTime: 6,
  slowTime: 5,
  slowFactor: 0.45,
};

export const WAVE_SHARDS = 20;

export const COLORS = {
  bgTop: '#0b1030',
  bgBottom: '#020208',
  shard: '#ffd34d',
  shardCore: '#fff3c4',
  mine: '#1a1a26',
  mineCore: '#ff4d6d',
  comet: '#9be7ff',
  ring: '#ffe066',
  shield: '#4dd8ff',
  magnet: '#c77dff',
  slow: '#5eead4',
  player: '#7df9ff',
  playerHull: '#e8fbff',
  text: '#eef4ff',
  dim: '#9aa7c7',
  danger: '#ff5d73',
};

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE = 4;
export const EVENT_RING = 8;
export const EVENT_POWER = 16;
