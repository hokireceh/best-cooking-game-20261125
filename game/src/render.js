// Dapur Kilat — render: everything the player sees, drawn on one canvas.
// One job: turn the world state into pictures. It never mutates the world.
// All art is drawn with canvas paths (no image files, no fonts to load).

import {
  CHEF_RADIUS,
  HUD_H,
  INGREDIENTS,
  PALETTE,
  SHIFT_SECONDS,
  VIEW_H,
  VIEW_W,
} from './config.js';
import { STATIONS } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// --- ingredient icons -------------------------------------------------------

export function drawIngredientIcon(ctx, kind, state, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  const u = s / 2;
  if (kind === 'bun') {
    ctx.fillStyle = '#c98d4a';
    roundRect(ctx, -u, -u * 0.2, s, u * 0.7, 4);
    ctx.fill();
    ctx.fillStyle = '#e8b96e';
    ctx.beginPath();
    ctx.arc(0, -u * 0.15, u * 0.85, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    for (const [sx, sy] of [[-0.4, -0.5], [0, -0.7], [0.4, -0.5]]) {
      ctx.beginPath();
      ctx.arc(sx * u, sy * u, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#1d1512' : state === 'cooked' ? '#5d3a1e' : '#8a5a35';
    ctx.beginPath();
    ctx.ellipse(0, 0, u, u * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'cooked') {
      ctx.strokeStyle = '#3d2712';
      ctx.lineWidth = 2;
      for (const gx of [-0.45, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(gx * u, -u * 0.45);
        ctx.lineTo(gx * u, u * 0.45);
        ctx.stroke();
      }
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = state === 'chopped' ? '#79c25e' : '#4d8f3e';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-u * 0.45 + i * u * 0.45, (i % 2 === 0 ? -u * 0.15 : u * 0.2), u * 0.5, u * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#2f6b24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-u * 0.5, 0);
    ctx.lineTo(u * 0.5, 0);
    ctx.stroke();
  } else if (kind === 'tomato') {
    ctx.fillStyle = state === 'chopped' ? '#e86a55' : '#c93a2c';
    ctx.beginPath();
    ctx.arc(0, 0, u * 0.85, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'chopped') {
      ctx.fillStyle = '#f2a594';
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d94f3d';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * u * 0.3, Math.sin(a) * u * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#58a34a';
      ctx.beginPath();
      ctx.ellipse(0, -u * 0.8, u * 0.35, u * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = '#f2b234';
    ctx.beginPath();
    ctx.moveTo(-u, u * 0.6);
    ctx.lineTo(u, u * 0.6);
    ctx.lineTo(u, -u * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d18f1d';
    for (const [hx, hy] of [[-0.4, 0.25], [0.15, 0.35], [0.45, 0.05]]) {
      ctx.beginPath();
      ctx.arc(hx * u, hy * u, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'onion') {
    ctx.fillStyle = state === 'chopped' ? '#cfa0d8' : '#a86bb5';
    ctx.beginPath();
    ctx.arc(0, 0, u * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#efe0f2';
    ctx.lineWidth = 2;
    for (const r of [0.55, 0.3]) {
      ctx.beginPath();
      ctx.arc(0, 0, u * r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- kitchen ----------------------------------------------------------------

function drawFloor(ctx, t) {
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  ctx.fillStyle = PALETTE.floorB;
  const tile = 64;
  for (let y = 0; y < (VIEW_H - HUD_H) / tile; y++) {
    for (let x = 0; x < VIEW_W / tile; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * tile, HUD_H + y * tile, tile, tile);
    }
  }
  void t;
}

function drawWall(ctx) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = PALETTE.wallTrim;
  ctx.fillRect(0, HUD_H - 8, VIEW_W, 8);
}

function drawCrates(ctx, world) {
  for (const crate of STATIONS.crates) {
    ctx.fillStyle = PALETTE.counterSide;
    roundRect(ctx, crate.x, crate.y, crate.w, crate.h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, crate.x + 4, crate.y + 4, crate.w - 8, crate.h - 8, 6);
    ctx.fill();
    drawIngredientIcon(ctx, crate.ingredient, 'raw', crate.x + crate.w / 2, crate.y + 26, 34);
    text(ctx, INGREDIENTS[crate.ingredient].label, crate.x + crate.w / 2, crate.y + crate.h - 11, 13, PALETTE.ink);
    if (world.chef.carrying) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      roundRect(ctx, crate.x, crate.y, crate.w, crate.h, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawBoard(ctx, world) {
  const b = STATIONS.board;
  ctx.fillStyle = PALETTE.counterSide;
  roundRect(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.boardWood;
  roundRect(ctx, b.x + 8, b.y + 8, b.w - 16, b.h - 16, 6);
  ctx.fill();
  if (world.board.item) {
    drawIngredientIcon(ctx, world.board.item.kind, world.board.item.state, b.x + 70, b.y + b.h / 2, 44);
    if (world.board.item.state === 'raw') {
      const cx = b.x + 150;
      const cy = b.y + b.h / 2;
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#00000033';
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#2f7d7a';
      ctx.beginPath();
      ctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * world.board.chop);
      ctx.stroke();
      text(ctx, 'TAHAN SPASI', cx, cy + 34, 10, PALETTE.ink);
    }
  } else {
    text(ctx, 'TALENAN', b.x + b.w / 2, b.y + b.h / 2 - 8, 14, '#7a5a34');
    text(ctx, 'taruh bahan, tahan Spasi', b.x + b.w / 2, b.y + b.h / 2 + 12, 11, '#7a5a34', 'center', 'normal');
  }
}

function drawGrill(ctx, world) {
  const g = STATIONS.grill;
  ctx.fillStyle = PALETTE.counterSide;
  roundRect(ctx, g.x, g.y, g.w, g.h, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.grillMetal;
  roundRect(ctx, g.x + 8, g.y + 8, g.w - 16, g.h - 16, 6);
  ctx.fill();
  ctx.strokeStyle = '#2c2c34';
  ctx.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(g.x + 14, g.y + 8 + i * 14);
    ctx.lineTo(g.x + g.w - 14, g.y + 8 + i * 14);
    ctx.stroke();
  }
  world.grill.forEach((slot, i) => {
    const cx = g.x + 70 + i * 140;
    const cy = g.y + g.h / 2;
    if (slot.item) {
      const glow = slot.item.state === 'raw' ? 0.5 + 0.5 * Math.sin(Date.now() / 180) : 0;
      if (glow > 0) {
        ctx.fillStyle = `rgba(255, 120, 40, ${0.25 * glow})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
        ctx.fill();
      }
      drawIngredientIcon(ctx, 'patty', slot.item.state, cx, cy, 52);
      const frac = slot.item.state === 'raw'
        ? slot.t / 6
        : slot.item.state === 'cooked'
          ? 1 - (slot.t - 6) / 6
          : 0;
      ctx.fillStyle = '#00000055';
      roundRect(ctx, cx - 26, cy + 32, 52, 7, 3);
      ctx.fill();
      ctx.fillStyle = slot.item.state === 'burnt' ? '#1d1512' : slot.item.state === 'cooked' ? '#f2b234' : '#e86a55';
      roundRect(ctx, cx - 26, cy + 32, 52 * Math.max(0, Math.min(1, frac)), 7, 3);
      ctx.fill();
      if (slot.item.state === 'burnt') text(ctx, 'GOSONG!', cx, cy - 38, 12, '#fff');
      else if (slot.item.state === 'cooked') text(ctx, 'MATANG', cx, cy - 38, 11, '#ffe9a8');
    }
  });
  text(ctx, 'PANGGANGAN', g.x + g.w / 2, g.y - 12, 12, PALETTE.cream);
}

function drawPlating(ctx, world) {
  const p = STATIONS.plating;
  ctx.fillStyle = PALETTE.counterSide;
  roundRect(ctx, p.x, p.y, p.w, p.h, 12);
  ctx.fill();
  ctx.fillStyle = '#f2e3c6';
  roundRect(ctx, p.x + 8, p.y + 8, p.w - 16, p.h - 16, 8);
  ctx.fill();
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  ctx.fillStyle = PALETTE.plateWhite;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 120, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8c9a8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 120, 46, 0, 0, Math.PI * 2);
  ctx.stroke();
  const items = world.plate.items;
  items.forEach((item, i) => {
    drawIngredientIcon(ctx, item.kind, item.state, cx - (items.length - 1) * 26 + i * 52, cy - 6 - (i % 2) * 8, 40);
  });
  if (items.length === 0) {
    text(ctx, 'MEJA PLATING — rakit hidangan di sini', cx, cy - 40, 13, '#8a7a5e', 'center', 'normal');
  }
  text(ctx, 'PLATING', p.x + p.w - 16, p.y + 18, 11, '#8a7a5e', 'right');
}

function drawServe(ctx, world) {
  const s = STATIONS.serve;
  ctx.fillStyle = '#5d3a28';
  roundRect(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fill();
  ctx.fillStyle = '#2b1a12';
  roundRect(ctx, s.x + 10, s.y + 10, s.w - 20, s.h - 20, 8);
  ctx.fill();
  const ready = world.chef.carrying && world.chef.carrying.plate;
  ctx.fillStyle = ready ? '#ffd94d' : '#f2e3c6';
  ctx.beginPath();
  ctx.arc(s.x + s.w / 2, s.y + 34, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b1a12';
  ctx.fillRect(s.x + s.w / 2 - 2, s.y + 34, 4, 10);
  text(ctx, 'JENDELA SERVE', s.x + s.w / 2, s.y + s.h - 18, 14, PALETTE.cream);
  text(ctx, ready ? 'Piring siap — tekan E!' : 'antar piring lengkap ke sini', s.x + s.w / 2, s.y + s.h - 38, 11, ready ? '#ffd94d' : '#cbb693', 'center', 'normal');
  if (ready) {
    ctx.strokeStyle = `rgba(255, 217, 77, ${0.5 + 0.5 * Math.sin(Date.now() / 200)})`;
    ctx.lineWidth = 4;
    roundRect(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 12);
    ctx.stroke();
  }
}

function drawTrash(ctx) {
  const t = STATIONS.trash;
  ctx.fillStyle = '#5a5f6b';
  roundRect(ctx, t.x, t.y, t.w, t.h, 8);
  ctx.fill();
  ctx.fillStyle = '#3d414d';
  roundRect(ctx, t.x + 6, t.y - 6, t.w - 12, 14, 6);
  ctx.fill();
  text(ctx, 'SAMPAH', t.x + t.w / 2, t.y + t.h / 2 + 8, 13, '#dfe3ea');
}

function drawChef(ctx, world, time) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(time / 90) * 3 : 0;
  const x = chef.x;
  const y = chef.y + bob;
  ctx.save();
  ctx.shadowColor = '#00000044';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#fdf8ee';
  ctx.beginPath();
  ctx.arc(x, y, CHEF_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#2f7d7a';
  ctx.fillRect(x - CHEF_RADIUS, y - 4, CHEF_RADIUS * 2, 7);
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(x, y - 6, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdf8ee';
  ctx.beginPath();
  ctx.arc(x - 9, y - 16, 8, 0, Math.PI * 2);
  ctx.arc(x, y - 20, 9, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 16, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 13, y - 16, 26, 8);
  ctx.fillStyle = '#2e2118';
  const lookX = chef.dirX * 3;
  ctx.beginPath();
  ctx.arc(x - 5 + lookX, y - 7, 2, 0, Math.PI * 2);
  ctx.arc(x + 5 + lookX, y - 7, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (chef.carrying) {
    const cy = y - CHEF_RADIUS - 26;
    if (chef.carrying.plate) {
      ctx.fillStyle = PALETTE.plateWhite;
      ctx.beginPath();
      ctx.ellipse(x, cy, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8c9a8';
      ctx.lineWidth = 2;
      ctx.stroke();
      chef.carrying.items.forEach((item, i) => {
        drawIngredientIcon(ctx, item.kind, item.state, x - (chef.carrying.items.length - 1) * 11 + i * 22, cy - 4, 20);
      });
    } else {
      drawIngredientIcon(ctx, chef.carrying.kind, chef.carrying.state, x, cy, 36);
    }
  }
}

function drawFloaters(ctx, world) {
  for (const f of world.floaters) {
    const a = 1 - f.t / f.life;
    ctx.globalAlpha = a;
    text(ctx, f.text, f.x, f.y - f.t * 34, 22, f.color);
    ctx.globalAlpha = 1;
  }
}

// --- order board + HUD ------------------------------------------------------

function drawTickets(ctx, world, highlightRecipeId = null) {
  const slotW = 252;
  for (let i = 0; i < 4; i++) {
    const x = 16 + i * (slotW + 10);
    const y = 10;
    const ticket = world.tickets[i];
    ctx.fillStyle = ticket ? '#fdf8ee' : '#00000022';
    roundRect(ctx, x, y, slotW, 76, 8);
    ctx.fill();
    if (!ticket) {
      text(ctx, '—', x + slotW / 2, y + 38, 20, '#ffffff55');
      continue;
    }
    const urgent = ticket.patience < 12;
    const frac = Math.max(0, ticket.patience / ticket.patienceMax);
    if (highlightRecipeId === ticket.recipe.id) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 3;
      roundRect(ctx, x, y, slotW, 76, 8);
      ctx.stroke();
    }
    text(ctx, ticket.recipe.name.toUpperCase(), x + 12, y + 16, 14, PALETTE.ink, 'left');
    ticket.recipe.need.forEach((need, j) => {
      drawIngredientIcon(ctx, need.kind, need.state, x + 24 + j * 34, y + 44, 28);
    });
    const barColor = urgent ? '#c0392b' : frac > 0.5 ? '#58a34a' : '#f2b234';
    ctx.fillStyle = '#00000022';
    roundRect(ctx, x + 12, y + 64, slotW - 24, 7, 3);
    ctx.fill();
    ctx.fillStyle = barColor;
    roundRect(ctx, x + 12, y + 64, (slotW - 24) * frac, 7, 3);
    ctx.fill();
    if (urgent) text(ctx, `${Math.ceil(ticket.patience)}d`, x + slotW - 12, y + 16, 13, '#c0392b', 'right');
  }
}

function drawHud(ctx, world) {
  const remain = Math.max(0, SHIFT_SECONDS - world.elapsed);
  const mm = Math.floor(remain / 60);
  const ss = String(Math.floor(remain % 60)).padStart(2, '0');
  const rush = remain <= 30 && world.phase === 'playing';
  const tx = VIEW_W - 210;
  text(ctx, `${mm}:${ss}`, tx + 80, 30, 30, rush ? '#ff6b5e' : PALETTE.cream);
  text(ctx, 'SHIFT', tx + 80, 56, 11, '#cbb693');
  text(ctx, `SKOR ${world.score}`, tx + 80, 78, 16, '#ffd94d');
  if (world.combo >= 2) {
    ctx.fillStyle = '#2f7d7a';
    roundRect(ctx, 1060, 44, 120, 26, 13);
    ctx.fill();
    text(ctx, `KOMBO x${world.combo}`, 1120, 58, 14, '#fff');
  }
  if (rush) {
    ctx.fillStyle = `rgba(192, 57, 43, ${0.55 + 0.35 * Math.sin(Date.now() / 150)})`;
    roundRect(ctx, VIEW_W / 2 - 90, 8, 180, 30, 15);
    ctx.fill();
    text(ctx, 'RUSH! PESANAN DERAS', VIEW_W / 2, 24, 14, '#fff');
  }
  if (world.message) {
    ctx.fillStyle = '#2e2118dd';
    const w = ctx.measureText(world.message).width + 36;
    roundRect(ctx, VIEW_W / 2 - w / 2, HUD_H + 130, w, 34, 17);
    ctx.fill();
    text(ctx, world.message, VIEW_W / 2, HUD_H + 148, 15, '#ffe9a8');
  }
}

// --- screens ------------------------------------------------------------------

function drawTitle(ctx, world) {
  ctx.fillStyle = '#2e2118b8';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'DAPUR KILAT', VIEW_W / 2, 190, 84, '#ffd94d');
  text(ctx, 'Masak cepat, sajikan tepat waktu!', VIEW_W / 2, 250, 24, PALETTE.cream, 'center', 'normal');
  const lines = [
    'WASD / Panah — gerakkan koki      Klik — jalan ke titik itu',
    'E / Klik stasiun — ambil & letak bahan',
    'Tahan SPASI di talenan — potong bahan',
    'Patty di panggangan: matang 6 detik, gosong 12 detik!',
    'Rakit di meja plating, antar piring ke Jendela Serve',
    'Shift 150 detik — layani pesanan sebelum waktunya habis',
  ];
  lines.forEach((line, i) => text(ctx, line, VIEW_W / 2, 320 + i * 32, 18, '#f7ead0', 'center', 'normal'));
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 300);
  ctx.globalAlpha = pulse;
  text(ctx, 'Tekan ENTER atau klik untuk mulai  •  M = musik', VIEW_W / 2, 560, 20, '#ffd94d');
  ctx.globalAlpha = 1;
  void world;
}

function gradeFor(score, served) {
  if (served >= 12 || score >= 1600) return 'S';
  if (served >= 9 || score >= 1200) return 'A';
  if (served >= 6 || score >= 800) return 'B';
  return 'C';
}

function drawEnd(ctx, world) {
  ctx.fillStyle = '#2e2118c8';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fdf8ee';
  roundRect(ctx, VIEW_W / 2 - 300, 120, 600, 440, 18);
  ctx.fill();
  text(ctx, 'SHIFT SELESAI!', VIEW_W / 2, 170, 40, PALETTE.ink);
  text(ctx, `SKOR AKHIR  ${world.score}`, VIEW_W / 2, 240, 34, '#b97d1e');
  text(ctx, `Hidangan tersaji: ${world.served}`, VIEW_W / 2, 300, 20, PALETTE.ink, 'center', 'normal');
  text(ctx, `Pesanan lewat: ${world.missed}`, VIEW_W / 2, 332, 20, PALETTE.ink, 'center', 'normal');
  text(ctx, `Kombo terbaik: x${world.bestCombo}`, VIEW_W / 2, 364, 20, PALETTE.ink, 'center', 'normal');
  const grade = gradeFor(world.score, world.served);
  ctx.fillStyle = '#2f7d7a';
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 440, 42, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, grade, VIEW_W / 2, 442, 44, '#fff');
  text(ctx, 'Tekan ENTER untuk main lagi', VIEW_W / 2, 520, 18, '#8a7a5e', 'center', 'normal');
}

// --- main entry ---------------------------------------------------------------

export function render(ctx, world, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, time);
  drawWall(ctx);
  drawCrates(ctx, world);
  drawBoard(ctx, world);
  drawGrill(ctx, world);
  drawPlating(ctx, world);
  drawServe(ctx, world);
  drawTrash(ctx);
  drawChef(ctx, world, time);
  drawFloaters(ctx, world);
  const highlight = world.chef.carrying && world.chef.carrying.plate
    ? world.tickets.find((t) => {
        const wanted = t.recipe.need.map((n) => `${n.kind}:${n.state}`).sort().join('|');
        const got = world.chef.carrying.items.map((i) => `${i.kind}:${i.state}`).sort().join('|');
        return wanted === got;
      })?.recipe.id
    : null;
  drawTickets(ctx, world, highlight);
  drawHud(ctx, world);
  if (world.phase === 'title') drawTitle(ctx, world);
  if (world.phase === 'end') drawEnd(ctx, world);
}
