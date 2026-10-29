// Вкладка «Развлечения» листа Мастера: наказания, киберпанк-таро, покер и блекджек против дилера,
// игрушки «потыкать». Всё домашнее, данные — fun-data.js; общие функции — dm.js и rules.js.

// --- Наказания ---
function punishTarget(){
  const names = state.players.map(r=>r[1].trim() || r[0].trim()).filter(Boolean);
  return options([['', 'случайный игрок'], ...names.map(n=>[n, n])], $('#punishWho')?.value || '');
}
function punish(tier){
  const names = state.players.map(r=>r[1].trim() || r[0].trim()).filter(Boolean);
  const who = $('#punishWho').value || (names.length ? pick(names) : 'Персонаж');
  const [what, effect] = pick(punishments[tier]);
  $('#punishOut').innerHTML = `<div class="gen-card is-fresh punish-${tier}"><header><b>${esc(who)}</b><span>${punishTiers[tier]} наказание</span></header><p class="punish-what">${esc(what)}</p><p class="gen-sub">${esc(effect)}</p></div>`;
  addLog({kind:'text', tag:'НАКАЗАНИЕ', text:`${who}: ${what} (${effect})`});
}

// --- Таро ---
let tarotDraw = [];
function drawTarot(){
  const [, slots] = tarotSpreads[$('#tarotSpread').value];
  const deck = [...tarotCards];
  for(let k = deck.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; }
  tarotDraw = slots.map((slot, k)=>({slot, card:deck[k], reversed:Math.random() < .5, open:false}));
  renderTarot();
}
function renderTarot(){
  $('#tarotTable').innerHTML = tarotDraw.map((t, k)=>{
    const [n, name, classic, sym] = t.card;
    return `<div class="tarot-slot"><small>${esc(t.slot)}</small>
      <button type="button" class="tarot-card${t.open ? ' is-open' : ''}${t.reversed ? ' is-reversed' : ''}" data-tarot="${k}" aria-label="${t.open ? esc(name) : 'Перевернуть карту'}" style="--delay:${k * 90}ms">
        <span class="tarot-back"><i>◈</i></span>
        <span class="tarot-face"><em>${n}</em><i>${sym}</i><b>${esc(name)}</b><small>${esc(classic)}</small></span>
      </button></div>`;
  }).join('') || '<p class="muted">Выберите расклад и нажмите «ТЯНУТЬ».</p>';
  $('#tarotMeaning').innerHTML = tarotDraw.filter(t=>t.open).map(t=>{
    const [, name, , , up, down, hint] = t.card;
    return `<div class="gen-card is-fresh"><header><b>${esc(t.slot)}: ${esc(name)}</b><span>${t.reversed ? 'перевёрнута' : 'прямо'}</span></header><p>${esc(t.reversed ? down : up)}</p><p class="gen-sub"><b>Мастеру:</b> ${esc(hint)}</p></div>`;
  }).join('');
}

// --- Карты: колода и оценка руки ---
const SUITS = ['♠', '♥', '♦', '♣'];
const RANK_NAMES = {11:'J', 12:'Q', 13:'K', 14:'A'};
const newDeck = () => {
  const deck = SUITS.flatMap(s=>Array.from({length:13}, (_, k)=>({r:k + 2, s})));
  for(let k = deck.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; }
  return deck;
};
const cardHtml = (c, {hidden = false, held = false, i = null, game = ''} = {}) => hidden
  ? '<span class="play-card is-back"></span>'
  : `<${i === null ? 'span' : 'button type="button"'} class="play-card${c.s === '♥' || c.s === '♦' ? ' is-red' : ''}${held ? ' is-marked' : ''}"${i === null ? '' : ` data-${game}-card="${i}"`}><b>${RANK_NAMES[c.r] || c.r}</b><i>${c.s}</i></${i === null ? 'span' : 'button'}>`;
const HAND_NAMES = ['старшая карта', 'пара', 'две пары', 'тройка', 'стрит', 'флеш', 'фулл-хаус', 'каре', 'стрит-флеш'];
// Покерная рука из 5 карт: [категория, ...ранги для сравнения по убыванию значимости].
function evalHand(cards){
  const ranks = cards.map(c=>c.r).sort((a, b)=>b - a);
  const counts = {};
  ranks.forEach(r=>{ counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.entries(counts).map(([r, n])=>[n, Number(r)]).sort((a, b)=>b[0] - a[0] || b[1] - a[1]);
  const flush = cards.every(c=>c.s === cards[0].s);
  const unique = [...new Set(ranks)];
  const wheel = unique.join() === '14,5,4,3,2';
  const straight = unique.length === 5 && (ranks[0] - ranks[4] === 4 || wheel);
  const top = wheel ? 5 : ranks[0];
  if(straight && flush) return [8, top];
  if(groups[0][0] === 4) return [7, groups[0][1], groups[1][1]];
  if(groups[0][0] === 3 && groups[1][0] === 2) return [6, groups[0][1], groups[1][1]];
  if(flush) return [5, ...ranks];
  if(straight) return [4, top];
  if(groups[0][0] === 3) return [3, ...groups.map(g=>g[1])];
  if(groups[0][0] === 2 && groups[1][0] === 2) return [2, ...groups.map(g=>g[1])];
  if(groups[0][0] === 2) return [1, ...groups.map(g=>g[1])];
  return [0, ...ranks];
}
const compareHands = (a, b) => { for(let k = 0; k < Math.max(a.length, b.length); k++){ const diff = (a[k] || 0) - (b[k] || 0); if(diff) return diff; } return 0; };
// Дилер меняет карты: сильную руку держит, пары и тройки оставляет, к четырём одной масти добирает одну, иначе держит две старшие.
function dealerDiscards(cards){
  const [cat] = evalHand(cards);
  if(cat >= 4) return [];
  const counts = {};
  cards.forEach(c=>{ counts[c.r] = (counts[c.r] || 0) + 1; });
  if(cat >= 1) return cards.map((c, k)=>counts[c.r] >= 2 ? -1 : k).filter(k=>k >= 0);
  const suit = SUITS.find(s=>cards.filter(c=>c.s === s).length === 4);
  if(suit) return cards.map((c, k)=>c.s === suit ? -1 : k).filter(k=>k >= 0);
  const keep = cards.map((c, k)=>[c.r, k]).sort((a, b)=>b[0] - a[0]).slice(0, 2).map(x=>x[1]);
  return cards.map((_, k)=>k).filter(k=>!keep.includes(k));
}

// --- Банк и итог партии ---
let game = null; // текущая раздача: {kind:'poker'|'bj', ...}
const bank = () => state.fun;
function renderBank(){
  $('#bankGm').textContent = bank().gm;
  $('#bankDealer').textContent = bank().dealer;
  $('#bankGmBar').style.width = `${Math.min(100, bank().gm / (bank().gm + bank().dealer || 1) * 100)}%`;
}
// Кто-то разорён (фишек меньше анте): Мастер — игроки получают баф; дилер — случается событие. Банки начинаются заново.
function checkBankrupt(){
  let html = '';
  if(bank().gm < ANTE){
    const buff = pick(gmLossBuffs);
    const trinket = /безделушка/.test(buff) && typeof lootJunk !== 'undefined' ? pick(lootJunk) : null;
    const text = trinket ? `${buff}: ${trinket[0]} (${trinket[1]})` : buff;
    html = `<div class="gen-card is-fresh card-verdict is-loss"><header><b>Мастер проигрался!</b><span>игрокам баф</span></header><p>${esc(text)}</p></div>`;
    addLog({kind:'text', tag:'КАЗИНО', text:`Мастер проиграл дилеру всё. Игрокам: ${text}`});
  }
  else if(bank().dealer < ANTE){
    const ev = pick(gmWinEvents);
    html = `<div class="gen-card is-fresh card-verdict is-win"><header><b>Мастер обыграл дилера!</b><span>случайное событие</span></header><p>${esc(ev)}</p></div>`;
    addLog({kind:'text', tag:'КАЗИНО', text:`Мастер обыграл дилера. Событие: ${ev}`});
  }
  if(html){ state.fun = {gm:CARD_START_BANK, dealer:CARD_START_BANK}; game = null; }
  save(); renderBank();
  return html;
}
// Итог раздачи: delta — сколько Мастер выиграл (минус — проиграл) за раздачу; фишки уже переложены.
function finishRound(delta, message){
  const verdict = checkBankrupt();
  $('#cardMsg').innerHTML = `<p class="card-result ${delta > 0 ? 'is-win' : delta < 0 ? 'is-loss' : ''}">${esc(message)} ${delta ? `(${delta > 0 ? '+' : '−'}${Math.abs(delta)})` : ''}</p>${verdict}`;
}

// --- Покер (пятикарточный дро) ---
const ANTE = 10;
function pokerDeal(){
  if(bank().gm < ANTE || bank().dealer < ANTE) return;
  const deck = newDeck();
  game = {kind:'poker', deck, gm:deck.splice(0, 5), dealer:deck.splice(0, 5), marked:new Set(), phase:'draw', pot:ANTE * 2};
  bank().gm -= ANTE; bank().dealer -= ANTE;
  renderBank();
  $('#cardMsg').innerHTML = '<p class="muted">Отметьте карты, которые хотите сменить, и нажмите «ПОМЕНЯТЬ».</p>';
  renderPoker();
}
function pokerDraw(){
  const g = game;
  g.gm = g.gm.map((c, k)=>g.marked.has(k) ? g.deck.shift() : c);
  const dealerSwap = dealerDiscards(g.dealer);
  g.dealer = g.dealer.map((c, k)=>dealerSwap.includes(k) ? g.deck.shift() : c);
  g.dealerSwapped = dealerSwap.length;
  g.marked.clear();
  g.phase = 'bet';
  $('#cardMsg').innerHTML = `<p class="muted">Дилер сменил карт: ${g.dealerSwapped}. У вас ${HAND_NAMES[evalHand(g.gm)[0]]}. Ставка?</p>`;
  renderPoker();
}
// Банк раздачи: анте обоих + ставки. Дилер отвечает по силе руки: с парой и выше — всегда, со старшей картой — иногда.
function pokerBet(amount){
  const g = game;
  g.phase = 'done';
  if(amount < 0){
    bank().dealer += g.pot;
    renderPoker(true);
    finishRound(-ANTE, 'Вы сбросили карты — банк забирает дилер.');
    return;
  }
  const bet = Math.min(amount, bank().gm, bank().dealer);
  bank().gm -= bet;
  const [cat] = evalHand(g.dealer);
  const calls = bet === 0 || cat >= 1 || Math.random() < (bet >= 30 ? .3 : .55);
  if(!calls){
    bank().gm += g.pot + bet;
    renderPoker(true);
    finishRound(ANTE, `Дилер сбросил карты. Банк ваш.`);
    return;
  }
  bank().dealer -= bet;
  g.pot += bet * 2;
  const a = evalHand(g.gm), b = evalHand(g.dealer);
  const cmp = compareHands(a, b);
  if(cmp > 0) bank().gm += g.pot;
  else if(cmp < 0) bank().dealer += g.pot;
  else { bank().gm += g.pot / 2; bank().dealer += g.pot / 2; }
  const stake = ANTE + bet;
  const dealerHand = `${HAND_NAMES[b[0]][0].toUpperCase()}${HAND_NAMES[b[0]].slice(1)}`;
  renderPoker(true);
  finishRound(cmp > 0 ? stake : cmp < 0 ? -stake : 0, cmp > 0 ? `Ваша рука (${HAND_NAMES[a[0]]}) бьёт дилера (${HAND_NAMES[b[0]]}).` : cmp < 0 ? `${dealerHand} у дилера бьёт вашу руку (${HAND_NAMES[a[0]]}).` : `Ничья: ${HAND_NAMES[a[0]]}. Банк делится.`);
}
function renderPoker(reveal = false){
  const g = game;
  if(!g || g.kind !== 'poker'){ $('#cardTable').innerHTML = ''; return; }
  const showDealer = reveal || g.phase === 'done';
  $('#cardTable').innerHTML = `<div class="card-row"><span class="card-who">ДИЛЕР${showDealer ? ` · ${HAND_NAMES[evalHand(g.dealer)[0]]}` : ''}</span>${g.dealer.map(c=>cardHtml(c, {hidden:!showDealer})).join('')}</div>
    <div class="card-row"><span class="card-who">МАСТЕР · ${HAND_NAMES[evalHand(g.gm)[0]]}</span>${g.gm.map((c, k)=>cardHtml(c, {held:g.marked.has(k), i:g.phase === 'draw' ? k : null, game:'poker'})).join('')}</div>
    <div class="card-actions">${g.phase === 'draw' ? '<button type="button" class="quick-roll" data-poker="draw">ПОМЕНЯТЬ</button>'
      : g.phase === 'bet' ? `<button type="button" class="add-row" data-poker="0">ЧЕК</button><button type="button" class="quick-roll" data-poker="10">СТАВКА 10</button><button type="button" class="quick-roll" data-poker="30">СТАВКА 30</button><button type="button" class="add-row" data-poker="-1">ПАС</button>`
      : '<button type="button" class="quick-roll" id="pokerDeal">НОВАЯ РАЗДАЧА</button>'}</div>`;
}

// --- Блекджек ---
const bjValue = cards => {
  let total = cards.reduce((s, c)=>s + (c.r === 14 ? 11 : Math.min(10, c.r)), 0);
  let aces = cards.filter(c=>c.r === 14).length;
  while(total > 21 && aces--) total -= 10;
  return total;
};
function bjDeal(){
  const bet = Math.min(num($('#bjBet').value), bank().gm, bank().dealer);
  if(bet <= 0) return;
  const deck = newDeck();
  game = {kind:'bj', deck, gm:deck.splice(0, 2), dealer:deck.splice(0, 2), bet, phase:'play'};
  $('#cardMsg').innerHTML = '';
  if(bjValue(game.gm) === 21){ bjFinish(); return; }
  renderBj();
}
function bjFinish(){
  const g = game;
  while(bjValue(g.dealer) < 17) g.dealer.push(g.deck.shift());
  g.phase = 'done';
  const me = bjValue(g.gm), dl = bjValue(g.dealer);
  const natural = me === 21 && g.gm.length === 2;
  let delta = 0, msg = '';
  if(me > 21){ delta = -g.bet; msg = `Перебор: ${me}.`; }
  else if(natural && !(dl === 21 && g.dealer.length === 2)){ delta = Math.round(g.bet * 1.5); msg = 'Блекджек! Выплата 3:2.'; }
  else if(dl > 21){ delta = g.bet; msg = `У дилера перебор: ${dl}.`; }
  else if(me > dl){ delta = g.bet; msg = `${me} против ${dl} — ваша победа.`; }
  else if(me < dl){ delta = -g.bet; msg = `${dl} у дилера против ваших ${me}.`; }
  else msg = `Ничья: ${me}.`;
  bank().gm += delta; bank().dealer -= delta;
  renderBj();
  finishRound(delta, msg);
}
function renderBj(){
  const g = game;
  if(!g || g.kind !== 'bj'){ $('#cardTable').innerHTML = ''; return; }
  const done = g.phase === 'done';
  $('#cardTable').innerHTML = `<div class="card-row"><span class="card-who">ДИЛЕР${done ? ` · ${bjValue(g.dealer)}` : ''}</span>${g.dealer.map((c, k)=>cardHtml(c, {hidden:!done && k === 1})).join('')}</div>
    <div class="card-row"><span class="card-who">МАСТЕР · ${bjValue(g.gm)} · ставка ${g.bet}</span>${g.gm.map(c=>cardHtml(c)).join('')}</div>
    <div class="card-actions">${done ? '<button type="button" class="quick-roll" id="bjDeal">НОВАЯ РАЗДАЧА</button>'
      : `<button type="button" class="quick-roll" data-bj="hit">ЕЩЁ</button><button type="button" class="add-row" data-bj="stand">ХВАТИТ</button>${g.gm.length === 2 && bank().gm >= g.bet * 2 && bank().dealer >= g.bet * 2 ? '<button type="button" class="add-row" data-bj="double">УДВОИТЬ</button>' : ''}`}</div>`;
}

// --- «Потыкать» ---
const fidgets = [['d10', 'кубик'], ['¤', 'фишка'], ['◉', 'киберглаз'], ['⚡', 'разряд'], ['☠', 'череп'], ['♪', 'Самурай']];
// Игрушку можно тянуть: отпустили — пружинит на место; просто нажали — крутится.
function bindFidgets(){
  $$('.fidget').forEach(el=>{
    let start = null, moved = false;
    el.addEventListener('pointerdown', ev=>{ start = [ev.clientX, ev.clientY]; moved = false; el.setPointerCapture?.(ev.pointerId); el.classList.add('is-held'); });
    el.addEventListener('pointermove', ev=>{
      if(!start) return;
      const dx = ev.clientX - start[0], dy = ev.clientY - start[1];
      if(Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 6}deg)`;
    });
    const release = () => {
      if(!start) return;
      start = null;
      el.classList.remove('is-held');
      el.style.transform = '';
      if(!moved){ el.classList.remove('is-spin'); void el.offsetWidth; el.classList.add('is-spin'); }
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  });
}

function funHtml(){
  return [
    section('punish', 'НАКАЗАНИЯ', 'домашнее',
      `<p class="muted">${punishNote}</p>
      <div class="chance-controls"><label>Кому<select id="punishWho">${punishTarget()}</select></label>
        ${Object.entries(punishTiers).map(([k, n])=>`<button type="button" class="quick-roll punish-btn punish-${k}" data-punish="${k}">${n.toUpperCase()}</button>`).join('')}</div>
      <div id="punishOut"></div>
      <details class="gen-tables"><summary>Все наказания</summary>${Object.entries(punishments).map(([k, list])=>`<h3>${punishTiers[k]}</h3>${table(['Что происходит', 'Эффект'], list.map(([a, b])=>[esc(a), esc(b)]))}`).join('')}</details>`, true),
    section('tarot', 'КИБЕРПАНК-ТАРО', 'домашнее: в книге правил таро нет',
      `<div class="chance-controls"><label>Расклад<select id="tarotSpread">${options(Object.entries(tarotSpreads).map(([k, [n]])=>[k, n]), 'three')}</select></label>
        <button type="button" class="quick-roll" id="tarotDraw">ТЯНУТЬ</button></div>
      <div id="tarotTable" class="tarot-table"></div>
      <div id="tarotMeaning"></div>
      <p class="muted">Нажмите на карту, чтобы перевернуть. 22 старших аркана в духе Найт-Сити; толкования написаны для листа. Перевёрнутая карта читается наоборот.</p>
      <details class="gen-tables"><summary>Вся колода</summary>${table(['№', 'Карта', 'Аркан', 'Прямо', 'Перевёрнута', 'Мастеру'], tarotCards.map(([n, name, classic, , up, down, hint])=>[n, `<b>${esc(name)}</b>`, classic, esc(up), esc(down), esc(hint)]))}</details>`, true),
    section('cards', 'КАРТЫ ПРОТИВ ДИЛЕРА', 'домашнее',
      `<p class="muted">Пока игроки отыгрывают — сыграйте с дилером. Каждый начинает со ${CARD_START_BANK} фишек. Проиграл всё — игроки получают небольшой баф; разорил дилера — с командой случается небольшое событие.</p>
      <div class="bank"><span>МАСТЕР <b id="bankGm"></b></span><span class="bank-bar"><i id="bankGmBar"></i></span><span>ДИЛЕР <b id="bankDealer"></b></span></div>
      <div class="chance-controls"><button type="button" class="quick-roll" id="pokerDeal">ПОКЕР: РАЗДАЧА (АНТЕ ${ANTE})</button>
        <label>Ставка в блекджек<select id="bjBet">${options([[10, 10], [20, 20], [50, 50]], 10)}</select></label><button type="button" class="quick-roll" id="bjDeal">БЛЕКДЖЕК</button>
        <button type="button" class="add-row" id="bankReset">СБРОСИТЬ ФИШКИ</button></div>
      <div id="cardTable" class="card-table"></div>
      <div id="cardMsg"></div>
      <details class="gen-tables"><summary>Бафы и события</summary>${table(['Мастер проиграл всё: игрокам'], gmLossBuffs.map(b=>[esc(b)]))}${table(['Мастер разорил дилера: событие'], gmWinEvents.map(e=>[esc(e)]))}</details>`, true),
    section('fidget', 'ПОТЫКАТЬ', 'для нервных Мастеров',
      `<div class="fidget-tray">${fidgets.map(([sym, name])=>`<span class="fidget" title="${esc(name)}: потяни или нажми">${esc(sym)}</span>`).join('')}</div>
      <p class="muted">Потяните игрушку — отпустите, и она вернётся на место. Нажмите — закрутится.</p>`, true)
  ].join('');
}
function renderFun(){
  $('#funList').innerHTML = funHtml();
  renderBank(); renderTarot(); bindFidgets();
  if(game?.kind === 'poker') renderPoker(); else if(game?.kind === 'bj') renderBj();
  if(typeof setupPanels === 'function') setupPanels();
}

$('#funList').addEventListener('click', ev=>{
  const el = ev.target.closest('button');
  if(!el) return;
  if(el.dataset.punish) punish(el.dataset.punish);
  if(el.id === 'tarotDraw') drawTarot();
  if(el.dataset.tarot !== undefined){
    const t = tarotDraw[Number(el.dataset.tarot)];
    if(!t.open){ t.open = true; addLog({kind:'text', tag:'ТАРО', text:`${t.slot}: ${t.card[1]}${t.reversed ? ' (перевёрнута)' : ''} — ${t.reversed ? t.card[5] : t.card[4]}`}); }
    renderTarot();
  }
  if(el.id === 'pokerDeal') pokerDeal();
  if(el.dataset.pokerCard !== undefined && game?.phase === 'draw'){ const k = Number(el.dataset.pokerCard); if(game.marked.has(k)) game.marked.delete(k); else game.marked.add(k); renderPoker(); }
  if(el.dataset.poker === 'draw') pokerDraw();
  else if(el.dataset.poker !== undefined && game?.phase === 'bet') pokerBet(num(el.dataset.poker));
  if(el.id === 'bjDeal') bjDeal();
  if(el.dataset.bj && game?.kind === 'bj' && game.phase === 'play'){
    if(el.dataset.bj === 'hit'){ game.gm.push(game.deck.shift()); if(bjValue(game.gm) >= 21) bjFinish(); else renderBj(); }
    if(el.dataset.bj === 'stand') bjFinish();
    if(el.dataset.bj === 'double'){ game.bet *= 2; game.gm.push(game.deck.shift()); bjFinish(); }
  }
  if(el.id === 'bankReset'){ state.fun = {gm:CARD_START_BANK, dealer:CARD_START_BANK}; game = null; renderBank(); $('#cardTable').innerHTML = ''; $('#cardMsg').innerHTML = ''; save(); }
});
// Игроки могли измениться: список «Кому» обновляется при открытии вкладки.
document.querySelector('.tab[data-tab="fun"]').addEventListener('click', ()=>{ $('#punishWho').innerHTML = punishTarget(); });
// Результат кубика мастера коротко вспыхивает при каждом броске.
new MutationObserver(()=>{ const box = $('#diceResult'); box.classList.remove('is-rolled'); void box.offsetWidth; box.classList.add('is-rolled'); }).observe($('#diceResult'), {childList:true});

renderFun();
