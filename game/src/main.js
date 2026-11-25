// Dapur Kilat — main: the game loop and the screen state machine.
// One job: own the animation frame, feed input into the world, and hand the
// world to the renderer. Title, playing and end are phases of one world.

import { VIEW_H, VIEW_W } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stagedWorld } from './shots.js';
import { createWorld, startShift, update } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

let world;
let frozen = false;

if (shot) {
  // Screenshot staging: pose the kitchen and hold it still, so the frame the
  // browser captures is exactly the staged one.
  world = stagedWorld(shot);
  frozen = true;
} else {
  world = createWorld();
}

let last = performance.now();

function frame(now) {
  const dt = (now - last) / 1000;
  last = now;

  if (input.mutePressed) audio.setMuted(!audio.isMuted());

  if (world.phase === 'title') {
    if (input.enterPressed || input.clicked) {
      audio.unlock();
      startShift(world);
    }
  } else if (world.phase === 'playing') {
    if (input.clicked || input.interactPressed || input.chopHeld) audio.unlock();
    if (!frozen) update(world, input, audio, dt);
  } else if (world.phase === 'end') {
    if (input.enterPressed) {
      audio.unlock();
      startShift(world);
    }
  }

  render(ctx, world, now);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
