// Dapur Kilat — world: the kitchen state and its rules. One job: everything
// that changes while a shift runs — the chef, the stations, the tickets, the
// plate, the score — and the one function that advances it, `update`.
// Rendering never mutates the world; it only reads it.

import {
  CHEF_RADIUS,
  CHEF_SPEED,
  CHOP_SECONDS,
  GRILL_BURN_SECONDS,
  GRILL_COOK_SECONDS,
  HUD_H,
  INGREDIENTS,
  INTERACT_DIST,
  MAX_TICKETS,
  RECIPES,
  SHIFT_SECONDS,
  VIEW_H,
  VIEW_W,
  isRush,
  patienceAt,
  spawnIntervalAt,
} from './config.js';

const CRATE_W = 96;
const CRATE_H = 62;

// Station rectangles (canvas pixels). The top row sits under the order board;
// the plating table anchors the middle; serve and trash live on the right.
export const STATIONS = {
  crates: Object.keys(INGREDIENTS).map((kind, i) => ({
    id: `crate-${kind}`,
    kind: 'crate',
    ingredient: kind,
    x: 24 + i * 104,
    y: HUD_H + 22,
    w: CRATE_W,
    h: CRATE_H,
  })),
  board: { id: 'board', kind: 'board', x: 700, y: HUD_H + 30, w: 200, h: 84 },
  grill: { id: 'grill', kind: 'grill', x: 940, y: HUD_H + 22, w: 280, h: 104 },
  plating: { id: 'plating', kind: 'plating', x: 420, y: 430, w: 440, h: 130 },
  serve: { id: 'serve', kind: 'serve', x: 1000, y: 300, w: 240, h: 120 },
  trash: { id: 'trash', kind: 'trash', x: 56, y: 600, w: 110, h: 84 },
};

export function allStations() {
  return [...STATIONS.crates, STATIONS.board, STATIONS.grill, STATIONS.plating, STATIONS.serve, STATIONS.trash];
}

// Rectangles the chef cannot walk through (the counters themselves).
const SOLIDS = [
  { x: 16, y: HUD_H + 14, w: 640, h: 78 },
  { x: 692, y: HUD_H + 22, w: 216, h: 100 },
  { x: 932, y: HUD_H + 14, w: 296, h: 120 },
  { x: 412, y: 422, w: 456, h: 146 },
  { x: 992, y: 292, w: 256, h: 136 },
  { x: 48, y: 592, w: 126, h: 100 },
];

let ticketSeq = 0;

export function createWorld() {
  return {
    phase: 'title',
    elapsed: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    chef: { x: VIEW_W / 2, y: 330, dirX: 0, dirY: 1, moving: false, carrying: null },
    moveTarget: null,
    pendingStation: null,
    board: { item: null, chop: 0 },
    grill: [
      { item: null, t: 0 },
      { item: null, t: 0 },
    ],
    plate: { items: [] },
    tickets: [],
    spawnTimer: 1.5,
    floaters: [],
    chopTick: 0,
    message: null,
    messageT: 0,
  };
}

function stationCenter(station) {
  return { x: station.x + station.w / 2, y: station.y + station.h / 2 };
}

function distToStation(chef, station) {
  const c = stationCenter(station);
  const nx = Math.max(station.x, Math.min(chef.x, station.x + station.w));
  const ny = Math.max(station.y, Math.min(chef.y, station.y + station.h));
  void c;
  return Math.hypot(chef.x - nx, chef.y - ny);
}

function nearestStation(world) {
  // Gate on edge distance (can the chef reach it?), but rank candidates by
  // centre distance: where two stations sit close together — the grill above
  // the serve window — the one the chef is standing in front of wins.
  let best = null;
  let bestD = Infinity;
  for (const station of allStations()) {
    if (distToStation(world.chef, station) > INTERACT_DIST) continue;
    const c = stationCenter(station);
    const d = Math.hypot(world.chef.x - c.x, world.chef.y - c.y);
    if (d < bestD) {
      bestD = d;
      best = station;
    }
  }
  return best;
}

function stationAtPoint(x, y) {
  for (const station of allStations()) {
    if (x >= station.x - 8 && x <= station.x + station.w + 8 && y >= station.y - 8 && y <= station.y + station.h + 8) {
      return station;
    }
  }
  return null;
}

function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, t: 0, life: 1.4 });
}

function showMessage(world, text) {
  world.message = text;
  world.messageT = 1.6;
}

function plateMatchesTicket(plateItems, recipe) {
  if (plateItems.length !== recipe.need.length) return false;
  const wanted = recipe.need.map((n) => `${n.kind}:${n.state}`).sort().join('|');
  const got = plateItems.map((i) => `${i.kind}:${i.state}`).sort().join('|');
  return wanted === got;
}

function findMatchingTicket(world, plateItems) {
  for (const ticket of world.tickets) {
    if (plateMatchesTicket(plateItems, ticket.recipe)) return ticket;
  }
  return null;
}

function servePlate(world, audio) {
  const carrying = world.chef.carrying;
  if (!carrying || !carrying.plate) return false;
  const ticket = findMatchingTicket(world, carrying.items);
  if (!ticket) {
    audio.error();
    showMessage(world, 'Pesanan ini tidak cocok — cek tiketnya!');
    return false;
  }
  const timeBonus = Math.round(50 * Math.max(0, ticket.patience / ticket.patienceMax));
  const mult = Math.min(1 + 0.25 * world.combo, 3);
  const points = Math.round((100 + timeBonus) * mult);
  world.score += points;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.served += 1;
  world.tickets = world.tickets.filter((t) => t !== ticket);
  world.chef.carrying = null;
  audio.serve();
  const c = stationCenter(STATIONS.serve);
  addFloater(world, c.x, c.y - 30, `+${points}`, '#f2b234');
  if (world.combo >= 3) addFloater(world, c.x, c.y - 58, `KOMBO x${world.combo}!`, '#2f7d7a');
  return true;
}

function interact(world, station, audio) {
  const chef = world.chef;
  const carrying = chef.carrying;

  if (station.kind === 'crate') {
    if (carrying) {
      audio.error();
      showMessage(world, 'Tangan penuh — letakkan dulu!');
      return;
    }
    chef.carrying = { kind: station.ingredient, state: 'raw' };
    audio.pickup();
    return;
  }

  if (station.kind === 'board') {
    if (world.board.item && !carrying) {
      chef.carrying = world.board.item;
      world.board.item = null;
      world.board.chop = 0;
      audio.pickup();
      return;
    }
    if (!world.board.item && carrying && !carrying.plate && INGREDIENTS[carrying.kind].chop && carrying.state === 'raw') {
      world.board.item = carrying;
      world.board.chop = 0;
      chef.carrying = null;
      audio.place();
      return;
    }
    if (world.board.item) {
      audio.error();
      showMessage(world, 'Talenan penuh — potong dulu (tahan Spasi)!');
    } else {
      audio.error();
      showMessage(world, 'Yang bisa dipotong: selada, tomat, bawang.');
    }
    return;
  }

  if (station.kind === 'grill') {
    if (carrying && !carrying.plate && carrying.kind === 'patty' && carrying.state === 'raw') {
      const slot = world.grill.find((s) => !s.item);
      if (slot) {
        slot.item = carrying;
        slot.t = 0;
        chef.carrying = null;
        audio.place();
        audio.sizzleStart();
      } else {
        audio.error();
        showMessage(world, 'Panggangan penuh!');
      }
      return;
    }
    const cooked = world.grill.find((s) => s.item && s.item.state === 'cooked');
    if (cooked && !carrying) {
      chef.carrying = cooked.item;
      cooked.item = null;
      cooked.t = 0;
      audio.pickup();
      if (!world.grill.some((s) => s.item)) audio.sizzleStop();
      return;
    }
    const burnt = world.grill.find((s) => s.item && s.item.state === 'burnt');
    if (burnt) {
      burnt.item = null;
      burnt.t = 0;
      audio.error();
      showMessage(world, 'Gosong! Dibuang.');
      if (!world.grill.some((s) => s.item)) audio.sizzleStop();
      return;
    }
    audio.error();
    showMessage(world, 'Panggangan: taruh patty mentah di sini.');
    return;
  }

  if (station.kind === 'plating') {
    if (carrying && carrying.plate) {
      if (world.plate.items.length === 0) {
        world.plate.items = carrying.items;
        chef.carrying = null;
        audio.place();
      } else {
        audio.error();
        showMessage(world, 'Meja plating sudah ada piring.');
      }
      return;
    }
    if (carrying && !carrying.plate) {
      if (world.plate.items.length >= 5) {
        audio.error();
        showMessage(world, 'Piring penuh!');
        return;
      }
      world.plate.items.push(carrying);
      chef.carrying = null;
      audio.place();
      return;
    }
    if (!carrying && world.plate.items.length > 0) {
      chef.carrying = { plate: true, items: world.plate.items };
      world.plate.items = [];
      audio.pickup();
      return;
    }
    audio.error();
    showMessage(world, 'Bawa bahan ke meja plating untuk merakit.');
    return;
  }

  if (station.kind === 'serve') {
    if (carrying && carrying.plate) {
      servePlate(world, audio);
      return;
    }
    audio.error();
    showMessage(world, 'Bawa piring yang sudah lengkap ke jendela serve.');
    return;
  }

  if (station.kind === 'trash') {
    if (carrying) {
      chef.carrying = null;
      audio.place();
      return;
    }
    if (world.board.item) {
      world.board.item = null;
      world.board.chop = 0;
      audio.place();
      return;
    }
    return;
  }
}

function resolveSolids(chef) {
  for (const solid of SOLIDS) {
    const nx = Math.max(solid.x, Math.min(chef.x, solid.x + solid.w));
    const ny = Math.max(solid.y, Math.min(chef.y, solid.y + solid.h));
    const dx = chef.x - nx;
    const dy = chef.y - ny;
    const d = Math.hypot(dx, dy);
    if (d < CHEF_RADIUS && d > 0.001) {
      chef.x = nx + (dx / d) * CHEF_RADIUS;
      chef.y = ny + (dy / d) * CHEF_RADIUS;
    } else if (d <= 0.001) {
      chef.y = solid.y + solid.h + CHEF_RADIUS;
    }
  }
}

function spawnTicket(world) {
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  const patience = patienceAt(world.elapsed);
  world.tickets.push({
    id: ticketSeq++,
    recipe,
    patience,
    patienceMax: patience,
    born: world.elapsed,
  });
}

export function startShift(world) {
  world.phase = 'playing';
  world.elapsed = 0;
  world.score = 0;
  world.combo = 0;
  world.bestCombo = 0;
  world.served = 0;
  world.missed = 0;
  world.tickets = [];
  world.spawnTimer = 1.5;
  world.floaters = [];
  world.chef.carrying = null;
  world.chef.x = VIEW_W / 2;
  world.chef.y = 330;
  world.board = { item: null, chop: 0 };
  world.grill = [
    { item: null, t: 0 },
    { item: null, t: 0 },
  ];
  world.plate = { items: [] };
  world.message = null;
}

export function update(world, input, audio, dt) {
  if (world.phase !== 'playing') return;
  dt = Math.min(dt, 0.05);
  world.elapsed += dt;

  // --- orders -------------------------------------------------------------
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    if (world.tickets.length < MAX_TICKETS) spawnTicket(world);
    world.spawnTimer = spawnIntervalAt(world.elapsed);
  }
  for (const ticket of world.tickets) ticket.patience -= dt;
  const expired = world.tickets.filter((t) => t.patience <= 0);
  if (expired.length > 0) {
    world.tickets = world.tickets.filter((t) => t.patience > 0);
    world.missed += expired.length;
    world.combo = 0;
    audio.expired();
    showMessage(world, 'Pesanan lewat — kombo putus!');
  }

  // --- grill --------------------------------------------------------------
  for (const slot of world.grill) {
    if (!slot.item) continue;
    slot.t += dt;
    if (slot.item.state === 'raw' && slot.t >= GRILL_COOK_SECONDS) {
      slot.item.state = 'cooked';
      audio.tick();
    } else if (slot.item.state === 'cooked' && slot.t >= GRILL_BURN_SECONDS) {
      slot.item.state = 'burnt';
      audio.expired();
      showMessage(world, 'Patty gosong di panggangan!');
    }
  }

  // --- chopping -----------------------------------------------------------
  const nearBoard = distToStation(world.chef, STATIONS.board) <= INTERACT_DIST;
  if (nearBoard && world.board.item && world.board.item.state === 'raw' && input.chopHeld) {
    world.board.chop += dt / CHOP_SECONDS;
    world.chopTick -= dt;
    if (world.chopTick <= 0) {
      audio.chop();
      world.chopTick = 0.22;
    }
    if (world.board.chop >= 1) {
      world.board.item.state = 'chopped';
      world.board.chop = 0;
      audio.chopDone();
    }
  }

  // --- movement -----------------------------------------------------------
  const chef = world.chef;
  const mv = input.moveVector();
  chef.moving = false;
  if (mv.x !== 0 || mv.y !== 0) {
    chef.x += mv.x * CHEF_SPEED * dt;
    chef.y += mv.y * CHEF_SPEED * dt;
    chef.dirX = mv.x;
    chef.dirY = mv.y;
    chef.moving = true;
    world.moveTarget = null;
    world.pendingStation = null;
  } else if (world.moveTarget) {
    const dx = world.moveTarget.x - chef.x;
    const dy = world.moveTarget.y - chef.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      world.moveTarget = null;
    } else {
      chef.x += (dx / d) * CHEF_SPEED * dt;
      chef.y += (dy / d) * CHEF_SPEED * dt;
      chef.dirX = dx / d;
      chef.dirY = dy / d;
      chef.moving = true;
    }
  }
  chef.x = Math.max(20, Math.min(VIEW_W - 20, chef.x));
  chef.y = Math.max(HUD_H + 8, Math.min(VIEW_H - 20, chef.y));
  resolveSolids(chef);

  // --- clicks ---------------------------------------------------------------
  if (input.clicked && input.clickPos) {
    const hit = stationAtPoint(input.clickPos.x, input.clickPos.y);
    if (hit) {
      const c = stationCenter(hit);
      world.moveTarget = { x: c.x, y: Math.min(c.y + hit.h / 2 + 30, VIEW_H - 30) };
      world.pendingStation = hit;
    } else {
      world.moveTarget = { x: input.clickPos.x, y: Math.max(input.clickPos.y, HUD_H + 12) };
      world.pendingStation = null;
    }
  }
  if (world.pendingStation) {
    if (distToStation(chef, world.pendingStation) <= INTERACT_DIST) {
      interact(world, world.pendingStation, audio);
      world.pendingStation = null;
      world.moveTarget = null;
    }
  }

  // --- keyboard interact ----------------------------------------------------
  if (input.interactPressed) {
    const station = nearestStation(world);
    if (station) interact(world, station, audio);
  }

  // --- floaters / messages --------------------------------------------------
  for (const f of world.floaters) f.t += dt;
  world.floaters = world.floaters.filter((f) => f.t < f.life);
  if (world.messageT > 0) {
    world.messageT -= dt;
    if (world.messageT <= 0) world.message = null;
  }

  // --- rush sizzle state ----------------------------------------------------
  if (!world.grill.some((s) => s.item)) audio.sizzleStop();

  if (world.elapsed >= SHIFT_SECONDS) {
    world.phase = 'end';
    audio.sizzleStop();
  }
}

export function rushNow(world) {
  return isRush(world.elapsed);
}
