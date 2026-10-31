/* ===== Scenes part 2: Craps, Baccarat, Video Poker, Keno, Big Six, Sic Bo ===== */

/* ===================== CRAPS ===================== */
class CrapsScene extends SceneBase {
  constructor() { super(); this.dice = [{ x: 420, y: 330, v: 5, rot: 0.2, z: 0 }, { x: 470, y: 352, v: 2, rot: -0.3, z: 0 }]; this.point = 0; this.rollsShown = []; this.hl = null; }
  payoutPos() { return [460, 330]; }
  start(res, sp, done) {
    this.busy = true; this.done = done; this.res = res; this.rolls = res.show.rolls; this.ri = 0; this.point = 0; this.hl = null;
    const n = this.rolls.length; this.rollDur = Math.min(1.25, 7 / n) * sp; this.t0 = NOW; this.beginRoll();
  }
  beginRoll() {
    const r = this.rolls[this.ri]; this.rT = NOW; this.rolling = true;
    const ex = 260 + Math.random() * 280, ey = 250 + Math.random() * 170;
    this.paths = [0, 1].map((i) => ({ sx: 900, sy: 300 + i * 30, ex: ex + i * (40 + Math.random() * 30), ey: ey + (Math.random() - 0.5) * 60, spin: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6), fv: r[i] }));
    SND.dice();
  }
  update() {
    if (!this.busy || !this.rolling) return;
    const k = clamp((NOW - this.rT) / (this.rollDur * 0.75), 0, 1);
    this.paths.forEach((p, i) => {
      const d = this.dice[i];
      const e = ease.out(k);
      d.x = lerp(p.sx, p.ex, e); d.y = lerp(p.sy, p.ey, e) + Math.sin(e * Math.PI * 3) * 8 * (1 - e);
      d.z = Math.abs(Math.sin(k * Math.PI * 3)) * 40 * (1 - k);
      d.rot = p.spin * (1 - e) + (i ? 0.25 : -0.15);
      d.v = k < 0.85 ? 1 + ((Math.floor(NOW * 18) + i * 3) % 6) : p.fv;
    });
    if (NOW - this.rT >= this.rollDur) {
      const r = this.rolls[this.ri], tot = r[0] + r[1]; this.rollsShown.unshift(tot); this.rollsShown = this.rollsShown.slice(0, 10);
      if (this.ri === 0 && this.res.show.point) this.point = this.res.show.point;
      this.ri++;
      if (this.ri < this.rolls.length) this.beginRoll();
      else { this.rolling = false; this.hl = tot; this.lastTot = tot; this.finish(); if (this.res.show.point) setTimeout(() => { if (!this.busy) this.point = 0; }, 1500); }
    }
  }
  draw(ctx, t, dt) {
    this.update();
    drawRoom(ctx, SW, SH, t);
    const path = () => rr(ctx, 16, 30, SW - 32, SH - 46, 40);
    tableRail(ctx, path, ['#1f7a3e', '#145a2c', '#0a3a1a']);
    const L = 'rgba(255,250,235,0.9)', line = (x, y, w, h, r) => { rr(ctx, x, y, w, h, r || 0); ctx.strokeStyle = L; ctx.lineWidth = 2.5; ctx.stroke(); };
    // point boxes
    const pts = [4, 5, 6, 8, 9, 10], names = { 4: '4', 5: '5', 6: 'SIX', 8: '8', 9: 'NINE', 10: '10' };
    pts.forEach((p, i) => {
      const x = 120 + i * 105, y = 62; line(x, y, 105, 104);
      feltText(ctx, names[p], x + 52, y + 56, p === 6 || p === 9 ? 30 : 46, { color: '#fff7e0' });
      if (this.hl === p && !this.busy) { rr(ctx, x + 3, y + 3, 99, 98, 2); ctx.fillStyle = 'rgba(255,230,120,0.18)'; ctx.fill(); }
    });
    // puck
    const pk = this.point ? 120 + pts.indexOf(this.point) * 105 + 52 : 790, pky = this.point ? 82 : 90;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(pk + 3, pky + 6, 26, 12, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(pk, pky, 26, 12, 0, 0, TAU); ctx.fillStyle = this.point ? '#fafafa' : '#141414'; ctx.fill(); ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `900 14px ${SANS}`; ctx.fillStyle = this.point ? '#111' : '#fafafa'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.point ? 'ON' : 'OFF', pk, pky + 1); ctx.restore();
    // COME
    line(120, 172, 630, 96); feltText(ctx, 'COME', 435, 222, 64, { color: '#c8102e' });
    // FIELD
    line(120, 274, 630, 110);
    const fieldNums = ['2', '3', '4', '9', '10', '11', '12'];
    fieldNums.forEach((n, i) => {
      const x = 170 + i * 80; ctx.beginPath(); ctx.arc(x, 312, 22, 0, TAU); ctx.strokeStyle = L; ctx.lineWidth = 2; ctx.stroke();
      feltText(ctx, n, x, 313, 22, { color: '#fff7e0' });
      if ((n === '2' || n === '12')) feltText(ctx, n === '2' ? 'PAYS 2×' : 'PAYS 3×', x, 345, 11, { color: '#ffd24d' });
    });
    feltText(ctx, 'FIELD', 435, 365, 26, { color: '#ffd24d' });
    if (this.hl && !this.busy && [2, 3, 4, 9, 10, 11, 12].includes(this.hl)) { rr(ctx, 123, 277, 624, 104, 4); ctx.fillStyle = 'rgba(255,230,120,0.15)'; ctx.fill(); }
    // DON'T PASS bar
    line(120, 388, 630, 50); feltText(ctx, "DON'T PASS BAR", 360, 414, 22, { color: '#fff7e0' });
    ctx.save(); ctx.translate(560, 414); for (let i = 0; i < 2; i++) drawDie(ctx, i * 34 - 16, 0, 26, 6, 0, '#f5f2ea'); ctx.restore();
    // PASS LINE
    ctx.beginPath(); ctx.moveTo(60, 70); ctx.lineTo(60, 520); ctx.quadraticCurveTo(60, 560, 100, 560); ctx.lineTo(760, 560);
    ctx.moveTo(108, 70); ctx.lineTo(108, 490); ctx.quadraticCurveTo(108, 508, 126, 508); ctx.lineTo(760, 508); ctx.strokeStyle = L; ctx.lineWidth = 2.5; ctx.stroke();
    feltText(ctx, 'PASS LINE', 430, 536, 30, { color: '#fff7e0' }); feltText(ctx, 'PASS LINE', 84, 290, 26, { color: '#fff7e0', rot: -Math.PI / 2 });
    // stick area / boxman side: proposition box
    line(780, 62, 170, 330, 6); feltText(ctx, 'SEVEN', 865, 92, 18, { color: '#ff6b6b' }); feltText(ctx, '4 to 1', 865, 112, 12);
    const props = [[[1, 1], '30:1'], [[6, 6], '30:1'], [[1, 2], '15:1'], [[5, 6], '15:1']];
    props.forEach(([dv, txt], i) => { const x = 820 + (i % 2) * 80, y = 160 + Math.floor(i / 2) * 76; line(x - 36, y - 26, 72, 68, 4); ctx.save(); drawDie(ctx, x - 12, y, 20, dv[0], 0); drawDie(ctx, x + 12, y, 20, dv[1], 0); ctx.restore(); feltText(ctx, txt, x, y + 32, 12); });
    feltText(ctx, 'ANY CRAPS 7:1', 865, 330, 14, { color: '#ff6b6b' }); feltText(ctx, 'HORN · HOP', 865, 360, 12);
    // roll history
    panel(ctx, 780, 410, 170, 132, 8, 'rgba(0,0,0,0.55)', '#c9a24a');
    ctx.font = `700 11px ${SANS}`; ctx.fillStyle = '#c9a24a'; ctx.textAlign = 'center'; ctx.fillText('LAST ROLLS', 865, 428);
    this.rollsShown.slice(0, 10).forEach((r, i) => { const col = r === 7 ? '#ff6b6b' : [2, 3, 12].includes(r) ? '#ffb04d' : '#fff'; ctx.font = `${i ? 700 : 900} ${i ? 17 : 22}px ${SANS}`; ctx.fillStyle = col; ctx.fillText(r, 805 + (i % 5) * 30, 458 + Math.floor(i / 5) * 40); });
    // bet chips
    const v = this.view;
    const pos = { pass: [640, 536], dontpass: [250, 414], field: [700, 312] }[v.type] || [640, 536];
    betChips(ctx, pos[0], pos[1], v.amt, v.base, 20);
    if (this.point && v.type !== 'field') { feltText(ctx, 'POINT ' + this.point, 300, 536, 14, { color: '#ffd24d' }); }
    // dice
    this.dice.slice().sort((a, b) => a.y - b.y).forEach((d) => drawDie(ctx, d.x, d.y, 40, d.v, d.rot, '#c8102e', d.z));
    if (!this.busy && this.lastTot) goldText(ctx, '' + this.lastTot, (this.dice[0].x + this.dice[1].x) / 2, Math.min(this.dice[0].y, this.dice[1].y) - 50, 34, { font: SANS, weight: 900, color: '#fff' });
  }
}

/* ===================== BACCARAT ===================== */
class BaccaratScene extends SceneBase {
  constructor() { super(); this.hist = []; this.d = null; this.reveal = 0; }
  payoutPos() { return [400, 300]; }
  start(res, sp, done) {
    this.busy = true; this.done = done; this.res = res; this.d = res.show; this.t0 = NOW; this.sp = sp;
    const ev = []; const g = 0.42 * sp;
    ev.push(['P', 0], ['B', 0], ['P', 1], ['B', 1]); if (this.d.P[2]) ev.push(['P', 2]); if (this.d.B[2]) ev.push(['B', 2]);
    this.events = ev.map((e, i) => ({ side: e[0], i: e[1], t: NOW + i * g })); this.endAt = NOW + ev.length * g + 0.5 * sp;
    this.events.forEach((e) => setTimeout(() => SND.card(), (e.t - NOW) * 1000));
  }
  update() {
    if (this.busy && NOW >= this.endAt) {
      this.hist.push(this.d.winner[0].toUpperCase()); if (this.hist.length > 66) this.hist = this.hist.slice(-66);
      this.finish();
    }
  }
  draw(ctx, t, dt) {
    this.update();
    drawRoom(ctx, SW, SH, t, 'rgba(255,180,120,0.12)');
    const path = () => { ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(760, 30); ctx.lineTo(760, 250); ctx.ellipse(390, 250, 370, 340, 0, 0, Math.PI); ctx.closePath(); };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; path(); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    path(); feltFill(ctx, 0, 0, SW, SH, ['#8a1a2a', '#5a0e1a', '#320610']);
    leatherRail(ctx, () => { ctx.beginPath(); ctx.ellipse(390, 250, 370, 340, 0, 0.02, Math.PI - 0.02); }, 28);
    goldText(ctx, 'BACCARAT', 390, 60, 30, { italic: true });
    // card boxes
    const boxes = { P: [120, 120, 'PLAYER', '#4a8ff0'], B: [420, 120, 'BANKER', '#f04a4a'] };
    for (const k in boxes) { const [x, y, l, c] = boxes[k]; rr(ctx, x, y, 250, 150, 10); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke(); feltText(ctx, l, x + 125, y + 166, 18, { color: c }); }
    // betting arcs
    const arcs = [['tie', 250, 'TIE  PAYS 8 TO 1', '#5fd38a'], ['banker', 300, 'BANKER  PAYS 19 TO 20', '#ff7b7b'], ['player', 350, 'PLAYER  PAYS 1 TO 1', '#7bb0ff']];
    arcs.forEach(([k, r, txt, col]) => {
      ctx.beginPath(); ctx.ellipse(390, 250, r, r * 0.92, 0, 0.45, Math.PI - 0.45); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      textOnArc(ctx, txt, 390, 250, r - 22, Math.PI / 2, 15, col, true);
      if (this.d && !this.busy && this.d.winner === k) { ctx.beginPath(); ctx.ellipse(390, 250, r - 22, (r - 22) * 0.92, 0, 0.6, Math.PI - 0.6); ctx.strokeStyle = 'rgba(255,240,150,0.5)'; ctx.lineWidth = 22; ctx.stroke(); }
    });
    const v = this.view; const cp = { tie: [390, 470], banker: [390, 520], player: [390, 570] }[v.type] || [390, 520];
    betChips(ctx, cp[0] + 150, cp[1] - 14, v.amt, v.base, 18);
    // cards
    if (this.d) {
      const ev = this.busy ? this.events : null;
      for (const side of ['P', 'B']) {
        const cards = this.d[side], [bx, by] = boxes[side];
        cards.forEach((c, i) => {
          const e = ev ? ev.find((q) => q.side === side && q.i === i) : null; if (e && NOW < e.t) return;
          const k = e ? clamp((NOW - e.t) / (0.35 * this.sp + 0.05), 0, 1) : 1;
          const tx = i < 2 ? bx + 72 + i * 92 : bx + 125, ty = by + (i < 2 ? 75 : 75);
          if (i === 2) { drawCard(ctx, c, tx, by + 75, 70, k, { rot: Math.PI / 2 }); }
          else drawCard(ctx, c, lerp(380, tx, ease.out(Math.min(1, k * 1.5))), lerp(30, ty, ease.out(Math.min(1, k * 1.5))), 70, clamp(k * 1.5 - 0.4, 0, 1));
        });
        const shown = cards.filter((c, i) => { const e = ev ? ev.find((q) => q.side === side && q.i === i) : null; return !e || NOW > e.t + 0.3; });
        if (shown.length) { const tot = bacTot(shown); ctx.beginPath(); ctx.arc(bx + 125, by - 22, 22, 0, TAU); ctx.fillStyle = side === 'P' ? '#1d4fa8' : '#a81d1d'; ctx.fill(); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2; ctx.stroke(); goldText(ctx, '' + tot, bx + 125, by - 21, 26, { font: SANS, weight: 900, color: '#fff' }); }
      }
      if (!this.busy) goldText(ctx, this.d.winner === 'tie' ? 'TIE' : (this.d.winner === 'player' ? 'PLAYER' : 'BANKER') + ' WINS', 390, 340, 34, { font: SANS, weight: 900, color: this.d.winner === 'tie' ? '#7dff9a' : this.d.winner === 'player' ? '#9ac4ff' : '#ff9a9a' });
    }
    // scoreboard
    const sx = 790, sy = 40; panel(ctx, sx, sy, 190, 400, 10, '#07080c', '#c9a24a');
    goldText(ctx, 'SCOREBOARD', sx + 95, sy + 20, 16, { font: SANS, weight: 800 });
    const cols = 6, cell = 28;
    for (let i = 0; i < 66; i++) { const c = Math.floor(i / 6), r = i % 6; const x = sx + 12 + (c % 6) * cell + 2, y = sy + 40 + r * cell + Math.floor(c / 6) * (6 * cell + 6); if (y > sy + 380) continue; ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.strokeRect(x, y, cell, cell); }
    const hs = this.hist.slice(-36);
    hs.forEach((w, i) => {
      const c = Math.floor(i / 6), r = i % 6, x = sx + 12 + c * cell + 2 + cell / 2, y = sy + 40 + r * cell + cell / 2;
      ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fillStyle = w === 'P' ? '#2d6fe0' : w === 'B' ? '#e03030' : '#2fb36a'; ctx.fill();
      ctx.font = `800 12px ${SANS}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w, x, y + 1);
    });
    const cnt = (k) => this.hist.filter((h) => h === k).length;
    [['P', 'Player', '#7bb0ff'], ['B', 'Banker', '#ff7b7b'], ['T', 'Tie', '#5fd38a']].forEach(([k, l, c], i) => { ctx.font = `700 15px ${SANS}`; ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.fillText(`${l}: ${cnt(k)}`, sx + 16, sy + 270 + i * 24); });
    ctx.font = `700 12px ${SANS}`; ctx.fillStyle = '#887'; ctx.fillText('8-deck shoe', sx + 16, sy + 350); ctx.fillText(`Rounds: ${this.hist.length}`, sx + 16, sy + 370);
  }
}

/* ===================== VIDEO POKER ===================== */
class VideoPokerScene extends SceneBase {
  constructor() { super(); this.hand = null; this.holds = [false, false, false, false, false]; this.phase = 'idle'; this.flip = [1, 1, 1, 1, 1]; this.final = null; this.idx = -1; this.anims = []; }
  payoutPos() { return [500, 400]; }
  cardX(i) { return 280 + i * 110; }
  /* manual: deal 5 */
  deal(hand) { this.hand = hand; this.final = null; this.idx = -1; this.holds = [false, false, false, false, false]; this.phase = 'hold'; this.dealAnim(hand, [0, 1, 2, 3, 4], 0.12); }
  dealAnim(cards, which, gap) { which.forEach((i, k) => { this.anims[i] = { t: NOW + k * gap, card: cards[i] }; setTimeout(() => SND.card(), k * gap * 1000); }); }
  draw2(final, idx) { this.final = final; const which = [0, 1, 2, 3, 4].filter((i) => !this.holds[i]); this.dealAnim(final, which, 0.12); this.phase = 'shown'; this.idx = idx; this.showAt = NOW + which.length * 0.12 + 0.3; }
  start(res, sp, done) {
    this.busy = true; this.done = done; const s = res.show; this.res = res;
    this.hand = s.hand; this.holds = [false, false, false, false, false]; this.final = null; this.idx = -1; this.dealAnim(s.hand, [0, 1, 2, 3, 4], 0.1 * sp);
    this.phase = 'hold';
    setTimeout(() => { this.holds = s.holds.slice(); SND.click(); }, (0.7 * sp) * 1000);
    setTimeout(() => { this.draw2(s.final, s.idx); this.showAt = NOW + 0.6 * sp; }, (1.5 * sp) * 1000);
    this.endAt = NOW + 2.3 * sp;
  }
  update() { if (this.busy && this.endAt && NOW >= this.endAt) { this.endAt = null; this.finish(); } }
  tap(x, y) { if (this.phase !== 'hold' || this.busy) return null; for (let i = 0; i < 5; i++) if (Math.abs(x - this.cardX(i)) < 52 && y > 300 && y < 520) { this.holds[i] = !this.holds[i]; SND.click(); return { hold: i }; } return null; }
  draw(ctx, t, dt) {
    this.update();
    drawRoom(ctx, SW, SH, t, 'rgba(120,160,255,0.12)');
    // cabinet
    rr(ctx, 150, 8, 700, 604, 26); ctx.fillStyle = '#121218'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = chromeGrad(ctx, 150, 0, 850, 0); ctx.stroke();
    rr(ctx, 172, 22, 656, 64, 12); const tg = ctx.createLinearGradient(0, 22, 0, 86); tg.addColorStop(0, '#2a1060'); tg.addColorStop(1, '#0a0a30'); ctx.fillStyle = tg; ctx.fill();
    bulbRow(ctx, rectBulbs(180, 28, 640, 52, 20), t, 2, 'rgba(160,200,255,0.9)');
    goldText(ctx, 'JACKS OR BETTER', 500, 56, 34, { glow: 'rgba(120,160,255,0.9)' });
    // screen
    rr(ctx, 186, 96, 628, 440, 10); const sg = ctx.createLinearGradient(0, 96, 0, 536); sg.addColorStop(0, '#0a1e8a'); sg.addColorStop(1, '#04104a'); ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
    // paytable
    rr(ctx, 210, 108, 580, 168, 6); ctx.fillStyle = '#071460'; ctx.fill(); ctx.strokeStyle = '#ffd24d'; ctx.lineWidth = 2; ctx.stroke();
    const win = this.phase === 'shown' && NOW >= (this.showAt || 0) ? this.idx : -1;
    VP_PAY.forEach(([name, pay], i) => {
      const col = i < 5 ? 0 : 1, row = i < 5 ? i : i - 5, x = 226 + col * 290, y = 128 + row * 31;
      if (i === win) { ctx.fillStyle = `rgba(255,60,60,${0.55 + 0.35 * Math.sin(t * 8)})`; ctx.fillRect(x - 8, y - 13, 272, 26); }
      ctx.font = `800 17px ${SANS}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd24d'; ctx.fillText(name.toUpperCase(), x, y);
      ctx.textAlign = 'right'; ctx.fillText(pay + '×', x + 254, y);
    });
    // cards
    for (let i = 0; i < 5; i++) {
      const x = this.cardX(i), y = 392, a = this.anims[i];
      if (!this.hand) { drawCard(ctx, null, x, y, 96, 0); continue; }
      let card = a ? a.card : this.hand[i], k = a ? clamp((NOW - a.t) / 0.22, 0, 1) : 1;
      drawCard(ctx, card, x, y, 96, k < 1 ? k : 1, { glow: this.holds[i] && this.phase !== 'idle' ? 'rgba(255,230,90,0.9)' : null });
      if (this.holds[i]) { ctx.font = `900 22px ${SANS}`; ctx.fillStyle = '#ffe27a'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('HELD', x, 310); ctx.shadowBlur = 0; }
    }
    if (this.phase === 'hold' && !this.busy) { ctx.font = `700 16px ${SANS}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('Tap cards to hold, then DRAW', 500, 516); }
    if (win >= 0) goldText(ctx, VP_PAY[win][0].toUpperCase(), 500, 296, 30, { font: SANS, weight: 900, color: '#fff', glow: '#ff3030' });
    else if (this.phase === 'shown' && NOW >= (this.showAt || 0)) { ctx.font = `800 20px ${SANS}`; ctx.fillStyle = '#9ab'; ctx.textAlign = 'center'; ctx.fillText('GAME OVER', 500, 296); }
    // physical buttons
    const by = 552; rr(ctx, 172, by - 8, 656, 56, 8); ctx.fillStyle = '#1e1e26'; ctx.fill();
    for (let i = 0; i < 5; i++) { const x = this.cardX(i); rr(ctx, x - 40, by, 80, 36, 6); ctx.fillStyle = this.holds[i] ? '#ffd24d' : '#c9a020'; ctx.fill(); ctx.fillStyle = '#222'; ctx.font = `900 14px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HOLD', x, by + 18); }
    ctx.textBaseline = 'alphabetic';
  }
}

/* ===================== KENO ===================== */
class KenoScene extends SceneBase {
  constructor() { super(); this.picks = []; this.balls = []; this.drawn = 0; this.hits = 0; this.pay = 0; this.spots = 4; }
  payoutPos() { return [600, 300]; }
  cell(n) { const i = n - 1, r = Math.floor(i / 10), c = i % 10; return [340 + c * 62, 70 + r * 50 + (r >= 4 ? 16 : 0)]; }
  start(res, sp, done) {
    this.busy = true; this.done = done; this.res = res; this.picks = res.show.picks.slice(); this.balls = res.show.balls; this.t0 = NOW; this.gap = 0.17 * sp; this.drawn = 0; this.hits = 0;
  }
  update() {
    if (!this.busy) return;
    const n = clamp(Math.floor((NOW - this.t0) / this.gap), 0, 20);
    while (this.drawn < n) { const b = this.balls[this.drawn]; this.drawn++; if (this.picks.includes(b)) { this.hits++; SND.tone(880 + this.hits * 110, 0.12, 'triangle', 0.15); } else if (Math.random() < 0.5) SND.ball(); }
    if (this.drawn >= 20 && NOW - this.t0 > 20 * this.gap + 0.4) { this.pay = this.res.show.pay; this.finish(); }
  }
  tap(x, y) {
    if (this.busy) return null;
    for (let n = 1; n <= 80; n++) { const [cx, cy] = this.cell(n); if (Math.abs(x - cx) < 29 && Math.abs(y - cy) < 23) return { pick: n }; }
    return null;
  }
  draw(ctx, t, dt) {
    this.update();
    drawRoom(ctx, SW, SH, t, 'rgba(255,220,120,0.10)');
    // blower
    const bx = 150, by = 210, R = 120;
    ctx.save(); ctx.fillStyle = '#2a1a0a'; rr(ctx, bx - 70, by + R - 10, 140, 70, 10); ctx.fill(); ctx.drawImage(TEX.wood, bx - 70, by + R - 10, 140, 70); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.clip();
    const gg = ctx.createRadialGradient(bx - 40, by - 50, 10, bx, by, R); gg.addColorStop(0, 'rgba(200,230,255,0.25)'); gg.addColorStop(1, 'rgba(60,80,120,0.35)'); ctx.fillStyle = gg; ctx.fillRect(bx - R, by - R, R * 2, R * 2);
    const active = this.busy ? 1 : 0.25;
    for (let i = 0; i < 46; i++) {
      const ph = i * 1.7, sp = active * (1.5 + (i % 5) * 0.4);
      const x = bx + Math.sin(t * sp + ph) * (R - 18) * ((i * 37) % 100) / 100, y = by + R - 16 - Math.abs(Math.sin(t * sp * 1.3 + ph * 2)) * (R * 1.6) * active - (1 - active) * ((i * 13) % 30);
      const bg = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 11); bg.addColorStop(0, '#fff'); bg.addColorStop(1, ['#ffd24d', '#ff6b6b', '#6bb8ff', '#7dff6a'][i % 4]);
      ctx.beginPath(); ctx.arc(x, clamp(y, by - R + 12, by + R - 12), 10, 0, TAU); ctx.fillStyle = bg; ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = chromeGrad(ctx, bx - R, by - R, bx + R, by + R); ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.ellipse(bx - 45, by - 55, 30, 50, -0.6, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    goldText(ctx, 'KENO', bx, by + R + 30, 34, { italic: true });
    // last ball
    if (this.drawn > 0) {
      const b = this.balls[this.drawn - 1], hit = this.picks.includes(b), y = 470;
      const bg = ctx.createRadialGradient(bx - 14, y - 14, 4, bx, y, 50); bg.addColorStop(0, '#fff'); bg.addColorStop(1, hit ? '#2fbf5a' : '#e0b030');
      ctx.beginPath(); ctx.arc(bx, y, 46, 0, TAU); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, y, 28, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); goldText(ctx, '' + b, bx, y + 1, 30, { font: SANS, weight: 900, color: '#111', stroke: 'rgba(0,0,0,0)' });
    }
    // board
    panel(ctx, 300, 36, 670, 470, 12, '#0b0c12', '#c9a24a');
    const drawnSet = new Set(this.balls.slice(0, this.drawn));
    for (let n = 1; n <= 80; n++) {
      const [x, y] = this.cell(n), d = drawnSet.has(n), p = this.picks.includes(n);
      rr(ctx, x - 28, y - 21, 56, 42, 6);
      ctx.fillStyle = d && p ? '#1e8a3c' : d ? '#b8870f' : '#1b1d27'; ctx.fill();
      if (d) { ctx.save(); ctx.shadowColor = p ? '#5aff8a' : '#ffd24d'; ctx.shadowBlur = 12; ctx.strokeStyle = p ? '#5aff8a' : '#ffd24d'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      ctx.font = `800 20px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = d ? '#fff' : '#9aa0b4'; ctx.fillText(n, x, y + 1);
      if (p) { ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.strokeStyle = d ? '#fff' : '#ff4d6d'; ctx.lineWidth = 3; ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(201,162,74,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(310, 270); ctx.lineTo(960, 270); ctx.stroke();
    // info + paytable
    const sp = this.view.spots || this.spots;
    panel(ctx, 300, 516, 670, 90, 10, 'rgba(0,0,0,0.65)', '#c9a24a');
    ledText(ctx, `DRAWN ${this.drawn}/20`, 400, 545, 18, '#ffd24d'); ledText(ctx, `HITS ${this.hits}/${sp}`, 400, 580, 18, '#5aff8a');
    const pt = KENO_PAY[sp] || {}; const ks = Object.keys(pt);
    ctx.font = `700 12px ${SANS}`; ctx.fillStyle = '#c9a24a'; ctx.textAlign = 'center'; ctx.fillText(`PICK ${sp} PAYS (for 1)`, 720, 534);
    ks.forEach((h, i) => {
      const x = 560 + (i + 0.5) * (380 / ks.length), on = !this.busy && this.drawn >= 20 && +h === this.hits;
      ctx.font = `800 15px ${SANS}`; ctx.fillStyle = on ? '#5aff8a' : '#ddd'; ctx.fillText(`${h} hit${h > 1 ? 's' : ''}`, x, 560); ctx.font = `900 19px ${SANS}`; ctx.fillStyle = on ? '#5aff8a' : '#ffd24d'; ctx.fillText(fmtMult(pt[h]), x, 586);
    });
  }
}
function fmtMult(x) { return x >= 1000 ? (x / 1000) + 'K×' : x + '×'; }

/* ===================== BIG SIX ===================== */
class BigSixScene extends SceneBase {
  constructor() { super(); this.cx = 350; this.cy = 318; this.R = 280; this.ang = -Math.PI / 2 - 0.5 * (TAU / 54); this.img = null; this.res = null; this.flap = 0; this.lastSeg = 0; }
  payoutPos() { return [350, 318]; }
  wheelImg(px) {
    if (this.img && this.px === px) return this.img;
    const R = this.R, s = Math.ceil(R * 2 * px), c = mkCanvas(s, s), g = c.getContext('2d'); g.scale(px, px); g.translate(R, R);
    const n = B6_ORDER.length, sa = TAU / n, r0 = R * 0.3, r1 = R * 0.9;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = '#2a1206'; g.fill(); g.save(); g.clip(); g.drawImage(TEX.wood, -R, -R, R * 2, R * 2); g.restore();
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.lineWidth = 8; g.strokeStyle = '#c9962a'; g.stroke();
    for (let i = 0; i < n; i++) {
      const k = B6_ORDER[i], sym = B6_SYMS.find((q) => q.k === k), a0 = i * sa, a1 = a0 + sa;
      g.beginPath(); g.arc(0, 0, r1, a0, a1); g.arc(0, 0, r0, a1, a0, true); g.closePath();
      const gr = g.createRadialGradient(0, 0, r0, 0, 0, r1); gr.addColorStop(0, shade(sym.col, -0.25)); gr.addColorStop(1, sym.col); g.fillStyle = gr; g.fill();
      g.strokeStyle = '#7a5010'; g.lineWidth = 1.5; g.stroke();
      g.save(); g.rotate(a0 + sa / 2); g.translate((r0 + r1) / 2 + 10, 0); g.rotate(Math.PI / 2);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (k === 'J' || k === 'M') {
        g.fillStyle = '#5a1080'; g.beginPath(); g.arc(0, -34, 10, 0, TAU); g.fill(); g.fillStyle = '#ffe27a'; g.font = `900 13px ${SERIF}`; g.fillText(k === 'J' ? '★' : 'M', 0, -33);
        g.font = `900 11px ${SANS}`; g.fillStyle = '#3a1a00'; g.save(); g.rotate(-Math.PI / 2); g.fillText(k === 'J' ? 'JOKER' : 'CASINO', -30, 0); g.restore();
      } else {
        g.fillStyle = k === '1' ? '#2a5a2a' : '#fff'; g.font = `900 ${k.length > 1 ? 11 : 15}px ${SERIF}`; g.fillText('$' + k, 0, -36);
        g.strokeStyle = k === '1' ? 'rgba(40,90,40,0.6)' : 'rgba(255,255,255,0.6)'; g.lineWidth = 1; g.strokeRect(-8, -22, 16, 94);
        g.save(); g.rotate(-Math.PI / 2); g.font = `800 12px ${SANS}`; g.fillText(k === '1' ? 'ONE' : k === '2' ? 'TWO' : k === '5' ? 'FIVE' : k === '10' ? 'TEN' : 'TWENTY', -26, 0); g.restore();
      }
      g.restore();
    }
    // pegs
    for (let i = 0; i < n; i++) { const a = i * sa; const x = Math.cos(a) * (R * 0.95), y = Math.sin(a) * (R * 0.95); g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fillStyle = '#e8e8e8'; g.fill(); g.strokeStyle = '#555'; g.lineWidth = 1; g.stroke(); }
    // hub
    const hg = g.createRadialGradient(-12, -14, 4, 0, 0, r0); hg.addColorStop(0, '#fff3c4'); hg.addColorStop(0.5, '#c9962a'); hg.addColorStop(1, '#6a4008'); g.beginPath(); g.arc(0, 0, r0, 0, TAU); g.fillStyle = hg; g.fill();
    g.beginPath(); g.arc(0, 0, r0 * 0.8, 0, TAU); g.fillStyle = '#5a0a18'; g.fill(); g.strokeStyle = '#ffd77a'; g.lineWidth = 3; g.stroke();
    g.font = `italic 900 ${R * 0.09}px ${SERIF}`; g.fillStyle = '#ffd77a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("Matthew's", 0, -12); g.font = `900 ${R * 0.06}px ${SANS}`; g.fillText('MONEY WHEEL', 0, 18);
    this.img = c; this.px = px; return c;
  }
  start(res, sp, done) {
    this.busy = true; this.done = done; this.res = res; this.t0 = NOW; this.dur = 5.5 * sp; this.a0 = this.ang;
    const sa = TAU / 54, jitter = (Math.random() - 0.5) * 0.6 * sa;
    let target = -Math.PI / 2 - (res.show.i + 0.5) * sa + jitter;
    while (target > this.a0) target -= TAU;
    this.a1 = target - TAU * Math.round(1 + 2 * sp);
    SND.chip();
  }
  update() {
    if (!this.busy) return;
    const k = clamp((NOW - this.t0) / this.dur, 0, 1);
    this.ang = lerp(this.a0, this.a1, ease.out(k));
    if (k >= 1) this.finish();
  }
  draw(ctx, t, dt) {
    this.update();
    drawRoom(ctx, SW, SH, t, 'rgba(255,200,90,0.14)');
    const { cx, cy, R } = this, sa = TAU / 54;
    // stand
    ctx.fillStyle = '#1a0d06'; ctx.beginPath(); ctx.moveTo(cx - 60, cy); ctx.lineTo(cx - 120, SH); ctx.lineTo(cx + 120, SH); ctx.lineTo(cx + 60, cy); ctx.fill();
    // rim lights
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(cx, cy, R + 22, 0, TAU); ctx.fillStyle = '#3a0a14'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R + 22, 0, TAU); ctx.lineWidth = 6; ctx.strokeStyle = goldGrad(ctx, cy - R, cy + R); ctx.stroke();
    const bulbs = []; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; bulbs.push([cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12)]); }
    bulbRow(ctx, bulbs, this.busy ? t * 3 : t, 1);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.ang); const img = this.wheelImg(SCENE_PX); ctx.drawImage(img, -R, -R, R * 2, R * 2); ctx.restore();
    // clapper
    const rel = ((-Math.PI / 2 - this.ang) / sa) % 1, f = ((rel % 1) + 1) % 1;
    const seg = Math.floor((-Math.PI / 2 - this.ang) / sa); if (seg !== this.lastSeg) { this.lastSeg = seg; if (this.busy) SND.tick(); }
    const defl = this.busy ? (f < 0.25 ? f / 0.25 : Math.max(0, 1 - (f - 0.25) / 0.4)) * 0.35 : 0;
    ctx.save(); ctx.translate(cx, cy - R - 30); ctx.rotate(-defl);
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(3, 52); ctx.lineTo(-3, 52); ctx.closePath(); const lg = ctx.createLinearGradient(-10, 0, 10, 0); lg.addColorStop(0, '#4a2010'); lg.addColorStop(0.5, '#a0603a'); lg.addColorStop(1, '#4a2010'); ctx.fillStyle = lg; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fillStyle = goldGrad(ctx, -13, 13); ctx.fill(); ctx.restore();
    // betting layout
    const v = this.view; panel(ctx, 690, 40, 290, 540, 14, '#0e3a20', '#c9a24a');
    ctx.save(); rr(ctx, 690, 40, 290, 540, 14); ctx.clip(); ctx.fillStyle = ctx.createPattern(TEX.felt, 'repeat'); ctx.fillRect(690, 40, 290, 540); ctx.restore();
    goldText(ctx, 'PLACE YOUR BET', 835, 70, 18, { font: SANS, weight: 800 });
    const winK = !this.busy && this.res ? this.res.show.k : null;
    B6_SYMS.forEach((s, i) => {
      const y = 96 + i * 68; rr(ctx, 708, y, 254, 58, 8); ctx.fillStyle = shade(s.col, -0.1); ctx.fill(); ctx.strokeStyle = winK === s.k ? '#fff' : 'rgba(255,240,200,0.6)'; ctx.lineWidth = winK === s.k ? 4 : 1.5; ctx.stroke();
      if (winK === s.k) { ctx.save(); ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore(); }
      ctx.font = `900 26px ${SERIF}`; ctx.fillStyle = s.k === '1' ? '#2a5a2a' : '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(s.k === 'J' ? '★ JOKER' : s.k === 'M' ? 'M CASINO' : '$' + s.k, 722, y + 29);
      ctx.font = `800 15px ${SANS}`; ctx.textAlign = 'right'; ctx.fillText(`pays ${s.pays} to 1`, 948, y + 29);
      if (v.type === s.k) betChips(ctx, 900, y + 42, v.amt, v.base, 16);
    });
  }
}

/* ===================== SIC BO ===================== */
class SicBoScene extends SceneBase {
  constructor() { super(); this.dice = [3, 5, 2]; this.res = null; this.areas = this.buildAreas(); }
  payoutPos() { return [500, 170]; }
  buildAreas() {
    const A = [];
    A.push({ k: 'small', x: 40, y: 300, w: 190, h: 120, label: 'SMALL', sub: '4 – 10 · 1 TO 1' });
    A.push({ k: 'odd', x: 240, y: 300, w: 110, h: 120, label: 'ODD', sub: '1 TO 1' });
    A.push({ k: 'anytriple', x: 360, y: 300, w: 280, h: 120, label: 'ANY TRIPLE', sub: '30 TO 1' });
    A.push({ k: 'even', x: 650, y: 300, w: 110, h: 120, label: 'EVEN', sub: '1 TO 1' });
    A.push({ k: 'big', x: 770, y: 300, w: 190, h: 120, label: 'BIG', sub: '11 – 17 · 1 TO 1' });
    A.push({ k: 'triple6', x: 860, y: 430, w: 100, h: 74, label: '6 6 6', sub: '180 TO 1' });
    return A;
  }
  start(res, sp, done) { this.busy = true; this.done = done; this.res = res; this.t0 = NOW; this.dur = 2.6 * sp; this.revealed = false; SND.dice(); }
  update() {
    if (!this.busy) return;
    const k = (NOW - this.t0) / this.dur;
    if (k < 0.6 && Math.random() < 0.25) SND.noise(0.03, 1500 + Math.random() * 1500, 4, 0.2);
    if (k >= 0.6 && !this.revealed) { this.revealed = true; this.dice = this.res.show.d.slice(); }
    if (k >= 1) this.finish();
  }
  tap(x, y) { if (this.busy) return null; for (const a of this.areas) if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return { type: a.k }; return null; }
  draw(ctx, t, dt) {
    this.update();
    drawRoom(ctx, SW, SH, t, 'rgba(255,150,90,0.12)');
    tableRail(ctx, () => rr(ctx, 16, 268, SW - 32, SH - 284, 30), ['#8a1a1a', '#5a0e0e', '#300606']);
    // layout
    const s = this.res ? this.res.show : null, done = !this.busy && s;
    const winning = (k) => done && (sicboRound.length, ({ small: !s.triple && s.t <= 10, big: !s.triple && s.t >= 11, odd: !s.triple && s.t % 2 === 1, even: !s.triple && s.t % 2 === 0, anytriple: s.triple, triple6: s.triple && s.d[0] === 6 })[k]);
    for (const a of this.areas) {
      rr(ctx, a.x, a.y, a.w, a.h, 8); ctx.strokeStyle = 'rgba(255,220,150,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
      if (winning(a.k)) { ctx.save(); ctx.fillStyle = `rgba(255,220,100,${0.2 + 0.12 * Math.sin(t * 6)})`; ctx.fill(); ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 18; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
      goldText(ctx, a.label, a.x + a.w / 2, a.y + a.h / 2 - 12, a.k === 'triple6' ? 20 : 30, { font: a.k === 'anytriple' ? SERIF : SANS, weight: 900 });
      feltText(ctx, a.sub, a.x + a.w / 2, a.y + a.h / 2 + 24, 13, { color: 'rgba(255,240,200,0.8)' });
      if (a.k === 'anytriple') for (let i = 1; i <= 6; i++) { const x = a.x + 22 + (i - 1) * 47; for (let j = 0; j < 3; j++) drawDie(ctx, x + j * 7 - 7, a.y + 100 - j * 2, 14, i, 0, '#f5f2ea'); }
    }
    // totals row
    for (let tot = 4; tot <= 17; tot++) {
      const x = 40 + (tot - 4) * 58.5, y = 430, w = 54; rr(ctx, x, y, w, 74, 6); ctx.strokeStyle = 'rgba(255,220,150,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (done && s.t === tot) { ctx.fillStyle = 'rgba(255,220,100,0.3)'; ctx.fill(); }
      if (tot >= 16) continue;
      feltText(ctx, '' + tot, x + w / 2, y + 28, 24, { color: '#fff3d0' });
      const pays = { 4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17 }[tot]; feltText(ctx, pays + ':1', x + w / 2, y + 56, 11);
    }
    // single faces row
    for (let f = 1; f <= 6; f++) {
      const x = 40 + (f - 1) * 153, y = 514, w = 146; rr(ctx, x, y, w, 70, 6); ctx.strokeStyle = 'rgba(255,220,150,0.6)'; ctx.stroke();
      if (done && s.d.includes(f)) { ctx.fillStyle = 'rgba(255,220,100,0.28)'; ctx.fill(); }
      drawDie(ctx, x + 50, y + 34, 34, f, 0, '#f5f2ea'); feltText(ctx, '1:1 · 2:1 · 3:1', x + 102, y + 36, 11);
    }
    // bet chips
    const v = this.view, a = this.areas.find((q) => q.k === v.type); if (a) betChips(ctx, a.x + a.w - 34, a.y + a.h - 26, v.amt, v.base, 18);
    // shaker
    const k = this.busy ? (NOW - this.t0) / this.dur : 1;
    const shaking = this.busy && k < 0.6, lift = this.busy ? clamp((k - 0.6) / 0.15, 0, 1) : 1;
    const sx = 500 + (shaking ? Math.sin(NOW * 40) * 10 : 0), sy = 150 + (shaking ? Math.cos(NOW * 33) * 8 : 0);
    // base plate
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.ellipse(sx, sy + 70, 150, 40, 0, 0, TAU); ctx.fillStyle = '#6a4008'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.ellipse(sx, sy + 62, 150, 40, 0, 0, TAU); ctx.fillStyle = goldGrad(ctx, sy + 22, sy + 102); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx, sy + 58, 128, 30, 0, 0, TAU); ctx.fillStyle = '#5a0a18'; ctx.fill();
    // dice
    this.dice.forEach((dv, i) => {
      const jx = shaking ? Math.sin(NOW * 50 + i * 2) * 26 : 0, jy = shaking ? Math.cos(NOW * 43 + i * 3) * 10 - Math.abs(Math.sin(NOW * 30 + i)) * 26 : 0;
      const v2 = shaking ? 1 + ((Math.floor(NOW * 15) + i * 2) % 6) : dv;
      drawDie(ctx, sx - 52 + i * 52 + jx, sy + 50 + jy + (i === 1 ? -6 : 0), 40, v2, shaking ? NOW * 8 + i : (i - 1) * 0.15, '#f5f2ea');
    });
    // glass dome
    const dy = sy - lift * 160;
    ctx.save(); ctx.globalAlpha = 0.9 - lift * 0.4;
    ctx.beginPath(); ctx.ellipse(sx, dy + 58, 132, 26, 0, 0, Math.PI); ctx.lineTo(sx - 132, dy + 58); ctx.ellipse(sx, dy + 58, 132, 150, 0, Math.PI, TAU); ctx.closePath();
    const dg = ctx.createRadialGradient(sx - 40, dy - 30, 10, sx, dy + 20, 160); dg.addColorStop(0, 'rgba(255,255,255,0.35)'); dg.addColorStop(0.5, 'rgba(180,220,255,0.12)'); dg.addColorStop(1, 'rgba(120,160,200,0.28)'); ctx.fillStyle = dg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(sx - 60, dy - 20, 18, 60, 0.4, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(sx, dy - 98, 16, 0, TAU); ctx.fillStyle = goldGrad(ctx, dy - 114, dy - 82); ctx.fill();
    ctx.restore();
    if (done) {
      goldText(ctx, `${s.d.join(' + ')} = ${s.t}${s.triple ? '  TRIPLE!' : ''}`, 500, 40, 30, { font: SANS, weight: 900, color: '#fff' });
      goldText(ctx, s.triple ? 'TRIPLE' : s.t <= 10 ? 'SMALL' : 'BIG', 820, 140, 40, {});
    }
    goldText(ctx, '大小', 160, 140, 54, { glow: 'rgba(255,120,60,0.6)' }); feltText(ctx, 'SIC BO', 160, 196, 20, { color: '#ffd77a' });
  }
}
