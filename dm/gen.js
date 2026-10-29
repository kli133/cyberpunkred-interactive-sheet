// Вкладка «Генераторы» листа Мастера: случайные встречи по книге, лут, заказы, NPC по жизненному пути,
// репутация и отношения фракций, календарь. Данные — gen-data.js; общие функции — dm.js, rules.js, ref.js.

const rollExpr = text => {
  const m = String(text).match(/^(\d+)d(\d+)(?:([*+])(\d+))?$/);
  if(!m) return num(text);
  let v = 0;
  for(let k = 0; k < Number(m[1]); k++) v += d(Number(m[2]));
  return m[3] === '*' ? v * Number(m[4]) : v + num(m[4]);
};
const playerCount = () => Math.max(1, num($('#genPlayers')?.value) || state.players.length || 4);
// Сколько противников: 'p', 'p/2', 'p-2', 'p+2', 'p/2-1' или число; минимум 1 (у «p-3» и «p/2» — 2, как в книге).
function groupSize(expr, players){
  const s = String(expr);
  if(/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^p(\/2)?([+\-]\d+)?$/);
  if(!m) return 1;
  const base = m[1] ? Math.ceil(players / 2) : players;
  return Math.max(m[1] || m[2] ? 2 : 1, base + num(m[2]));
}
const subResult = (sub, r) => sub.find(([a, b])=>r >= a && r <= b)?.[2] || '';

// --- Календарь ---
const calDate = () => new Date(`${state.calendar.now}:00Z`);
const calIso = date => date.toISOString().slice(0, 16);
const partOfDay = date => { const h = date.getUTCHours(); return h >= 6 && h < 18 ? 'day' : h >= 18 ? 'evening' : 'night'; };
const ruDate = (date, opts) => date.toLocaleDateString('ru-RU', {timeZone:'UTC', ...opts});
function calendarLabel(){
  const date = calDate();
  return `${ruDate(date, {weekday:'long'})}, ${ruDate(date, {day:'numeric', month:'long', year:'numeric'})}, ${date.toISOString().slice(11, 16)} — ${encounterTimes[partOfDay(date)].toLowerCase()}`;
}
// Сдвиг времени: события в промежутке срабатывают, смена суток и месяца пишутся в журнал.
function advanceTime(unit, amount){
  const from = calDate();
  const to = new Date(from);
  if(unit === 'h') to.setUTCHours(to.getUTCHours() + amount);
  if(unit === 'd') to.setUTCDate(to.getUTCDate() + amount);
  if(unit === 'm') to.setUTCMonth(to.getUTCMonth() + amount);
  state.calendar.now = calIso(to);
  const days = Math.floor(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) / 864e5) - Math.floor(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()) / 864e5);
  const months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth();
  if(days > 0) addLog({kind:'text', tag:'ВРЕМЯ', text:`Прошло дней: ${days}. За каждый полный день отдыха раненые восстанавливают ПЗ, равные ТЕЛ.`});
  if(months > 0){ addLog({kind:'text', tag:'МЕСЯЦ', text:'Начался новый месяц: оплата жилья и образа жизни — вкладка «Экономика», «НОВЫЙ МЕСЯЦ».'}); toast('Новый месяц: пора платить за жильё'); }
  state.calendar.events.forEach(ev=>{
    const at = new Date(`${ev.date}T00:00:00Z`);
    if(!ev.done && at > from && at <= to){ ev.done = true; addLog({kind:'text', tag:'СОБЫТИЕ', text:`${ruDate(at, {day:'numeric', month:'long'})}: ${ev.text}`}); toast(`Событие: ${ev.text}`); }
  });
  renderCalendar(); save();
}
function renderCalendar(){
  if(!$('#calNow')) return;
  $('#calNow').textContent = calendarLabel();
  $('#calInput').value = state.calendar.now;
  $('#calendarStatus').textContent = `${ruDate(calDate(), {day:'numeric', month:'short', year:'numeric'}).toUpperCase()} ${state.calendar.now.slice(11)}`;
  const now = calDate();
  $('#calEvents').innerHTML = [...state.calendar.events].map((ev, i)=>({ev, i})).sort((a, b)=>a.ev.date.localeCompare(b.ev.date)).map(({ev, i})=>{
    const at = new Date(`${ev.date}T00:00:00Z`);
    const left = Math.round((at - new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) / 864e5);
    return `<div class="cal-event${ev.done || left < 0 ? ' is-past' : ''}"><b>${esc(ruDate(at, {day:'numeric', month:'short', year:'numeric'}))}</b><span>${esc(ev.text)}</span><small>${left > 0 ? `через ${left} дн.` : left === 0 ? 'сегодня' : 'прошло'}</small><button type="button" class="remove" data-cal-del="${i}" aria-label="Удалить">×</button></div>`;
  }).join('') || '<p class="muted">Событий нет: сроки заказов, дни рождения NPC, концерты, выплаты долгов.</p>';
  if($('#encTime') && !$('#encTime').dataset.touched) $('#encTime').value = partOfDay(now);
}

// --- Встречи ---
function rollEncounter(){
  const time = $('#encTime').value, zone = encounterZones[$('#encZone').value];
  if(!zone[2]){ $('#encOut').innerHTML = `<div class="gen-card"><b>${esc(zone[0])}</b><p>${esc(zone[3])}</p></div>`; return; }
  const r = zone[1] + Math.floor(Math.random() * (zone[2] - zone[1] + 1));
  const entry = encounters[time].find(([a, b])=>r >= a && r <= b);
  const [from, to, title, text, groups, sub, twice] = entry;
  const players = playerCount();
  const subs = sub ? (twice ? [d(10), d(10)] : [d(10)]).map(v=>[v, subResult(sub, v)]) : [];
  lastEncounter = {title, groups:groups.map(([idx, expr, label])=>[idx, groupSize(expr, players), label])};
  const range = from === to ? String(from).padStart(2, '0') : `${String(from).padStart(2, '0')}–${to === 100 ? '00' : String(to).padStart(2, '0')}`;
  $('#encOut').innerHTML = `<div class="gen-card is-fresh">
      <header><b>${esc(title)}</b><span>d100 = ${r === 100 ? '00' : r} · ${range} · ${esc(encounterTimes[time])}</span></header>
      <p>${esc(text)}</p>
      ${subs.map(([v, t], k)=>`<p class="gen-sub"><b>${twice ? `Сторона ${k ? 'Б' : 'А'}: ` : ''}1d10 = ${v}</b> — ${esc(t)}</p>`).join('')}
      ${lastEncounter.groups.length ? `<p class="muted">${lastEncounter.groups.map(([idx, n, label])=>`${esc(label)}: ${n} × ${esc(bookBestiary[idx].name)}`).join(' · ')}</p>
      <button type="button" class="quick-roll" id="encSpawn">ВСЕХ В БОЙ</button>` : ''}
    </div>`;
  addLog({kind:'text', tag:'ВСТРЕЧА', text:`${title} (d100 = ${r}). ${subs.map(([v, t])=>`1d10 = ${v}: ${t}`).join('; ')}`});
}
let lastEncounter = null;
// Противники встречи выставляются из бестиария книги; подпись с изменениями снаряжения — в заметки.
function spawnEncounter(){
  if(!lastEncounter) return;
  let total = 0;
  lastEncounter.groups.forEach(([idx, n, label])=>{
    for(let k = 0; k < n; k++){
      const e = bookEnemy(bookBestiary[idx]);
      e.name = `${label.split(' (')[0][0].toUpperCase()}${label.split(' (')[0].slice(1)}${n > 1 ? ` ${k + 1}` : ''}`;
      e.kind = bookBestiary[idx].name;
      e.notes = [`${lastEncounter.title}: ${label}`, e.notes].filter(Boolean).join('\n');
      state.enemies.push(e);
      total++;
    }
  });
  renderCombat();
  toast(`${lastEncounter.title}: выставлено ${total}. Поправьте снаряжение по заметкам.`);
  activateTab('enemies');
}

// --- Лут ---
const priceNum = text => { const m = String(text).replace(/\s/g, '').match(/(\d+)/); return m ? Number(m[1]) : 0; };
const ammoForms = {bullet:'пули', slug:'жаканы', shell:'дробь', arrow:'стрелы', grenade:'граната', rocket:'ракета'};
let lootPools = null;
function buildLootPools(){
  const weapons = [...Object.entries(weaponTypes).map(([id, w])=>[w[0], weaponExtras[id]?.[0] || '']), ...Object.values(exoticWeapons).filter(w=>w[0] !== 'Граната (бросок)').map(w=>[w[0], w[7]])];
  const ammo = Object.values(ammoTypes).flatMap(([name, price, groups])=>groups.map(g=>[`${name} ${ammoForms[g]}${g === 'grenade' || g === 'rocket' ? '' : ' ×10'}`, price]));
  return {
    weapon:weapons, ammo, drug:streetDrugs.map(dr=>[dr[0], dr[1]]), gear:gearPrices.map(([n, p])=>[n, p]),
    cyber:Object.values(cyberCatalog).flat().map(c=>[c[0], c[3]]), program:Object.entries(programPresets).map(([id, p])=>[`Программа: ${p[0].split(' (')[0]}`, programInfo[id]?.[0] || '']),
    armor:armorPrices.map(a=>[a[0], a[3]]), junk:lootJunk, data:lootData, med:lootMed
  };
}
function lootItems(key, count){
  lootPools = lootPools || buildLootPools();
  const [, , , weights, cap] = lootContainers[key];
  const bag = Object.entries(weights).flatMap(([pool, w])=>Array(w).fill(pool));
  return Array.from({length:count}, ()=>{
    const pool = pick(bag);
    const list = lootPools[pool].filter(([, p])=>!priceNum(p) || priceNum(p) <= cap);
    const [name, price] = pick(list.length ? list : lootPools[pool]);
    return {pool, name, price};
  });
}
function lootCard({title, cash, items, carried}, fresh, notesBtn, closeBtn = ''){
  return `<div class="gen-card${fresh ? ' is-fresh' : ''}"><header><b>${esc(title)}</b><span>${cash ? `${cash}eb наличными` : 'без наличных'}</span>${closeBtn}</header>
    ${carried.length ? `<p class="gen-sub"><b>При себе:</b> ${carried.map(esc).join(', ')}</p>` : ''}
    <ul class="loot-list">${items.map(it=>`<li><small>${esc(lootPoolNames[it.pool])}</small> ${esc(it.name)} <em>${esc(it.price || '')}</em></li>`).join('')}</ul>
    ${notesBtn}</div>`;
}
function logLoot({title, cash, items, carried}){
  addLog({kind:'text', tag:'ЛУТ', text:`${title}: ${[cash && `${cash}eb`, ...carried, ...items.map(it=>it.name)].filter(Boolean).join(', ')}`});
}
function lootToNotes({title, cash, items, carried}){
  const line = `${title}: ${[cash && `${cash}eb`, ...carried, ...items.map(it=>`${it.name}${it.price ? ` (${it.price})` : ''}`)].filter(Boolean).join(', ')}`;
  state.loot = [state.loot.trim(), line].filter(Boolean).join('\n');
  $$('[data-key="loot"]').forEach(f=>{ f.value = state.loot; });
  save(); toast('Записано в «Добыча и награды» (вкладка «NPC и заметки»)');
}
function showLoot(title, cash, items, carried = []){
  lastLoot = {title, cash, items, carried};
  $('#lootOut').innerHTML = lootCard(lastLoot, true, '<button type="button" class="add-row" id="lootToNotes">В ЗАМЕТКИ «ДОБЫЧА»</button>');
  logLoot(lastLoot);
}
let lastLoot = null;
function rollLoot(){
  const key = $('#lootKind').value;
  const [title, cash, count] = lootContainers[key];
  showLoot(title, rollExpr(cash), lootItems(key, rollExpr(count)));
}
// Обыскать противника: его оружие с остатком патронов, снаряжение из карточки, наличные и пара находок по уровню.
// Находка видна прямо в карточке, пока Мастер её не закроет; в сохранение не попадает.
const enemyLoot = {};
function lootEnemy(e){
  const tier = /босс/i.test(e.kind) ? 'boss' : /лейтенант/i.test(e.kind) ? 'lieutenant' : 'pockets';
  const [, cash] = lootContainers[tier];
  const carried = [...e.weapons.map(w=>`${w[0] || 'оружие'}${isBlank(w[4]) ? '' : ` (${w[4]} патр.)`}`), ...e.implants.map(imp=>`${imp.name} (${imp.kind === 'drug' ? 'наркотик' : 'имплант — только с хирургом'})`)];
  if(e.gear.trim()) carried.push(e.gear.trim());
  const loot = {title:`Обыск: ${enemyName(e)}`, cash:rollExpr(cash), items:lootItems(tier, d(2)), carried, fresh:true};
  enemyLoot[e.id] = loot;
  logLoot(loot);
  renderCombat();
}
// Блок лута в карточке противника (dm.js). Анимация — только при первом показе, а не при каждой перерисовке.
function lootBlock(i, e){
  const loot = enemyLoot[e.id];
  if(!loot) return '';
  const html = `<div class="enemy-loot">${lootCard(loot, loot.fresh,
    `<button type="button" class="add-row" data-act="lootNotes" data-i="${i}">В ЗАМЕТКИ «ДОБЫЧА»</button>`,
    `<button type="button" class="loot-close" data-act="lootClose" data-i="${i}" title="Закрыть" aria-label="Закрыть">×</button>`)}</div>`;
  loot.fresh = false;
  return html;
}

// --- Заказы ---
function rollGig(){
  const kind = $('#gigTier').value === '' ? pick([0, 0, 1, 1, 1, 2]) : num($('#gigTier').value);
  const [job, what] = pick(gigJobs);
  const players = playerCount();
  lastGig = {title:`${job}: ${pick(gigTargets)}`, client:pick(gigClients), job:what, place:pick(gigPlaces), twist:pick(gigTwists),
    tier:gigPay[kind][0], pay:String(gigPay[kind][3] * players), status:'предложено', notes:''};
  $('#gigGenOut').innerHTML = `<div class="gen-card is-fresh"><header><b>${esc(lastGig.title)}</b><span>${esc(lastGig.tier)}</span></header>${gigBody(lastGig)}
    <button type="button" class="quick-roll" id="gigToBoard">НА ДОСКУ ЗАКАЗОВ</button> <button type="button" class="add-row" id="gigToHooks">В ЗАЦЕПКИ СЕССИИ</button></div>`;
}
let lastGig = null;
const gigBody = g => `<p><b>Заказчик:</b> ${esc(g.client)} · <b>Где:</b> ${esc(g.place)}</p><p><b>Задача:</b> ${esc(g.job)}</p><p><b>Подвох:</b> ${esc(g.twist)}</p><p><b>Плата:</b> ${esc(g.pay)}eb на команду</p>`;
const gigText = g => `${g.title} — ${g.client}, ${g.place}. ${g.job}. Подвох: ${g.twist}. Плата ${g.pay}eb.`;
function renderGigs(){
  $('#gigBoard').innerHTML = state.gigs.map((g, i)=>`<article class="gen-card gig-card is-${gigStatuses.indexOf(g.status)}">
      <header><input data-gig="${i}" data-k="title" value="${esc(g.title)}" aria-label="Заказ"><select data-gig="${i}" data-k="status" aria-label="Статус">${options(gigStatuses.map(s=>[s, s]), g.status)}</select><button type="button" class="remove" data-gig-del="${i}" aria-label="Удалить">×</button></header>
      ${gigBody(g)}
      <textarea data-gig="${i}" data-k="notes" rows="2" placeholder="Что сделано, кто погиб, кому должны...">${esc(g.notes)}</textarea>
    </article>`).join('') || '<p class="muted">Доска пуста: сгенерируйте заказ и нажмите «НА ДОСКУ».</p>';
}

// --- NPC ---
const npcTraits = [['region', 'Откуда', ()=>pick(lifepath.region)], ['job', 'Кто', ()=>pick(npcJobs)], ['personality', 'Характер', ()=>pick(lifepath.personality)],
  ['mood', 'Сейчас', ()=>pick(npcMoods)], ['quirk', 'Манера', ()=>pick(npcQuirks)], ['clothing', 'Одежда', ()=>pick(lifepath.clothing)], ['hair', 'Причёска', ()=>pick(lifepath.hair)],
  ['affectation', 'Деталь', ()=>pick(lifepath.affectation)], ['values', 'Ценит', ()=>pick(lifepath.values)], ['people', 'О людях', ()=>pick(lifepath.people)],
  ['closest', 'Самый близкий', ()=>pick(lifepath.closest)], ['possession', 'Дорожит', ()=>pick(lifepath.possession)], ['family', 'Семья', ()=>pick(lifepath.family)],
  ['crisis', 'Беда', ()=>pick(lifepath.crisis)], ['goal', 'Хочет', ()=>pick(lifepath.goal)]];
let currentNpc = null;
function rollNpc(){
  currentNpc = {name:generateNames(1)[0], ...Object.fromEntries(npcTraits.map(([k, , f])=>[k, f()]))};
  renderNpcGen();
}
function renderNpcGen(){
  const n = currentNpc;
  $('#npcGenOut').innerHTML = `<div class="gen-card is-fresh"><header><b>${esc(n.name)}</b><button type="button" class="weapon-btn" data-npc-reroll="name" title="Другое имя">⟳</button></header>
    <div class="npc-traits">${npcTraits.map(([k, label])=>`<button type="button" class="trait-chip" data-npc-reroll="${k}" title="Нажмите, чтобы перебросить"><small>${label}</small>${esc(n[k])}</button>`).join('')}</div>
    <button type="button" class="quick-roll" data-npc-save="0">+ В NPC</button> <button type="button" class="add-row" data-npc-save="1" title="Закреплённый NPC переживает «Очистить»">★ ЗАКРЕПИТЬ</button></div>`;
}
const npcNotes = n => npcTraits.filter(([k])=>!['job', 'mood'].includes(k)).map(([k, label])=>`${label}: ${n[k]}`).join('\n');
function saveNpc(pinned){
  const n = currentNpc;
  state.npcs.push([n.name, n.job, n.mood, '', npcNotes(n), '', pinned ? 'true' : '']);
  renderNpcs(); save();
  toast(`${n.name}: ${pinned ? 'закреплён в NPC' : 'добавлен в NPC'}`);
}

// --- Репутация и фракции ---
function renderReputation(){
  $('#repPlayers').innerHTML = state.reputation.map((p, i)=>{
    const lvl = Math.max(0, Math.min(10, num(p.rep)));
    return `<div class="rep-row"><b>${esc(p.name)}</b>
      <label class="rep-level">репутация <input type="number" min="0" max="10" data-rep="${i}" data-k="rep" value="${esc(p.rep)}"></label>
      <label title="Репутация из-за трусости — отрицательная при запугивании"><input type="checkbox" data-rep="${i}" data-k="coward"${p.coward ? ' checked' : ''}> трусость</label>
      <span class="muted">${esc(reputationLevels[lvl])}</span>
      <span class="row-btns"><button type="button" class="weapon-btn" data-rep-meet="${i}" title="NPC бросает 1d10: меньше репутации — слышал о персонаже">ВСТРЕЧА</button><button type="button" class="weapon-btn" data-rep-face="${i}" title="1d10 + репутация; прибавьте ХАР">ЗАПУГИВАНИЕ</button><button type="button" class="remove" data-rep-del="${i}" aria-label="Убрать">×</button></span></div>`;
  }).join('') || '<p class="muted">Нажмите «ИЗ ТАБЛИЦЫ ИГРОКОВ».</p>';
  $('#factionList').innerHTML = state.factions.map((f, i)=>{
    const lvl = standingLevels.find(([v])=>v === f.standing);
    return `<article class="faction-card st-${f.standing < 0 ? 'neg' : f.standing > 0 ? 'pos' : 'zero'}">
      <header><input data-fac="${i}" data-k="name" value="${esc(f.name)}" aria-label="Фракция"><small>${esc(f.kind)}</small><button type="button" class="remove" data-fac-del="${i}" aria-label="Удалить">×</button></header>
      <p class="muted">${esc(f.desc)}</p>
      <div class="standing"><input type="range" min="-3" max="3" step="1" data-fac="${i}" data-k="standing" value="${f.standing}" aria-label="Отношение"><b>${f.standing > 0 ? '+' : ''}${f.standing} ${esc(lvl[1])}</b></div>
      <p><b>При встрече:</b> ${esc(lvl[2])}.</p><p><b>Эффект:</b> ${esc(lvl[3])}.</p>
      <button type="button" class="weapon-btn" data-fac-react="${i}" title="1d10 + отношение × 2">РЕАКЦИЯ</button>
      <textarea data-fac="${i}" data-k="notes" rows="1" class="grow-field" placeholder="Что команда им сделала, кто там знаком...">${esc(f.notes)}</textarea>
    </article>`;
  }).join('');
}

function genHtml(){
  const players = state.players.length || 4;
  return [
    section('calendar', 'КАЛЕНДАРЬ', 'домашнее',
      `<div class="cal-now"><b id="calNow"></b><input type="datetime-local" id="calInput" aria-label="Дата и время"></div>
      <div class="cal-buttons">${[['h', 1, '+1 ЧАС'], ['h', 6, '+6 ЧАСОВ'], ['d', 1, '+1 ДЕНЬ'], ['d', 7, '+1 НЕДЕЛЯ'], ['m', 1, '+1 МЕСЯЦ']].map(([u, a, l])=>`<button type="button" class="add-row" data-cal-step="${u}" data-amount="${a}">${l}</button>`).join('')}</div>
      <div class="cal-add"><input type="date" id="calEventDate" aria-label="Дата события"><input id="calEventText" placeholder="Срок заказа, концерт, долг..." aria-label="Событие"><button type="button" class="quick-roll" id="calEventAdd">+ СОБЫТИЕ</button></div>
      <div id="calEvents" class="cal-events"></div>
      <p class="muted">Обычные месяцы и годы, Красное время — 2045. При смене суток лист напомнит про лечение, при смене месяца — про аренду; события срабатывают, когда время доходит до их даты. Время суток подставляется во встречи.</p>`, true),
    section('encounters', 'СЛУЧАЙНЫЕ ВСТРЕЧИ', 'стр. 417–425',
      `<div class="chance-controls"><label>Время<select id="encTime">${options(Object.entries(encounterTimes), 'day')}</select></label>
        <label>Зона<select id="encZone">${options(Object.entries(encounterZones).map(([k, z])=>[k, z[0]]), 'moderate')}</select></label>
        <label>Игроков<input type="number" id="genPlayers" min="1" max="12" value="${players}"></label>
        <button type="button" class="quick-roll" id="encRoll">БРОСИТЬ D100</button></div>
      <p class="muted" id="encZoneNote"></p>
      <div id="encOut"></div>
      <p class="muted">${encounterNote}</p>
      <details class="gen-tables"><summary>Таблицы встреч</summary>${Object.entries(encounters).map(([t, list])=>`<h3>${encounterTimes[t]}</h3>${table(['d100', 'Встреча', 'Что происходит'], list.map(([a, b, title, text])=>[a === b ? a : `${a}–${b === 100 ? '00' : b}`, `<b>${esc(title)}</b>`, esc(text)]))}`).join('')}</details>`, true),
    section('loot', 'ЛУТ', 'домашнее',
      `<div class="chance-controls"><label>Где ищут<select id="lootKind">${options(Object.entries(lootContainers).map(([k, c])=>[k, c[0]]), 'pockets')}</select></label>
        <button type="button" class="quick-roll" id="lootRoll">ОБЫСКАТЬ</button></div>
      <div id="lootOut"></div>
      <p class="muted">Предметы берутся из прайсов книги (снаряжение, оружие, патроны, импланты, программы, наркотики) с пределом цены по контейнеру. Поверженного противника обыщите кнопкой $ на его карточке: оружие и остаток патронов, снаряжение, наличные и пара находок по уровню.</p>`),
    section('gigs', 'ЗАКАЗЫ', 'домашнее, плата — стр. 381',
      `<div class="chance-controls"><label>Сложность<select id="gigTier">${options([['', 'случайная'], ...gigPay.map(([n], k)=>[k, n])], '')}</select></label>
        <button type="button" class="quick-roll" id="gigRoll">НОВЫЙ ЗАКАЗ</button></div>
      <div id="gigGenOut"></div>
      <h3>Доска заказов</h3><div id="gigBoard" class="gig-board"></div>`),
    section('npcgen', 'NPC', 'жизненный путь, стр. 45–53',
      `<button type="button" class="quick-roll" id="npcRoll">НОВЫЙ NPC</button>
      <div id="npcGenOut"></div>
      <p class="muted">Черты — из таблиц жизненного пути книги; «Кто», «Сейчас» и «Манера» — таблицы листа. Нажмите на черту, чтобы перебросить её. ★ ЗАКРЕПИТЬ — NPC останется после «Очистить», вернётесь к нему позже.</p>`),
    section('reputation', 'РЕПУТАЦИЯ И ФРАКЦИИ', 'стр. 193–194, 308–309',
      `${list(reputationRules)}
      <div class="econ-toolbar"><button type="button" class="quick-roll" id="repFromPlayers">ИЗ ТАБЛИЦЫ ИГРОКОВ</button></div>
      <div id="repPlayers" class="rep-list"></div>
      ${table(['Уровень', 'Кто о вас знает'], reputationLevels.map((t, k)=>[k, t]).slice(1))}
      <h3>Отношение фракций к команде (домашнее правило)</h3>
      <p class="muted">Шкала от −3 до +3 — правило листа, в книге её нет. Описания банд — по книге.</p>
      <div class="econ-toolbar"><button type="button" class="add-row" id="facAdd">+ ФРАКЦИЯ</button><button type="button" class="add-row" id="facReset">ВЕРНУТЬ БАНДЫ КНИГИ</button></div>
      <div id="factionList" class="faction-list"></div>
      ${table(['Отношение', 'Название', 'При встрече', 'Эффект'], standingLevels.map(([v, n, a, b])=>[v > 0 ? `+${v}` : v, `<b>${n}</b>`, a, b]))}`)
  ].join('');
}
function renderGen(){
  $('#genList').innerHTML = genHtml();
  $('#encZoneNote').textContent = encounterZones.moderate[3];
  renderCalendar(); renderGigs(); renderReputation();
  if(typeof setupPanels === 'function') setupPanels();
}

$('#genList').addEventListener('input', ev=>{
  const el = ev.target;
  const value = el.type === 'checkbox' ? el.checked : el.value;
  if(el.dataset.gig !== undefined){ state.gigs[Number(el.dataset.gig)][el.dataset.k] = value; save(); if(el.dataset.k === 'status') renderGigs(); return; }
  if(el.dataset.rep !== undefined){ state.reputation[Number(el.dataset.rep)][el.dataset.k] = value; save(); if(el.type === 'checkbox') renderReputation(); return; }
  if(el.dataset.fac !== undefined){
    const f = state.factions[Number(el.dataset.fac)];
    f[el.dataset.k] = el.dataset.k === 'standing' ? num(value) : value;
    if(el.classList.contains('grow-field')) autoGrow(el);
    save();
    if(el.dataset.k === 'standing') renderReputation();
    return;
  }
  if(el.id === 'encZone') $('#encZoneNote').textContent = encounterZones[el.value][3];
  if(el.id === 'encTime') el.dataset.touched = '1';
});
$('#genList').addEventListener('change', ev=>{
  const el = ev.target;
  if(el.id === 'calInput' && el.value){ state.calendar.now = el.value.slice(0, 16); renderCalendar(); save(); }
  if(el.dataset.rep !== undefined && el.dataset.k === 'rep') renderReputation();
});
$('#genList').addEventListener('click', ev=>{
  const el = ev.target.closest('button');
  if(!el) return;
  if(el.dataset.calStep) advanceTime(el.dataset.calStep, num(el.dataset.amount));
  if(el.id === 'calEventAdd'){
    const date = $('#calEventDate').value || state.calendar.now.slice(0, 10), text = $('#calEventText').value.trim();
    if(!text){ toast('Опишите событие'); return; }
    state.calendar.events.push({date, text, done:false});
    $('#calEventText').value = '';
    renderCalendar(); save();
  }
  if(el.dataset.calDel !== undefined){ state.calendar.events.splice(Number(el.dataset.calDel), 1); renderCalendar(); save(); }
  if(el.id === 'encRoll') rollEncounter();
  if(el.id === 'encSpawn') spawnEncounter();
  if(el.id === 'lootRoll') rollLoot();
  if(el.id === 'lootToNotes' && lastLoot) lootToNotes(lastLoot);
  if(el.id === 'gigRoll') rollGig();
  if(el.id === 'gigToBoard' && lastGig){ state.gigs.unshift({...lastGig}); renderGigs(); save(); toast('Заказ на доске'); }
  if(el.id === 'gigToHooks' && lastGig){
    state.hooks = [state.hooks.trim(), gigText(lastGig)].filter(Boolean).join('\n');
    $$('[data-key="hooks"]').forEach(f=>{ f.value = state.hooks; });
    save(); toast('Добавлено в «Цели и зацепки» на вкладке «Сессия»');
  }
  if(el.dataset.gigDel !== undefined){ const g = state.gigs[Number(el.dataset.gigDel)]; withUndo(`Заказ «${g.title}» удалён`, ()=>state.gigs.splice(Number(el.dataset.gigDel), 1)); }
  if(el.id === 'npcRoll') rollNpc();
  if(el.dataset.npcReroll && currentNpc){
    const k = el.dataset.npcReroll;
    currentNpc[k] = k === 'name' ? generateNames(1)[0] : npcTraits.find(([key])=>key === k)[2]();
    renderNpcGen();
    $(`[data-npc-reroll="${k}"]`)?.classList.add('is-rerolled');
  }
  if(el.dataset.npcSave !== undefined && currentNpc) saveNpc(el.dataset.npcSave === '1');
  if(el.id === 'repFromPlayers'){
    state.players.forEach(row=>{ const name = row[1].trim() || row[0].trim(); if(name && !state.reputation.some(p=>p.name === name)) state.reputation.push({name, rep:'0', coward:false}); });
    renderReputation(); save();
  }
  if(el.dataset.repDel !== undefined){ state.reputation.splice(Number(el.dataset.repDel), 1); renderReputation(); save(); }
  if(el.dataset.repMeet !== undefined){
    const p = state.reputation[Number(el.dataset.repMeet)];
    const r = d(10);
    addLog({kind:'text', tag:'РЕПУТАЦИЯ', text:`${p.name}: NPC бросает 1d10 = ${r} против репутации ${num(p.rep)} — ${r < num(p.rep) ? `СЛЫШАЛ: ${p.coward ? 'о трусости, не впечатлён' : 'знает о его делах'}` : 'не слышал'}`});
  }
  if(el.dataset.repFace !== undefined){
    const p = state.reputation[Number(el.dataset.repFace)];
    const rep = num(p.rep) * (p.coward ? -1 : 1);
    roll({count:1, sides:10, bonus:0}, rep, `${p.name}: запугивание`, {crits:true, note:`репутация ${rep >= 0 ? '+' : ''}${rep}; прибавьте ХАР. Против ХАР + Репутация + 1d10 противника; проигравший отступает или −2 против победителя`});
  }
  if(el.id === 'facAdd'){ state.factions.push({name:'Новая фракция', kind:'своя', desc:'', standing:0, notes:''}); renderReputation(); save(); }
  if(el.id === 'facReset') withUndo('Банды книги возвращены, отношения сброшены', ()=>{ state.factions = defaultFactions(); });
  if(el.dataset.facDel !== undefined){ const f = state.factions[Number(el.dataset.facDel)]; withUndo(`${f.name}: удалена`, ()=>state.factions.splice(Number(el.dataset.facDel), 1)); }
  if(el.dataset.facReact !== undefined){
    const f = state.factions[Number(el.dataset.facReact)];
    const r = d(10), total = r + f.standing * 2;
    const [, , text] = reactionTable.find(([a, b])=>total >= a && total <= b);
    addLog({kind:'text', tag:'ФРАКЦИЯ', text:`${f.name}: 1d10 = ${r} ${f.standing >= 0 ? '+' : '−'} ${Math.abs(f.standing * 2)} = ${total} — ${text}`});
    $('#diceResult').innerHTML = `<strong class="formula-roll-total">${esc(f.name)}: ${esc(text)}</strong><div class="roll-note"><span>1d10 = ${r}, отношение ${f.standing > 0 ? '+' : ''}${f.standing} × 2 → ${total}</span></div>`;
    $('#diceDrawer').classList.add('open');
  }
});
// Обыск противника — кнопка $ в заголовке его карточки (dm.js).
enemyActions.loot = e => lootEnemy(e);
enemyActions.lootNotes = e => { if(enemyLoot[e.id]) lootToNotes(enemyLoot[e.id]); };
enemyActions.lootClose = e => { delete enemyLoot[e.id]; renderCombat(); };

renderGen();
