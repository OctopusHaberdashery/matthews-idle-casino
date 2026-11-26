/* ===== House Specials, VIP club perks, goals, high rollers, the casino jackpot, save tools ===== */
const ITCH_URL = ''; // the game's itch.io page, e.g. https://name.itch.io/the-lucky-carpet (used by the "rate it" prompt)
const ON_WEB = !window.AndroidApp && /^https?:/.test(location.protocol);

const totalDealers = () => GAME_ORDER.reduce((a, k) => a + (G(k).owned ? G(k).n : 0), 0);
const baseRate = () => GAME_ORDER.reduce((a, gid) => a + rateOf(gid, true), 0);   // income without a hot streak
const lowestBet = () => Math.min(...GAME_ORDER.filter((k) => G(k).owned).map((k) => baseBet(G(k))), Infinity);
const shopLvl = (k) => (S.shop && S.shop[k]) || 0;

/* ---------- House Specials: each table has two; a table runs one (both with the Master Key) ---------- */
const SPECIALS = {
  slots: [
    { k: 'a', name: 'Loose Reels', desc: '+6% player edge on the slots.', fx: (o) => { o.edge += 0.06; } },
    { k: 'b', name: 'Progressive Link', desc: 'The casino jackpot fills twice as fast.', fx: () => { } },
  ],
  roulette: [
    { k: 'a', name: 'La Partage', desc: '12% of every losing bet comes back.', fx: (o) => { o.refund += 0.12; } },
    { k: 'b', name: 'Second Wheel', desc: 'Roulette rounds run 40% faster.', fx: (o) => { o.speed *= 1.4; } },
  ],
  blackjack: [
    { k: 'a', name: 'Card Counters', desc: '+1% edge for every 10 dealers here (up to +15%).', fx: (o, g) => { o.edge += Math.min(0.15, Math.floor(g.n / 10) * 0.01); } },
    { k: 'b', name: 'Shuffle Machine', desc: 'Blackjack hands run 40% faster.', fx: (o) => { o.speed *= 1.4; } },
  ],
  craps: [
    { k: 'a', name: 'Free Odds', desc: 'Bets on this table are 50% bigger.', fx: (o) => { o.bet *= 1.5; } },
    { k: 'b', name: 'Hot Shooter', desc: 'Every craps win pays 10% more.', fx: (o) => { o.win *= 1.10; } },
  ],
  baccarat: [
    { k: 'a', name: 'No Commission', desc: 'Every baccarat win pays 9% more.', fx: (o) => { o.win *= 1.09; } },
    { k: 'b', name: 'Whale Room', desc: 'High rollers tip three times as much.', fx: () => { } },
  ],
  videopoker: [
    { k: 'a', name: 'Full-Pay Machines', desc: '+6% player edge on video poker.', fx: (o) => { o.edge += 0.06; } },
    { k: 'b', name: 'Bank of Machines', desc: 'Dealers here cost 35% less.', fx: (o) => { o.cost *= 0.65; } },
  ],
  keno: [
    { k: 'a', name: 'Night Runners', desc: 'Keno earns double while you’re away.', fx: (o) => { o.off *= 2; } },
    { k: 'b', name: 'Multiplier Ball', desc: 'Every keno win pays 10% more.', fx: (o) => { o.win *= 1.10; } },
  ],
  bigsix: [
    { k: 'a', name: 'Crowd Pleaser', desc: '+2% player edge on every other table.', fx: () => { } },
    { k: 'b', name: 'Showstopper', desc: 'Hot streaks last twice as long.', fx: () => { } },
  ],
  sicbo: [
    { k: 'a', name: 'Dragon’s Luck', desc: '+1% edge here for every table you have open.', fx: (o) => { o.edge += 0.01 * S.owned; } },
    { k: 'b', name: 'Fast Shaker', desc: 'Sic Bo rounds run 40% faster.', fx: (o) => { o.speed *= 1.4; } },
  ],
};
const hasSp = (gid, k) => G(gid).owned && (G(gid).sp || []).includes(k);
const specialCost = (g) => 150 * baseBet(g);
function mods(gid) {
  const g = G(gid), o = { edge: 0, win: 1, refund: 0, speed: 1, bet: 1, cost: 1, off: 1 };
  for (const k of g.sp || []) { const sp = SPECIALS[gid].find((x) => x.k === k); if (sp) sp.fx(o, g); }
  if (gid !== 'bigsix' && hasSp('bigsix', 'a')) o.edge += 0.02;
  return o;
}
function chooseSpecial(gid, k, confirmed) {
  const g = G(gid), c = specialCost(g), sp = SPECIALS[gid].find((x) => x.k === k);
  if (g.sp.includes(k)) return;
  if (S.money < c) { toast(`${sp.name} costs ${fmt(c)}. You have ${fmt(S.money)}.`); return; }
  const both = shopLvl('key') > 0;
  if (g.sp.length && !both && !confirmed) {
    const cur = SPECIALS[gid].find((x) => x.k === g.sp[0]);
    showModal(`<div class="wb"><div class="wb-title">Switch special?</div><p>A table runs one House Special at a time. Replace <b>${cur.name}</b> with <b>${sp.name}</b> for ${fmt(c)}?</p></div>`,
      [['Keep ' + cur.name, closeModal], ['Switch', () => { closeModal(); chooseSpecial(gid, k, true); }, 'gold']]);
    return;
  }
  S.money -= c; if (both) g.sp.push(k); else g.sp = [k];
  SND.buy(); toast(`${sp.name} is now running on ${GAME_DEFS[gid].short}.`); renderShop(); renderControls(); save();
}

/* ---------- VIP club perks: bought with VIP chips, kept forever ---------- */
const VIPSHOP = [
  { k: 'seed', n: 'Seed Money', max: 5, cost: [1, 2, 3, 5, 8], d: (l) => `Start every casino with ${fmt(ECON.start * Math.pow(10, l + 1))} instead of ${fmt(ECON.start * Math.pow(10, l))}.` },
  { k: 'staff', n: 'Loyal Staff', max: 5, cost: [1, 2, 4, 6, 9], d: (l) => `Every table opens with ${3 * (l + 1)} dealers already hired.` },
  { k: 'touch', n: 'Golden Touch', max: 5, cost: [1, 2, 3, 5, 8], d: (l) => `Playing by hand gets +${3 * (l + 1)}% more edge (now +${3 * l}%).` },
  { k: 'fast', n: 'Fast Hands', max: 5, cost: [2, 3, 5, 8, 12], d: (l) => `Every dealer works ${8 * (l + 1)}% faster (now ${8 * l}%).` },
  { k: 'magnet', n: 'High Roller Magnet', max: 4, cost: [1, 2, 4, 7], d: (l) => `High rollers visit ${25 * (l + 1)}% more often.` },
  { k: 'owl', n: 'Night Owl', max: 4, cost: [2, 3, 5, 8], d: (l) => `+${25 * (l + 1)}% earnings while away, and dealers stay ${4 * (l + 1)}h longer.` },
  { k: 'felt', n: 'Friends in Construction', max: 4, cost: [1, 2, 4, 7], d: (l) => `New tables cost ${15 * (l + 1)}% less.` },
  { k: 'key', n: 'Master Key', max: 1, cost: [12], d: () => 'Every table can run both of its House Specials at once.' },
];
function buyVip(k) {
  const def = VIPSHOP.find((x) => x.k === k), l = shopLvl(k); if (l >= def.max) return;
  const c = def.cost[l];
  if (S.vip < c) { toast('Not enough VIP chips. Cash out to earn more.'); return; }
  S.vip -= c; S.shop[k] = l + 1;
  if (k === 'seed') S.money += ECON.start * (Math.pow(10, l + 1) - Math.pow(10, l));   // applies to this casino too
  if (k === 'staff') GAME_ORDER.forEach((gid) => { const g = G(gid); if (g.owned) g.n += 3; });
  SND.buy(); toast(`${def.n} upgraded.`); renderShop(); renderControls(); save();
}
const offRateNow = () => ECON.offRate[S.global.off] + 0.25 * shopLvl('owl');
const offCapNow = () => ECON.offCap[S.global.cap] + 4 * shopLvl('owl');

/* ---------- Goals: each one pays cash and +0.5% player edge forever ---------- */
const ACH_EDGE = 0.005;
const maxOnTable = () => Math.max(0, ...GAME_ORDER.map((k) => (G(k).owned ? G(k).n : 0)));
const ACH = [
  { id: 'hand1', n: 'Beginner’s Luck', d: 'Play your first hand.', cash: 25, t: () => S.stats.played >= 1 },
  { id: 'hire1', n: 'Now Hiring', d: 'Hire your first dealer.', cash: 40, t: () => totalDealers() >= 1 },
  { id: 'hands10', n: 'Hands On', d: 'Play 10 hands yourself.', cash: 60, t: () => S.stats.played >= 10 },
  { id: 'd5', n: 'Small Crew', d: 'Have 5 dealers working.', cash: 100, t: () => totalDealers() >= 5 },
  { id: 'roll1', n: 'Right This Way', d: 'Greet a high roller.', cash: 100, t: () => S.stats.rollers >= 1 },
  { id: 'jack1', n: 'Jackpot!', d: 'Hit the casino jackpot.', cash: 150, t: () => S.stats.jackpots >= 1 },
  { id: 'sp1', n: 'House Special', d: 'Pick a House Special for a table.', cash: 250, t: () => GAME_ORDER.some((k) => (G(k).sp || []).length) },
  { id: 't2', n: 'Expansion', d: 'Open a second table.', cash: 500, t: () => S.owned >= 2 },
  { id: 'd25', n: 'Full Pit', d: 'Put 25 dealers on one table.', cash: 0, t: () => maxOnTable() >= 25 },
  { id: 'w6', n: 'Millionaire', d: 'Win $1M in total.', cash: 0, t: () => S.stats.wonAll >= 1e6 },
  { id: 't3', n: 'Three’s Company', d: 'Open three tables.', cash: 0, t: () => S.owned >= 3 },
  { id: 'hands100', n: 'Regular', d: 'Play 100 hands yourself.', cash: 0, t: () => S.stats.played >= 100 },
  { id: 'roll10', n: 'Gracious Host', d: 'Greet 10 high rollers.', cash: 0, t: () => S.stats.rollers >= 10 },
  { id: 'd100', n: 'Staff Party', d: 'Have 100 dealers working.', cash: 0, t: () => totalDealers() >= 100 },
  { id: 'big50', n: 'Long Shot', d: 'Win 30 times your bet in one round.', cash: 0, t: () => (S.stats.maxMult || 0) >= 30 },
  { id: 'bjnat', n: 'Natural', d: 'Get dealt a blackjack playing by hand.', cash: 0, t: () => !!S.flags.bjnat },
  { id: 'straight', n: 'Straight Up', d: 'Hit a single roulette number playing by hand.', cash: 0, t: () => !!S.flags.straight },
  { id: 'away', n: 'Welcome Back', d: 'Come back after 10 minutes away.', cash: 0, t: () => !!S.flags.away },
  { id: 'carpet', n: 'The Lucky Carpet', d: 'Lay the Lucky Carpet 5 times.', cash: 0, t: () => S.global.carpet >= 5 },
  { id: 'speed', n: 'Lightning Hands', d: 'Max out dealer speed on a table.', cash: 0, t: () => GAME_ORDER.some((k) => G(k).s >= ECON.speedMax) },
  { id: 't5', n: 'High Street', d: 'Open five tables.', cash: 0, t: () => S.owned >= 5 },
  { id: 'w9', n: 'Billionaire', d: 'Win $1B in total.', cash: 0, t: () => S.stats.wonAll >= 1e9 },
  { id: 'jack10', n: 'Jackpot Regular', d: 'Hit the jackpot 10 times.', cash: 0, t: () => S.stats.jackpots >= 10 },
  { id: 'grand', n: 'The Big One', d: 'Hit a Grand jackpot.', cash: 0, t: () => !!S.flags.grand },
  { id: 'd500', n: 'Small Army', d: 'Have 500 dealers working.', cash: 0, t: () => totalDealers() >= 500 },
  { id: 'roll50', n: 'Legendary Host', d: 'Greet 50 high rollers.', cash: 0, t: () => S.stats.rollers >= 50 },
  { id: 'p1', n: 'Member of the Club', d: 'Cash out for the first time.', cash: 0, t: () => S.stats.prestiges >= 1 },
  { id: 'shop5', n: 'Perks of the Job', d: 'Buy 5 club perk levels.', cash: 0, t: () => VIPSHOP.reduce((a, x) => a + shopLvl(x.k), 0) >= 5 },
  { id: 'sp9', n: 'Full Menu', d: 'Run a House Special on all nine tables.', cash: 0, t: () => GAME_ORDER.every((k) => (G(k).sp || []).length) },
  { id: 't9', n: 'The Whole Floor', d: 'Open all nine tables.', cash: 0, t: () => S.owned >= 9 },
  { id: 'w12', n: 'Trillionaire', d: 'Win $1T in total.', cash: 0, t: () => S.stats.wonAll >= 1e12 },
  { id: 'hands1k', n: 'Card Shark', d: 'Play 1,000 hands yourself.', cash: 0, t: () => S.stats.played >= 1000 },
  { id: 'd2000', n: 'Payroll', d: 'Have 2,000 dealers working.', cash: 0, t: () => totalDealers() >= 2000 },
  { id: 'p3', n: 'Serial Founder', d: 'Cash out 3 times.', cash: 0, t: () => S.stats.prestiges >= 3 },
  { id: 'w15', n: 'Quadrillionaire', d: 'Win $1Qa in total.', cash: 0, t: () => S.stats.wonAll >= 1e15 },
  { id: 'p10', n: 'Casino Royalty', d: 'Cash out 10 times.', cash: 0, t: () => S.stats.prestiges >= 10 },
];
const achCount = () => ACH.reduce((a, x) => a + (S.ach[x.id] ? 1 : 0), 0);
const achEdge = () => achCount() * ACH_EDGE;
const achCash = (a) => Math.max(a.cash, 45 * baseRate());   // early goals pay a fixed amount; later ones pay 45 seconds of income
function checkAch() {
  for (const a of ACH) if (!S.ach[a.id] && a.t()) {       // one at a time, so each gets its moment
    const cash = achCash(a); S.ach[a.id] = 1; S.money += cash;
    toast(`🏆 ${a.n}: +${fmt(cash)} and +0.5% edge`); SND.win(); burstCoins(500, 300, 18, false);
    if (shopTab === 'goals') renderShop(); renderControls();
    return;
  }
}
function renderGoals(box) {
  const n = achCount();
  box.append(h('div', { class: 'shead' }, h('div', { class: 'stitle' }, '🏆 Goals'),
    h('div', { class: 'ssub' }, `${n} of ${ACH.length} done · +${(n * 0.5).toFixed(1)}% player edge on every table`)));
  const row = (a, done) => h('div', { class: 'goal' + (done ? ' done' : '') }, h('div', { class: 'gmark' }, done ? '✓' : '○'),
    h('div', { class: 'gtext' }, h('div', { class: 'gname' }, a.n), h('div', { class: 'gdesc' }, a.d)),
    h('div', { class: 'grew' }, done ? 'Done' : '+' + fmt(achCash(a))));
  ACH.filter((a) => !S.ach[a.id]).forEach((a) => box.append(row(a, false)));
  ACH.filter((a) => S.ach[a.id]).forEach((a) => box.append(row(a, true)));
  box.append(h('p', { class: 'dim small' }, 'Every goal pays cash and adds +0.5% player edge forever. Goals survive cashing out.'));
}

/* ---------- High rollers: tap them when they walk in ---------- */
const HOT_WIN = 1.3;
const buffOn = () => !!(S.buff && Date.now() < S.buff.until);
const buffWin = () => (buffOn() ? HOT_WIN : 1);
const ROLLER = { el: null, until: 0 };
const rollerGap = () => (75 + Math.random() * 75) * 1000 / (1 + 0.25 * shopLvl('magnet'));
function removeRoller() { if (ROLLER.el) ROLLER.el.remove(); ROLLER.el = null; }
function tickRoller() {
  const now = Date.now();
  if (ROLLER.el) { if (now > ROLLER.until) { removeRoller(); S.roll.next = now + rollerGap(); } return; }
  if (!S.roll.next) { if (totalDealers() > 0) S.roll.next = now + 30000; return; }   // first visit: 30s after the first dealer
  if (now < S.roll.next || document.visibilityState === 'hidden' || $('#modal').classList.contains('show') || !S.sel) return;
  const el = h('button', { id: 'roller', onclick: tapRoller }, h('span', { class: 'rhat' }, '🎩'), h('span', { class: 'rtxt' }, 'HIGH ROLLER'));
  el.style.left = (14 + Math.random() * 58) + '%'; el.style.top = (22 + Math.random() * 50) + '%';
  const size = Math.round(clamp(cv.clientWidth * 0.15, 54, 104)); el.style.width = el.style.height = size + 'px'; el.style.fontSize = (size / 104) + 'em';
  $('#canvas-wrap').append(el); ROLLER.el = el; ROLLER.until = now + 14000;
  SND.tone(880, 0.12, 'triangle', 0.14); SND.tone(1320, 0.2, 'triangle', 0.14, 0.1);
}
function tapRoller() {
  if (!ROLLER.el) return; SND.init(); SND.resume();
  removeRoller(); S.stats.rollers = (S.stats.rollers || 0) + 1; S.roll.next = Date.now() + rollerGap();
  if (Math.random() < 0.55) {
    const amt = Math.max(10 * lowestBet(), 45 * baseRate()) * (hasSp('baccarat', 'b') ? 3 : 1);
    S.money += amt; S.won += amt; S.stats.wonAll += amt;
    FX.banner = { title: 'HIGH ROLLER!', sub: 'Tipped you +' + fmt(amt), age: 0, life: 2.4 }; burstCoins(500, 300, 50, true);
  } else {
    const dur = 30 * (hasSp('bigsix', 'b') ? 2 : 1); S.buff = { until: Date.now() + dur * 1000 };
    FX.banner = { title: 'HOT STREAK!', sub: `Every win pays +30% for ${dur} seconds`, age: 0, life: 2.4 };
  }
  SND.bigwin(); vibrate(60); drawAcc = 1; save();
}

/* ---------- The casino jackpot: fills in real time, also while you're away ---------- */
const JACK_CAP = 8 * 3600, JACK_SHARE = 0.2;
const jackSpeed = () => (hasSp('slots', 'b') ? 2 : 1);
const jackNeed = () => (S.stats.jackpots ? 600 : 180);             // the first one comes quickly
const jackValue = () => S.jackT * JACK_SHARE * baseRate();
const JK = {};
function buildJack() {
  JK.val = h('div', { class: 'jval' }, '$0'); JK.sub = h('div', { class: 'jsub' }); JK.bar = h('div', { class: 'jfill' });
  JK.el = h('div', { class: 'jack', onclick: claimJackpot }, h('div', { class: 'jlabel' }, '★ JACKPOT ★'), JK.val, h('div', { class: 'jbar' }, JK.bar), JK.sub);
  $('#floor-list').prepend(JK.el);
}
function updateJack() {
  if (!JK.el) return;
  const need = jackNeed(), ready = S.jackT >= need && baseRate() > 0, full = S.jackT >= JACK_CAP;
  setEl(JK.val, fmt(jackValue())); JK.el.classList.toggle('ready', ready);
  const pct = Math.round(100 * (ready ? S.jackT / JACK_CAP : S.jackT / need)); if (JK.pct !== pct) { JK.pct = pct; JK.bar.style.width = Math.min(100, pct) + '%'; }
  setEl(JK.sub, !totalDealers() ? 'Hire a dealer to start it' : full ? 'FULL. Tap to hit it!' : ready ? 'Tap to hit it! Still growing' : 'Ready in ' + fmtTime((need - S.jackT) / jackSpeed()));
}
function claimJackpot() {
  SND.init(); SND.resume();
  if (!totalDealers()) { toast('The jackpot starts filling once you hire a dealer.'); return; }
  const need = jackNeed();
  if (S.jackT < need) { toast(`The jackpot is still building. Ready in ${fmtTime((need - S.jackT) / jackSpeed())}. It keeps growing while you're away.`); return; }
  const r = Math.random(), tier = r < 0.05 ? ['GRAND JACKPOT!', 5] : r < 0.30 ? ['MAJOR JACKPOT!', 2] : ['MINI JACKPOT!', 1];
  const pay = jackValue() * tier[1];
  S.money += pay; S.won += pay; S.stats.wonAll += pay; S.jackT = 0; S.stats.jackpots = (S.stats.jackpots || 0) + 1; if (tier[1] === 5) S.flags.grand = 1;
  FX.banner = { title: tier[0], sub: '+' + fmt(pay), age: 0, life: 3.2 }; burstCoins(500, 300, tier[1] > 1 ? 120 : 60, true);
  SND.bigwin(); vibrate([60, 40, 120]); drawAcc = 1; updateJack(); save();
}

/* ---------- Beginner's luck: the first three hands of a brand-new casino go the player's way ---------- */
const luckyStart = () => S.stats.played < 3 && !S.stats.prestiges && S.stats.rounds < 50;
function luckyResult(gid, type, ctx, res) {
  for (let i = 0; i < 400; i++) { const net = res.win - res.loss; if (net >= 0.5 && net <= 12) return res; res = autoRound(gid, type, ctx); }
  return res;                                              // long-shot bets stay honest
}
function luckyShoe(shoe) {                                 // a twenty against a dealer who busts (never a natural: that goal should be earned)
  const c = (r, s) => ({ r, s });
  const deal = [[c(13, 0), c(6, 2), c(12, 1), c(10, 3), c(11, 0)], [c(1, 1), c(5, 0), c(9, 2), c(10, 1), c(9, 3)], [c(10, 2), c(4, 3), c(11, 1), c(13, 2), c(12, 0)]][S.stats.played % 3];
  for (let i = deal.length - 1; i >= 0; i--) shoe.c.push(deal[i]);   // order drawn: player, dealer, player, dealer, dealer's hit
}
function luckyPokerDeck(deck) {                            // three of a kind, already held
  const r = deck[0].r, trips = deck.filter((c) => c.r === r).slice(0, 3), rest = deck.filter((c) => !trips.includes(c));
  const kick = rest.filter((c) => c.r !== r).slice(0, 2);
  return [...trips, ...kick, ...rest.filter((c) => !kick.includes(c))];
}

/* ---------- Save tools ---------- */
let NO_SAVE = false;
function saveString() { const m = S.money; S.money += PENDING; const s = JSON.stringify(S); S.money = m; return 'LC1:' + btoa(unescape(encodeURIComponent(s))); }
function parseSave(text) {
  text = (text || '').trim(); if (!text) return null;
  try {
    const json = text.startsWith('LC1:') ? decodeURIComponent(escape(atob(text.slice(4).replace(/\s+/g, '')))) : text;
    const st = JSON.parse(json);
    return st && st.v === 1 && st.games && typeof st.money === 'number' ? json : null;
  } catch (e) { return null; }
}
function copyText(text, area) {
  const ok = () => toast('Copied. Paste it somewhere safe.');
  const old = () => { try { area.focus(); area.select(); document.execCommand('copy') ? ok() : toast('Select the text and copy it.'); } catch (e) { toast('Select the text and copy it.'); } };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, old); else old();
}
function exportSave() {
  save(); const text = saveString();
  const area = h('textarea', { class: 'savebox', readonly: '' }); area.value = text;
  const dl = () => { try { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: 'lucky-carpet-save.txt' }); document.body.append(a); a.click(); a.remove(); } catch (e) { toast('Could not make a file. Copy the text instead.'); } };
  const btns = [['Close', closeModal], ['Copy', () => copyText(text, area), 'gold']]; if (!window.AndroidApp) btns.splice(1, 0, ['Save as file', dl]);
  showModal(h('div', { class: 'wb' }, h('div', { class: 'wb-title' }, 'Your save'), h('p', {}, 'Keep this text somewhere safe. Paste it into Import to bring your casino back, on this device or another one.'), area), btns);
  setTimeout(() => area.select(), 50);
}
function importSave() {
  const area = h('textarea', { class: 'savebox', placeholder: 'Paste your save here' });
  const file = h('input', { type: 'file', accept: '.txt,text/plain', style: 'display:none', onchange: (e) => { const f = e.target.files[0]; if (f) f.text().then((t) => { area.value = t; }); } });
  const go = () => {
    const json = parseSave(area.value); if (!json) { toast('That doesn’t look like a save from this game.'); return; }
    NO_SAVE = true; try { localStorage.setItem(SAVE_KEY, json); } catch (e) { NO_SAVE = false; toast('This browser wouldn’t store the save.'); return; }
    location.reload();
  };
  showModal(h('div', { class: 'wb' }, h('div', { class: 'wb-title' }, 'Import a save'), h('p', {}, 'This replaces the casino on this device.'), area, file),
    [['Cancel', closeModal], ['Choose a file', () => file.click()], ['Load it', go, 'gold']]);
}
function resetSave() {
  showModal('<div class="wb"><div class="wb-title">Start over?</div><p>This erases this casino, including VIP chips and goals. Export a save first if you might want it back.</p></div>',
    [['Keep my casino', closeModal, 'gold'], ['Erase everything', () => { NO_SAVE = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.reload(); }]]);
}

/* ---------- "Rate it" prompt: once, after the first cash-out, on the web only ---------- */
function maybeAskRating() {
  if (!ON_WEB || S.flags.rateAsked || !S.stats.prestiges) return;
  S.flags.rateAsked = 1; save();
  setTimeout(() => {
    const where = ITCH_URL ? '' : ' Use “Rate this game” at the top of the game’s itch.io page.';
    showModal(`<div class="wb"><div class="wb-title">Enjoying the casino?</div><p>You just cashed out for the first time. If you’re having fun, a quick rating on itch.io helps other players find the game.${where}</p></div>`,
      ITCH_URL ? [['Maybe later', closeModal], ['Rate it', () => { closeModal(); window.open(ITCH_URL.replace(/\/$/, '') + '/rate', '_blank', 'noopener'); }, 'gold']] : [['OK', closeModal, 'gold']]);
  }, 1800);
}

/* ---------- per-frame upkeep ---------- */
let exT = 0, achT = 0;
function tickExtras(dt) {
  if (totalDealers() > 0) S.jackT = Math.min(JACK_CAP, S.jackT + dt * jackSpeed());
  exT += dt; if (exT < 0.3) return; exT = 0;
  if (S.buff && Date.now() > S.buff.until) S.buff = null;
  tickRoller(); updateJack();
  achT += 0.3; if (achT >= 1.2) { achT = 0; checkAch(); }
}
