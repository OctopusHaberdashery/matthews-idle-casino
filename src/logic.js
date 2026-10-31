/* ===== Matthew's Idle Casino — game rules (pure logic, no drawing) =====
   Every round returns { win, loss } in units of the base bet:
     win  = total net profit from winning parts (multiplied by the table's payout boost)
     loss = total stake lost
   plus a `show` object the scenes use to animate what happened. */

const rnd = () => Math.random();
const ri = (n) => Math.floor(rnd() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- cards ---------- */
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
class Shoe {
  constructor(decks) { this.decks = decks; this.fill(); }
  fill() {
    this.c = [];
    for (let d = 0; d < this.decks; d++) for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) this.c.push({ r, s });
    shuffle(this.c); this.cut = Math.floor(this.c.length * 0.25); this.shuffled = true;
  }
  draw() { if (this.c.length <= this.cut) this.fill(); return this.c.pop(); }
}

/* ---------- Blackjack (6 decks, dealer stands soft 17, 3:2, double any two, split once) ---------- */
const bjCardVal = (c) => (c.r >= 10 ? 10 : c.r);
function bjValue(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { t += bjCardVal(c); if (c.r === 1) aces++; }
  let soft = false;
  if (aces && t + 10 <= 21) { t += 10; soft = true; }
  return { total: t, soft };
}
const bjIsBJ = (cards) => cards.length === 2 && bjValue(cards).total === 21;
function bjDeal(shoe) {
  const p = [shoe.draw()], d = [shoe.draw()]; p.push(shoe.draw()); d.push(shoe.draw());
  return { hands: [{ cards: p, stake: 1, done: false, doubled: false, fromSplit: false }], dealer: d, active: 0, over: false, split: false };
}
function bjCanSplit(st) {
  const h = st.hands[st.active];
  return !st.split && h.cards.length === 2 && bjCardVal(h.cards[0]) === bjCardVal(h.cards[1]);
}
function bjCanDouble(st) { const h = st.hands[st.active]; return h.cards.length === 2 && !(h.fromSplit && h.cards[0].r === 1); }
/* Basic strategy. Returns 'hit' | 'stand' | 'double' | 'split' */
function bjStrategy(st, allowExtra) {
  const h = st.hands[st.active], up = bjCardVal(st.dealer[0]);
  const u = up === 1 ? 11 : up;
  if (allowExtra && bjCanSplit(st)) {
    const r = bjCardVal(h.cards[0]);
    const sp = (r === 1 || r === 8) || ((r === 2 || r === 3 || r === 7) && u <= 7) || (r === 6 && u <= 6) ||
      (r === 9 && u <= 9 && u !== 7) || (r === 4 && (u === 5 || u === 6));
    if (sp) return 'split';
  }
  const { total, soft } = bjValue(h.cards);
  const canD = allowExtra && bjCanDouble(st);
  if (soft) {
    if (total >= 19) return 'stand';
    if (total === 18) { if (u >= 3 && u <= 6 && canD) return 'double'; return (u <= 8) ? 'stand' : 'hit'; }
    if (total === 17) return (u >= 3 && u <= 6 && canD) ? 'double' : 'hit';
    if (total >= 15) return (u >= 4 && u <= 6 && canD) ? 'double' : 'hit';
    return (u >= 5 && u <= 6 && canD) ? 'double' : 'hit';
  }
  if (total >= 17) return 'stand';
  if (total >= 13) return u <= 6 ? 'stand' : 'hit';
  if (total === 12) return (u >= 4 && u <= 6) ? 'stand' : 'hit';
  if (total === 11) return canD ? 'double' : 'hit';
  if (total === 10) return (u <= 9 && canD) ? 'double' : 'hit';
  if (total === 9) return (u >= 3 && u <= 6 && canD) ? 'double' : 'hit';
  return 'hit';
}
function bjNextHand(st) {
  while (st.active < st.hands.length && st.hands[st.active].done) st.active++;
  if (st.active >= st.hands.length) st.over = true;
}
function bjAct(st, act, shoe) {
  const h = st.hands[st.active];
  if (act === 'hit') { h.cards.push(shoe.draw()); if (bjValue(h.cards).total >= 21) h.done = true; }
  else if (act === 'stand') h.done = true;
  else if (act === 'double') { h.stake = 2; h.doubled = true; h.cards.push(shoe.draw()); h.done = true; }
  else if (act === 'split') {
    const c2 = h.cards.pop(); st.split = true;
    const h2 = { cards: [c2], stake: 1, done: false, doubled: false, fromSplit: true };
    h.fromSplit = true; h.cards.push(shoe.draw()); h2.cards.push(shoe.draw());
    st.hands.splice(st.active + 1, 0, h2);
    if (h.cards[0].r === 1) { h.done = true; h2.done = true; } // split aces get one card
    else if (bjValue(h.cards).total === 21) h.done = true;
  }
  bjNextHand(st);
}
function bjDealerPlay(st, shoe) {
  const live = st.hands.some((h) => bjValue(h.cards).total <= 21) && !(st.hands.length === 1 && bjIsBJ(st.hands[0].cards) && !st.split);
  if (live) while (true) { const v = bjValue(st.dealer); if (v.total >= 17) break; st.dealer.push(shoe.draw()); }
}
function bjSettle(st) {
  let win = 0, loss = 0; const res = [];
  const dv = bjValue(st.dealer).total, dBJ = bjIsBJ(st.dealer);
  for (const h of st.hands) {
    const pv = bjValue(h.cards).total, pBJ = bjIsBJ(h.cards) && !st.split;
    let r;
    if (pBJ && !dBJ) r = 1.5;
    else if (dBJ) r = pBJ ? 0 : -h.stake;
    else if (pv > 21) r = -h.stake;
    else if (dv > 21 || pv > dv) r = h.stake;
    else if (pv === dv) r = 0;
    else r = -h.stake;
    res.push(r); if (r > 0) win += r; else loss -= r;
  }
  return { win, loss, res };
}
/* dealer peek: returns true if round ends right after the deal */
function bjPeekEnds(st) { return bjIsBJ(st.dealer) || bjIsBJ(st.hands[0].cards); }
function bjAuto(shoe, canAffordExtra) {
  const st = bjDeal(shoe);
  if (!bjPeekEnds(st)) {
    let extra = 0;
    while (!st.over) {
      let a = bjStrategy(st, canAffordExtra(extra + 1));
      if (a === 'double' || a === 'split') extra++;
      bjAct(st, a, shoe);
    }
    bjDealerPlay(st, shoe);
  } else st.over = true;
  const s = bjSettle(st); s.show = st; return s;
}

/* ---------- Roulette (European single zero) ---------- */
const RL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RL_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const RL_BETS = {
  red: { label: 'Red', pays: 1, hit: (n) => RL_RED.has(n) },
  black: { label: 'Black', pays: 1, hit: (n) => n > 0 && !RL_RED.has(n) },
  odd: { label: 'Odd', pays: 1, hit: (n) => n % 2 === 1 },
  even: { label: 'Even', pays: 1, hit: (n) => n > 0 && n % 2 === 0 },
  low: { label: '1–18', pays: 1, hit: (n) => n >= 1 && n <= 18 },
  high: { label: '19–36', pays: 1, hit: (n) => n >= 19 },
  d1: { label: '1st 12', pays: 2, hit: (n) => n >= 1 && n <= 12 },
  d2: { label: '2nd 12', pays: 2, hit: (n) => n >= 13 && n <= 24 },
  d3: { label: '3rd 12', pays: 2, hit: (n) => n >= 25 },
  num: { label: 'Straight up', pays: 35, hit: (n, s) => n === s },
};
function rlRound(type, straight) {
  const n = RL_ORDER[ri(37)], b = RL_BETS[type];
  const hit = b.hit(n, straight);
  return { win: hit ? b.pays : 0, loss: hit ? 0 : 1, show: { n } };
}

/* ---------- Craps ---------- */
const d6 = () => 1 + ri(6);
function crapsRound(type) {
  const rolls = [];
  const roll = () => { const r = [d6(), d6()]; rolls.push(r); return r[0] + r[1]; };
  if (type === 'field') {
    const t = roll();
    if (t === 2) return { win: 2, loss: 0, show: { rolls } };
    if (t === 12) return { win: 3, loss: 0, show: { rolls } };
    if ([3, 4, 9, 10, 11].includes(t)) return { win: 1, loss: 0, show: { rolls } };
    return { win: 0, loss: 1, show: { rolls } };
  }
  const t = roll(); let passWins = null, push = false, point = 0;
  if (t === 7 || t === 11) passWins = true;
  else if (t === 2 || t === 3) passWins = false;
  else if (t === 12) { passWins = false; push = true; }
  else {
    point = t;
    for (let i = 0; i < 400; i++) { const x = roll(); if (x === point) { passWins = true; break; } if (x === 7) { passWins = false; break; } }
  }
  if (type === 'pass') return { win: passWins ? 1 : 0, loss: passWins ? 0 : 1, show: { rolls, point } };
  if (push) return { win: 0, loss: 0, show: { rolls, point, push: true } };
  return { win: passWins ? 0 : 1, loss: passWins ? 1 : 0, show: { rolls, point } };
}

/* ---------- Baccarat (8 decks, standard third-card rules) ---------- */
const bacVal = (c) => (c.r >= 10 ? 0 : c.r);
const bacTot = (h) => h.reduce((a, c) => a + bacVal(c), 0) % 10;
function bacDeal(shoe) {
  const P = [shoe.draw()], B = [shoe.draw()]; P.push(shoe.draw()); B.push(shoe.draw());
  let p = bacTot(P), b = bacTot(B);
  if (p < 8 && b < 8) {
    let p3 = null;
    if (p <= 5) { p3 = shoe.draw(); P.push(p3); }
    b = bacTot(B);
    if (p3 === null) { if (b <= 5) B.push(shoe.draw()); }
    else {
      const v = bacVal(p3);
      const draw = b <= 2 || (b === 3 && v !== 8) || (b === 4 && v >= 2 && v <= 7) || (b === 5 && v >= 4 && v <= 7) || (b === 6 && (v === 6 || v === 7));
      if (draw) B.push(shoe.draw());
    }
  }
  p = bacTot(P); b = bacTot(B);
  return { P, B, p, b, winner: p > b ? 'player' : b > p ? 'banker' : 'tie' };
}
function bacRound(shoe, type) {
  const d = bacDeal(shoe);
  let win = 0, loss = 0;
  if (type === 'tie') { if (d.winner === 'tie') win = 8; else loss = 1; }
  else if (d.winner === 'tie') { /* push */ }
  else if (d.winner === type) win = type === 'banker' ? 0.95 : 1;
  else loss = 1;
  return { win, loss, show: d };
}

/* ---------- Video Poker (Jacks or Better 9/6) ---------- */
const VP_PAY = [
  ['Royal Flush', 800], ['Straight Flush', 50], ['Four of a Kind', 25], ['Full House', 9], ['Flush', 6],
  ['Straight', 4], ['Three of a Kind', 3], ['Two Pair', 2], ['Jacks or Better', 1],
];
function vpRankIdx(hand) { // index into VP_PAY or -1
  const rs = hand.map((c) => (c.r === 1 ? 14 : c.r)).sort((a, b) => a - b);
  const flush = hand.every((c) => c.s === hand[0].s);
  const uniq = [...new Set(rs)];
  let straight = false, high = rs[4];
  if (uniq.length === 5) {
    if (rs[4] - rs[0] === 4) straight = true;
    else if (rs.join() === '2,3,4,5,14') { straight = true; high = 5; }
  }
  if (straight && flush) return high === 14 ? 0 : 1;
  const cnt = {}; rs.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1));
  const cs = Object.values(cnt).sort((a, b) => b - a);
  if (cs[0] === 4) return 2;
  if (cs[0] === 3 && cs[1] === 2) return 3;
  if (flush) return 4;
  if (straight) return 5;
  if (cs[0] === 3) return 6;
  if (cs[0] === 2 && cs[1] === 2) return 7;
  if (cs[0] === 2) { const pr = +Object.keys(cnt).find((k) => cnt[k] === 2); if (pr >= 11) return 8; }
  return -1;
}
/* A solid simplified hold strategy. Returns array of 5 booleans. */
function vpStrategy(hand) {
  const rv = (c) => (c.r === 1 ? 14 : c.r);
  const idx = vpRankIdx(hand);
  const all = [true, true, true, true, true], none = [false, false, false, false, false];
  const pick = (f) => hand.map(f);
  if (idx >= 0 && idx <= 5 && idx !== 2) {
    // check 4 to a royal inside a flush/straight
    if (idx === 4 || idx === 5) { const r4 = vpToRoyal(hand); if (r4 && r4.filter(Boolean).length === 4) return r4; }
    return all;
  }
  if (idx === 2) return pick((c) => hand.filter((d) => d.r === c.r).length === 4);
  const r4 = vpToRoyal(hand); if (r4 && r4.filter(Boolean).length === 4) return r4;
  if (idx === 6) return pick((c) => hand.filter((d) => d.r === c.r).length === 3);
  if (idx === 7) return pick((c) => hand.filter((d) => d.r === c.r).length === 2);
  const sf4 = vpToSF(hand, 4); if (sf4) return sf4;
  if (idx === 8) return pick((c) => hand.filter((d) => d.r === c.r).length === 2);
  if (r4 && r4.filter(Boolean).length === 3) return r4;
  for (let s = 0; s < 4; s++) if (hand.filter((c) => c.s === s).length === 4) return pick((c) => c.s === s);
  const lowPair = hand.some((c) => hand.filter((d) => d.r === c.r).length === 2);
  if (lowPair) return pick((c) => hand.filter((d) => d.r === c.r).length === 2);
  const os = vpOutsideStraight(hand); if (os) return os;
  for (let s = 0; s < 4; s++) { const hs = hand.filter((c) => c.s === s && rv(c) >= 11); if (hs.length >= 2) { const keep = hs.sort((a, b) => rv(a) - rv(b)).slice(0, 2); return pick((c) => keep.includes(c)); } }
  const sf3 = vpToSF(hand, 3); if (sf3) return sf3;
  const highs = hand.filter((c) => rv(c) >= 11).sort((a, b) => rv(a) - rv(b));
  if (highs.length >= 2) { const keep = highs.slice(0, 2); return pick((c) => keep.includes(c)); }
  if (highs.length === 1) return pick((c) => c === highs[0]);
  return none;
}
function vpToRoyal(hand) {
  const royal = (c) => c.r === 1 || c.r >= 10;
  for (let s = 0; s < 4; s++) { const n = hand.filter((c) => c.s === s && royal(c)).length; if (n >= 3) return hand.map((c) => c.s === s && royal(c)); }
  return null;
}
function vpToSF(hand, need) {
  const rv = (c) => (c.r === 1 ? 14 : c.r);
  for (let s = 0; s < 4; s++) {
    const suited = hand.filter((c) => c.s === s); if (suited.length < need) continue;
    for (let lo = 1; lo <= 10; lo++) {
      const inWin = suited.filter((c) => { const v = rv(c); return (v >= lo && v <= lo + 4) || (lo === 1 && v === 14); });
      if (inWin.length >= need) { const keep = inWin.slice(0, need); return hand.map((c) => keep.includes(c)); }
    }
  }
  return null;
}
function vpOutsideStraight(hand) {
  const rv = (c) => (c.r === 1 ? 14 : c.r);
  for (let lo = 2; lo <= 10; lo++) {
    const keep = []; for (let v = lo; v < lo + 4; v++) { const c = hand.find((x) => rv(x) === v); if (c) keep.push(c); }
    if (keep.length === 4 && lo !== 11) return hand.map((c) => keep.includes(c));
  }
  return null;
}
function vpDeck() { const d = []; for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s }); return shuffle(d); }
function vpRound() {
  const deck = vpDeck(); const hand = deck.splice(0, 5);
  const holds = vpStrategy(hand);
  const final = hand.map((c, i) => (holds[i] ? c : deck.pop()));
  const idx = vpRankIdx(final), pay = idx >= 0 ? VP_PAY[idx][1] : 0;
  return { win: Math.max(0, pay - 1), loss: pay === 0 ? 1 : 0, show: { hand, holds, final, idx } };
}

/* ---------- Keno (80 balls, 20 drawn) ---------- */
const KENO_PAY = { // spots -> {hits: pays-for-1}
  1: { 1: 3.2 },
  4: { 2: 1, 3: 5, 4: 90 },
  6: { 3: 1, 4: 5, 5: 80, 6: 1600 },
  8: { 4: 1, 5: 8, 6: 90, 7: 1200, 8: 25000 },
};
function kenoQuickPick(n) { const s = new Set(); while (s.size < n) s.add(1 + ri(80)); return [...s]; }
function kenoRound(spots, picks) {
  if (!picks || picks.length !== spots) picks = kenoQuickPick(spots);
  const balls = shuffle(Array.from({ length: 80 }, (_, i) => i + 1)).slice(0, 20);
  const set = new Set(balls); const hits = picks.filter((p) => set.has(p)).length;
  const pay = KENO_PAY[spots][hits] || 0;
  return { win: Math.max(0, pay - 1), loss: pay === 0 ? 1 : 0, show: { balls, picks, hits, pay } };
}

/* ---------- Big Six money wheel (54 segments) ---------- */
const B6_SYMS = [
  { k: '1', pays: 1, n: 24, col: '#e9e4d4' }, { k: '2', pays: 2, n: 15, col: '#5b8fd8' }, { k: '5', pays: 5, n: 7, col: '#d84a4a' },
  { k: '10', pays: 10, n: 4, col: '#3fae6a' }, { k: '20', pays: 20, n: 2, col: '#9b59d6' }, { k: 'J', pays: 45, n: 1, col: '#f2c230' },
  { k: 'M', pays: 45, n: 1, col: '#f2c230' },
];
const B6_ORDER = (() => { // classic-style spread
  const pat = '1,2,1,5,1,2,1,10,1,2,1,5,1,20,1,2,1,5,1,2,J,2,1,2,10,1,5,1,2,1,2,1,10,1,5,2,1,2,20,1,2,1,5,1,2,1,10,1,2,1,5,2,1,M';
  return pat.split(',');
})();
function b6Round(sym) {
  const i = ri(B6_ORDER.length), k = B6_ORDER[i];
  const s = B6_SYMS.find((x) => x.k === sym);
  return k === sym ? { win: s.pays, loss: 0, show: { i, k } } : { win: 0, loss: 1, show: { i, k } };
}

/* ---------- Sic Bo (3 dice) ---------- */
function sicboRound(type) {
  const d = [d6(), d6(), d6()], t = d[0] + d[1] + d[2];
  const triple = d[0] === d[1] && d[1] === d[2];
  let w = 0;
  if (type === 'small') w = (!triple && t >= 4 && t <= 10) ? 1 : 0;
  else if (type === 'big') w = (!triple && t >= 11 && t <= 17) ? 1 : 0;
  else if (type === 'anytriple') w = triple ? 30 : 0;
  else if (type === 'triple6') w = (triple && d[0] === 6) ? 180 : 0;
  else if (type === 'odd') w = (!triple && t % 2 === 1) ? 1 : 0;
  else if (type === 'even') w = (!triple && t % 2 === 0) ? 1 : 0;
  return { win: w, loss: w ? 0 : 1, show: { d, t, triple } };
}

/* ---------- Slots: 3 reels x 3 rows, 5 paylines ---------- */
const SLOT_SYMS = ['cherry', 'lemon', 'orange', 'plum', 'bell', 'bar', 'seven', 'diamond'];
const SLOT_PAY = { diamond: 250, seven: 100, bar: 40, bell: 20, plum: 14, orange: 10, lemon: 8, cherry: 5 };
const SLOT_STRIP = (() => {
  const counts = { cherry: 7, lemon: 7, orange: 6, plum: 5, bell: 4, bar: 3, seven: 2, diamond: 1 };
  const reels = [];
  for (let r = 0; r < 3; r++) { const s = []; for (const k in counts) for (let i = 0; i < counts[k]; i++) s.push(k); reels.push(shuffleSeeded(s, 1234 + r * 77)); }
  return reels;
})();
function shuffleSeeded(a, seed) { let x = seed; const rr = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const SLOT_LINES = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];
function slotLinePay(sy) {
  // diamond is wild for others (doubles), three diamonds = jackpot
  const nd = sy.filter((s) => s === 'diamond').length;
  if (nd === 3) return SLOT_PAY.diamond;
  const base = sy.filter((s) => s !== 'diamond');
  if (base.every((s) => s === base[0])) return SLOT_PAY[base[0]] * (nd ? 2 * nd : 1);
  // cherries anywhere from the left
  if (sy[0] === 'cherry' && (sy[1] === 'cherry' || sy[1] === 'diamond')) return 2;
  if (sy[0] === 'cherry') return 1;
  return 0;
}
function slotsRound() {
  const stops = SLOT_STRIP.map((s) => ri(s.length));
  const grid = stops.map((st, r) => [0, 1, 2].map((k) => SLOT_STRIP[r][(st + k) % SLOT_STRIP[r].length])); // grid[reel][row]
  let ret = 0; const lines = [];
  SLOT_LINES.forEach((ln, li) => { const sy = ln.map((row, reel) => grid[reel][row]); const p = slotLinePay(sy); if (p) { ret += p; lines.push({ li, p }); } });
  ret /= 5;
  return { win: Math.max(0, ret - 1), loss: Math.max(0, 1 - ret), show: { stops, grid, lines, ret } };
}

/* ---------- registry ---------- */
const GAME_DEFS = {
  slots: { name: 'Slot Machine', short: 'Slots', tag: 'Five lines, three reels, diamonds wild', bets: { spin: 'Spin 5 lines' }, def: 'spin' },
  roulette: { name: 'Roulette', short: 'Roulette', tag: 'European single-zero wheel', bets: Object.fromEntries(Object.entries(RL_BETS).map(([k, v]) => [k, v.label])), def: 'red' },
  blackjack: { name: 'Blackjack', short: 'Blackjack', tag: 'Six decks · pays 3 to 2', bets: { hand: 'Main bet' }, def: 'hand' },
  craps: { name: 'Craps', short: 'Craps', tag: 'Pass, Don’t Pass and the Field', bets: { pass: 'Pass Line', dontpass: 'Don’t Pass', field: 'Field' }, def: 'pass' },
  baccarat: { name: 'Baccarat', short: 'Baccarat', tag: 'Punto Banco · eight decks', bets: { player: 'Player', banker: 'Banker', tie: 'Tie 8:1' }, def: 'banker' },
  videopoker: { name: 'Video Poker', short: 'Video Poker', tag: 'Jacks or Better · 9/6', bets: { draw: 'Deal & draw' }, def: 'draw' },
  keno: { name: 'Keno', short: 'Keno', tag: '80 balls · 20 drawn', bets: { 1: 'Pick 1', 4: 'Pick 4', 6: 'Pick 6', 8: 'Pick 8' }, def: '4' },
  bigsix: { name: 'Big Six Wheel', short: 'Big Six', tag: 'The money wheel', bets: Object.fromEntries(B6_SYMS.map((s) => [s.k, s.k === 'J' ? 'Joker 45:1' : s.k === 'M' ? 'Casino 45:1' : '$' + s.k + ' pays ' + s.pays])), def: '1' },
  sicbo: { name: 'Sic Bo', short: 'Sic Bo', tag: 'Three dice under the dome', bets: { small: 'Small', big: 'Big', odd: 'Odd', even: 'Even', anytriple: 'Any Triple 30:1', triple6: 'Triple 6s 180:1' }, def: 'big' },
};
const GAME_ORDER = ['slots', 'roulette', 'blackjack', 'craps', 'baccarat', 'videopoker', 'keno', 'bigsix', 'sicbo'];
const shoes = { blackjack: new Shoe(6), baccarat: new Shoe(8) };
function autoRound(gid, bet, ctx) {
  switch (gid) {
    case 'slots': return slotsRound();
    case 'roulette': return rlRound(bet, ctx.straight || 17);
    case 'blackjack': return bjAuto(shoes.blackjack, ctx.canAfford || (() => true));
    case 'craps': return crapsRound(bet);
    case 'baccarat': return bacRound(shoes.baccarat, bet);
    case 'videopoker': return vpRound();
    case 'keno': return kenoRound(+bet, ctx.picks);
    case 'bigsix': return b6Round(bet);
    case 'sicbo': return sicboRound(bet);
  }
}
if (typeof module !== 'undefined') module.exports = { autoRound, GAME_DEFS, GAME_ORDER, KENO_PAY, vpRankIdx, VP_PAY, bjValue, slotsRound };
