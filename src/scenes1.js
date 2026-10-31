/* ===== Scenes part 1: Slots, Roulette, Blackjack. Logical canvas is 1000 x 620. ===== */
const SW = 1000, SH = 620;
let NOW = 0;
class SceneBase {
  constructor() { this.busy = false; this.view = { amt: 10, base: 10, type: '' }; this.done = null; }
  finish() { const d = this.done; this.done = null; this.busy = false; if (d) d(); }
  payoutPos() { return [SW / 2, SH / 2]; }
  /* Paints the parts of a table that never change into an offscreen image once, then reuses it every frame. */
  layer(ctx, key, fn) {
    const px = SCENE_PX || 1; this._layers = this._layers || {};
    let L = this._layers[key];
    if (!L || L.px !== px) { const c = mkCanvas(SW * px, SH * px), g = c.getContext('2d'); g.scale(px, px); IN_LAYER = true; try { fn(g); } finally { IN_LAYER = false; } L = this._layers[key] = { c, px }; }
    ctx.drawImage(L.c, 0, 0, SW, SH);
  }
  dropLayers() { this._layers = {}; }
}
function betChips(ctx, x, y, amt, base, r = 22) {
  if (!amt) return;
  const st = chipStyleFor(amt, base), n = clamp(1 + Math.floor(Math.log2(Math.max(1, amt / base)) / 2), 1, 6);
  chipStack(ctx, x, y, r, n, st, fmtShort(amt));
}
function tableRail(ctx, pathFn, felt) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; pathFn(); ctx.fillStyle = '#123'; ctx.fill(); ctx.restore();
  pathFn(); feltFill(ctx, 0, 0, SW, SH, felt);
  leatherRail(ctx, pathFn, 26);
}
function ledText(ctx, text, x, y, size, color, align) {
  ctx.save(); ctx.font = `700 ${size}px "Courier New", monospace`; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.35; ctx.lineWidth = 4; ctx.strokeStyle = color; ctx.strokeText(text, x, y); ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
function panel(ctx, x, y, w, h, r, fill, stroke) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
function chromeGrad(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#f8f8f8'); g.addColorStop(0.2, '#9aa0a8'); g.addColorStop(0.45, '#eef1f4'); g.addColorStop(0.7, '#6d737c'); g.addColorStop(1, '#d6dadf'); return g;
}

/* ===================== SLOTS ===================== */
class SlotsScene extends SceneBase {
  constructor() {
    super(); this.pos = [5, 11, 17]; this.target = null; this.lines = []; this.lever = 0; this.lastTick = [0, 0, 0];
    this.win = 0; this.flashT = 0;
  }
  payoutPos() { return [500, 330]; }
  start(res, sp, done) {
    this.busy = true; this.done = done; this.lines = []; this.res = res; this.sp = sp; this.t0 = NOW; this.win = 0;
    const L = SLOT_STRIP[0].length;
    // reels scroll downward: position decreases from several laps up to the stop
    this.from = res.show.stops.map((s, i) => s + L * (3 + i));
    this.dur = [0.9, 1.25, 1.6].map((d) => d * sp);
    if (sp > 0.6) this.lever = NOW;
    SND.chip();
  }
  update() {
    if (!this.busy) return;
    const t = NOW - this.t0; let all = true;
    for (let i = 0; i < 3; i++) {
      const k = clamp(t / this.dur[i], 0, 1);
      const e = k < 1 ? ease.back(k) : 1;
      this.pos[i] = lerp(this.from[i], this.res.show.stops[i], e);
      const cell = Math.floor(this.pos[i]);
      if (cell !== this.lastTick[i] && k < 0.95 && i === 0 && this.sp > 0.5) { this.lastTick[i] = cell; if (Math.random() < 0.35) SND.reel(); }
      if (k >= 1 && !this['stopped' + i]) { this['stopped' + i] = true; SND.stop(); }
      if (k < 1) all = false;
    }
    if (all) {
      for (let i = 0; i < 3; i++) this['stopped' + i] = false;
      this.lines = this.res.show.lines; this.flashT = NOW; this.win = this.res.show.ret;
      this.finish();
    }
  }
  draw(ctx, t, dt) {
    this.update();
    const X = 230, Y = 14, W = 540, H = 600;
    const rx = X + 60, ry = Y + 222, rw = 130, gap = 15, rowH = 76, rh = rowH * 3;
    const ly = ry + rh + 20, by = ly + 62, lx = X + W + 24, lyy = Y + 300;
    const lineCols = ['#ff4d4d', '#ffd24d', '#4dd2ff', '#7dff6a', '#ff7dff'];
    const lineY = (row) => ry + row * rowH + rowH / 2;
    if (!this.arcPts) { this.arcPts = []; for (let i = 0; i <= 26; i++) { const k = i / 26; const x = lerp(X + 22, X + W - 22, k); const y = Y + 128 - Math.sin(k * Math.PI) * 88 - 10 * (1 - Math.sin(k * Math.PI)); this.arcPts.push([x, Math.max(Y + 12, y - 20)]); } }
    this.layer(ctx, 'bg', (ctx) => {
      drawRoom(ctx, SW, SH, 0, 'rgba(255,120,200,0.10)');
      for (const x of [40, 860]) {
        ctx.save(); ctx.globalAlpha = 0.55; rr(ctx, x, 120, 100, 470, 16); ctx.fillStyle = '#1a1020'; ctx.fill();
        rr(ctx, x + 12, 250, 76, 110, 6); const sg = ctx.createLinearGradient(0, 250, 0, 360); sg.addColorStop(0, '#2a3a6a'); sg.addColorStop(1, '#101830'); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
      }
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      rr(ctx, X, Y + 90, W, H - 90, 22); ctx.fillStyle = '#1b0f22'; ctx.fill(); ctx.restore();
      rr(ctx, X, Y + 90, W, H - 90, 22); const body = ctx.createLinearGradient(X, 0, X + W, 0);
      body.addColorStop(0, '#3a0d16'); body.addColorStop(0.08, '#8b1a2b'); body.addColorStop(0.5, '#b4223a'); body.addColorStop(0.92, '#8b1a2b'); body.addColorStop(1, '#3a0d16');
      ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = chromeGrad(ctx, X, 0, X + W, 0); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.moveTo(X + 10, Y + 130); ctx.lineTo(X + 10, Y + 70); ctx.quadraticCurveTo(X + W / 2, Y - 30, X + W - 10, Y + 70); ctx.lineTo(X + W - 10, Y + 130); ctx.closePath();
      const tg = ctx.createLinearGradient(0, Y, 0, Y + 130); tg.addColorStop(0, '#2b0a40'); tg.addColorStop(1, '#5a1060'); ctx.fillStyle = tg; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = chromeGrad(ctx, X, Y, X + W, Y + 120); ctx.stroke();
      ctx.clip();
      for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 18) * Math.PI; ctx.beginPath(); ctx.moveTo(X + W / 2, Y + 150); ctx.arc(X + W / 2, Y + 150, 400, a, a + Math.PI / 36); ctx.closePath(); ctx.fillStyle = 'rgba(255,200,255,0.06)'; ctx.fill(); }
      ctx.restore();
      goldText(ctx, "MATTHEW'S", X + W / 2, Y + 62, 30, { italic: true, glow: 'rgba(255,120,255,0.8)' });
      goldText(ctx, 'LUCKY 777', X + W / 2, Y + 103, 44, { glow: 'rgba(255,200,60,0.9)' });
      const py = Y + 138; panel(ctx, X + 26, py, W - 52, 66, 8, '#140a1c', '#c9a24a');
      [['diamond', 250], ['seven', 100], ['bar', 40], ['bell', 20], ['plum', 14], ['orange', 10], ['lemon', 8], ['cherry', 5]].forEach(([sy, p], i) => {
        const cx = X + 48 + i * 61; ctx.drawImage(slotSymbol(sy, 64), cx - 14, py + 6, 28, 28);
        ctx.font = `800 13px ${SANS}`; ctx.fillStyle = '#ffe27a'; ctx.textAlign = 'center'; ctx.fillText('×' + p, cx, py + 49);
      });
      rr(ctx, rx - 18, ry - 16, rw * 3 + gap * 2 + 36, rh + 32, 14); ctx.fillStyle = chromeGrad(ctx, rx, ry - 16, rx, ry + rh + 16); ctx.fill();
      rr(ctx, rx - 10, ry - 8, rw * 3 + gap * 2 + 20, rh + 16, 10); ctx.fillStyle = '#0b0b10'; ctx.fill();
      SLOT_LINES.forEach((ln, i) => {
        for (const [sx, row] of [[rx - 26, ln[0]], [rx + rw * 3 + gap * 2 + 26, ln[2]]]) {
          const yy = lineY(row) + (i >= 3 ? (i === 3 ? -14 : 14) : 0);
          ctx.beginPath(); ctx.arc(sx, yy, 10, 0, TAU); ctx.fillStyle = lineCols[i]; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = '#000'; ctx.font = `800 12px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, sx, yy + 1);
        }
      });
      panel(ctx, X + 40, ly, W - 80, 52, 8, '#060606', '#555');
      ['BET', 'LINES', 'WIN'].forEach((l, i) => { const cx = X + 40 + (W - 80) * (i + 0.5) / 3; ctx.font = `700 11px ${SANS}`; ctx.fillStyle = '#c9a24a'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(l, cx, ly + 13); });
      rr(ctx, X + 20, by, W - 40, 54, 10); const dg = ctx.createLinearGradient(0, by, 0, by + 54); dg.addColorStop(0, '#2a2a30'); dg.addColorStop(1, '#0e0e12'); ctx.fillStyle = dg; ctx.fill();
      ['MAX', 'LINES', 'BET'].forEach((b, i) => { const bx = X + 50 + i * 82; rr(ctx, bx, by + 11, 66, 32, 8); ctx.fillStyle = ['#d8a420', '#2d7bd8', '#2db84d'][i]; ctx.fill(); ctx.fillStyle = '#111'; ctx.font = `800 13px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b, bx + 33, by + 27); });
      rr(ctx, lx - 14, lyy - 20, 28, 60, 8); ctx.fillStyle = chromeGrad(ctx, lx - 14, 0, lx + 14, 0); ctx.fill();
    });
    for (const x of [40, 860]) { ctx.save(); ctx.globalAlpha = 0.55; bulbRow(ctx, rectBulbs(x + 8, 132, 84, 80, 14), t + x, 1, 'rgba(255,120,220,0.8)'); ctx.restore(); }
    bulbRow(ctx, this.arcPts, t, 0);
    // reels
    for (let r = 0; r < 3; r++) {
      const x = rx + r * (rw + gap), L = SLOT_STRIP[r].length;
      ctx.save(); rr(ctx, x, ry, rw, rh, 6); ctx.clip();
      ctx.drawImage(reelBackdrop(rw, rh), x, ry, rw, rh);
      const p = this.pos[r], base = Math.floor(p), frac = p - base;
      const speed = this.busy ? Math.abs(this.from[r] - this.res.show.stops[r]) / this.dur[r] * (1 - clamp((NOW - this.t0) / this.dur[r], 0, 1)) : 0;
      const blur = clamp(speed / 30, 0, 1);
      for (let k = -1; k <= 3; k++) {
        const idx = (((base + k) % L) + L) % L, y = ry + (k + frac) * rowH;
        const img = slotSymbol(SLOT_STRIP[r][idx], 128), sz = 68;
        ctx.globalAlpha = 1 - blur * 0.55; ctx.drawImage(img, x + rw / 2 - sz / 2, y + rowH / 2 - sz / 2 - blur * 14, sz, sz + blur * 28);
        if (blur > 0.2) { ctx.globalAlpha = blur * 0.25; ctx.drawImage(img, x + rw / 2 - sz / 2, y + rowH / 2 - sz / 2 - 30, sz, sz + 60); }
      }
      ctx.globalAlpha = 1; ctx.drawImage(reelShade(rw, rh), x, ry, rw, rh); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 160, ry); ctx.lineTo(rx + 60, ry + rh); ctx.lineTo(rx - 40, ry + rh); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    if (!this.busy && this.lines.length) {
      const k = Math.floor((NOW - this.flashT) * 1.6) % this.lines.length, ln = this.lines[k];
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = lineCols[ln.li];
      const path = () => { ctx.beginPath(); SLOT_LINES[ln.li].forEach((row, reel) => { const x = rx + reel * (rw + gap) + rw / 2, y = lineY(row); reel ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
      ctx.globalAlpha = 0.25; ctx.lineWidth = 18; path(); ctx.stroke(); ctx.globalAlpha = 0.9; ctx.lineWidth = 7; path(); ctx.stroke();
      SLOT_LINES[ln.li].forEach((row, reel) => { const x = rx + reel * (rw + gap); rr(ctx, x + 4, ry + row * rowH + 4, rw - 8, rowH - 8, 8); ctx.lineWidth = 3; ctx.stroke(); });
      ctx.restore();
    }
    const vals = [fmtShort(this.view.amt), '5', this.busy ? '—' : (this.win ? (this.win).toFixed(1) + '×' : '0')];
    vals.forEach((v, i) => ledText(ctx, v, X + 40 + (W - 80) * (i + 0.5) / 3, ly + 34, 22, i === 2 && this.win ? '#7dff6a' : '#ff3b3b'));
    const spinPulse = this.busy ? 0.3 : 0.6 + 0.4 * Math.sin(t * 4);
    ctx.save(); ctx.globalAlpha = 0.35 * spinPulse; ctx.beginPath(); ctx.ellipse(X + W - 120, by + 27, 76, 30, 0, 0, TAU); ctx.fillStyle = '#ff3b3b'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.ellipse(X + W - 120, by + 27, 64, 22, 0, 0, TAU); ctx.fillStyle = '#d0101e'; ctx.fill();
    goldText(ctx, 'SPIN', X + W - 120, by + 28, 22, { font: SANS, weight: 900, color: '#fff' });
    const lk = clamp((NOW - this.lever) / 0.5, 0, 1), la = lk < 0.4 ? lk / 0.4 : 1 - (lk - 0.4) / 0.6;
    const ang = -1.2 + la * 1.9, ex = lx + Math.cos(ang) * 6;
    const tipX = lx + 30 * Math.sin(la * 0.3), tipY = lyy + 10 - 170 * Math.cos(la * 2.6) * (1 - la * 0.2);
    ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.strokeStyle = '#c8ccd2'; ctx.beginPath(); ctx.moveTo(ex, lyy + 10); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.drawImage(knobSprite(), tipX - 20, tipY - 20, 40, 40);
  }
}

/* ===================== ROULETTE ===================== */
class RouletteScene extends SceneBase {
  constructor() {
    super(); this.cx = 256; this.cy = 318; this.R = 230; this.rotor = 0; this.ball = { a: 0, r: 0, vis: false }; this.hist = [];
    this.wheelImg = null; this.result = null; this.cells = this.buildLayout();
  }
  payoutPos() { return [256, 318]; }
  buildLayout() {
    const cells = []; const gx = 640, gy = 128, cw = 62, ch = 31;
    cells.push({ k: 'num', n: 0, x: gx, y: gy - 44, w: cw * 3, h: 44 });
    for (let n = 1; n <= 36; n++) { const row = Math.floor((n - 1) / 3), col = (n - 1) % 3; cells.push({ k: 'num', n, x: gx + col * cw, y: gy + row * ch, w: cw, h: ch }); }
    ['d1', 'd2', 'd3'].forEach((k, i) => cells.push({ k, x: gx - 48, y: gy + i * ch * 4, w: 48, h: ch * 4, label: ['1st 12', '2nd 12', '3rd 12'][i] }));
    ['low', 'even', 'red', 'black', 'odd', 'high'].forEach((k, i) => cells.push({ k, x: gx - 96, y: gy + i * ch * 2, w: 48, h: ch * 2, label: { low: '1-18', even: 'EVEN', red: '', black: '', odd: 'ODD', high: '19-36' }[k] }));
    return cells;
  }
  wheel(px) {
    if (this.wheelImg && this.wheelPx === px) return this.wheelImg;
    const R = this.R, s = Math.ceil(R * 2 * px), c = mkCanvas(s, s), g = c.getContext('2d'); g.scale(px, px); g.translate(R, R);
    const r1 = R * 0.66, r2 = R * 0.5, r3 = R * 0.38;
    // pocket ring
    for (let i = 0; i < 37; i++) {
      const a0 = (i / 37) * TAU - TAU / 74, a1 = a0 + TAU / 37, n = RL_ORDER[i];
      g.beginPath(); g.arc(0, 0, r1, a0, a1); g.arc(0, 0, r3, a1, a0, true); g.closePath();
      g.fillStyle = n === 0 ? '#0f8a3c' : RL_RED.has(n) ? '#c0141e' : '#141414'; g.fill();
      g.strokeStyle = '#d8b25a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(Math.cos(a0) * r3, Math.sin(a0) * r3); g.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1); g.stroke();
      const am = a0 + TAU / 74; g.save(); g.translate(Math.cos(am) * (r1 - R * 0.07), Math.sin(am) * (r1 - R * 0.07)); g.rotate(am + Math.PI / 2);
      g.fillStyle = '#fff'; g.font = `700 ${R * 0.075}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 0, 0); g.restore();
    }
    // pocket separators band
    g.beginPath(); g.arc(0, 0, r2, 0, TAU); g.strokeStyle = 'rgba(216,178,90,0.9)'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 37; i++) { const a = (i / 37) * TAU - TAU / 74; g.beginPath(); g.moveTo(Math.cos(a) * r3, Math.sin(a) * r3); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); g.strokeStyle = '#f2d68a'; g.lineWidth = 2.5; g.stroke(); }
    g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.strokeStyle = '#b08a3a'; g.lineWidth = 3; g.stroke();
    // cone
    const cg = g.createRadialGradient(-R * 0.08, -R * 0.1, 4, 0, 0, r3); cg.addColorStop(0, '#9a5a2a'); cg.addColorStop(0.7, '#5a2e12'); cg.addColorStop(1, '#3a1a08');
    g.beginPath(); g.arc(0, 0, r3, 0, TAU); g.fillStyle = cg; g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, r3, 0, TAU); g.clip(); g.drawImage(TEX.wood, -r3, -r3, r3 * 2, r3 * 2);
    const cg2 = g.createRadialGradient(-R * 0.1, -R * 0.12, 4, 0, 0, r3); cg2.addColorStop(0, 'rgba(255,200,140,0.25)'); cg2.addColorStop(1, 'rgba(40,15,0,0.65)'); g.fillStyle = cg2; g.fillRect(-r3, -r3, r3 * 2, r3 * 2); g.restore();
    g.beginPath(); g.arc(0, 0, r3, 0, TAU); g.strokeStyle = '#d8b25a'; g.lineWidth = 2; g.stroke();
    // turret
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2; g.save(); g.rotate(a);
      const sg = g.createLinearGradient(0, -6, 0, 6); sg.addColorStop(0, '#fff3c4'); sg.addColorStop(0.5, '#c9962a'); sg.addColorStop(1, '#7a5010');
      g.fillStyle = sg; g.beginPath(); g.moveTo(0, -5); g.lineTo(r3 * 0.85, -2); g.arc(r3 * 0.85, 0, 6, -Math.PI / 2, Math.PI / 2); g.lineTo(0, 5); g.fill(); g.restore();
    }
    const tg = g.createRadialGradient(-6, -8, 2, 0, 0, R * 0.09); tg.addColorStop(0, '#fff6d0'); tg.addColorStop(0.5, '#e0aa3a'); tg.addColorStop(1, '#7a5010');
    g.beginPath(); g.arc(0, 0, R * 0.085, 0, TAU); g.fillStyle = tg; g.fill();
    this.wheelImg = c; this.wheelPx = px; return c;
  }
  start(res, sp, done) {
    this.busy = true; this.done = done; this.res = res; this.t0 = NOW; this.dur = 5.2 * sp; this.result = null;
    this.rot0 = this.rotor; const turns = 1.2 + 1.3 * sp;
    this.rot1 = this.rot0 + turns * TAU;
    const idx = RL_ORDER.indexOf(res.show.n); this.pocketA = (idx / 37) * TAU;
    this.ballTurns = -(3 + 3 * sp) * TAU; this.lastTickA = 0; SND.chip();
  }
  update() {
    if (!this.busy) { this.rotor += 0.0025; return; }
    const k = clamp((NOW - this.t0) / this.dur, 0, 1);
    this.rotor = lerp(this.rot0, this.rot1, ease.out(k));
    const bk = clamp(k / 0.82, 0, 1);
    const rel = this.ballTurns * (1 - ease.out(bk)) + (Math.random() - 0.5) * 0.02 * (bk > 0.55 && bk < 1 ? 1 : 0);
    this.ball.a = this.rotor + this.pocketA + rel;
    const rTrack = this.R * 0.79, rPocket = this.R * 0.55;
    if (bk < 0.55) this.ball.r = rTrack;
    else if (bk < 1) { const q = (bk - 0.55) / 0.45; this.ball.r = lerp(rTrack, rPocket, q) + Math.abs(Math.sin(q * 14)) * (1 - q) * 18; if (Math.random() < 0.15) SND.ball(); }
    else this.ball.r = rPocket;
    this.ball.vis = true;
    if (k >= 1) { this.result = this.res.show.n; this.hist.unshift(this.result); this.hist = this.hist.slice(0, 13); this.finish(); }
  }
  tap(x, y) {
    for (const c of this.cells) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c.k === 'num' ? { type: 'num', straight: c.n } : { type: c.k };
    return null;
  }
  draw(ctx, t, dt) {
    this.update();
    const { cx, cy, R } = this, v = this.view;
    this.layer(ctx, 'bg', (ctx) => {
      drawRoom(ctx, SW, SH, 0);
      tableRail(ctx, () => { rr(ctx, 14, 30, SW - 28, SH - 44, 60); });
      feltText(ctx, "MATTHEW'S", 830, 580, 18, { color: 'rgba(255,230,160,0.35)' });
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#2a1206'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip(); ctx.drawImage(TEX.wood, cx - R, cy - R, R * 2, R * 2);
      const bowl = ctx.createRadialGradient(cx - 40, cy - 50, R * 0.2, cx, cy, R); bowl.addColorStop(0, 'rgba(255,200,140,0.25)'); bowl.addColorStop(0.75, 'rgba(0,0,0,0.0)'); bowl.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = bowl; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = '#c9962a'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.86, 0, TAU); ctx.arc(cx, cy, R * 0.72, 0, TAU, true);
      const trk = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R * 0.86); trk.addColorStop(0, '#2a1a10'); trk.addColorStop(0.5, '#6a4a30'); trk.addColorStop(1, '#3a2010'); ctx.fillStyle = trk; ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + 0.2, x = cx + Math.cos(a) * R * 0.78, y = cy + Math.sin(a) * R * 0.78;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -4); ctx.lineTo(9, 0); ctx.lineTo(0, 4); ctx.closePath(); ctx.fillStyle = goldGrad(ctx, -4, 4); ctx.fill(); ctx.restore();
      }
      panel(ctx, 492, 44, 48, 300, 8, '#0a0a0e', '#c9a24a');
      ctx.font = `700 10px ${SANS}`; ctx.fillStyle = '#c9a24a'; ctx.textAlign = 'center'; ctx.fillText('LAST', 516, 58);
      for (const c of this.cells) {
        rr(ctx, c.x, c.y, c.w, c.h, 2);
        if (c.k === 'num') { ctx.fillStyle = c.n === 0 ? '#0f8a3c' : RL_RED.has(c.n) ? '#b3121c' : '#151515'; ctx.fill(); }
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,240,200,0.75)'; ctx.stroke();
        if (c.k === 'num') { ctx.font = `700 ${c.n === 0 ? 22 : 17}px ${SERIF}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.n, c.x + c.w / 2, c.y + c.h / 2 + 1); }
        else if (c.k === 'red' || c.k === 'black') { ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(14, 0); ctx.lineTo(0, 22); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fillStyle = c.k === 'red' ? '#c0141e' : '#111'; ctx.fill(); ctx.strokeStyle = '#e9d9a8'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
        else feltText(ctx, c.label, c.x + c.w / 2, c.y + c.h / 2, 15, { rot: -Math.PI / 2, color: 'rgba(255,245,215,0.9)' });
      }
      feltText(ctx, 'SINGLE ZERO', 735, 520, 14, { color: 'rgba(255,240,200,0.35)' });
    });
    const img = this.wheel(SCENE_PX);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.rotor); ctx.drawImage(img, -R, -R, R * 2, R * 2); ctx.restore();
    const done = this.result !== null && !this.busy;
    if (done) {
      const idx = RL_ORDER.indexOf(this.result), a = this.rotor + (idx / 37) * TAU;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.beginPath(); ctx.arc(0, 0, R * 0.66, -TAU / 74, TAU / 74); ctx.arc(0, 0, R * 0.38, TAU / 74, -TAU / 74, true); ctx.closePath();
      ctx.strokeStyle = 'rgba(255,230,120,0.3)'; ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = `rgba(255,240,150,${0.6 + 0.4 * Math.sin(t * 6)})`; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    }
    if (this.ball.vis) {
      const bx = cx + Math.cos(this.ball.a) * this.ball.r, by = cy + Math.sin(this.ball.a) * this.ball.r;
      ctx.drawImage(ballSprite(), bx - 11, by - 11, 25, 25);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    this.hist.slice(0, 11).forEach((n, i) => {
      ctx.font = `${i === 0 ? 900 : 700} ${i === 0 ? 20 : 16}px ${SANS}`; ctx.fillStyle = n === 0 ? '#2fe07a' : RL_RED.has(n) ? '#ff4040' : '#f0f0f0';
      ctx.fillText(n, n === 0 ? 516 : RL_RED.has(n) ? 505 : 527, 84 + i * 24);
    });
    if (done) for (const c of this.cells) if (c.k === 'num' ? c.n === this.result : RL_BETS[c.k].hit(this.result)) {
      rr(ctx, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 3); ctx.strokeStyle = 'rgba(255,230,120,0.95)'; ctx.lineWidth = 3; ctx.stroke();
    }
    if (done) {
      const c = this.cells.find((q) => q.k === 'num' && q.n === this.result);
      const dx = c.x + c.w / 2, dy = c.y + c.h / 2 - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(dx + 3, dy + 14, 12, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eee'; ctx.fillRect(dx - 6, dy - 12, 12, 24); ctx.fillStyle = '#bbb'; ctx.fillRect(dx + 2, dy - 12, 4, 24); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(dx, dy - 12, 6, 3, 0, 0, TAU); ctx.fill();
    }
    const bc = v.type === 'num' ? this.cells.find((q) => q.k === 'num' && q.n === v.straight) : this.cells.find((q) => q.k === v.type);
    if (bc) betChips(ctx, bc.x + bc.w / 2, bc.y + bc.h / 2 + 4, v.amt, v.base, 17);
  }
}

/* ===================== BLACKJACK ===================== */
class BlackjackScene extends SceneBase {
  constructor() { super(); this.sprites = new Map(); this.nextT = 0; this.st = null; this.revealT = null; this.labels = []; this.gap = 0.32; }
  payoutPos() { return [500, 400]; }
  reset() { this.sprites.clear(); this.nextT = NOW; this.st = null; this.revealT = null; this.labels = []; this.showDealer = false; }
  want(key, card, hidden) {
    if (this.sprites.has(key)) return;
    const st = Math.max(NOW, this.nextT); this.nextT = st + this.gap;
    this.sprites.set(key, { card, t0: st, hidden: !!hidden, x: 860, y: 96, flipT: null });
    setTimeout(() => SND.card(), Math.max(0, (st - NOW) * 1000));
  }
  sync(st, showDealer) {
    this.st = st;
    const H0 = st.hands[0];
    this.want('0:0', H0.cards[0]); this.want('d:0', st.dealer[0]);
    if (!this.sprites.has('1:0') || !st.split) this.want('0:1', st.split ? st.hands[1].cards[0] : H0.cards[1]);
    this.want('d:1', st.dealer[1], true);
    if (st.split && this.sprites.has('0:1') && this.sprites.get('0:1').card === st.hands[1].cards[0]) {
      const sp = this.sprites.get('0:1'); this.sprites.delete('0:1'); this.sprites.set('1:0', sp); this.nextT = Math.max(this.nextT, NOW) + 0.25;
    }
    st.hands.forEach((h, hi) => h.cards.forEach((c, i) => { if (!(hi === 0 && i === 0)) this.want(hi + ':' + i, c); }));
    if (showDealer && !this.showDealer) {
      this.showDealer = true; const s = this.sprites.get('d:1'); const ft = Math.max(NOW, this.nextT); s.flipT = ft; this.nextT = ft + this.gap * 1.2;
      setTimeout(() => SND.card(), Math.max(0, (ft - NOW) * 1000));
      st.dealer.forEach((c, i) => { if (i >= 2) this.want('d:' + i, c); });
    }
  }
  idleAt() { return this.nextT + 0.35; }
  target(key) {
    const [h, i] = key.split(':'), st = this.st;
    if (h === 'd') { const n = st.dealer.length; return [500 + (+i - (n - 1) / 2) * 66, 160]; }
    const nh = st.hands.length, hand = st.hands[+h], n = hand ? hand.cards.length : 2;
    const cx = 500 + (+h - (nh - 1) / 2) * 250;
    return [cx + (+i - (n - 1) / 2) * 40, 300 - +i * 5];
  }
  start(res, sp, done) { // watch mode: animate a finished auto round
    this.busy = true; this.done = done; this.reset(); this.gap = 0.32 * sp;
    const st = res.show; this.sync(st, false); this.sync(st, true);
    this.endAt = this.idleAt(); this.pendingResult = res;
  }
  showResult(res) {
    this.labels = res.res.map((r, i) => {
      const h = this.st.hands[i]; const v = bjValue(h.cards).total;
      return r > 1 ? ['BLACKJACK!', '#ffe27a'] : r > 0 ? ['WIN', '#7dff6a'] : r === 0 ? ['PUSH', '#9ad0ff'] : v > 21 ? ['BUST', '#ff6b6b'] : ['LOSE', '#ff6b6b'];
    });
  }
  update() {
    if (this.busy && this.endAt && NOW >= this.endAt) { this.endAt = null; this.showResult(this.pendingResult); this.finish(); }
  }
  draw(ctx, t, dt) {
    this.update();
    this.layer(ctx, 'bg', (ctx) => {
      drawRoom(ctx, SW, SH, 0);
      const path = () => { ctx.beginPath(); ctx.moveTo(20, 24); ctx.lineTo(980, 24); ctx.lineTo(980, 140); ctx.ellipse(500, 140, 480, 460, 0, 0, Math.PI); ctx.closePath(); };
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; path(); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
      path(); feltFill(ctx, 0, 0, SW, SH, ['#1a6aa8', '#0e4a7a', '#062a48']);
      ctx.save(); ctx.beginPath(); ctx.moveTo(20, 140); ctx.ellipse(500, 140, 480, 460, 0, 0, Math.PI); leatherRail(ctx, () => { ctx.beginPath(); ctx.ellipse(500, 140, 480, 460, 0, 0.02, Math.PI - 0.02); }, 30); ctx.restore();
      // printed felt
      textOnArc(ctx, 'BLACKJACK PAYS 3 TO 2', 500, 140, 335, Math.PI / 2, 26, 'rgba(255,215,120,0.85)', true);
      textOnArc(ctx, 'DEALER MUST STAND ON ALL 17s', 500, 140, 297, Math.PI / 2, 15, 'rgba(255,255,255,0.55)', true);
      ctx.save(); ctx.beginPath(); ctx.ellipse(500, 140, 290, 272, 0, 0.5, Math.PI - 0.5); ctx.strokeStyle = 'rgba(255,215,120,0.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      textOnArc(ctx, 'INSURANCE PAYS 2 TO 1', 500, 140, 276, Math.PI / 2, 12, 'rgba(255,215,120,0.55)', true);
      // chip tray
      panel(ctx, 330, 24, 340, 64, 6, '#1a1a1a', '#555');
      for (let i = 0; i < 8; i++) {
        const x = 348 + i * 40; rr(ctx, x - 16, 30, 32, 52, 14); ctx.fillStyle = '#0a0a0a'; ctx.fill();
        const st2 = CHIP_COLS[7 - i]; for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 2 ? shade(st2.c, -0.2) : st2.c; ctx.fillRect(x - 14, 34 + k * 5.2, 28, 4.5); ctx.fillStyle = st2.e; ctx.fillRect(x - 3, 34 + k * 5.2, 6, 4.5); }
      }
      // shoe
      ctx.save(); ctx.translate(862, 92); ctx.rotate(-0.12);
      rr(ctx, -50, -36, 110, 72, 8); ctx.fillStyle = '#2a1206'; ctx.fill(); ctx.drawImage(TEX.wood, -50, -36, 110, 72);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); rr(ctx, -42, -26, 70, 52, 4); ctx.fillStyle = '#7a0d18'; ctx.fill();
      for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#f5f0e2' : '#ddd5c2'; ctx.fillRect(-38 + i * 6, -22, 4, 44); }
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-50, -36, 110, 10); ctx.restore();
      // discard tray
      ctx.save(); ctx.translate(140, 92); ctx.rotate(0.12); rr(ctx, -50, -30, 100, 60, 6); ctx.fillStyle = 'rgba(200,230,255,0.15)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.fillStyle = '#8f1020'; ctx.fillRect(-44, 18 - i * 6, 88, 5); } ctx.restore();
    });
    // betting circles
    const hands = this.st ? this.st.hands : [{ stake: 1 }];
    const nh = hands.length;
    for (let h = 0; h < Math.max(1, nh); h++) {
      const cx = 500 + (h - (nh - 1) / 2) * 250, cy = 540;
      ctx.beginPath(); ctx.ellipse(cx, cy, 56, 30, 0, 0, TAU); ctx.strokeStyle = 'rgba(255,215,120,0.75)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, 48, 24, 0, 0, TAU); ctx.strokeStyle = 'rgba(255,215,120,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (this.view.amt) { const stake = hands[h] && hands[h].stake || 1; betChips(ctx, cx - (stake > 1 ? 18 : 0), cy + 2, this.view.amt, this.view.base, 20); if (stake > 1) betChips(ctx, cx + 22, cy + 6, this.view.amt, this.view.base, 20); }
    }
    // cards
    const W = 78;
    const order = [...this.sprites.entries()].sort((a, b) => a[1].t0 - b[1].t0);
    for (const [key, s] of order) {
      if (NOW < s.t0) continue;
      const [tx, ty] = this.target(key);
      const k = clamp((NOW - s.t0) / 0.32, 0, 1);
      if (k < 1) { s.x = lerp(860, tx, ease.out(k)); s.y = lerp(96, ty, ease.out(k)); }
      else { s.x += (tx - s.x) * Math.min(1, dt * 10); s.y += (ty - s.y) * Math.min(1, dt * 10); }
      let flip = s.hidden ? 0 : clamp(k * 1.4, 0, 1);
      if (s.hidden && s.flipT !== null) flip = clamp((NOW - s.flipT) / 0.3, 0, 1);
      drawCard(ctx, s.card, s.x, s.y, W, flip, { rot: k < 1 ? (1 - k) * -0.5 : 0 });
    }
    // totals
    if (this.st) {
      const shown = (key) => { const s = this.sprites.get(key); return s && NOW >= s.t0 + 0.2; };
      const dCards = this.st.dealer.filter((c, i) => shown('d:' + i) && !(i === 1 && (!this.sprites.get('d:1').flipT || NOW < this.sprites.get('d:1').flipT + 0.2)));
      if (dCards.length) this.bubble(ctx, 500 + (this.st.dealer.length * 33) + 30, 112, bjValue(dCards));
      this.st.hands.forEach((h, hi) => {
        const cs = h.cards.filter((c, i) => shown(hi + ':' + i)); if (!cs.length) return;
        const [x] = this.target(hi + ':' + (h.cards.length - 1));
        this.bubble(ctx, x + 66, 248, bjValue(cs), this.st.active === hi && !this.st.over && this.manual);
        if (this.labels[hi] && !this.busy) goldText(ctx, this.labels[hi][0], 500 + (hi - (this.st.hands.length - 1) / 2) * 250, 384, 28, { font: SANS, weight: 900, color: this.labels[hi][1] });
      });
    }
  }
  bubble(ctx, x, y, v, active) {
    const txt = v.soft && v.total < 21 ? `${v.total - 10}/${v.total}` : '' + v.total;
    ctx.save(); ctx.font = `800 18px ${SANS}`; const w = Math.max(38, ctx.measureText(txt).width + 18);
    rr(ctx, x - w / 2, y - 15, w, 30, 15); ctx.fillStyle = v.total > 21 ? '#b3121c' : active ? '#d8a420' : 'rgba(0,0,0,0.75)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,120,0.8)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1); ctx.restore();
  }
}
