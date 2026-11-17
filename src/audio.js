// Synthesised sound effects through WebAudio: no audio files, nothing to
// load. The context is created on the first user gesture (browsers block
// audio before one) and every call is a no-op while muted or unavailable.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac || !master) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // A failed blip must never break the game loop.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    collect(combo) {
      const base = 520 + Math.min(combo, 24) * 22;
      tone(base, 0.09, 'sine', 0.5, base * 1.6);
      tone(base * 2, 0.06, 'triangle', 0.18);
    },
    dash() {
      tone(280, 0.18, 'sawtooth', 0.22, 880);
    },
    ring() {
      tone(660, 0.12, 'sine', 0.45, 990);
      tone(990, 0.2, 'sine', 0.4, 1320);
    },
    hit() {
      tone(180, 0.3, 'square', 0.4, 60);
      tone(90, 0.35, 'sawtooth', 0.3, 45);
    },
    power() {
      tone(440, 0.1, 'triangle', 0.4, 660);
      tone(660, 0.14, 'triangle', 0.35, 880);
    },
    wave() {
      tone(392, 0.12, 'triangle', 0.35);
      setTimeout(() => tone(523, 0.12, 'triangle', 0.35), 110);
      setTimeout(() => tone(659, 0.2, 'triangle', 0.35), 220);
    },
    over() {
      tone(392, 0.25, 'triangle', 0.4, 370);
      setTimeout(() => tone(311, 0.25, 'triangle', 0.4, 294), 240);
      setTimeout(() => tone(233, 0.5, 'triangle', 0.4, 220), 480);
    },
    start() {
      tone(523, 0.1, 'triangle', 0.35);
      setTimeout(() => tone(784, 0.16, 'triangle', 0.35), 100);
    },
  };
}
