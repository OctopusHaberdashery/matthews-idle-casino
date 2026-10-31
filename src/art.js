/* ===== Drawing toolkit: felt, wood, chips, cards, dice, slot symbols, lights, particles, sound ===== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  bounce: (t) => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; },
};
const SERIF = '"Playfair Display", Georgia, "Noto Serif", serif';
const SANS = '"Roboto Condensed", "Roboto", "Helvetica Neue", Arial, sans-serif';

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

/* ---------- textures (generated once) ---------- */
const TEX = {};
function noiseTex(size, base, spread, alpha, seed) {
  const c = mkCanvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size);
  let x = seed || 7; const r = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * size; i++) {
    const n = (r() - 0.5) * spread;
    img.data[i * 4] = clamp(base[0] + n, 0, 255); img.data[i * 4 + 1] = clamp(base[1] + n, 0, 255);
    img.data[i * 4 + 2] = clamp(base[2] + n, 0, 255); img.data[i * 4 + 3] = alpha;
  }
  g.putImageData(img, 0, 0); return c;
}
function buildTextures() {
  TEX.felt = noiseTex(128, [128, 128, 128], 60, 26, 3);
  // carpet: deep burgundy with gold motif
  const c = mkCanvas(160, 160), g = c.getContext('2d');
  g.fillStyle = '#3a0b14'; g.fillRect(0, 0, 160, 160);
  g.drawImage(noiseTex(160, [60, 10, 20], 30, 90, 11), 0, 0);
  g.strokeStyle = 'rgba(214,170,80,0.22)'; g.lineWidth = 2;
  for (const [ox, oy] of [[0, 0], [80, 80], [160, 0], [0, 160], [160, 160]]) {
    g.save(); g.translate(ox, oy);
    for (let k = 0; k < 8; k++) { g.rotate(TAU / 8); g.beginPath(); g.ellipse(0, 22, 8, 22, 0, 0, TAU); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fillStyle = 'rgba(214,170,80,0.25)'; g.fill(); g.restore();
  }
  g.strokeStyle = 'rgba(30,90,110,0.35)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(80, 0); g.lineTo(160, 80); g.lineTo(80, 160); g.lineTo(0, 80); g.closePath(); g.stroke();
  for (const [ox, oy] of [[80, 0], [0, 80], [160, 80], [80, 160]]) { g.beginPath(); g.arc(ox, oy, 5, 0, TAU); g.fillStyle = 'rgba(40,140,150,0.35)'; g.fill(); }
  TEX.carpet = c;
  // wood grain
  const w = mkCanvas(256, 64), wg = w.getContext('2d');
  const grd = wg.createLinearGradient(0, 0, 0, 64); grd.addColorStop(0, '#5a2e12'); grd.addColorStop(0.5, '#7a4219'); grd.addColorStop(1, '#4a240d');
  wg.fillStyle = grd; wg.fillRect(0, 0, 256, 64);
  let sx = 5; const rr2 = () => ((sx = (sx * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    wg.strokeStyle = `rgba(${rr2() < 0.5 ? '30,12,4' : '150,90,45'},${0.08 + rr2() * 0.15})`; wg.lineWidth = 0.6 + rr2() * 1.6;
    wg.beginPath(); const y0 = rr2() * 64; wg.moveTo(0, y0);
    for (let x = 0; x <= 256; x += 16) wg.lineTo(x, y0 + Math.sin(x / 30 + i) * 3 + (rr2() - 0.5) * 2);
    wg.stroke();
  }
  TEX.wood = w;
}

/* ---------- room backdrop ---------- */
const roomCache = new Map();
function drawRoom(ctx, W, H, t, tint) {
  const px = SCENE_PX || 1, key = (tint || '') + '|' + px.toFixed(3);
  let c = roomCache.get(key);
  if (!c) {
    if (roomCache.size > 12) roomCache.clear();
    c = mkCanvas(W * px, H * px); const g0 = c.getContext('2d'); g0.scale(px, px);
    g0.fillStyle = g0.createPattern(TEX.carpet, 'repeat'); g0.fillRect(0, 0, W, H);
    const g = g0.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.5, W * 0.75);
    g.addColorStop(0, tint || 'rgba(255,200,120,0.10)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    g0.fillStyle = g; g0.fillRect(0, 0, W, H); roomCache.set(key, c);
  }
  ctx.drawImage(c, 0, 0, W, H);
  // drifting bokeh lights
  for (let i = 0; i < 14; i++) {
    const x = (i * 173 + t * 6 * (i % 3 + 1)) % (W + 80) - 40, y = 30 + ((i * 97) % 140);
    const r = 10 + (i * 7) % 22, a = 0.04 + 0.04 * Math.sin(t * 0.8 + i);
    const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = ['255,200,90', '255,120,120', '140,200,255'][i % 3];
    bg.addColorStop(0, `rgba(${col},${a * 2})`); bg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}

/* ---------- felt & rails ---------- */
function feltFill(ctx, x, y, w, h, color) {
  const c = color || ['#1d7a46', '#0f5530', '#073a1f'];
  const g = ctx.createRadialGradient(x + w / 2, y + h * 0.45, 10, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, c[0]); g.addColorStop(0.6, c[1]); g.addColorStop(1, c[2]);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = ctx.createPattern(TEX.felt, 'repeat'); ctx.fillRect(x, y, w, h); ctx.restore();
}
function leatherRail(ctx, pathFn, width) {
  ctx.save();
  pathFn(); ctx.lineWidth = width + 6; ctx.strokeStyle = '#1a0a05'; ctx.stroke();
  pathFn(); ctx.lineWidth = width; ctx.strokeStyle = '#3b1a0e'; ctx.stroke();
  pathFn(); ctx.lineWidth = width * 0.55; ctx.strokeStyle = '#5a2a16'; ctx.stroke();
  pathFn(); ctx.lineWidth = width * 0.18; ctx.strokeStyle = 'rgba(255,220,180,0.18)'; ctx.stroke();
  pathFn(); ctx.lineWidth = 2; ctx.setLineDash([2, 7]); ctx.strokeStyle = 'rgba(255,230,190,0.25)'; ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
function goldGrad(ctx, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff3c4'); g.addColorStop(0.35, '#f2c94c'); g.addColorStop(0.55, '#b07d1c'); g.addColorStop(0.8, '#f6d77a'); g.addColorStop(1, '#8a5a12');
  return g;
}
function goldText(ctx, text, x, y, size, opts = {}) {
  ctx.save();
  ctx.font = `${opts.italic ? 'italic ' : ''}${opts.weight || 700} ${size}px ${opts.font || SERIF}`;
  ctx.textAlign = opts.align || 'center'; ctx.textBaseline = 'middle';
  if (opts.glow) {
    if (IN_LAYER) { ctx.shadowColor = opts.glow; ctx.shadowBlur = size * 0.5; }
    else { const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.35; ctx.lineWidth = size * 0.32; ctx.lineJoin = 'round'; ctx.strokeStyle = opts.glow; ctx.strokeText(text, x, y); ctx.globalAlpha = a; }
  }
  ctx.lineWidth = Math.max(2, size * 0.09); ctx.strokeStyle = opts.stroke || 'rgba(40,20,0,0.85)'; ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = opts.color || goldGrad(ctx, y - size / 2, y + size / 2); ctx.fillText(text, x, y);
  ctx.restore();
}
function feltText(ctx, text, x, y, size, opts = {}) {
  ctx.save(); ctx.font = `${opts.weight || 700} ${size}px ${opts.font || SERIF}`; ctx.textAlign = opts.align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.color || 'rgba(255,240,200,0.55)'; if (opts.rot) { ctx.translate(x, y); ctx.rotate(opts.rot); ctx.fillText(text, 0, 0); } else ctx.fillText(text, x, y); ctx.restore();
}
function textOnArc(ctx, text, cx, cy, r, mid, size, color, inward) {
  ctx.save(); ctx.font = `700 ${size}px ${SERIF}`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const widths = [...text].map((ch) => ctx.measureText(ch).width + size * 0.08), total = widths.reduce((a, b) => a + b, 0);
  let a = mid - (total / r) / 2 * (inward ? -1 : 1);
  [...text].forEach((ch, i) => {
    const da = widths[i] / r; const ang = a + (da / 2) * (inward ? -1 : 1);
    ctx.save(); ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.rotate(ang + (inward ? -Math.PI / 2 : Math.PI / 2)); ctx.fillText(ch, 0, 0); ctx.restore();
    a += da * (inward ? -1 : 1);
  });
  ctx.restore();
}

/* ---------- chips ---------- */
const CHIP_COLS = [
  { v: 1, c: '#f4f1e8', e: '#3c6fc4' }, { v: 5, c: '#c62a2a', e: '#f4f1e8' }, { v: 25, c: '#1f8a45', e: '#f4f1e8' },
  { v: 100, c: '#1b1b1f', e: '#e9c46a' }, { v: 500, c: '#6b2fa8', e: '#f4f1e8' }, { v: 1000, c: '#e8a317', e: '#1b1b1f' },
  { v: 5000, c: '#c24a8d', e: '#fff' }, { v: 25000, c: '#16a6b6', e: '#1b1b1f' },
];
function chipStyleFor(amount, base) {
  const ratio = amount / (base || 1); let k = 0;
  const steps = [1, 2, 4, 10, 40, 200, 1000, 10000];
  for (let i = 0; i < steps.length; i++) if (ratio >= steps[i]) k = i;
  return CHIP_COLS[k];
}
const chipCache = new Map();
function drawChip(ctx, x, y, r, style, label, tilt = 0.45) {
  const px = SCENE_PX || 1, key = style.c + style.e + r + '|' + (label || '') + '|' + tilt + '|' + px.toFixed(2);
  let spr = chipCache.get(key);
  if (!spr) {
    if (chipCache.size > 300) chipCache.clear();
    const pad = 6, w = r * 2 + pad * 2 + 4, h = r * tilt * 2 + r * 0.22 + pad * 2 + 6;
    const c = mkCanvas(w * px, h * px), g = c.getContext('2d'); g.scale(px, px);
    drawChipRaw(g, pad + r, pad + r * tilt, r, style, label, tilt);
    spr = { c, ox: pad + r, oy: pad + r * tilt, w, h }; chipCache.set(key, spr);
  }
  ctx.drawImage(spr.c, x - spr.ox, y - spr.oy, spr.w, spr.h);
}
function drawChipRaw(ctx, x, y, r, style, label, tilt) {
  const ry = r * tilt, th = r * 0.22;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 2, y + th + 3, r * 1.02, ry * 1.05, 0, 0, TAU); ctx.fill();
  // edge
  ctx.fillStyle = shade(style.c, -0.35); ctx.beginPath(); ctx.ellipse(x, y + th, r, ry, 0, 0, Math.PI); ctx.lineTo(x - r, y); ctx.ellipse(x, y, r, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 6; i++) { // edge stripes
    const a = Math.PI * (0.1 + i * 0.16), ex = x + Math.cos(a) * r;
    ctx.fillStyle = style.e; ctx.fillRect(ex - r * 0.06, y + Math.sin(a) * ry, r * 0.12, th);
  }
  // face
  ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, TAU); ctx.fillStyle = style.c; ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.fillStyle = style.e; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * ry * 0.86, r * 0.11, ry * 0.16, a, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.66, ry * 0.66, 0, 0, TAU); ctx.strokeStyle = style.e; ctx.lineWidth = Math.max(1, r * 0.06); ctx.setLineDash([r * 0.12, r * 0.1]); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.56, ry * 0.56, 0, 0, TAU); ctx.fillStyle = shade(style.c, 0.12); ctx.fill();
  if (label && r > 9) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, tilt); ctx.font = `800 ${r * 0.52}px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = style.c === '#f4f1e8' ? '#222' : style.e; ctx.fillText(label, 0, 1); ctx.restore();
  }
  const hl = ctx.createLinearGradient(x - r, y - ry, x + r, y + ry); hl.addColorStop(0, 'rgba(255,255,255,0.35)'); hl.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, TAU); ctx.fillStyle = hl; ctx.fill();
  ctx.restore();
}
function chipStack(ctx, x, y, r, count, style, label) {
  const th = r * 0.22;
  for (let i = 0; i < count; i++) drawChip(ctx, x + ((i * 7) % 3 - 1) * 0.6, y - i * th, r, style, i === count - 1 ? label : '');
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; } else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/* ---------- suits & cards ---------- */
function suitPath(ctx, s, x, y, sz) {
  ctx.beginPath();
  if (s === 1) { // heart
    ctx.moveTo(x, y + sz * 0.42);
    ctx.bezierCurveTo(x - sz * 0.62, y - sz * 0.02, x - sz * 0.42, y - sz * 0.62, x, y - sz * 0.22);
    ctx.bezierCurveTo(x + sz * 0.42, y - sz * 0.62, x + sz * 0.62, y - sz * 0.02, x, y + sz * 0.42);
  } else if (s === 2) { // diamond
    ctx.moveTo(x, y - sz * 0.5); ctx.quadraticCurveTo(x + sz * 0.12, y - sz * 0.12, x + sz * 0.38, y); ctx.quadraticCurveTo(x + sz * 0.12, y + sz * 0.12, x, y + sz * 0.5);
    ctx.quadraticCurveTo(x - sz * 0.12, y + sz * 0.12, x - sz * 0.38, y); ctx.quadraticCurveTo(x - sz * 0.12, y - sz * 0.12, x, y - sz * 0.5);
  } else if (s === 0) { // spade
    ctx.moveTo(x, y - sz * 0.48);
    ctx.bezierCurveTo(x + sz * 0.6, y - sz * 0.05, x + sz * 0.5, y + sz * 0.38, x + sz * 0.06, y + sz * 0.16);
    ctx.quadraticCurveTo(x + sz * 0.1, y + sz * 0.38, x + sz * 0.24, y + sz * 0.48); ctx.lineTo(x - sz * 0.24, y + sz * 0.48);
    ctx.quadraticCurveTo(x - sz * 0.1, y + sz * 0.38, x - sz * 0.06, y + sz * 0.16);
    ctx.bezierCurveTo(x - sz * 0.5, y + sz * 0.38, x - sz * 0.6, y - sz * 0.05, x, y - sz * 0.48);
  } else { // club
    const r = sz * 0.2;
    ctx.arc(x, y - sz * 0.22, r, 0, TAU); ctx.moveTo(x - sz * 0.22 + r, y + sz * 0.06); ctx.arc(x - sz * 0.22, y + sz * 0.06, r, 0, TAU);
    ctx.moveTo(x + sz * 0.22 + r, y + sz * 0.06); ctx.arc(x + sz * 0.22, y + sz * 0.06, r, 0, TAU);
    ctx.moveTo(x - sz * 0.05, y); ctx.lineTo(x + sz * 0.05, y); ctx.quadraticCurveTo(x + sz * 0.08, y + sz * 0.36, x + sz * 0.22, y + sz * 0.48);
    ctx.lineTo(x - sz * 0.22, y + sz * 0.48); ctx.quadraticCurveTo(x - sz * 0.08, y + sz * 0.36, x - sz * 0.05, y);
  }
  ctx.closePath();
}
const suitCol = (s) => (s === 1 || s === 2 ? '#c8102e' : '#15151a');
function drawSuit(ctx, s, x, y, sz, flip) {
  ctx.save(); if (flip) { ctx.translate(x, y); ctx.rotate(Math.PI); x = 0; y = 0; }
  suitPath(ctx, s, x, y, sz); ctx.fillStyle = suitCol(s); ctx.fill(); ctx.restore();
}
const PIPS = {
  1: [[0.5, 0.5]], 2: [[0.5, 0.2], [0.5, 0.8]], 3: [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
  4: [[0.28, 0.2], [0.72, 0.2], [0.28, 0.8], [0.72, 0.8]], 5: [[0.28, 0.2], [0.72, 0.2], [0.5, 0.5], [0.28, 0.8], [0.72, 0.8]],
  6: [[0.28, 0.2], [0.72, 0.2], [0.28, 0.5], [0.72, 0.5], [0.28, 0.8], [0.72, 0.8]],
  7: [[0.28, 0.2], [0.72, 0.2], [0.5, 0.35], [0.28, 0.5], [0.72, 0.5], [0.28, 0.8], [0.72, 0.8]],
  8: [[0.28, 0.2], [0.72, 0.2], [0.5, 0.35], [0.28, 0.5], [0.72, 0.5], [0.5, 0.65], [0.28, 0.8], [0.72, 0.8]],
  9: [[0.28, 0.2], [0.72, 0.2], [0.28, 0.4], [0.72, 0.4], [0.5, 0.5], [0.28, 0.6], [0.72, 0.6], [0.28, 0.8], [0.72, 0.8]],
  10: [[0.28, 0.2], [0.72, 0.2], [0.5, 0.3], [0.28, 0.4], [0.72, 0.4], [0.28, 0.6], [0.72, 0.6], [0.5, 0.7], [0.28, 0.8], [0.72, 0.8]],
};
const cardCache = new Map();
function renderCardFace(card, w) {
  const key = card.r + '_' + card.s + '_' + w; if (cardCache.has(key)) return cardCache.get(key);
  const h = Math.round(w * 1.4), pad = 3, c = mkCanvas(w + pad * 2, h + pad * 2), g = c.getContext('2d');
  g.translate(pad, pad);
  rr(g, 0, 0, w, h, w * 0.08); const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#ece8de'); g.fillStyle = bg; g.fill();
  g.lineWidth = 1; g.strokeStyle = '#b9b2a2'; g.stroke();
  const col = suitCol(card.s), rk = RANKS[card.r];
  const idx = (flip) => {
    g.save(); if (flip) { g.translate(w, h); g.rotate(Math.PI); }
    g.fillStyle = col; g.font = `700 ${w * 0.24}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(rk, w * 0.14, w * 0.17); drawSuit(g, card.s, w * 0.14, w * 0.4, w * 0.17); g.restore();
  };
  idx(false); idx(true);
  const ix = w * 0.24, iy = h * 0.12, iw = w * 0.52, ih = h * 0.76;
  if (card.r >= 11) drawCourt(g, card, ix - w * 0.02, iy, iw + w * 0.04, ih);
  else if (card.r === 1) {
    if (card.s === 0) { drawSuit(g, 0, w / 2, h / 2, w * 0.62); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; suitPath(g, 0, w / 2, h / 2, w * 0.5); g.stroke(); }
    else drawSuit(g, card.s, w / 2, h / 2, w * 0.42);
  } else {
    PIPS[card.r].forEach(([px, py]) => drawSuit(g, card.s, ix + px * iw, iy + py * ih, w * 0.2, py > 0.55));
  }
  cardCache.set(key, c); return c;
}
function drawCourt(g, card, x, y, w, h) {
  g.save(); rr(g, x, y, w, h, 3); g.fillStyle = '#fbf6e8'; g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 1.2; g.stroke(); g.clip();
  const red = card.s === 1 || card.s === 2;
  const robe = red ? ['#c8102e', '#1f4fa8'] : ['#1f4fa8', '#c8102e'], gold = '#e3b23c';
  const half = (flip) => {
    g.save(); if (flip) { g.translate(x + w, y + h); g.rotate(Math.PI); g.translate(-x, -y); }
    const cx = x + w / 2, top = y;
    // robe
    g.fillStyle = robe[0]; g.beginPath(); g.moveTo(x, top + h * 0.5); g.lineTo(x, top + h * 0.33); g.quadraticCurveTo(cx, top + h * 0.22, x + w, top + h * 0.33); g.lineTo(x + w, top + h * 0.5); g.fill();
    g.fillStyle = robe[1]; g.beginPath(); g.moveTo(cx - w * 0.12, top + h * 0.5); g.lineTo(cx - w * 0.08, top + h * 0.28); g.lineTo(cx + w * 0.08, top + h * 0.28); g.lineTo(cx + w * 0.12, top + h * 0.5); g.fill();
    g.strokeStyle = gold; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, top + h * 0.36); g.quadraticCurveTo(cx, top + h * 0.26, x + w, top + h * 0.36); g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = gold; g.beginPath(); g.arc(x + w * (0.15 + i * 0.175), top + h * 0.43, w * 0.03, 0, TAU); g.fill(); }
    // head
    g.fillStyle = '#f2d2b0'; g.beginPath(); g.ellipse(cx, top + h * 0.2, w * 0.15, h * 0.085, 0, 0, TAU); g.fill();
    g.strokeStyle = '#7a4a2a'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#222'; g.beginPath(); g.arc(cx - w * 0.05, top + h * 0.19, 1.2, 0, TAU); g.arc(cx + w * 0.05, top + h * 0.19, 1.2, 0, TAU); g.fill();
    if (card.r === 13) { g.fillStyle = '#6b3b1a'; g.beginPath(); g.ellipse(cx, top + h * 0.27, w * 0.12, h * 0.04, 0, 0, Math.PI); g.fill(); }
    // headwear
    g.fillStyle = gold; g.strokeStyle = '#8a5a12'; g.lineWidth = 0.8;
    if (card.r === 13) { g.beginPath(); g.moveTo(cx - w * 0.17, top + h * 0.13); for (let i = 0; i <= 4; i++) { g.lineTo(cx - w * 0.17 + i * w * 0.085, top + h * (i % 2 ? 0.08 : 0.02)); } g.lineTo(cx + w * 0.17, top + h * 0.13); g.closePath(); g.fill(); g.stroke(); }
    else if (card.r === 12) { g.beginPath(); g.moveTo(cx - w * 0.15, top + h * 0.13); g.quadraticCurveTo(cx, top + h * 0.0, cx + w * 0.15, top + h * 0.13); g.closePath(); g.fill(); g.stroke(); g.fillStyle = robe[1]; g.beginPath(); g.arc(cx, top + h * 0.07, w * 0.03, 0, TAU); g.fill(); }
    else { g.fillStyle = robe[1]; g.beginPath(); g.moveTo(cx - w * 0.17, top + h * 0.14); g.quadraticCurveTo(cx, top + h * 0.03, cx + w * 0.2, top + h * 0.12); g.closePath(); g.fill(); g.strokeStyle = gold; g.stroke(); }
    g.restore();
  };
  half(false); half(true);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(x, y + h * 0.62); g.lineTo(x + w, y + h * 0.38); g.stroke();
  drawSuit(g, card.s, x + w * 0.16, y + h * 0.56, w * 0.16); drawSuit(g, card.s, x + w * 0.84, y + h * 0.44, w * 0.16, true);
  g.restore();
}
let cardBackCache = new Map();
function renderCardBack(w) {
  if (cardBackCache.has(w)) return cardBackCache.get(w);
  const h = Math.round(w * 1.4), pad = 3, c = mkCanvas(w + pad * 2, h + pad * 2), g = c.getContext('2d'); g.translate(pad, pad);
  rr(g, 0, 0, w, h, w * 0.08); g.fillStyle = '#fbfaf5'; g.fill(); g.strokeStyle = '#b9b2a2'; g.stroke();
  rr(g, w * 0.07, w * 0.07, w * 0.86, h - w * 0.14, w * 0.05); g.fillStyle = '#8f1020'; g.fill(); g.save(); g.clip();
  g.strokeStyle = 'rgba(255,215,150,0.45)'; g.lineWidth = 1;
  for (let i = -h; i < w + h; i += w * 0.1) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
  g.fillStyle = '#8f1020'; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.24, w * 0.3, 0, 0, TAU); g.fill();
  g.strokeStyle = '#e8c56b'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#e8c56b'; g.font = `italic 700 ${w * 0.3}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('M', w / 2, h / 2 + 1);
  g.restore(); cardBackCache.set(w, c); return c;
}
/* draws a card centered at x,y with width w; flip 0..1 (0 = back, 1 = face) */
function drawCard(ctx, card, x, y, w, flip = 1, opts = {}) {
  const dpr = SCENE_PX || 1, pw = Math.max(20, Math.round(w * dpr));
  const h = w * 1.4, sx = Math.abs(Math.cos(Math.PI * (1 - flip)));
  const face = flip >= 0.5;
  const img = face && card ? renderCardFace(card, pw) : renderCardBack(pw);
  ctx.save(); ctx.translate(x, y); if (opts.rot) ctx.rotate(opts.rot);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, -w / 2 * sx + 3, -h / 2 + 4, w * sx, h, w * 0.08); ctx.fill();
  ctx.scale(sx, 1);
  const k = w / pw; ctx.drawImage(img, -w / 2 - 3 * k, -h / 2 - 3 * k, img.width * k, img.height * k);
  if (opts.glow) { ctx.strokeStyle = opts.glow; ctx.globalAlpha = 0.3; ctx.lineWidth = 12; rr(ctx, -w / 2, -h / 2, w, h, w * 0.08); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.stroke(); }
  if (opts.dim) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, -w / 2, -h / 2, w, h, w * 0.08); ctx.fill(); }
  ctx.restore();
}
let SCENE_PX = 1;

/* ---------- dice ---------- */
const DIE_PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
function drawDie(ctx, x, y, s, v, rot = 0, color = '#c8102e', z = 0) {
  ctx.fillStyle = `rgba(0,0,0,${0.35 - z * 0.002})`; ctx.beginPath(); ctx.ellipse(x + 4 + z * 0.3, y + s * 0.45 + z * 0.5, s * 0.62, s * 0.22, 0, 0, TAU); ctx.fill();
  const S = s * 1.5, img = sprite('die' + color + v + '_' + s, S, S, (g) => { g.translate(S / 2, S / 2); drawDieBody(g, s, v, color); });
  ctx.save(); ctx.translate(x, y - z); if (rot) ctx.rotate(rot); ctx.drawImage(img, -S / 2, -S / 2, S, S); ctx.restore();
}
function drawDieBody(ctx, s, v, color) {
  rr(ctx, -s / 2, -s / 2 + s * 0.12, s, s, s * 0.18); ctx.fillStyle = shade(color, -0.45); ctx.fill();
  rr(ctx, -s / 2, -s / 2, s, s, s * 0.18);
  const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, shade(color, 0.28)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, -0.25));
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  const pc = color === '#f5f2ea' ? '#1a1a1a' : '#fff';
  for (const [px, py] of DIE_PIPS[v]) {
    ctx.beginPath(); ctx.arc(px * s * 0.26, py * s * 0.26, s * 0.085, 0, TAU); ctx.fillStyle = pc; ctx.fill();
    ctx.beginPath(); ctx.arc(px * s * 0.26 + s * 0.015, py * s * 0.26 + s * 0.02, s * 0.085, 0, Math.PI); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  }
  const hl = ctx.createRadialGradient(-s * 0.25, -s * 0.3, 0, -s * 0.2, -s * 0.2, s * 0.7); hl.addColorStop(0, 'rgba(255,255,255,0.45)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  rr(ctx, -s / 2, -s / 2, s, s, s * 0.18); ctx.fillStyle = hl; ctx.fill();
}

/* ---------- slot symbols (cached) ---------- */
const symCache = new Map();
function slotSymbol(name, size) {
  const key = name + size; if (symCache.has(key)) return symCache.get(key);
  const c = mkCanvas(size, size), g = c.getContext('2d'), s = size, m = s / 2;
  g.translate(m, m); g.scale(s / 100, s / 100);
  const sh = () => { g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 6; g.shadowOffsetY = 3; };
  const ns = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; };
  const ball = (x, y, r, c0, c1) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  if (name === 'cherry') {
    g.strokeStyle = '#2f7d22'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-18, 14); g.quadraticCurveTo(-6, -20, 10, -32); g.stroke(); g.beginPath(); g.moveTo(18, 18); g.quadraticCurveTo(14, -10, 10, -32); g.stroke();
    g.fillStyle = '#3fae2e'; g.beginPath(); g.ellipse(22, -30, 16, 7, -0.4, 0, TAU); g.fill(); g.strokeStyle = '#1f6a17'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, -32); g.lineTo(34, -36); g.stroke();
    sh(); ball(-18, 20, 19, '#ff8a8a', '#a00010'); ball(18, 24, 19, '#ff8a8a', '#a00010'); ns();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-24, 12, 5, 3, -0.6, 0, TAU); g.ellipse(12, 16, 5, 3, -0.6, 0, TAU); g.fill();
  } else if (name === 'lemon') {
    sh(); const gr = g.createRadialGradient(-12, -12, 4, 0, 0, 40); gr.addColorStop(0, '#fffbb0'); gr.addColorStop(0.6, '#f7d917'); gr.addColorStop(1, '#c49a00');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 38, 28, -0.25, 0, TAU); g.fill(); ns();
    g.fillStyle = '#e8c400'; g.beginPath(); g.ellipse(-37, 9, 6, 5, 0, 0, TAU); g.ellipse(37, -9, 6, 5, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(160,120,0,0.25)'; for (let i = 0; i < 25; i++) { g.beginPath(); g.arc(-28 + (i * 37) % 56, -16 + (i * 23) % 32, 1.2, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-14, -12, 10, 4, -0.5, 0, TAU); g.fill();
  } else if (name === 'orange') {
    sh(); ball(0, 4, 34, '#ffd08a', '#e06a00'); ns();
    g.fillStyle = 'rgba(150,60,0,0.25)'; for (let i = 0; i < 40; i++) { const a = i * 2.4, r = (i * 13) % 30; g.beginPath(); g.arc(Math.cos(a) * r, 4 + Math.sin(a) * r, 1.1, 0, TAU); g.fill(); }
    g.fillStyle = '#3fae2e'; g.beginPath(); g.ellipse(10, -32, 14, 6, -0.5, 0, TAU); g.fill(); g.fillStyle = '#5a3a14'; g.fillRect(-2, -34, 4, 8);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-13, -10, 9, 5, -0.6, 0, TAU); g.fill();
  } else if (name === 'plum') {
    sh(); const gr = g.createRadialGradient(-12, -10, 4, 0, 4, 40); gr.addColorStop(0, '#d89cf0'); gr.addColorStop(0.5, '#7a2aa0'); gr.addColorStop(1, '#3a0a52');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 5, 31, 35, 0.15, 0, TAU); g.fill(); ns();
    g.strokeStyle = 'rgba(40,0,60,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-2, -28); g.quadraticCurveTo(10, 5, 2, 38); g.stroke();
    g.fillStyle = '#3fae2e'; g.beginPath(); g.ellipse(-12, -32, 13, 5, 0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-14, -8, 6, 10, 0.2, 0, TAU); g.fill();
  } else if (name === 'bell') {
    sh(); const gr = g.createLinearGradient(-35, 0, 35, 0); gr.addColorStop(0, '#9a6a0c'); gr.addColorStop(0.3, '#ffe27a'); gr.addColorStop(0.55, '#f2b81c'); gr.addColorStop(1, '#8a5a08');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-6, -36); g.quadraticCurveTo(-30, -30, -28, 6); g.quadraticCurveTo(-30, 22, -40, 28); g.lineTo(40, 28); g.quadraticCurveTo(30, 22, 28, 6); g.quadraticCurveTo(30, -30, 6, -36); g.closePath(); g.fill(); ns();
    g.fillStyle = '#b8860b'; g.fillRect(-40, 26, 80, 6); g.beginPath(); g.arc(0, 36, 8, 0, TAU); g.fillStyle = '#d8a420'; g.fill();
    g.fillStyle = '#c99410'; g.beginPath(); g.arc(0, -38, 6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-14, -8, 5, 16, 0.1, 0, TAU); g.fill();
  } else if (name === 'bar') {
    sh(); rr(g, -42, -20, 84, 40, 6); g.fillStyle = '#111'; g.fill(); ns(); g.strokeStyle = '#e9c46a'; g.lineWidth = 3; rr(g, -40, -18, 80, 36, 5); g.stroke();
    g.font = `900 30px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = goldGrad(g, -14, 14); g.fillText('BAR', 0, 2);
  } else if (name === 'seven') {
    g.lineJoin = 'round';
    const path = () => { g.beginPath(); g.moveTo(-30, -36); g.lineTo(32, -36); g.lineTo(32, -24); g.quadraticCurveTo(4, 2, -2, 38); g.lineTo(-20, 38); g.quadraticCurveTo(-12, 4, 12, -20); g.lineTo(-30, -20); g.closePath(); };
    sh(); path(); g.fillStyle = '#f2c94c'; g.lineWidth = 10; g.strokeStyle = '#7a4a00'; g.stroke(); g.fill(); ns();
    path(); const gr = g.createLinearGradient(0, -36, 0, 38); gr.addColorStop(0, '#ff5a5a'); gr.addColorStop(0.5, '#d0101e'); gr.addColorStop(1, '#7a0010');
    g.save(); g.scale(0.86, 0.86); g.translate(1, 0); path(); g.fillStyle = gr; g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(-24, -33); g.lineTo(26, -33); g.lineTo(24, -29); g.lineTo(-24, -29); g.fill();
  } else if (name === 'diamond') {
    sh(); g.beginPath(); g.moveTo(-36, -12); g.lineTo(-20, -32); g.lineTo(20, -32); g.lineTo(36, -12); g.lineTo(0, 36); g.closePath();
    const gr = g.createLinearGradient(-30, -30, 30, 30); gr.addColorStop(0, '#d9f6ff'); gr.addColorStop(0.5, '#3fb7ff'); gr.addColorStop(1, '#0a4f9a'); g.fillStyle = gr; g.fill(); ns();
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-36, -12); g.lineTo(36, -12); g.moveTo(-20, -32); g.lineTo(-10, -12); g.lineTo(0, -32); g.lineTo(10, -12); g.lineTo(20, -32);
    g.moveTo(-10, -12); g.lineTo(0, 36); g.lineTo(10, -12); g.moveTo(-36, -12); g.lineTo(0, 36); g.lineTo(36, -12); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(-24, -28); g.lineTo(-18, -16); g.lineTo(-28, -16); g.fill();
    g.fillStyle = '#fff'; g.font = `900 13px ${SANS}`; g.textAlign = 'center'; g.fillText('WILD', 0, 8);
  }
  symCache.set(key, c); return c;
}

/* ---------- marquee bulbs ---------- */
const bulbCache = new Map();
function bulbSprite(on, color) {
  const px = SCENE_PX || 1, key = on + '|' + (color || '') + '|' + px.toFixed(2);
  let c = bulbCache.get(key); if (c) return c;
  const r = 4.2, R = r * 3.2; c = mkCanvas(R * 2 * px, R * 2 * px); const g = c.getContext('2d'); g.scale(px, px);
  if (on) { const gr = g.createRadialGradient(R, R, 0, R, R, R); gr.addColorStop(0, color || 'rgba(255,230,140,0.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(R, R, r, 0, TAU); g.fillStyle = on ? '#fff6c8' : '#6a5320'; g.fill();
  bulbCache.set(key, c); return c;
}
function bulbRow(ctx, pts, t, phase, color) {
  const onS = bulbSprite(true, color), offS = bulbSprite(false), R = 4.2 * 3.2, f = Math.floor(t * 6);
  for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; ctx.drawImage(((f + i) % 3) !== phase ? onS : offS, x - R, y - R, R * 2, R * 2); }
}
function rectBulbs(x, y, w, h, gap) {
  const pts = [];
  for (let px = x; px <= x + w; px += gap) pts.push([px, y]);
  for (let py = y + gap; py <= y + h; py += gap) pts.push([x + w, py]);
  for (let px = x + w - gap; px >= x; px -= gap) pts.push([px, y + h]);
  for (let py = y + h - gap; py > y; py -= gap) pts.push([x, py]);
  return pts;
}

/* ---------- small cached sprites ---------- */
let IN_LAYER = false;
const spriteCache = new Map();
function sprite(key, w, h, fn) {
  const px = SCENE_PX || 1, k = key + '|' + w + 'x' + h + '|' + px.toFixed(2);
  let c = spriteCache.get(k); if (c) return c;
  c = mkCanvas(w * px, h * px); const g = c.getContext('2d'); g.scale(px, px); fn(g, w, h); spriteCache.set(k, c); return c;
}
function kenoBallSprite(col) {
  return sprite('kball' + col, 22, 22, (g) => { const bg = g.createRadialGradient(8, 8, 1, 11, 11, 11); bg.addColorStop(0, '#fff'); bg.addColorStop(1, col); g.beginPath(); g.arc(11, 11, 10, 0, TAU); g.fillStyle = bg; g.fill(); });
}
function coinSprite() {
  return sprite('coin', 26, 26, (g) => { g.translate(13, 13); g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fillStyle = goldGrad(g, -12, 12); g.fill(); g.strokeStyle = '#8a5a12'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#8a5a12'; g.font = `800 15px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 1); });
}
function ballSprite() {
  return sprite('ball', 25, 25, (g) => { g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(14, 14, 9, 0, TAU); g.fill();
    const bg = g.createRadialGradient(8, 8, 1, 11, 11, 9); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.6, '#e6e6e6'); bg.addColorStop(1, '#9a9a9a'); g.beginPath(); g.arc(11, 11, 9, 0, TAU); g.fillStyle = bg; g.fill(); });
}
function knobSprite() {
  return sprite('knob', 40, 40, (g) => { const kb = g.createRadialGradient(14, 14, 2, 20, 20, 20); kb.addColorStop(0, '#ff9a9a'); kb.addColorStop(1, '#9a0010'); g.fillStyle = kb; g.beginPath(); g.arc(20, 20, 18, 0, TAU); g.fill(); });
}
function reelBackdrop(w, h) {
  return sprite('reelbg', w, h, (g) => { const cyl = g.createLinearGradient(0, 0, 0, h); cyl.addColorStop(0, '#9a9a9a'); cyl.addColorStop(0.18, '#f4f4f0'); cyl.addColorStop(0.5, '#ffffff'); cyl.addColorStop(0.82, '#f4f4f0'); cyl.addColorStop(1, '#8a8a8a'); g.fillStyle = cyl; g.fillRect(0, 0, w, h); });
}
function reelShade(w, h) {
  return sprite('reelshade', w, h, (g) => { const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(0.2, 'rgba(0,0,0,0)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = sh; g.fillRect(0, 0, w, h); });
}

/* ---------- particles & floating text ---------- */
const FX = { parts: [], texts: [], flash: 0, banner: null };
function burstCoins(x, y, n, big) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 180 + Math.random() * (big ? 520 : 300);
    FX.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.4 + Math.random() * 0.8, age: 0, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, s: 7 + Math.random() * 6, k: Math.random() < 0.7 ? 'coin' : 'spark' });
  }
}
function floatText(x, y, text, color, size) { FX.texts.push({ x, y, text, color: color || '#ffe27a', size: size || 30, age: 0, life: 1.6 }); }
function drawFX(ctx, dt, W, H) {
  for (const p of FX.parts) { p.age += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
  FX.parts = FX.parts.filter((p) => p.age < p.life && p.y < H + 40);
  for (const p of FX.parts) {
    const a = 1 - p.age / p.life; ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y);
    if (p.k === 'coin') { ctx.scale(Math.abs(Math.cos(p.rot)) + 0.1, 1); ctx.drawImage(coinSprite(), -p.s, -p.s, p.s * 2, p.s * 2); }
    else { ctx.rotate(p.rot); ctx.fillStyle = '#fff6c8'; ctx.fillRect(-p.s * 0.15, -p.s, p.s * 0.3, p.s * 2); ctx.fillRect(-p.s, -p.s * 0.15, p.s * 2, p.s * 0.3); }
    ctx.restore();
  }
  for (const t of FX.texts) t.age += dt;
  FX.texts = FX.texts.filter((t) => t.age < t.life);
  for (const t of FX.texts) {
    const k = t.age / t.life, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.save(); ctx.globalAlpha = a; goldText(ctx, t.text, t.x, t.y - ease.out(Math.min(1, k * 1.5)) * 60, t.size * (k < 0.1 ? 0.6 + k * 4 : 1), { color: t.color, font: SANS, weight: 900 }); ctx.restore();
  }
  if (FX.banner) {
    const b = FX.banner; b.age += dt; const k = b.age / b.life;
    if (k >= 1) FX.banner = null;
    else {
      const a = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1, s = k < 0.12 ? ease.back(k / 0.12) : 1;
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H / 2 - 70, W, 140);
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(242,201,76,0)'); g.addColorStop(0.5, 'rgba(242,201,76,0.9)'); g.addColorStop(1, 'rgba(242,201,76,0)');
      ctx.fillStyle = g; ctx.fillRect(0, H / 2 - 72, W, 3); ctx.fillRect(0, H / 2 + 69, W, 3);
      ctx.translate(W / 2, H / 2); ctx.scale(s, s);
      goldText(ctx, b.title, 0, -18, 58, { glow: 'rgba(255,200,60,0.9)' });
      goldText(ctx, b.sub, 0, 36, 30, { font: SANS, weight: 900, color: '#ffffff' });
      ctx.restore();
    }
  }
}

/* ---------- sound (synthesized, no files) ---------- */
const SND = {
  ctx: null, on: true, vol: 0.6,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  tone(f, d, type, peak, when = 0, slide) {
    if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    this.env(g, t, 0.005, d, (peak || 0.2) * this.vol); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
  },
  noise(d, freq, q, peak, when = 0) {
    if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime + when;
    const len = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = c.createGain(); this.env(g, t, 0.002, d, (peak || 0.3) * this.vol); s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  chip() { this.noise(0.05, 3200, 3, 0.35); this.noise(0.04, 5200, 4, 0.2, 0.03); },
  card() { this.noise(0.09, 2400, 0.8, 0.22); },
  tick() { this.noise(0.02, 4000, 6, 0.18); },
  dice() { for (let i = 0; i < 5; i++) this.noise(0.03, 1800 + Math.random() * 1500, 4, 0.3, i * 0.06 + Math.random() * 0.03); },
  click() { this.tone(900, 0.04, 'square', 0.05); },
  reel() { this.tone(160, 0.06, 'triangle', 0.08); },
  stop() { this.noise(0.05, 900, 2, 0.35); this.tone(110, 0.08, 'sine', 0.2); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, i * 0.08)); },
  bigwin() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => { this.tone(f, 0.3, 'triangle', 0.2, i * 0.09); this.tone(f / 2, 0.3, 'sine', 0.12, i * 0.09); }); this.noise(0.6, 6000, 0.5, 0.08, 0.5); },
  lose() { this.tone(220, 0.25, 'sine', 0.08, 0, 150); },
  buy() { this.tone(660, 0.08, 'triangle', 0.15); this.tone(990, 0.12, 'triangle', 0.15, 0.07); this.noise(0.05, 3200, 3, 0.25, 0.02); },
  ball() { this.noise(0.03, 2600, 8, 0.12); },
};
