// Dapur Kilat — input: keyboard movement, click-to-move and interact keys.
// One job: turn raw DOM events into a tidy per-frame snapshot the world can read.
// The game never reads `event` directly; it reads this module's state.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    // Held movement keys, as a set of codes.
    keys,
    // Where the player last clicked on the canvas (canvas pixels), or null.
    clickTarget: null,
    // True only on the frame the mouse button went down.
    clicked: false,
    // Canvas pixel position of the last click, for station hit-testing.
    clickPos: null,
    // True while Space is held (chopping).
    chopHeld: false,
    // True only on the frame E (or Enter on menus) went down.
    interactPressed: false,
    // True only on the frame Enter went down (menus / restart).
    enterPressed: false,
    // True only on the frame M went down (music toggle).
    mutePressed: false,
    mouseX: 0,
    mouseY: 0,
  };

  function toCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE') state.interactPressed = true;
    if (event.code === 'Enter') state.enterPressed = true;
    if (event.code === 'KeyM') state.mutePressed = true;
    if (event.code === 'Space') state.chopHeld = true;
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'Space') state.chopHeld = false;
  });

  canvas.addEventListener('mousedown', (event) => {
    const p = toCanvas(event.clientX, event.clientY);
    state.mouseX = p.x;
    state.mouseY = p.y;
    state.clicked = true;
    state.clickPos = p;
    state.clickTarget = p;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvas(event.clientX, event.clientY);
    state.mouseX = p.x;
    state.mouseY = p.y;
  });

  window.addEventListener('blur', () => {
    keys.clear();
    state.chopHeld = false;
  });

  // Movement vector from WASD / arrows, normalised. Zero when idle.
  state.moveVector = function moveVector() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  };

  // Call at the end of each frame: one-frame presses expire.
  state.endFrame = function endFrame() {
    state.clicked = false;
    state.clickPos = null;
    state.interactPressed = false;
    state.enterPressed = false;
    state.mutePressed = false;
  };

  return state;
}
