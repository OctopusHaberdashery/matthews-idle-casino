/* ===== Matthew's Idle Casino — economy, game loop and interface ===== */
const ECON = {
  start: 50, edge0: 0.12, manualBonus: 0.13, charmEdge: 0.03, charmMax: 12, vipEdge: 0.01, carpetEdge: 0.01, carpetMax: 15,
  B: (t) => 10 * Math.pow(4, t),
  unlock: (owned) => (owned === 0 ? 0 : 1000 * Math.pow(50, owned - 1)),
  dealerCost: (B, n) => (n === 0 ? 10 * B : 6 * B * Math.pow(1.15, n - 1)),
  limitCost: (B, L) => 50 * B * Math.pow(12, L),
  speedCost: (B, s) => 15 * B * Math.pow(2.5, s), speedMax: 10, interval: (s) => 2.5 * Math.pow(0.8, s),
  charmCost: (B, c) => 30 * B * Math.pow(3.5, c),
  miles: [25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000],
  offRate: [0.5, 0.75, 1.0], offRateCost: [25e3, 2.5e6],
  offCap: [4, 8, 24], offCapCost: [1e5, 5e7],
  carpetCost: (l) => 1e6 * Math.pow(15, l),
  vipFor: (won) => Math.floor(Math.cbrt(Math.max(0, won) / 1e10)),
};
const SAVE_KEY = 'matthews_idle_casino_v1';

/* ---------- formatting ---------- */
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];
function fmtNum(x, dec) {
  if (!isFinite(x)) return '∞';
  const neg = x < 0; x = Math.abs(x);
  let s;
  if (x < 1000) s = x < 100 && x % 1 !== 0 ? x.toFixed(dec === undefined ? 2 : dec) : Math.round(x).toString();
  else { let i = 0; while (x >= 1000 && i < SUFFIX.length - 1) { x /= 1000; i++; } s = (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + SUFFIX[i]; }
  return (neg ? '−' : '') + s;
}
const fmt = (x, dec) => (x < 0 ? '−$' + fmtNum(-x, dec) : '$' + fmtNum(x, dec));
const fmtShort = (x) => '$' + fmtNum(x, 0);
function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return sec + 's'; if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
  return Math.floor(sec / 86400) + 'd ' + Math.floor((sec % 86400) / 3600) + 'h';
}

/* ---------- state ---------- */
let S = null;
function freshGame() { return { owned: false, tier: 0, n: 0, L: 0, s: 0, c: 0, type: null, step: 0, watch: true, straight: 17, picks: [], acc: 0, rounds: 0, net: 0, best: 0 }; }
function newState(keep) {
  const st = {
    v: 1, money: ECON.start, won: 0, vip: 0, vipTotal: 0, games: {}, global: { off: 0, cap: 0, carpet: 0 }, sel: null, owned: 0,
    sound: true, last: Date.now(), created: Date.now(), stats: { rounds: 0, biggest: 0, biggestGame: '', wonAll: 0, prestiges: 0, played: 0 }, comp: 0,
  };
  GAME_ORDER.forEach((g) => { st.games[g] = freshGame(); st.games[g].type = GAME_DEFS[g].def; });
  if (keep) { st.vip = keep.vip; st.vipTotal = keep.vipTotal; st.stats = keep.stats; st.sound = keep.sound; }
  return st;
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
    const st = JSON.parse(raw); if (!st || st.v !== 1) return null;
    const base = newState(); for (const k in base) if (st[k] === undefined) st[k] = base[k];
    GAME_ORDER.forEach((g) => { st.games[g] = Object.assign(freshGame(), { type: GAME_DEFS[g].def }, st.games[g] || {}); });
    return st;
  } catch (e) { return null; }
}
let PENDING = 0; // stakes on the felt right now (added back when saving, so a closed app never loses a bet)
function save() { try { S.last = Date.now(); const m = S.money; S.money += PENDING; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); S.money = m; } catch (e) { } }

/* ---------- economy helpers ---------- */
const G = (gid) => S.games[gid];
const baseBet = (g) => ECON.B(g.tier);
const milesHit = (g) => ECON.miles.filter((m) => g.n >= m).length;
const nextMile = (g) => ECON.miles.find((m) => g.n < m);
const maxBet = (g) => baseBet(g) * Math.pow(2, g.L + milesHit(g));
const interval = (g) => ECON.interval(g.s);
function edge(g, manual) { return ECON.edge0 + ECON.charmEdge * g.c + ECON.vipEdge * S.vip + ECON.carpetEdge * S.global.carpet + (manual ? ECON.manualBonus : 0); }
function wl(gid, type) { return (RTP[gid] && RTP[gid][type]) || [0.5, 0.5]; }
function boost(gid, type, E) { const [W, L] = wl(gid, type); return (L + E) / W; }
function rateOf(gid) { const g = G(gid); if (!g.owned || !g.n) return 0; return g.n * maxBet(g) * edge(g, false) / interval(g); }
const totalRate = () => GAME_ORDER.reduce((a, gid) => a + rateOf(gid), 0);
function stakeAfford(bet, units) { return S.money >= bet * units - 1e-9; }
function autoBet(g) {
  const B = baseBet(g); let b = maxBet(g);
  while (b > B && !stakeAfford(b, 1)) b /= 2;
  return stakeAfford(b, 1) ? b : 0;
}
function chosenBet(g) { const B = baseBet(g); return Math.max(B, maxBet(g) / Math.pow(2, g.step)); }
function profitOf(gid, type, res, bet, manual) { const g = G(gid); const m = boost(gid, type, edge(g, manual)); return bet * (res.win * m - res.loss); }
function roundCtx(gid, bet) {
  const g = G(gid); return { straight: g.straight, picks: null, canAfford: (extra) => stakeAfford(bet, 1 + extra) };
}
function credit(gid, profit, bet, grossWin, manual) {
  const g = G(gid); S.money += profit; if (S.money < 0) S.money = 0;
  g.net += profit; g.rounds++; S.stats.rounds++;
  if (grossWin > 0) { S.won += grossWin; S.stats.wonAll += grossWin; }
  if (profit > g.best) g.best = profit;
  if (profit > S.stats.biggest) { S.stats.biggest = profit; S.stats.biggestGame = gid; }
}

/* ---------- scenes ---------- */
const SCENES = {
  slots: new SlotsScene(), roulette: new RouletteScene(), blackjack: new BlackjackScene(), craps: new CrapsScene(), baccarat: new BaccaratScene(),
  videopoker: new VideoPokerScene(), keno: new KenoScene(), bigsix: new BigSixScene(), sicbo: new SicBoScene(),
};
const PLAY_LABEL = { slots: 'SPIN', roulette: 'SPIN', blackjack: 'DEAL', craps: 'ROLL', baccarat: 'DEAL', videopoker: 'DEAL', keno: 'DRAW', bigsix: 'SPIN', sicbo: 'SHAKE' };

/* ---------- rounds ---------- */
const manualRound = { active: false };
function sceneFor(gid) { return SCENES[gid]; }
function celebrate(gid, profit, bet, visible) {
  const sc = sceneFor(gid), [px, py] = sc.payoutPos(), mult = profit / bet;
  if (!visible) { if (mult >= 40) toast(`🎰 ${GAME_DEFS[gid].short}: ${mult >= 150 ? 'JACKPOT' : 'BIG WIN'} +${fmt(profit)}`); return; }
  if (profit > 0) {
    floatText(px, py - 30, '+' + fmt(profit), '#ffe27a', 38);
    if (mult >= 150) { FX.banner = { title: 'JACKPOT!', sub: '+' + fmt(profit), age: 0, life: 3.2 }; burstCoins(px, py, 120, true); SND.bigwin(); vibrate([60, 40, 120]); }
    else if (mult >= 15) { FX.banner = { title: 'BIG WIN!', sub: '+' + fmt(profit), age: 0, life: 2.6 }; burstCoins(px, py, 60, true); SND.bigwin(); vibrate(60); }
    else { burstCoins(px, py, Math.min(30, 6 + mult * 8), false); SND.win(); }
  } else if (profit < 0) { floatText(px, py - 30, fmt(profit), '#ff8a8a', 28); SND.lose(); }
  else floatText(px, py - 30, 'PUSH', '#9ad0ff', 28);
}
function vibrate(p) { try { if (window.AndroidApp && AndroidApp.vibrate) AndroidApp.vibrate(Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p); else if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }

/* watch mode: show one dealer round on the visible table */
function showcaseAuto(gid) {
  const g = G(gid), sc = sceneFor(gid); const bet = autoBet(g); if (!bet) return false;
  const res = autoRound(gid, g.type, roundCtx(gid, bet));
  const stakeUnits = gid === 'blackjack' ? res.show.hands.reduce((a, h) => a + h.stake, 0) : 1;
  S.money -= bet * stakeUnits; if (S.money < 0) S.money = 0; PENDING += bet * stakeUnits;
  sc.view = { amt: bet, base: baseBet(g), type: g.type, straight: g.straight, spots: +g.type };
  const sp = clamp(interval(g) / 2.5, 0.35, 1);
  sc.manual = false;
  sc.start(res, sp, () => {
    const profit = profitOf(gid, g.type, res, bet, false);
    S.money += bet * stakeUnits; PENDING -= bet * stakeUnits; credit(gid, profit, bet, profit > 0 ? profit : 0);
    celebrate(gid, profit, bet, S.sel === gid);
  });
  return true;
}
/* simple manual rounds */
function playManual(gid) {
  const g = G(gid), sc = sceneFor(gid); if (sc.busy || manualRound.active) return;
  SND.init(); SND.resume();
  const bet = chosenBet(g);
  if (!stakeAfford(bet, 1)) { toast('Not enough chips for that bet — lower it or wait for the dealers.'); return; }
  if (gid === 'blackjack') return bjManualDeal(gid, bet);
  if (gid === 'videopoker') return vpManualDeal(gid, bet);
  const ctx = roundCtx(gid, bet);
  if (gid === 'keno') ctx.picks = g.picks.length === +g.type ? g.picks.slice() : null;
  const res = autoRound(gid, g.type, ctx);
  if (gid === 'keno' && ctx.picks) res.show.picks = ctx.picks;
  S.money -= bet; PENDING += bet; S.stats.played++;
  sc.view = { amt: bet, base: baseBet(g), type: g.type, straight: g.straight, spots: +g.type };
  manualRound.active = true; renderControls();
  sc.start(res, 1, () => {
    manualRound.active = false;
    const profit = profitOf(gid, g.type, res, bet, true); S.money += bet; PENDING -= bet; credit(gid, profit, bet, profit > 0 ? profit : 0);
    celebrate(gid, profit, bet, S.sel === gid); renderControls();
  });
}
/* blackjack by hand */
function bjManualDeal(gid, bet) {
  const g = G(gid), sc = sceneFor(gid);
  S.money -= bet; PENDING += bet; S.stats.played++;
  const st = bjDeal(shoes.blackjack);
  manualRound.active = true; manualRound.bj = { st, bet, stake: 1 }; sc.reset(); sc.manual = true; sc.gap = 0.32;
  sc.view = { amt: bet, base: baseBet(g), type: 'hand' };
  sc.sync(st, false);
  if (bjPeekEnds(st)) { st.over = true; afterIdle(sc, () => { sc.sync(st, true); afterIdle(sc, () => bjManualSettle(gid)); }); }
  else afterIdle(sc, () => renderControls());
  renderControls();
}
function afterIdle(sc, fn) { const wait = Math.max(0, sc.idleAt() - NOW); setTimeout(fn, wait * 1000); }
function bjManualAct(act) {
  const gid = 'blackjack', sc = sceneFor(gid), m = manualRound.bj; if (!m || m.st.over || NOW < sc.idleAt() - 0.3) return;
  if ((act === 'double' || act === 'split')) { if (!stakeAfford(m.bet, 1)) { toast('Not enough chips to ' + act + '.'); return; } S.money -= m.bet; PENDING += m.bet; m.stake++; }
  SND.click(); bjAct(m.st, act, shoes.blackjack); sc.sync(m.st, false);
  if (m.st.over) { bjDealerPlay(m.st, shoes.blackjack); afterIdle(sc, () => { sc.sync(m.st, true); afterIdle(sc, () => bjManualSettle(gid)); }); }
  else afterIdle(sc, () => renderControls());
  renderControls();
}
function bjManualSettle(gid) {
  const m = manualRound.bj, sc = sceneFor(gid); const res = bjSettle(m.st);
  const profit = profitOf(gid, 'hand', res, m.bet, true); S.money += m.bet * m.stake; PENDING -= m.bet * m.stake; credit(gid, profit, m.bet, profit > 0 ? profit : 0);
  sc.showResult(res); celebrate(gid, profit, m.bet, S.sel === gid);
  manualRound.active = false; manualRound.bj = null; renderControls();
}
/* video poker by hand */
function vpManualDeal(gid, bet) {
  const g = G(gid), sc = sceneFor(gid); S.money -= bet; PENDING += bet; S.stats.played++;
  const deck = vpDeck(), hand = deck.splice(0, 5);
  manualRound.active = true; manualRound.vp = { deck, hand, bet };
  sc.view = { amt: bet, base: baseBet(g) }; sc.deal(hand); renderControls();
}
function vpManualDraw() {
  const gid = 'videopoker', sc = sceneFor(gid), m = manualRound.vp; if (!m) return;
  const final = m.hand.map((c, i) => (sc.holds[i] ? c : m.deck.pop())), idx = vpRankIdx(final), pay = idx >= 0 ? VP_PAY[idx][1] : 0;
  sc.draw2(final, idx); manualRound.vp = null;
  setTimeout(() => {
    const res = { win: Math.max(0, pay - 1), loss: pay === 0 ? 1 : 0 };
    const profit = profitOf(gid, 'draw', res, m.bet, true); S.money += m.bet; PENDING -= m.bet; credit(gid, profit, m.bet, profit > 0 ? profit : 0);
    celebrate(gid, profit, m.bet, S.sel === gid); manualRound.active = false; renderControls();
  }, 950);
  renderControls();
}

/* ---------- background dealers ---------- */
function tickGame(gid, dt) {
  const g = G(gid); if (!g.owned || !g.n) return;
  g.acc += dt * g.n / interval(g);
  const sc = sceneFor(gid), showcase = S.sel === gid && g.watch && !manualRound.active && document.visibilityState !== 'hidden';
  if (showcase && !sc.busy && g.acc >= 1) { if (showcaseAuto(gid)) g.acc -= 1; }
  let k = Math.floor(g.acc) - (showcase ? 1 : 0); if (k <= 0) return;
  g.acc -= k;
  // Background dealers: real rounds (with real swings and jackpots) only while the bet is a small slice
  // of the bankroll; otherwise they bank their steady expected winnings. This keeps the casino from ever going broke.
  const bet = maxBet(g); let done = 0;
  while (done < k && done < 30 && bet <= S.money * 0.01) {
    const res = autoRound(gid, g.type, roundCtx(gid, bet));
    const profit = profitOf(gid, g.type, res, bet, false);
    credit(gid, profit, bet, profit > 0 ? profit : 0); done++;
    if (profit / bet >= 40) celebrate(gid, profit, bet, false);
  }
  const rest = k - done;
  if (rest > 0) {
    const E = edge(g, false), [W] = wl(gid, g.type), m = boost(gid, g.type, E);
    const p = rest * bet * E; S.money += p; g.net += p; g.rounds += rest; S.stats.rounds += rest; S.won += rest * bet * W * m; S.stats.wonAll += rest * bet * W * m;
  }
}

/* ---------- purchases ---------- */
function costOf(gid, what) {
  const g = G(gid), B = baseBet(g);
  if (what === 'n') return ECON.dealerCost(B, g.n);
  if (what === 'L') return ECON.limitCost(B, g.L);
  if (what === 's') return g.s >= ECON.speedMax ? Infinity : ECON.speedCost(B, g.s);
  if (what === 'c') return g.c >= ECON.charmMax ? Infinity : ECON.charmCost(B, g.c);
}
function buy(gid, what, many) {
  const g = G(gid); let bought = 0;
  do { const c = costOf(gid, what); if (!(S.money >= c)) break; S.money -= c; g[what]++; bought++; } while (many && bought < 1000);
  if (bought) {
    SND.buy(); if (what === 'n' && g.n === 1) { g.watch = true; toast(`Your first dealer is on ${GAME_DEFS[gid].short}! They'll keep playing while you're away.`); }
    if (what === 'n' && ECON.miles.includes(g.n)) toast(`${g.n} dealers on ${GAME_DEFS[gid].short} — High-roller bonus: table limit doubled!`);
    renderShop(); renderControls(); save();
  }
}
function unlockCost() { return ECON.unlock(S.owned); }
function unlockGame(gid, free) {
  const g = G(gid); if (g.owned) return;
  const c = free ? 0 : unlockCost(); if (S.money < c) return;
  S.money -= c; g.owned = true; g.tier = S.owned; S.owned++; g.watch = false; g.type = GAME_DEFS[gid].def;
  SND.buy(); if (!free) { burstCoins(500, 300, 50, true); toast(`${GAME_DEFS[gid].name} is open! Minimum bet ${fmt(baseBet(g))}.`); }
  select(gid); save();
}
const GLOBALS = {
  off: { name: 'Night Manager', desc: (l) => `Offline earnings ${Math.round(ECON.offRate[l] * 100)}% → ${Math.round(ECON.offRate[l + 1] * 100)}% of normal`, max: 2, cost: (l) => ECON.offRateCost[l] },
  cap: { name: 'Graveyard Shift', desc: (l) => `Dealers keep earning up to ${ECON.offCap[l]}h → ${ECON.offCap[l + 1]}h while you're away`, max: 2, cost: (l) => ECON.offCapCost[l] },
  carpet: { name: 'Lucky Carpet', desc: (l) => `+1% player edge on every table (now +${l}%)`, max: ECON.carpetMax, cost: (l) => ECON.carpetCost(l) },
};
function buyGlobal(k) { const def = GLOBALS[k], l = S.global[k]; if (l >= def.max) return; const c = def.cost(l); if (S.money < c) return; S.money -= c; S.global[k]++; SND.buy(); renderShop(); save(); }
function prestige() {
  const gain = ECON.vipFor(S.won); if (gain < 1) return;
  const keep = { vip: S.vip + gain, vipTotal: S.vipTotal + gain, stats: Object.assign({}, S.stats, { prestiges: S.stats.prestiges + 1 }), sound: S.sound };
  S = newState(keep); manualRound.active = false; save(); closeModal(); SND.bigwin();
  for (const k in SCENES) { SCENES[k].busy = false; SCENES[k].done = null; }
  pickFirstGame(true);
}

/* ---------- offline ---------- */
function offlineGain(sec) {
  const capped = Math.min(sec, ECON.offCap[S.global.cap] * 3600);
  return { amount: totalRate() * capped * ECON.offRate[S.global.off], capped, sec };
}
function applyOffline(sec, quietly) {
  if (sec < 5) return;
  const o = offlineGain(sec); if (o.amount <= 0) return;
  S.money += o.amount; S.won += o.amount;
  if (quietly) { toast(`Dealers earned ${fmt(o.amount)} while you were away`); return; }
  showModal(`<div class="wb"><div class="wb-title">Welcome back, Matthew!</div>
    <p>Your dealers kept the tables busy for <b>${fmtTime(o.capped)}</b>${o.sec > o.capped ? ` (they clock out after ${ECON.offCap[S.global.cap]}h)` : ''}.</p>
    <div class="wb-amt">+${fmt(o.amount)}</div><p class="dim">Offline tables earn ${Math.round(ECON.offRate[S.global.off] * 100)}% of their usual rate.</p></div>`, [['Collect', closeModal, 'gold']]);
  SND.init(); burstCoins(500, 300, 40, true);
}

/* ================= UI ================= */
const $ = (s) => document.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) { if (k === 'class') el.className = attrs[k]; else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]); else if (k === 'html') el.innerHTML = attrs[k]; else el.setAttribute(k, attrs[k]); }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
function showModal(html, buttons, cls) {
  const m = $('#modal'), box = $('#modal-box'); box.className = 'modal-box ' + (cls || ''); box.innerHTML = '';
  const body = typeof html === 'string' ? h('div', { html }) : html; box.append(body);
  if (buttons && buttons.length) box.append(h('div', { class: 'modal-btns' }, buttons.map(([l, fn, c]) => h('button', { class: 'btn ' + (c || ''), onclick: fn }, l))));
  m.classList.add('show');
}
function closeModal() { $('#modal').classList.remove('show'); }

/* game icons (small canvas art used in the floor list and picker) */
function drawIcon(c, gid) {
  const g = c.getContext('2d'), s = c.width; g.clearRect(0, 0, s, s); g.save(); g.scale(s / 100, s / 100);
  const bg = g.createRadialGradient(50, 45, 5, 50, 50, 70); bg.addColorStop(0, '#3a1a2a'); bg.addColorStop(1, '#120810'); rr(g, 2, 2, 96, 96, 18); g.fillStyle = bg; g.fill();
  g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.stroke();
  if (gid === 'slots') {
    rr(g, 20, 14, 60, 74, 10); g.fillStyle = '#b4223a'; g.fill(); g.strokeStyle = '#ddd'; g.lineWidth = 2.5; g.stroke();
    rr(g, 26, 36, 48, 26, 4); g.fillStyle = '#fff'; g.fill(); for (let i = 0; i < 3; i++) g.drawImage(slotSymbol('seven', 64), 27 + i * 16, 39, 15, 20);
    g.fillStyle = '#ffe27a'; g.font = `900 11px ${SANS}`; g.textAlign = 'center'; g.fillText('777', 50, 30);
    g.strokeStyle = '#ccc'; g.lineWidth = 3; g.beginPath(); g.moveTo(82, 56); g.lineTo(88, 30); g.stroke(); g.beginPath(); g.arc(88, 28, 5, 0, TAU); g.fillStyle = '#d0101e'; g.fill();
  } else if (gid === 'roulette' || gid === 'bigsix') {
    const n = gid === 'roulette' ? 18 : 16;
    for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(50, 52); g.arc(50, 52, 36, (i / n) * TAU, ((i + 1) / n) * TAU); g.closePath(); g.fillStyle = gid === 'roulette' ? (i === 0 ? '#0f8a3c' : i % 2 ? '#c0141e' : '#141414') : B6_SYMS[i % 6].col; g.fill(); }
    g.beginPath(); g.arc(50, 52, 36, 0, TAU); g.lineWidth = 4; g.strokeStyle = '#c9962a'; g.stroke();
    g.beginPath(); g.arc(50, 52, 15, 0, TAU); g.fillStyle = goldGrad(g, 37, 67); g.fill();
    if (gid === 'roulette') { g.beginPath(); g.arc(68, 30, 4.5, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
    else { g.beginPath(); g.moveTo(44, 8); g.lineTo(56, 8); g.lineTo(50, 22); g.fillStyle = '#ffe27a'; g.fill(); }
  } else if (gid === 'blackjack' || gid === 'baccarat') {
    const a = gid === 'blackjack' ? [{ r: 1, s: 0 }, { r: 13, s: 1 }] : [{ r: 9, s: 2 }, { r: 12, s: 3 }];
    drawCardMini(g, a[0], 38, 50, -0.18); drawCardMini(g, a[1], 60, 52, 0.18);
    if (gid === 'baccarat') { g.beginPath(); g.arc(78, 80, 11, 0, TAU); g.fillStyle = '#e03030'; g.fill(); g.fillStyle = '#fff'; g.font = `900 12px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B', 78, 81); }
    else { g.fillStyle = '#ffe27a'; g.font = `900 13px ${SANS}`; g.textAlign = 'center'; g.fillText('21', 50, 94); }
  } else if (gid === 'craps') { drawDie(g, 38, 46, 30, 5, -0.3); drawDie(g, 64, 60, 30, 2, 0.25); }
  else if (gid === 'sicbo') {
    drawDie(g, 32, 66, 22, 4, -0.2, '#f5f2ea'); drawDie(g, 52, 70, 22, 6, 0.1, '#f5f2ea'); drawDie(g, 70, 64, 22, 1, 0.3, '#f5f2ea');
    g.beginPath(); g.ellipse(50, 70, 38, 10, 0, 0, Math.PI); g.lineTo(12, 70); g.ellipse(50, 70, 38, 52, 0, Math.PI, TAU); g.fillStyle = 'rgba(180,220,255,0.18)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.arc(50, 18, 5, 0, TAU); g.fillStyle = '#e0aa3a'; g.fill();
  } else if (gid === 'videopoker') {
    rr(g, 14, 18, 72, 62, 6); g.fillStyle = '#0a1e8a'; g.fill(); g.strokeStyle = '#bbb'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 5; i++) { rr(g, 19 + i * 13.5, 44, 12, 18, 2); g.fillStyle = '#fff'; g.fill(); drawSuit(g, i % 4, 25 + i * 13.5, 53, 7); }
    g.fillStyle = '#ffd24d'; g.font = `800 8px ${SANS}`; g.textAlign = 'center'; g.fillText('ROYAL FLUSH', 50, 32);
  } else if (gid === 'keno') {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const hit = (r * 5 + c) % 3 === 0; rr(g, 16 + c * 14, 18 + r * 14, 12, 12, 2); g.fillStyle = hit ? '#ffd24d' : '#2a2d3a'; g.fill(); }
    g.beginPath(); g.arc(70, 76, 14, 0, TAU); const bg2 = g.createRadialGradient(65, 71, 2, 70, 76, 14); bg2.addColorStop(0, '#fff'); bg2.addColorStop(1, '#2fbf5a'); g.fillStyle = bg2; g.fill();
    g.fillStyle = '#111'; g.font = `900 11px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('42', 70, 77);
  }
  g.restore();
}
function drawCardMini(g, card, x, y, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); rr(g, -17, -24, 34, 48, 4); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#999'; g.lineWidth = 1; g.stroke();
  g.fillStyle = suitCol(card.s); g.font = `800 12px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(RANKS[card.r], -9, -14); drawSuit(g, card.s, 2, 6, 16); g.restore();
}

/* floor list */
const floorEls = {};
function buildFloor() {
  const f = $('#floor-list'); f.innerHTML = '';
  GAME_ORDER.forEach((gid) => {
    const icon = h('canvas', { width: 88, height: 88, class: 'ficon' }); drawIcon(icon, gid);
    const name = h('div', { class: 'fname' }, GAME_DEFS[gid].short), sub = h('div', { class: 'fsub' }), badge = h('div', { class: 'fbadge' });
    const el = h('div', { class: 'fitem', onclick: () => onFloorTap(gid) }, icon, h('div', { class: 'ftext' }, name, sub), badge);
    floorEls[gid] = { el, sub, badge }; f.append(el);
  });
}
function onFloorTap(gid) {
  SND.init(); SND.resume();
  const g = G(gid);
  if (g.owned) { select(gid); return; }
  const c = unlockCost();
  if (S.money >= c) {
    showModal(`<div class="wb"><canvas id="pickicon" width="160" height="160"></canvas><div class="wb-title">Open ${GAME_DEFS[gid].name}?</div><p>${GAME_DEFS[gid].tag}</p>
      <p>Costs <b>${fmt(c)}</b>. Its minimum bet will be <b>${fmt(ECON.B(S.owned))}</b>.</p></div>`, [['Not yet', closeModal], ['Open it — ' + fmt(c), () => { closeModal(); unlockGame(gid); }, 'gold']]);
    drawIcon($('#pickicon'), gid);
  } else toast(`${GAME_DEFS[gid].name} opens for ${fmt(c)} — you have ${fmt(S.money)}.`);
}
function updateFloor() {
  const c = unlockCost();
  GAME_ORDER.forEach((gid) => {
    const g = G(gid), e = floorEls[gid]; if (!e) return;
    e.el.classList.toggle('sel', S.sel === gid); e.el.classList.toggle('locked', !g.owned);
    if (g.owned) {
      const r = rateOf(gid); e.sub.textContent = g.n ? `${fmt(r)}/s` : 'Playing by hand';
      e.badge.textContent = g.n ? g.n + '' : ''; e.badge.style.display = g.n ? '' : 'none';
      const sc = SCENES[gid]; e.el.classList.toggle('busy', !!sc.busy && S.sel !== gid);
    } else {
      e.sub.textContent = '🔒 ' + fmt(c); e.badge.style.display = 'none'; e.el.classList.toggle('afford', S.money >= c);
    }
  });
}

/* selection */
function select(gid) {
  if (S.sel === gid) return;
  if (manualRound.active && S.sel) { toast('Finish this hand first.'); return; }
  S.sel = gid; const g = G(gid), sc = sceneFor(gid);
  if (!sc.busy) sc.view = { amt: g.watch && g.n ? maxBet(g) : chosenBet(g), base: baseBet(g), type: g.type, straight: g.straight, spots: +g.type };
  if (gid === 'keno' && !sc.busy) sc.picks = g.picks.slice();
  renderControls(); renderShop(); updateFloor();
}

/* ---------- controls under the table ---------- */
let ctl = {};
function renderControls() {
  const box = $('#controls'); box.innerHTML = ''; ctl = {};
  const gid = S.sel; if (!gid) return; const g = G(gid), def = GAME_DEFS[gid], sc = sceneFor(gid);
  const watching = g.watch && g.n > 0;
  // row 1: bet types
  const types = Object.keys(def.bets);
  const row1 = h('div', { class: 'crow types' });
  if (types.length > 1) types.forEach((k) => {
    let label = def.bets[k]; if (gid === 'roulette' && k === 'num') label = 'Number ' + g.straight;
    row1.append(h('button', { class: 'chipbtn' + (g.type === k ? ' on' : ''), onclick: () => setType(gid, k) }, label));
  });
  else row1.append(h('div', { class: 'tagline' }, def.tag));
  const info = h('div', { class: 'edgeinfo' }); ctl.info = info; row1.append(info);
  // row 2
  const row2 = h('div', { class: 'crow main' });
  const modeBtn = h('button', { class: 'btn mode' + (watching ? ' on' : ''), onclick: () => toggleWatch(gid) }, watching ? '👀 Watching dealers' : '✋ Playing myself');
  if (g.n > 0) row2.append(modeBtn);
  if (!watching) {
    const step = h('div', { class: 'stepper' },
      h('button', { class: 'btn sm', onclick: () => { g.step = Math.min(g.step + 1, g.L + milesHit(g)); renderControls(); } }, '−'),
      ctl.bet = h('div', { class: 'betamt' }, fmt(chosenBet(g))),
      h('button', { class: 'btn sm', onclick: () => { g.step = Math.max(0, g.step - 1); renderControls(); } }, '+'));
    row2.append(step);
    const busy = sc.busy || manualRound.active;
    if (gid === 'blackjack' && manualRound.bj) {
      const st = manualRound.bj.st, ready = !st.over && NOW >= sc.idleAt() - 0.35;
      [['Hit', 'hit'], ['Stand', 'stand'], ['Double', 'double'], ['Split', 'split']].forEach(([l, a]) => {
        const ok = ready && (a === 'hit' || a === 'stand' || (a === 'double' && bjCanDouble(st)) || (a === 'split' && bjCanSplit(st)));
        row2.append(h('button', { class: 'btn act ' + a + (ok ? '' : ' dis'), onclick: () => ok && bjManualAct(a) }, l));
      });
      const hint = ready ? bjStrategy(st, true) : null; if (hint) row2.append(h('div', { class: 'hint' }, 'Book says: ' + hint));
    } else if (gid === 'videopoker' && manualRound.vp) {
      row2.append(h('div', { class: 'hint' }, 'Tap cards to hold'), h('button', { class: 'btn big gold', onclick: vpManualDraw }, 'DRAW'));
    } else {
      if (gid === 'keno') {
        row2.append(h('button', { class: 'btn', onclick: () => { g.picks = kenoQuickPick(+g.type); sc.picks = g.picks.slice(); SND.click(); renderControls(); } }, 'Quick pick'));
        row2.append(h('button', { class: 'btn', onclick: () => { g.picks = []; sc.picks = []; renderControls(); } }, 'Clear'));
        row2.append(h('div', { class: 'hint' }, `${g.picks.length}/${g.type} picked`));
      }
      row2.append(ctl.play = h('button', { class: 'btn big gold' + (busy ? ' dis' : ''), onclick: () => playManual(gid) }, PLAY_LABEL[gid]));
    }
  } else {
    row2.append(h('div', { class: 'watchinfo' }, ctl.watch = h('span')));
  }
  // pit boss comp
  const minB = Math.min(...GAME_ORDER.filter((k) => G(k).owned).map((k) => baseBet(G(k))));
  if (S.money < minB && !manualRound.active) {
    const ready = Date.now() >= S.comp;
    row2.append(h('button', { class: 'btn comp' + (ready ? '' : ' dis'), onclick: () => { if (Date.now() < S.comp) return; S.money += minB * 5; S.comp = Date.now() + 30000; SND.chip(); toast(`The pit boss slides you ${fmt(minB * 5)} in chips. "On the house, Matthew."`); renderControls(); } }, ready ? `🎩 Ask the pit boss (+${fmt(minB * 5)})` : '🎩 Pit boss is busy…'));
  }
  box.append(row1, row2);
  updateControls();
}
function setType(gid, k) {
  const g = G(gid); if (manualRound.active || sceneFor(gid).busy && !g.watch) { toast('Wait for this round to finish.'); return; }
  if (gid === 'roulette' && k === 'num' && g.type === 'num') { g.straight = (g.straight + 1) % 37; }
  g.type = k; if (gid === 'keno') { g.picks = []; sceneFor(gid).picks = []; sceneFor(gid).view.spots = +k; }
  const sc = sceneFor(gid); if (!sc.busy) { sc.view.type = k; sc.view.straight = g.straight; }
  SND.click(); renderControls();
}
function toggleWatch(gid) { const g = G(gid); if (manualRound.active) { toast('Finish this hand first.'); return; } g.watch = !g.watch; SND.click(); renderControls(); }
function updateControls() {
  const gid = S.sel; if (!gid || !ctl.info) return; const g = G(gid), watching = g.watch && g.n > 0;
  const E = edge(g, !watching), m = boost(gid, g.type, E);
  ctl.info.innerHTML = `Player edge <b>+${(E * 100).toFixed(0)}%</b>${!watching ? ' <span class="dim">(hands-on bonus)</span>' : ''} · wins pay <b>×${m.toFixed(2)}</b>`;
  if (ctl.watch) { const rps = g.n / interval(g); ctl.watch.innerHTML = `${g.n} dealer${g.n > 1 ? 's' : ''} · ${rps >= 10 ? rps.toFixed(0) : rps.toFixed(1)} rounds/s at ${fmt(autoBet(g) || maxBet(g))} · ≈ <b>${fmt(rateOf(gid))}/s</b>`; }
  if (ctl.bet) ctl.bet.textContent = fmt(chosenBet(g));
  if (ctl.play) ctl.play.classList.toggle('dis', sceneFor(gid).busy || manualRound.active);
}

/* ---------- shop (right panel) ---------- */
let shopTab = 'table', shopEls = [];
function renderShop() {
  const box = $('#shop-body'); box.innerHTML = ''; shopEls = [];
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === shopTab));
  if (shopTab === 'table') return renderTableShop(box);
  if (shopTab === 'casino') return renderCasinoShop(box);
  renderVip(box);
}
function upCard(title, desc, costFn, onBuy, opts = {}) {
  const cost = h('span', { class: 'ucost' }), btn = h('button', { class: 'btn ubtn', onclick: onBuy }, cost);
  const max = opts.max ? h('button', { class: 'btn ubtn max', onclick: opts.max }, 'Max') : null;
  const d = h('div', { class: 'udesc' }); const lvl = h('div', { class: 'ulvl' });
  const el = h('div', { class: 'ucard' + (opts.cls ? ' ' + opts.cls : '') }, h('div', { class: 'uhead' }, h('div', { class: 'utitle' }, title), lvl), d, h('div', { class: 'ubtns' }, btn, max));
  shopEls.push({ costFn, cost, btn, max, d, desc, lvl, lvlFn: opts.lvl }); return el;
}
function renderTableShop(box) {
  const gid = S.sel; if (!gid) return; const g = G(gid), def = GAME_DEFS[gid];
  box.append(h('div', { class: 'shead' }, h('div', { class: 'stitle' }, def.name), h('div', { class: 'ssub' }, `Table ${g.tier + 1} · minimum bet ${fmt(baseBet(g))}`)));
  box.append(upCard(g.n ? 'Hire another dealer' : 'Auto-Play: hire a dealer',
    () => g.n ? `Each dealer plays a round every ${interval(g).toFixed(2)}s. ${nextMile(g) ? `At ${nextMile(g)} dealers the table limit doubles.` : ''}` : 'A dealer plays this table for you — even when the app is closed.',
    () => costOf(gid, 'n'), () => buy(gid, 'n'), { max: () => buy(gid, 'n', true), lvl: () => g.n + ' hired', cls: g.n ? '' : 'hero' }));
  box.append(upCard('Raise the table limit', () => `Bets ${fmt(maxBet(g))} → ${fmt(maxBet(g) * 2)}. Bigger bets, bigger wins.`, () => costOf(gid, 'L'), () => buy(gid, 'L'), { lvl: () => 'Lv ' + g.L }));
  box.append(upCard('Faster dealers', () => g.s >= ECON.speedMax ? 'Dealers are as fast as they get.' : `Round every ${interval(g).toFixed(2)}s → ${ECON.interval(g.s + 1).toFixed(2)}s`, () => costOf(gid, 's'), () => buy(gid, 's'), { lvl: () => g.s + '/' + ECON.speedMax }));
  box.append(upCard('Lucky charm', () => g.c >= ECON.charmMax ? 'This table is as lucky as it gets.' : `Player edge +${(edge(g) * 100).toFixed(0)}% → +${((edge(g) + ECON.charmEdge) * 100).toFixed(0)}%`, () => costOf(gid, 'c'), () => buy(gid, 'c'), { lvl: () => g.c + '/' + ECON.charmMax }));
  const st = h('div', { class: 'tstats' }); shopEls.push({ stats: st, gid }); box.append(st);
}
function renderCasinoShop(box) {
  box.append(h('div', { class: 'shead' }, h('div', { class: 'stitle' }, 'The Casino'), h('div', { class: 'ssub' }, 'Upgrades for every table')));
  for (const k in GLOBALS) {
    const def = GLOBALS[k];
    box.append(upCard(def.name, () => S.global[k] >= def.max ? 'Fully upgraded.' : def.desc(S.global[k]), () => (S.global[k] >= def.max ? Infinity : def.cost(S.global[k])), () => buyGlobal(k), { lvl: () => S.global[k] + '/' + def.max }));
  }
  const st = h('div', { class: 'tstats' }); shopEls.push({ casino: st }); box.append(st);
}
function renderVip(box) {
  box.append(h('div', { class: 'shead' }, h('div', { class: 'stitle' }, '★ High Roller Club'), h('div', { class: 'ssub' }, 'Cash out and start a bigger casino')));
  const info = h('div', { class: 'vipbox' }); shopEls.push({ vip: info }); box.append(info);
  box.append(h('button', { class: 'btn big gold wide', onclick: confirmPrestige }, 'Cash out & join the club'));
  box.append(h('p', { class: 'dim small' }, 'Cashing out resets your bankroll, tables and casino upgrades. You keep your VIP chips forever, and each one adds +1% player edge to every table.'));
}
function confirmPrestige() {
  const gain = ECON.vipFor(S.won);
  if (gain < 1) { toast(`You need ${fmt(1e10)} in total winnings for your first VIP chip.`); return; }
  showModal(`<div class="wb"><div class="wb-title">Cash out?</div><p>You'll earn <b>${gain} VIP chip${gain > 1 ? 's' : ''}</b> (+${gain}% edge on every table, forever).</p><p>Your bankroll, tables and upgrades reset, and you pick a new first table.</p></div>`, [['Keep playing', closeModal], ['Cash out', prestige, 'gold']]);
}
function updateShop() {
  for (const e of shopEls) {
    if (e.costFn) {
      const c = e.costFn(); e.cost.textContent = c === Infinity ? 'MAX' : fmt(c);
      e.btn.classList.toggle('dis', !(S.money >= c)); if (e.max) e.max.classList.toggle('dis', !(S.money >= c));
      const d = e.desc(); if (e.d.textContent !== d) e.d.textContent = d; if (e.lvlFn) e.lvl.textContent = e.lvlFn();
    } else if (e.stats) {
      const g = G(e.gid);
      e.stats.innerHTML = `<div>Rounds played <b>${fmtNum(g.rounds)}</b></div><div>Net result <b class="${g.net >= 0 ? 'pos' : 'neg'}">${fmt(g.net)}</b></div><div>Biggest win <b>${fmt(g.best)}</b></div><div>Max bet <b>${fmt(maxBet(g))}</b></div>`;
    } else if (e.casino) {
      e.casino.innerHTML = `<div>Total winnings <b>${fmt(S.stats.wonAll)}</b></div><div>Rounds played <b>${fmtNum(S.stats.rounds)}</b></div><div>Hands you played <b>${fmtNum(S.stats.played)}</b></div><div>Biggest win <b>${fmt(S.stats.biggest)}</b>${S.stats.biggestGame ? ' on ' + GAME_DEFS[S.stats.biggestGame].short : ''}</div><div>Offline cap <b>${ECON.offCap[S.global.cap]}h</b> at <b>${Math.round(ECON.offRate[S.global.off] * 100)}%</b></div>`;
    } else if (e.vip) {
      const gain = ECON.vipFor(S.won), next = Math.pow(gain + 1, 3) * 1e10;
      e.vip.innerHTML = `<div class="vipchips">★ ${S.vip}</div><div>VIP chips owned (+${S.vip}% edge)</div><hr><div>Winnings this run <b>${fmt(S.won)}</b></div><div>Cash out now for <b class="gold">${gain}</b> VIP chip${gain === 1 ? '' : 's'}</div><div class="dim">Next chip at ${fmt(next)} winnings</div>`;
    }
  }
}

/* ---------- top bar ---------- */
let shownMoney = 0;
function updateTop(dt) {
  shownMoney += (S.money - shownMoney) * Math.min(1, dt * 8); if (Math.abs(S.money - shownMoney) < 0.01) shownMoney = S.money;
  $('#money').textContent = fmt(shownMoney);
  const r = totalRate(); $('#rate').textContent = r > 0 ? `+${fmt(r)}/s` : 'Play a few rounds, then hire a dealer';
  $('#vip').textContent = '★ ' + S.vip;
  $('#sound').textContent = S.sound ? '🔊' : '🔈';
}

/* ---------- first table picker ---------- */
function pickFirstGame(again) {
  const grid = h('div', { class: 'pickgrid' });
  GAME_ORDER.forEach((gid) => {
    const c = h('canvas', { width: 120, height: 120 }); drawIcon(c, gid);
    grid.append(h('button', { class: 'pick', onclick: () => { closeModal(); SND.init(); SND.resume(); unlockGame(gid, true); toast(`Welcome to the floor! Bets here start at ${fmt(10)}. Hire your first dealer for ${fmt(100)}.`); } }, c, h('div', { class: 'pname' }, GAME_DEFS[gid].short), h('div', { class: 'ptag' }, GAME_DEFS[gid].tag)));
  });
  const body = h('div', {}, h('div', { class: 'logo-big' }, "Matthew's Idle Casino"),
    h('p', { class: 'center' }, again ? `Welcome to the High Roller Club — you hold ${S.vip} VIP chip${S.vip === 1 ? '' : 's'}. Pick your first table.` : 'Your casino opens tonight. Pick your first table — it’s on the house. Every table here is rigged in your favor.'),
    grid);
  showModal(body, [], 'wide');
}

/* ---------- canvas & loop ---------- */
const cv = document.getElementById('scene'), cx = cv.getContext('2d');
let view = { s: 1, ox: 0, oy: 0 };
function resize() {
  const wrap = $('#canvas-wrap'), w = wrap.clientWidth - 12, hh = wrap.clientHeight - 12, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.min(w / SW, hh / SH); const cw = Math.floor(SW * s), ch = Math.floor(SH * s);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  view = { s: s * dpr, css: s }; SCENE_PX = s * dpr;
}
cv.addEventListener('pointerdown', (e) => {
  SND.init(); SND.resume();
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / view.css, y = (e.clientY - r.top) / view.css;
  const gid = S.sel; if (!gid) return; const g = G(gid), sc = sceneFor(gid); if (!sc.tap) return;
  if (g.watch && g.n) {
    if (['roulette', 'sicbo', 'keno', 'videopoker'].includes(gid) && sc.tap(x, y) !== null) toast('Switch to “Playing myself” to place bets by hand.');
    return;
  }
  const res = sc.tap(x, y); if (!res) return;
  if (res.type) { if (res.type === 'num') g.straight = res.straight; setType(gid, res.type); if (res.type === 'num') { sc.view.straight = res.straight; renderControls(); } }
  if (res.pick !== undefined) {
    const i = g.picks.indexOf(res.pick);
    if (i >= 0) g.picks.splice(i, 1); else if (g.picks.length < +g.type) g.picks.push(res.pick); else { g.picks.shift(); g.picks.push(res.pick); }
    sc.picks = g.picks.slice(); SND.click(); renderControls();
  }
});
let lastT = performance.now() / 1000, uiT = 0, saveT = 0, drawAcc = 1;
let wallLast = Date.now();
function catchUp() { const now = Date.now(), gap = (now - wallLast) / 1000; wallLast = now; if (gap > 5) { applyOffline(gap, gap < 600); return true; } return false; }
function frame() {
  const t = performance.now() / 1000; let dt = t - lastT; lastT = t;
  if (catchUp()) dt = 0.016;
  dt = Math.min(dt, 0.25); NOW = t;
  for (const gid of GAME_ORDER) { tickGame(gid, dt); if (gid !== S.sel && SCENES[gid].busy && SCENES[gid].update) SCENES[gid].update(); }
  drawAcc += dt;
  const sc0 = S.sel && sceneFor(S.sel), lively = sc0 && (sc0.busy || FX.parts.length || FX.texts.length || FX.banner || manualRound.active);
  if (S.sel && (lively || drawAcc >= 1 / 24)) {
    const ddt = drawAcc; drawAcc = 0;
    const sc = sceneFor(S.sel), g = G(S.sel);
    if (!sc.busy && !manualRound.active) { sc.view.amt = g.watch && g.n ? (autoBet(g) || maxBet(g)) : chosenBet(g); sc.view.base = baseBet(g); sc.view.type = g.type; sc.view.straight = g.straight; sc.view.spots = +g.type; }
    cx.setTransform(view.s, 0, 0, view.s, 0, 0);
    sc.draw(cx, t, ddt); drawFX(cx, ddt, SW, SH);
  }
  updateTop(dt);
  uiT += dt; if (uiT > 0.25) { uiT = 0; updateFloor(); updateShop(); updateControls(); refreshBjButtons(); }
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  requestAnimationFrame(frame);
}
let lastBjReady = null;
function refreshBjButtons() {
  if (S.sel !== 'blackjack' || !manualRound.bj) return; const sc = sceneFor('blackjack'), ready = !manualRound.bj.st.over && NOW >= sc.idleAt() - 0.35;
  if (ready !== lastBjReady) { lastBjReady = ready; renderControls(); }
}

/* ---------- boot ---------- */
function boot() {
  buildTextures();
  S = load(); const fresh = !S; if (!S) S = newState();
  SND.on = S.sound;
  buildFloor();
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { shopTab = t.dataset.tab; SND.click(); renderShop(); }));
  $('#sound').addEventListener('click', () => { S.sound = !S.sound; SND.on = S.sound; SND.init(); SND.resume(); if (S.sound) SND.chip(); save(); });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !$('#modal-box').classList.contains('wide')) closeModal(); });
  window.addEventListener('resize', resize); new ResizeObserver(resize).observe($('#canvas-wrap')); resize();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
    else { lastT = performance.now() / 1000; catchUp(); }
  });
  window.addEventListener('pagehide', save);
  if (fresh || !GAME_ORDER.some((g) => G(g).owned)) pickFirstGame(false);
  else {
    const sel = S.sel && G(S.sel).owned ? S.sel : GAME_ORDER.find((g) => G(g).owned); S.sel = null; select(sel);
    const away = (Date.now() - S.last) / 1000; if (away > 30) applyOffline(away, false);
  }
  wallLast = Date.now();
  renderShop();
  requestAnimationFrame(frame);
}
window.__appPause = save;
window.addEventListener('load', boot);
