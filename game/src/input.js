// Keyboard + mouse input. Thrust comes from WASD/arrows or from holding the
// mouse (the ship steers toward the cursor); Space or right-click dashes.
// Enter/Space/click confirms on menus, P or Escape pauses, M mutes, R
// restarts from the game-over screen. Actions are edge-triggered and taken
// once per frame by the loop.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;

const THRUST_KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseHeld = false;

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onKeyDown(event) {
    if (event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'Space') actions |= ACTION_DASH;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const p = canvasPoint(event.clientX, event.clientY);
    mouseX = p.x;
    mouseY = p.y;
  }

  function onMouseDown(event) {
    event.preventDefault();
    const p = canvasPoint(event.clientX, event.clientY);
    mouseX = p.x;
    mouseY = p.y;
    if (event.button === 2) {
      actions |= ACTION_DASH;
      return;
    }
    mouseHeld = true;
    actions |= ACTION_CONFIRM;
  }

  function onMouseUp(event) {
    if (event.button === 0) mouseHeld = false;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  function onBlur() {
    keys.clear();
    mouseHeld = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    /** Thrust vector for this frame: keys first, else steer toward the held mouse. */
    thrust(player) {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const dir = THRUST_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x !== 0 || y !== 0) {
        const len = Math.hypot(x, y);
        return { x: x / len, y: y / len, active: true };
      }
      if (mouseHeld) {
        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 24) return { x: dx / dist, y: dy / dist, active: true };
      }
      return { x: 0, y: 0, active: false };
    },
    dashHeld() {
      return keys.has('Space');
    },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    },
  };
}
