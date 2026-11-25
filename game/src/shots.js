// Dapur Kilat — shots: deterministic staged states for screenshots.
// One job: given `?shot=start|play|serve|end`, pose the kitchen so a single
// frame shows the game at its best. Staging only rearranges state the game
// itself owns; nothing here draws anything the game cannot do.

import { RECIPES } from './config.js';
import { createWorld, startShift } from './world.js';

function ticketFor(recipeId, patience, patienceMax) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  return { id: 900 + Math.floor(Math.random() * 90), recipe, patience, patienceMax, born: 0 };
}

export function stagedWorld(shot) {
  const world = createWorld();
  startShift(world);

  if (shot === 'start') {
    world.phase = 'title';
    world.tickets = [
      ticketFor('burger-kilat', 38, 48),
      ticketFor('salad-segar', 26, 48),
    ];
    world.chef.x = 640;
    world.chef.y = 330;
    world.elapsed = 0;
    return world;
  }

  if (shot === 'play') {
    world.elapsed = 27;
    world.score = 350;
    world.combo = 2;
    world.bestCombo = 2;
    world.served = 2;
    world.tickets = [
      ticketFor('burger-kilat', 30, 48),
      ticketFor('burger-keju', 18, 48),
      ticketFor('salad-segar', 40, 48),
    ];
    world.chef.x = 690;
    world.chef.y = 250;
    world.chef.dirX = 0;
    world.chef.dirY = 1;
    world.chef.carrying = { kind: 'tomato', state: 'chopped' };
    world.board.item = { kind: 'lettuce', state: 'raw' };
    world.board.chop = 0.55;
    world.grill[0] = { item: { kind: 'patty', state: 'raw' }, t: 3.5 };
    world.grill[1] = { item: { kind: 'patty', state: 'cooked' }, t: 7.5 };
    world.plate.items = [
      { kind: 'bun', state: 'raw' },
      { kind: 'patty', state: 'cooked' },
    ];
    return world;
  }

  if (shot === 'serve') {
    world.elapsed = 61;
    world.score = 720;
    world.combo = 4;
    world.bestCombo = 4;
    world.served = 5;
    world.tickets = [
      ticketFor('burger-kilat', 22, 48),
      ticketFor('roti-bawang', 34, 48),
    ];
    world.chef.x = 1060;
    world.chef.y = 480;
    world.chef.dirX = 0;
    world.chef.dirY = -1;
    world.chef.carrying = {
      plate: true,
      items: [
        { kind: 'bun', state: 'raw' },
        { kind: 'patty', state: 'cooked' },
        { kind: 'lettuce', state: 'chopped' },
      ],
    };
    world.grill[0] = { item: { kind: 'patty', state: 'cooked' }, t: 8 };
    world.floaters = [{ x: 1120, y: 260, text: '+245', color: '#f2b234', t: 0.3, life: 1.4 }];
    return world;
  }

  if (shot === 'end') {
    world.phase = 'end';
    world.elapsed = 150;
    world.score = 1250;
    world.combo = 0;
    world.bestCombo = 5;
    world.served = 9;
    world.missed = 2;
    return world;
  }

  return world;
}
