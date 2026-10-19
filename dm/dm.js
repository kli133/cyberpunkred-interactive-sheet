// Лист Мастера Cyberpunk RED. Справочные таблицы (stats, weaponTypes, armorPresets, criticalInjuries,
// rangeBands, rangeDv, autofireDv) — в ../data.js.
const DM_KEY = 'cyberred-dm';
const LOG_LIMIT = 60;
const STAT_REF = 1, STAT_DEX = 2, STAT_WILL = 5, STAT_MOVE = 7, STAT_BODY = 8;
// Игроки: j — индекс в сохранённой строке. 6 — РЕФ, 7 — id листа персонажа в этом браузере (скрытое).
const PLAYER_WIDTH = 8;
const playerColumns = [{j:0,label:'Игрок'},{j:1,label:'Персонаж'},{j:2,label:'Роль'},{j:6,label:'РЕФ',short:true},{j:3,label:'Хиты',short:true},{j:4,label:'SP г/т',short:true},{j:5,label:'Заметки',note:true}];
// NPC: 0 имя, 1 кто / фракция, 2 отношение, 3 где найти, 4 заметки, 5 свёрнут, 6 закреплён (переживает «Очистить»).
const NPC_WIDTH = 7;
const npcFields = [{j:0,label:'Имя',placeholder:'Имя NPC'},{j:1,label:'Кто / фракция',placeholder:'фиксер, Тигриные когти...'},{j:2,label:'Отношение',placeholder:'союзник, должник, враг...'},{j:3,label:'Где найти',placeholder:'бар, район, номер...'}];
// Оружие противника: 0 название, 1 атака (стат + навык), 2 урон, 3 ROF, 4 патроны, 5 магазин, 6 тип из книги, 7 база автоогня.
const WEAPON_WIDTH = 8;
// Этаж архитектуры: 0 этаж, 1 ветка, 2 что там, 3 СЛ, 4 содержимое, 5 REZ, 6 REZ макс., 7 пройден.
const FLOOR_WIDTH = 8;
const floorKinds = ['Пароль','Файл','Узел управления','Чёрный ЛЁД','Демон','Другое','Пусто'];
// Таблицы генератора Сети — из книги (netBookTables в net-data.js). Мастер может их править:
// одна строка — один вариант; 16 строк бросаются 3d6, другое число строк — с равным шансом.
// «ЛЁД: Имя» берёт статы из blackIce в data.js.
const netGenDefaults = netBookTables;
const netGenTitles = {lobby:'Лобби (этажи 1–2)', ...Object.fromEntries(Object.entries(netDifficulties).map(([k,[name,dv]])=>[k, `${name} (СЛ ${dv})`]))};
const AUTOFIRE_AMMO_COST = 10;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const d = sides => Math.floor(Math.random()*sides)+1;
const pick = list => list[Math.floor(Math.random()*list.length)];
const now = () => new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
const num = value => Number(value) || 0;
const isBlank = value => value === undefined || value === null || String(value).trim() === '';
const signed = value => value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = value => JSON.parse(JSON.stringify(value));
const rows = (list, width) => (Array.isArray(list) ? list : []).map(row=>Array.from({length:width},(_,j)=>String(row?.[j] ?? '')));

// Состояния противника (стр. 177, 180–181): лёжа, в захвате, без сознания, горит (2 / 4 / 6), тонет, вакуум, под током.
// vacuumLoss — сколько ИНТ, РЕФ и ЛВК отнял вакуум: возвращается, когда состояние снимают.
const blankStatus = () => ({prone:false, grappled:false, unconscious:false, fire:0, drown:false, vacuum:false, shock:false, vacuumLoss:0});
const statusFlags = [['prone','ЛЁЖА','Лёжа: нельзя перемещаться, пока не встанет'], ['grappled','ЗАХВАТ','В захвате: −2 ко всем броскам'], ['unconscious','БЕЗ СОЗН.','Без сознания: не действует'],
  ['drown','ТОНЕТ','Тонет или задыхается: в начале хода урон = ТЕЛ мимо брони'], ['vacuum','ВАКУУМ','Вакуум: удушье в начале хода и 1d6 по ИНТ, РЕФ, ЛВК в конце хода'],
  ['shock','ТОК','Под током: 6d6 в конце хода, броня защищает']];
const fireLevels = [[0,'не горит'], [2,'горит: слабо (2)'], [4,'горит: сильно (4)'], [6,'горит: смертельно (6)']];
const blankEnemy = () => ({
  id:uid(), name:'', kind:'', stats:stats.map(()=>''), hp:'', hpMax:'',
  headSp:'', headSpMax:'', bodySp:'', bodySpMax:'', armor:'', range:'', dv:'',
  weapons:[], skills:[], injuries:'', gear:'', notes:'', dead:false, deathPenalty:0, collapsed:false, selected:false, status:blankStatus(),
  implants:[]
});
const blankState = () => ({
  sessionTitle:'', scene:'', hooks:'', notes:'', locations:'', clues:'', loot:'',
  players:[], npcs:[], enemies:[], templates:[], scenes:[], nets:[], tables:[], netGen:{}, covers:[], economy:{people:[]},
  gigs:[], factions:defaultFactions(), reputation:[], calendar:{now:'2045-06-01T20:00', events:[]},
  init:[], turn:0, round:1, log:[], compact:false
});

// Фракции по умолчанию — банды и силы Найт-Сити из книги (gen-data.js), отношение 0.
const defaultFactions = () => factionPresets.map(([name, kind, desc])=>({name, kind, desc, standing:0, notes:''}));

// --- Хранение ---
function normalizeEnemy(raw){
  const e = {...blankEnemy(), ...(raw && typeof raw === 'object' ? raw : {})};
  e.id = String(e.id || uid());
  e.stats = stats.map((_,i)=>String(e.stats?.[i] ?? ''));
  e.weapons = rows(e.weapons, WEAPON_WIDTH);
  e.skills = rows(e.skills, 2);
  ['name','kind','hp','hpMax','headSp','headSpMax','bodySp','bodySpMax','armor','range','dv','injuries','gear','notes'].forEach(k=>{ e[k] = String(e[k] ?? ''); });
  ['dead','collapsed','selected'].forEach(k=>{ e[k] = e[k] === true; });
  e.deathPenalty = num(e.deathPenalty);
  const st = e.status && typeof e.status === 'object' ? e.status : {};
  e.status = {...blankStatus(), ...Object.fromEntries(Object.entries(blankStatus()).map(([k,v])=>[k, typeof v === 'boolean' ? st[k] === true : num(st[k])]))};
  e.implants = (Array.isArray(e.implants) ? e.implants : []).map(imp=>({name:String(imp?.name ?? ''), kind:imp?.kind === 'drug' ? 'drug' : 'cyber'})).filter(imp=>imp.name);
  return e;
}
function normalize(raw){
  const s = {...blankState(), ...(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})};
  s.players = rows(s.players, PLAYER_WIDTH);
  s.npcs = rows(s.npcs, NPC_WIDTH);
  s.enemies = (Array.isArray(s.enemies) ? s.enemies : []).map(normalizeEnemy);
  s.templates = (Array.isArray(s.templates) ? s.templates : []).map(normalizeEnemy);
  s.scenes = (Array.isArray(s.scenes) ? s.scenes : []).map(sc=>({name:String(sc?.name ?? ''), enemies:(Array.isArray(sc?.enemies) ? sc.enemies : []).map(normalizeEnemy)}));
  s.nets = (Array.isArray(s.nets) ? s.nets : []).map(n=>({name:String(n?.name ?? ''), notes:String(n?.notes ?? ''), difficulty:netDifficulties[n?.difficulty] ? n.difficulty : '',
    floors:rows(n?.floors, FLOOR_WIDTH), demon:demons[n?.demon] ? n.demon : '', demonRez:isBlank(n?.demonRez) ? '' : String(n.demonRez)}));
  // Нетронутые прежние заготовки листа заменяются таблицами книги.
  const gen = s.netGen && typeof s.netGen === 'object' ? s.netGen : {};
  s.netGen = Object.fromEntries(Object.entries(netGenDefaults).map(([k,lines])=>[k, typeof gen[k] === 'string' && gen[k] !== netOldDefaults[k].join('\n') ? gen[k] : lines.join('\n')]));
  s.tables = (Array.isArray(s.tables) ? s.tables : []).map(t=>({name:String(t?.name ?? ''), lines:String(t?.lines ?? '')}));
  s.covers = (Array.isArray(s.covers) ? s.covers : []).map(c=>({name:String(c?.name ?? ''), hp:num(c?.hp), max:num(c?.max)}));
  // Экономика: строки персонажей — строки, кроме отметки «оплачено».
  const people = Array.isArray(s.economy?.people) ? s.economy.people : [];
  s.economy = {people:people.map(p=>({...Object.fromEntries(['name','roleId','rank','housing','lifestyle','trauma','extra','cash','ipGroup','ipStyle','ipStyleLevel'].map(k=>[k, String(p?.[k] ?? '')])), paid:p?.paid === true}))
    .map(p=>({...p, housing:p.housing || 'container', lifestyle:p.lifestyle || 'kibble'}))};
  // Генераторы: доска заказов, репутация игроков, отношения фракций, календарь.
  const str = v => String(v ?? '');
  s.gigs = (Array.isArray(s.gigs) ? s.gigs : []).map(g=>Object.fromEntries(['title','client','job','place','twist','tier','pay','status','notes'].map(k=>[k, str(g?.[k])])));
  s.reputation = (Array.isArray(s.reputation) ? s.reputation : []).map(p=>({name:str(p?.name), rep:str(p?.rep), coward:p?.coward === true}));
  s.factions = Array.isArray(s.factions) ? s.factions.map(f=>({name:str(f?.name), kind:str(f?.kind), desc:str(f?.desc), standing:Math.max(-3, Math.min(3, Math.round(num(f?.standing)))), notes:str(f?.notes)})) : defaultFactions();
  const cal = s.calendar && typeof s.calendar === 'object' ? s.calendar : {};
  s.calendar = {now:/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(cal.now) ? cal.now : '2045-06-01T20:00',
    events:(Array.isArray(cal.events) ? cal.events : []).map(ev=>({date:str(ev?.date).slice(0, 10), text:str(ev?.text), done:ev?.done === true})).filter(ev=>/^\d{4}-\d\d-\d\d$/.test(ev.date))};
  s.init = (Array.isArray(s.init) ? s.init : []).map(item=>({
    id:String(item?.id || uid()), name:String(item?.name ?? ''), value:String(item?.value ?? ''),
    enemyId:item?.enemyId ? String(item.enemyId) : '', note:String(item?.note ?? ''),
    effects:(Array.isArray(item?.effects) ? item.effects : []).map(ef=>({text:String(ef?.text ?? ''), rounds:isBlank(ef?.rounds) ? '' : num(ef.rounds)}))
  }));
  s.log = Array.isArray(s.log) ? s.log.slice(0, LOG_LIMIT) : [];
  s.turn = Math.max(0, num(s.turn));
  s.round = Math.max(1, num(s.round));
  s.compact = s.compact === true;
  return s;
}
function load(){
  try { return normalize(JSON.parse(localStorage.getItem(DM_KEY) || 'null')); }
  catch { return blankState(); }
}
let state = load();
let saveTimer = null;
function persist(){
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(DM_KEY, JSON.stringify(state));
    $('#saveStatus').textContent = 'СОХРАНЕНО '+now();
  } catch {
    $('#saveStatus').textContent = 'НЕ СОХРАНЕНО: ПЕРЕПОЛНЕНО ХРАНИЛИЩЕ';
  }
}
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300); };

// --- Расчёты противника ---
// Импланты и наркотики противника (ref-data.js): fx — эффект, который лист считает сам.
const cyberIndex = Object.fromEntries(Object.entries(cyberCatalog).flatMap(([group, items])=>items.map(item=>[item[0], {group, item, fx:item[5] || {}}])));
const drugIndex = Object.fromEntries(streetDrugs.map(d=>[d[0], {fx:d[6]}]));
const implantFx = imp => (imp.kind === 'drug' ? drugIndex[imp.name] : cyberIndex[imp.name])?.fx || {};
// СТАТ с учётом имплантов: прибавки (с пределом), экзоскелет поднимает до значения.
function stat(e, i){
  let value = num(e.stats[i]);
  (e.implants || []).map(implantFx).forEach(fx=>{
    if(fx.stat?.[0] === i) value = fx.stat[2] ? Math.min(fx.stat[2], value + fx.stat[1]) : value + fx.stat[1];
  });
  (e.implants || []).map(implantFx).forEach(fx=>{
    if(fx.statMin?.[0] === i) value = Math.min(fx.statMin[2], Math.max(value, fx.statMin[1]));
  });
  return value;
}
const initBonus = e => (e.implants || []).map(implantFx).reduce((sum, fx)=>sum + num(fx.init), 0);
const ignoresWound = e => (e.implants || []).some(imp=>implantFx(imp).ignoreWound);
const formulaHp = e => 10 + 5*Math.ceil((stat(e, STAT_BODY) + stat(e, STAT_WILL))/2);
const maxHp = e => isBlank(e.hpMax) ? formulaHp(e) : num(e.hpMax);
const curHp = e => isBlank(e.hp) ? maxHp(e) : num(e.hp);
const woundThreshold = e => Math.ceil(maxHp(e)/2);
const hpPercent = e => Math.max(0, Math.min(100, maxHp(e) ? curHp(e) / maxHp(e) * 100 : 0));
function condition(e){
  if(e.dead) return {key:'dead', label:'МЁРТВ', penalty:0};
  if(curHp(e) <= 0) return {key:'mortal', label:'СМЕРТЕЛЬНО', penalty:4};
  if(curHp(e) < woundThreshold(e)) return {key:'serious', label:'ТЯЖЕЛО РАНЕН', penalty:2};
  return {key:'ok', label:'В СТРОЮ', penalty:0};
}
const enemyName = (e, i = state.enemies.indexOf(e)) => e.name.trim() || `Противник ${i + 1}`;
const enemyById = id => state.enemies.find(e=>e.id === id);

// --- Критические травмы противника ---
// Травмы хранятся строками в e.injuries; правило находится по названию из книги или прежнему названию листа.
const zoneLabels = {Body:'тело', Head:'голова'};
function parseInjury(line){
  const p = plain(line);
  const zones = /\(голов/.test(p) ? ['Head', 'Body'] : ['Body', 'Head'];
  for(const zone of zones){
    const k = criticalInjuries[zone].findIndex((name, idx)=>p.startsWith(plain(name)) || p.startsWith(plain(injuryRules[zone][idx].old)));
    if(k >= 0) return {line, zone, k, name:criticalInjuries[zone][k], rule:injuryRules[zone][k]};
  }
  return {line};
}
const enemyInjuries = e => e.injuries.split('\n').map(line=>line.trim()).filter(Boolean).map(parseInjury);
const hasInjury = (e, zone, k) => enemyInjuries(e).some(inj=>inj.zone === zone && inj.k === k);
// Сумма эффектов всех травм: штрафы складываются, «не может уклоняться» и множитель головы — по худшей.
function injuryMods(e){
  const total = {all:0, ranged:0, melee:0, move:0, death:0, noDodge:false, headMult:2};
  enemyInjuries(e).forEach(({rule})=>{
    if(!rule) return;
    const m = rule.mods;
    ['all','ranged','melee','move','death'].forEach(k=>{ total[k] += num(m[k]); });
    if(m.noDodge) total.noDodge = true;
    if(m.headMult) total.headMult = Math.max(total.headMult, m.headMult);
  });
  return total;
}
function addInjury(e, zone, k, rolled){
  const injury = `${criticalInjuries[zone][k]} (${zoneLabels[zone]}${rolled ? `, 2d6 = ${rolled}` : ''})`;
  e.injuries = [e.injuries.trim(), injury].filter(Boolean).join('\n');
  return injury;
}
// Бросок 2d6 по таблице повторяется, пока не выпадет травма, которой у цели ещё нет (стр. 187).
function rollInjury(e, zone){
  for(let tries = 0; tries < 50; tries++){
    const r = d(6) + d(6);
    if(!hasInjury(e, zone, r - 2)) return addInjury(e, zone, r - 2, r);
  }
  return 'все травмы этой зоны уже есть';
}
// Штраф к броску противника: ранение, травмы, захват; kind — 'ranged' или 'melee' для травм глаз и мышц.
function checkPenalty(e, kind = ''){
  const m = injuryMods(e);
  const wound = condition(e).key === 'serious' && ignoresWound(e) ? 0 : condition(e).penalty;
  const parts = [[wound, 'ранение'], [m.all, 'травмы'], [e.status.grappled ? 2 : 0, 'захват'],
    [kind === 'ranged' ? m.ranged : kind === 'melee' ? m.melee : 0, kind === 'ranged' ? 'травма глаза' : 'разрыв мышцы']].filter(([v])=>v > 0);
  return {total:parts.reduce((sum, [v])=>sum + v, 0), note:parts.map(([v, label])=>`${label} −${v}`).join(', ')};
}
// Скорость: смертельное ранение −6, травмы ног и лёгких — свои штрафы, минимум 1 (стр. 186–187); лёжа и без сознания — 0.
function moveStat(e){
  const base = stat(e, STAT_MOVE);
  if(e.status.prone || e.status.unconscious) return 0;
  const penalty = (condition(e).key === 'mortal' ? 6 : 0) + injuryMods(e).move;
  return penalty ? Math.max(Math.min(1, base), base - penalty) : base;
}
const moveMeters = e => moveStat(e) * 2;
const deathBase = e => e.deathPenalty + injuryMods(e).death;

// --- Оружие и DV ---
// Экзотическое оружие и гранаты (dm-data.js) выбираются наравне с оружием из книги.
const allWeapons = {...weaponTypes, ...Object.fromEntries(Object.entries(exoticWeapons).map(([id, w])=>[id, w.slice(0, 6)]))};
const weaponType = w => allWeapons[w[6]];
const weaponProps = w => exoticWeapons[w[6]]?.[8] || {};
const autofireMult = w => num(weaponType(w)?.[5]);
const isMelee = w => /Оружие ближнего боя|Рукопашный/.test(weaponType(w)?.[1] || '');
const canShell = w => w[6] === 'shotgun' || w[6] === 'hurricane';
const SHELL_DV = 13; // дробь и огнемёт: атака против СЛ 13 (стр. 174)
// DV атаки: ручное значение карточки или таблица по дистанции; null — DV неизвестен, NaN — вне дальности.
function attackDv(e, w, auto){
  if(!isBlank(e.dv)) return num(e.dv);
  const table = weaponDvTable[w[6]] || exoticWeapons[w[6]]?.[6];
  if(table === 'shell') return SHELL_DV;
  if(isBlank(e.range) || isMelee(w) || !table) return null;
  const value = auto ? autofireDv[table]?.[num(e.range)] : rangeDv[table]?.[1][num(e.range)];
  return value ?? NaN;
}
function spendAmmo(w, need){
  if(isBlank(w[4])) return true;
  if(num(w[4]) < need){ toast(`${w[0] || 'Оружие'}: патронов ${num(w[4])}, нужно ${need}`); return false; }
  w[4] = String(num(w[4]) - need);
  return true;
}

// --- Кубики ---
function parseDice(value){
  const match = String(value).trim().match(/^(\d*)\s*[dдк]\s*(\d+)(?:\s*([+\-−])\s*(\d+))?$/i);
  if(!match) return null;
  const count = Number(match[1] || 1), sides = Number(match[2]);
  if(count < 1 || count > 100 || sides < 1 || sides > 1000) return null;
  return {count, sides, bonus: match[3] ? (match[3] === '+' ? 1 : -1) * Number(match[4]) : 0};
}
const isCritDamage = entry => entry.sides === 6 && entry.dice.filter(v=>v === 6).length >= 2;
// Правило RED: на одиночном 1d10 десятка — ещё 1d10 сверху, единица — 1d10 вычитается.
// judge(entry) — пояснение к результату; multiply — урон очереди (сумма × множитель).
// noCrit — урон оружия, которое не вызывает критических травм (огнемёт, несмертельное).
function roll(formula, modifier, label, {crits = false, note = '', judge, multiply, noCrit = false} = {}){
  const dice = Array.from({length:formula.count},()=>d(formula.sides));
  const sum = dice.reduce((a,b)=>a+b,0);
  const critical = crits && formula.count === 1 && formula.sides === 10 && (sum === 10 || sum === 1);
  const critExtra = critical ? (sum === 10 ? d(10) : -d(10)) : 0;
  const entry = {label, dice, sides:formula.sides, mod:formula.bonus + modifier, total:sum + formula.bonus + modifier + critExtra, critExtra, time:now()};
  if(multiply) entry.total *= multiply;
  entry.mult = multiply || 0;
  entry.note = [critical && (critExtra > 0 ? 'КРИТИЧЕСКИЙ УСПЕХ' : 'КРИТИЧЕСКИЙ ПРОВАЛ'),
    !noCrit && isCritDamage(entry) && `КРИТИЧЕСКАЯ ТРАВМА у цели: +${CRITICAL_BONUS_DAMAGE} урона`, note, judge?.(entry)].filter(Boolean).join('. ');
  addLog(entry);
  showRoll(entry);
  return entry;
}
function showRoll(entry){
  const dice = entry.dice.map((v,i)=>`<span class="formula-die${entry.critExtra && i === 0 ? ' is-crit-source' : ''}">${v}<small>D${entry.sides}</small></span>`).join('');
  const crit = entry.critExtra ? `<span class="formula-die is-crit">${entry.critExtra > 0 ? '+' : '−'}${Math.abs(entry.critExtra)}<small>КРИТ</small></span>` : '';
  $('#diceResult').innerHTML = `<div class="formula-roll-values">${dice}${crit}</div><strong class="formula-roll-total">${esc(entry.label)}: ${entry.total}</strong>${entry.note ? `<div class="roll-note"><span>${esc(entry.note)}</span></div>` : ''}`;
  $('#diceDrawer').classList.add('open');
}
const logLine = item => item.kind === 'text'
  ? `<b class="log-tag">${esc(item.tag || 'УРОН')}</b> ${esc(item.text)}`
  : `${esc(item.label)}: <b>${item.dice.join(' + ')}</b>${item.critExtra ? ` ${item.critExtra > 0 ? '+' : '−'} крит ${Math.abs(item.critExtra)}` : ''}${item.mod ? ` ${signed(item.mod)}` : ''}${item.mult ? ` × ${item.mult}` : ''} = <strong>${item.total}</strong>${item.note ? ` <em>${esc(item.note)}</em>` : ''}`;
function addLog(entry){
  state.log = [{...entry, time:entry.time || now()}, ...state.log].slice(0, LOG_LIMIT);
  renderLog();
  save();
}
function renderLog(){
  const html = state.log.map(item=>`<div><small>${esc(item.time)}</small> ${logLine(item)}</div>`).join('');
  $('#dashboardLog').innerHTML = html || 'Пока нет бросков.';
  $('#diceLog').innerHTML = html;
}

// Бросок от лица противника: 1d10 + база, со штрафами ранения, травм и захвата.
// kind — 'ranged' или 'melee': тогда учитываются и травмы глаз или мышц.
function enemyCheck(e, base, label, options = {}, kind = ''){
  const p = checkPenalty(e, kind);
  const note = [p.note, e.status.unconscious && 'БЕЗ СОЗНАНИЯ — не может действовать', options.note].filter(Boolean).join('; ');
  return roll({count:1, sides:10, bonus:0}, num(base) - p.total, `${enemyName(e)}: ${label}`, {crits:true, ...options, note});
}
const dodgeHint = 'если цель уклоняется (РЕФ 8+) — сравните с её ЛВК + Уклонение + 1d10';
// Атака: сравнение с DV по дистанции; при попадании урон бросается сразу. Высокое качество — +1 (стр. 342).
function weaponAttack(e, j){
  const w = e.weapons[j];
  const name = w[0] || 'оружие';
  const props = weaponProps(w);
  if(!isMelee(w) && !spendAmmo(w, 1)) return;
  const dv = attackDv(e, w, false);
  const base = num(w[1]) + (props.quality ? 1 : 0);
  const attack = enemyCheck(e, base, `${name}, атака`, {note: props.quality ? 'высокое качество +1' : '', judge: entry => isMelee(w) ? 'ближний бой: цель защищается ЛВК + Уклонение + 1d10'
    : dv === null ? `DV: выберите дистанцию; ${dodgeHint}` : Number.isNaN(dv) ? 'ВНЕ ДАЛЬНОСТИ'
    : `${entry.total > dv ? 'ПОПАЛ' : 'ПРОМАХ'} (DV ${dv}); ${dodgeHint}`}, isMelee(w) ? 'melee' : 'ranged');
  if(dv !== null && !Number.isNaN(dv) && attack.total > dv) weaponDamage(e, j, `попадание ${attack.total} > DV ${dv}`);
}
// Свойства оружия, которые важны цели: несмертельное, игнор брони ниже 11, урон по площади.
const damageNotes = w => { const p = weaponProps(w); return [p.area && 'урон всем в зоне, один бросок', p.ap11 && 'броня ниже 11 SP не защищает', p.nonLethal && 'несмертельное: цель останется с 1 ПЗ без сознания'].filter(Boolean).join('; '); };
function weaponDamage(e, j, note = ''){
  const w = e.weapons[j];
  const props = weaponProps(w);
  if(props.effect){ addLog({kind:'text', tag:'ЭФФЕКТ', text:`${enemyName(e)}: ${w[0] || 'оружие'} — ${props.effect}${note ? ` (${note})` : ''}`}); return; }
  const f = parseDice(w[2]);
  if(!f){ toast('Укажите урон в виде 3d6 или 2d6+2'); return; }
  roll(f, 0, `${enemyName(e)}: ${w[0] || 'оружие'}, урон`, {note:[note, damageNotes(w)].filter(Boolean).join('; '), noCrit:props.noCrit || props.nonLethal});
}
// Выстрел дробью (стр. 174): против СЛ 13, при успехе 3d6 всем в 6 м перед стрелком; без прицельных выстрелов.
function weaponShell(e, j){
  const w = e.weapons[j];
  if(!spendAmmo(w, 1)) return;
  const attack = enemyCheck(e, w[1], `${w[0] || 'дробовик'}, дробь`, {judge: entry => `${entry.total > SHELL_DV ? 'ПОПАЛ' : 'ПРОМАХ'} (СЛ ${SHELL_DV}); цели с РЕФ 8+ могут уклониться`}, 'ranged');
  if(attack.total > SHELL_DV) roll(parseDice(SHOTGUN_SHELL_DAMAGE), 0, `${enemyName(e)}: дробь, урон`, {note:'всем, кого видит в 6 м перед собой; один бросок на всех'});
}
// Очередь (стр. 173): 10 патронов (Helix — 20), 1d10 + РЕФ + Автоогонь против DV автоогня;
// урон 2d6 × (на сколько превышен DV), не больше множителя оружия.
function weaponAutofire(e, j){
  const w = e.weapons[j];
  const mult = autofireMult(w);
  if(!mult){ toast('У этого оружия нет автоогня'); return; }
  if(!spendAmmo(w, weaponProps(w).autofireCost || AUTOFIRE_AMMO_COST)) return;
  const base = isBlank(w[7]) ? w[1] : w[7];
  const dv = attackDv(e, w, true);
  const attack = enemyCheck(e, base, `${w[0] || 'оружие'}, очередь`, {note: isBlank(w[7]) ? 'база автоогня не задана — взята атака' : '',
    judge: entry => dv === null ? `DV автоогня: выберите дистанцию; урон 2d6 × превышение (макс. ×${mult})` : Number.isNaN(dv) ? 'ВНЕ ДАЛЬНОСТИ АВТООГНЯ'
      : entry.total > dv ? `ПОПАЛ (DV ${dv})` : `ПРОМАХ (DV ${dv})`}, 'ranged');
  if(dv === null || Number.isNaN(dv) || attack.total <= dv) return;
  const multiplier = Math.min(mult, attack.total - dv);
  roll({count:2, sides:6, bonus:0}, 0, `${enemyName(e)}: ${w[0] || 'оружие'}, урон очереди`, {multiply:multiplier, note:`превышение ${attack.total - dv}, множитель ×${multiplier} (макс. ×${mult})`});
}
// Подавляющий огонь (стр. 173): 10 патронов; все в зоне без укрытия бросают ВОЛ + Концентрация + 1d10 против этого броска.
function weaponSuppress(e, j){
  const w = e.weapons[j];
  if(!autofireMult(w)){ toast('Подавляющий огонь — только из оружия с автоогнём'); return; }
  if(!spendAmmo(w, AUTOFIRE_AMMO_COST)) return;
  enemyCheck(e, isBlank(w[7]) ? w[1] : w[7], `${w[0] || 'оружие'}, подавляющий огонь`, {judge: entry => `цели в 25 м без укрытия: ВОЛ + Концентрация + 1d10 против ${entry.total}, иначе тратят перемещение на укрытие`}, 'ranged');
}

// --- Урон ---
// Зоны попадания: тело, голова, и прицельные выстрелы −8 (стр. 170) в ногу и в предмет в руке — урон идёт в тело.
const hitZones = [['Body','Тело'], ['Head','Голова ×2'], ['Leg','Нога (прицельно)'], ['Hand','Предмет в руке (прицельно)']];
// Вид урона: как броня его останавливает.
const damageKinds = [['','обычный'], ['melee','ближний: SP/2'], ['ap11','броня < 11 не держит'], ['ignore','мимо брони'], ['nonlethal','несмертельный']];
const LEG_BREAK = 6, LEG_LOST = 10; // индексы «Перелом ноги» и «Оторванная нога» в таблице тела
// Урон по одному противнику, возвращает строку для журнала. attack — урон от атаки (у смертельно раненого — новая травма).
function damageEnemy(e, damage, zone, kind, crit, attack = true){
  const head = zone === 'Head';
  const spKey = head ? 'headSp' : 'bodySp';
  const sp = num(e[spKey]);
  const effectiveSp = kind === 'melee' ? Math.ceil(sp/2) : kind === 'ignore' || (kind === 'ap11' && sp < 11) ? 0 : sp;
  const mult = head ? injuryMods(e).headMult : 1;
  let through = Math.max(0, damage - effectiveSp) * mult;
  const wasMortal = condition(e).key === 'mortal';
  const parts = [];
  // Несмертельное и «мимо брони» броню не портят (стр. 186, 349).
  if(through > 0 && sp > 0 && kind !== 'ignore' && kind !== 'nonlethal'){ e[spKey] = String(sp - 1); parts.push(`SP ${sp} → ${sp - 1}`); }
  if(through > 0 && zone === 'Hand') parts.push('роняет предмет из рук');
  const injuries = [];
  if(kind !== 'nonlethal'){
    // Прицельно в ногу: «Перелом ноги», если у цели ещё есть целая нога.
    const legsGone = enemyInjuries(e).filter(inj=>inj.zone === 'Body' && (inj.k === LEG_BREAK || inj.k === LEG_LOST)).length;
    if(through > 0 && zone === 'Leg' && legsGone < 2) injuries.push(addInjury(e, 'Body', LEG_BREAK));
    if(crit) injuries.push(rollInjury(e, head ? 'Head' : 'Body'));
    // Смертельно раненый от каждой атаки получает новую травму, штраф испытания смерти +1 (стр. 188).
    if(wasMortal && attack && through > 0 && kind !== 'ignore'){
      injuries.push(rollInjury(e, head ? 'Head' : 'Body'));
      e.deathPenalty += 1;
      parts.push('штраф испытания смерти +1');
    }
  }
  if(injuries.length){ through += CRITICAL_BONUS_DAMAGE * injuries.length; parts.push(`крит. травма: ${injuries.join(', ')} (+${CRITICAL_BONUS_DAMAGE * injuries.length})`); }
  const before = curHp(e);
  let after = Math.max(0, before - through);
  if(kind === 'nonlethal' && after < 1 && through > 0){ after = Math.min(before, 1); e.status.unconscious = true; parts.push('без сознания'); }
  e.hp = String(after);
  const c = condition(e);
  const where = {Head:'голову', Leg:'ногу', Hand:'руку'}[zone] || 'тело';
  if(through <= 0) return `${enemyName(e)}: ${damage} в ${where} остановлено бронёй (SP ${effectiveSp}).`;
  return [`${enemyName(e)}: ${damage} в ${where} (SP ${effectiveSp}${mult > 2 ? `, голова ×${mult}` : ''}) → −${kind === 'nonlethal' ? before - after : through} ХИТ, ${before} → ${e.hp}/${maxHp(e)}`, ...parts, c.key === 'ok' ? '' : c.label].filter(Boolean).join('. ');
}
// Урон мимо брони без атаки: огонь, удушье (стр. 180).
function directDamage(e, amount, why){
  const before = curHp(e);
  e.hp = String(Math.max(0, before - amount));
  addLog({kind:'text', tag:'СОСТОЯНИЕ', text:`${enemyName(e)}: ${why} — −${amount} ХИТ, ${before} → ${e.hp}/${maxHp(e)}${condition(e).key === 'ok' ? '' : `. ${condition(e).label}`}`});
}
function applyHit(e, card){
  const damage = Math.max(0, Math.floor(num(card.querySelector('[data-hit="damage"]').value)));
  const zone = card.querySelector('[data-hit="zone"]').value;
  const kind = card.querySelector('[data-hit="kind"]')?.value || '';
  const crit = card.querySelector('[data-hit="crit"]')?.checked;
  if(!damage && !crit) return;
  addLog({kind:'text', tag:'УРОН', text:damageEnemy(e, damage, zone, kind, crit)});
  renderCombat();
}
// Групповое попадание: граната, взрыв, дробь. Формула бросается один раз на всех.
function groupHit(){
  const targets = state.enemies.filter(e=>e.selected && !e.dead);
  if(!targets.length){ toast('Отметьте противников галочкой в заголовке карточки'); return; }
  const value = $('#groupDamage').value.trim();
  const formula = parseDice(value);
  let damage = Math.floor(num(value));
  if(formula) damage = roll(formula, 0, `Групповой урон (${targets.length} целей)`).total;
  if(damage <= 0){ toast('Урон: число или формула, например 6d6'); return; }
  const zone = $('#groupZone').value, kind = $('#groupKind').value;
  targets.forEach(e=>addLog({kind:'text', tag:'ГРУППА', text:damageEnemy(e, damage, zone, kind, false)}));
  renderCombat();
}
// Испытание против смерти (стр. 188): 1d10 + штраф должен быть меньше ТЕЛ; выпавшая 10 — всегда провал.
// Каждое следующее — штраф +1; травмы добавляют к штрафу свои +1.
function deathSave(e){
  const r = d(10);
  const penalty = deathBase(e);
  const total = r + penalty;
  const ok = r !== 10 && total < stat(e, STAT_BODY);
  addLog({kind:'text', tag:'СМЕРТЬ', text:`${enemyName(e)}: испытание 1d10 = ${r}${penalty ? ` + ${penalty}` : ''} против ТЕЛ ${stat(e, STAT_BODY)} — ${ok ? 'выжил' : r === 10 ? 'выпала 10: УМЕР' : 'УМЕР'}`});
  if(ok) e.deathPenalty += 1; else e.dead = true;
  renderCombat();
}
// Состояния в начале и в конце хода противника (стр. 180).
function startTurnEffects(e){
  if(e.dead) return;
  if(e.status.drown || e.status.vacuum) directDamage(e, stat(e, STAT_BODY), e.status.vacuum ? 'удушье в вакууме' : 'тонет / задыхается');
  if(condition(e).key === 'mortal') addLog({kind:'text', tag:'СМЕРТЬ', text:`${enemyName(e)}: начало хода — испытание смерти (ТЕЛ ${stat(e, STAT_BODY)}, штраф +${deathBase(e)})`});
}
function endTurnEffects(e){
  if(e.dead) return;
  if(e.status.fire) directDamage(e, e.status.fire, `горит (${e.status.fire})`);
  if(e.status.shock){
    const r = roll({count:6, sides:6, bonus:0}, 0, `${enemyName(e)}: удар током`, {noCrit:true});
    addLog({kind:'text', tag:'СОСТОЯНИЕ', text:damageEnemy(e, r.total, 'Body', '', false, false)});
  }
  if(e.status.vacuum){
    const loss = d(6);
    [0, STAT_REF, STAT_DEX].forEach(s=>{ e.stats[s] = String(Math.max(0, stat(e, s) - loss)); });
    e.status.vacuumLoss += loss;
    const dead = stat(e, 0) <= 0;
    if(dead) e.dead = true;
    addLog({kind:'text', tag:'СОСТОЯНИЕ', text:`${enemyName(e)}: вакуум — ИНТ, РЕФ и ЛВК −${loss} (1d6)${dead ? '. ИНТ 0: УМЕР' : ''}`});
  }
}
// Снятый вакуум возвращает отнятые ИНТ, РЕФ и ЛВК: персонаж глотнул воздуха.
function setStatus(e, key, value){
  if(key === 'vacuum' && !value && e.status.vacuumLoss){
    [0, STAT_REF, STAT_DEX].forEach(s=>{ e.stats[s] = String(stat(e, s) + e.status.vacuumLoss); });
    addLog({kind:'text', tag:'СОСТОЯНИЕ', text:`${enemyName(e)}: глотнул воздуха — ИНТ, РЕФ и ЛВК +${e.status.vacuumLoss}`});
    e.status.vacuumLoss = 0;
  }
  e.status[key] = value;
}
// Сломанные рёбра и инородное тело: 5 урона в конце хода, если прошёл пешком больше 4 м (стр. 187).
const movingInjuries = e => enemyInjuries(e).filter(inj=>/В конце каждого хода, в котором прошёл/.test(inj.rule?.effect || ''));
function movedFar(e){
  const list = movingInjuries(e);
  if(!list.length) return;
  directDamage(e, CRITICAL_BONUS_DAMAGE * list.length, `прошёл больше 4 м с травмой (${list.map(inj=>inj.name).join(', ')})`);
}

// --- Отрисовка противников ---
const input = (i, path, value, attrs = '') => `<input data-e="${i}" data-f="${path}" value="${esc(value)}" ${attrs}>`;
const area = (i, path, value, placeholder, rowsCount = 2) => `<textarea data-e="${i}" data-f="${path}" rows="${rowsCount}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
const options = (list, value) => list.map(([id,label])=>`<option value="${esc(id)}"${String(id) === String(value) ? ' selected' : ''}>${esc(label)}</option>`).join('');
const weaponGroups = [['Оружие из книги', weaponTypes], ['Экзотическое и гранаты', exoticWeapons]];
const weaponTypeOptions = value => `${options([['','— свой —']], value)}${weaponGroups.map(([title, list])=>`<optgroup label="${title}">${options(Object.entries(list).map(([id,w])=>[id, w[0]]), value)}</optgroup>`).join('')}`;
const presetWeaponOptions = () => `<option value="">+ оружие из книги…</option>${weaponGroups.map(([title, list])=>`<optgroup label="${title}">${Object.entries(list).map(([id,w])=>`<option value="${id}">${esc(w[0])}${w[2] ? ` (${esc(w[2])})` : ''}</option>`).join('')}</optgroup>`).join('')}`;
const armorOptions = value => options([['','— броня —'], ...Object.entries(armorPresets).map(([id,a])=>[id, `${a[0]} (SP ${a[1]})`])], value);
const rangeSelect = (i, e) => `<select data-e="${i}" data-f="range" aria-label="Дистанция до цели" title="Дистанция до цели: по ней берётся DV">${options([['','дистанция…'], ...rangeBands.map((b,k)=>[k, b])], e.range)}</select>`;
const hitControls = (i, c, full) => `
  <input type="number" min="0" data-hit="damage" placeholder="урон" aria-label="Урон">
  <select data-hit="zone" aria-label="Зона" title="Нога: при пробитии брони — «Перелом ноги». Предмет в руке: цель роняет его. Прицельный выстрел стрелок делает с −8">${options(full ? hitZones : hitZones.slice(0, 2), 'Body')}</select>
  ${full ? `<select data-hit="kind" aria-label="Вид урона" title="Ближний: SP/2. Броня ниже 11 не держит: Mono-Three, рельсотрон. Мимо брони: яд, огонь, удушение. Несмертельный: тазер, дубинка-шокер">${options(damageKinds, '')}</select>
  <label title="Две шестёрки на кубиках урона: травма 2d6 и +5 урона"><input type="checkbox" data-hit="crit"> крит</label>` : ''}
  <button type="button" class="quick-roll" data-act="hit" data-i="${i}">ПОПАДАНИЕ</button>
  ${full ? `<button type="button" class="weapon-btn" data-act="heal" data-i="${i}" title="Вылечить на число из поля «урон» (пусто — полностью)">ЛЕЧИТЬ</button>` : ''}
  <button type="button" class="weapon-btn death-btn" data-act="deathSave" data-i="${i}"${c.key === 'mortal' ? '' : ' hidden'}>ИСПЫТАНИЕ СМЕРТИ</button>`;
function weaponButtons(i, j, w){
  const props = weaponProps(w);
  const note = props.note || props.effect;
  return (props.autoOnly ? '' : `<button type="button" class="weapon-btn" data-act="attack" data-i="${i}" data-j="${j}" title="1d10 + атака против DV; при попадании урон бросается сам${note ? `. ${esc(note)}` : ''}">АТАКА</button>`)
    + (canShell(w) ? `<button type="button" class="weapon-btn" data-act="shell" data-i="${i}" data-j="${j}" title="Выстрел дробью: против СЛ 13, 3d6 всем в 6 м перед стрелком">ДРОБЬ</button>` : '')
    + (autofireMult(w) ? `<button type="button" class="weapon-btn" data-act="autofire" data-i="${i}" data-j="${j}" title="Очередь: ${props.autofireCost || AUTOFIRE_AMMO_COST} патронов, DV автоогня, урон 2d6 × превышение (макс. ×${autofireMult(w)})">ОЧЕРЕДЬ</button><button type="button" class="weapon-btn" data-act="suppress" data-i="${i}" data-j="${j}" title="Подавляющий огонь: 10 патронов">ПОДАВЛ.</button>` : '')
    + `<button type="button" class="weapon-btn" data-act="damage" data-i="${i}" data-j="${j}"${props.effect ? ` title="${esc(props.effect)}"` : ''}>${props.effect ? 'ЭФФЕКТ' : 'УРОН'}</button>`;
}
// Травмы — чипы с эффектом из книги; штрафы, которые лист применяет сам, — строкой ниже.
function injuryBlock(i, e){
  const list = enemyInjuries(e);
  const m = injuryMods(e);
  const effects = [m.all && `все броски −${m.all}`, m.ranged && `дальние атаки −${m.ranged}`, m.melee && `ближние атаки −${m.melee}`, m.move && `СКО −${m.move}`,
    m.death && `испытание смерти +${m.death}`, m.noDodge && 'не может уклоняться', m.headMult > 2 && `голова ×${m.headMult}`].filter(Boolean);
  const chips = list.map((inj, k)=>`<span class="injury-chip${inj.rule ? '' : ' is-custom'}" title="${esc(inj.rule ? `${inj.rule.effect} Первая помощь: ${inj.rule.aid}. Лечение: ${inj.rule.treat}.` : 'Своя запись')}">${esc(inj.line)}<button type="button" data-act="delInjury" data-i="${i}" data-j="${k}" aria-label="Вылечить">×</button></span>`).join('');
  const add = `<select data-act="addInjury" data-i="${i}" aria-label="Добавить травму"><option value="">+ травма…</option>${Object.entries(criticalInjuries).map(([zone, names])=>`<optgroup label="${zone === 'Head' ? 'Голова' : 'Тело'}">${names.map((name, k)=>`<option value="${zone}:${k}">${k + 2}. ${esc(name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const moving = movingInjuries(e).length ? `<button type="button" class="weapon-btn" data-act="movedFar" data-i="${i}" title="Рёбра или инородное тело: 5 урона за каждую такую травму">ПРОШЁЛ > 4 М</button>` : '';
  return `<div class="enemy-injuries"><span class="injury-title">ТРАВМЫ</span>${chips || '<span class="muted">нет</span>'}${add}${moving}</div>${effects.length ? `<p class="injury-effects">Учтено в бросках: ${effects.join(' · ')}</p>` : ''}`;
}
const statusBlock = (i, e) => `<div class="enemy-status"><span class="injury-title">СОСТОЯНИЕ</span>${statusFlags.map(([k, label, hint])=>`<button type="button" class="status-chip${e.status[k] ? ' active' : ''}" data-act="status" data-i="${i}" data-j="${k}" aria-pressed="${e.status[k]}" title="${esc(hint)}">${label}</button>`).join('')}<select data-act="fire" data-i="${i}" aria-label="Горит" title="Урон огнём в конце хода противника, мимо брони">${options(fireLevels, e.status.fire)}</select></div>`;
const headTools = (i, e) => `<span class="enemy-tools">
    <button type="button" data-act="init" data-i="${i}" title="${state.init.some(item=>item.enemyId === e.id) ? 'Уже в инициативе — перебросить' : 'В инициативу: 1d10 + РЕФ'}">⚑</button>
    <button type="button" data-act="loot" data-i="${i}" title="Обыскать: оружие, патроны, снаряжение, наличные">$</button>
    <button type="button" data-act="dup" data-i="${i}" title="Копия">⧉</button>
    <button type="button" data-act="template" data-i="${i}" title="Сохранить в бестиарий">★</button>
    <button type="button" data-act="dead" data-i="${i}" title="${e.dead ? 'Вернуть в бой' : 'Отметить мёртвым'}">☠</button>
    <button type="button" data-act="collapse" data-i="${i}" title="Свернуть / развернуть">${e.collapsed ? '▾' : '▴'}</button>
    <button type="button" data-act="remove" data-i="${i}" title="Удалить">×</button>
  </span>`;

function enemyCard(e, i){
  const c = condition(e);
  const weapons = e.weapons.map((w,j)=>`<tr>
      <td>${input(i, `weapons.${j}.0`, w[0], 'placeholder="Оружие"')}<select data-e="${i}" data-f="weapons.${j}.6" class="weapon-type" aria-label="Тип оружия: по нему берётся DV">${weaponTypeOptions(w[6])}</select></td>
      <td>${input(i, `weapons.${j}.1`, w[1], 'type="number" placeholder="база" title="Стат + навык оружия"')}${autofireMult(w) ? input(i, `weapons.${j}.7`, w[7], 'type="number" placeholder="авто" title="База автоогня: РЕФ + Автоматический огонь"') : ''}</td>
      <td>${input(i, `weapons.${j}.2`, w[2], 'placeholder="3d6"')}</td>
      <td>${input(i, `weapons.${j}.3`, w[3], 'type="number"')}</td>
      <td>${input(i, `weapons.${j}.4`, w[4], 'type="number" placeholder="—"')}<span class="slash">/</span>${input(i, `weapons.${j}.5`, w[5], 'type="number" placeholder="—"')}</td>
      <td class="row-btns">${weaponButtons(i, j, w)}<button type="button" class="weapon-btn" data-act="reload" data-i="${i}" data-j="${j}" title="Перезарядить">↻</button><button type="button" class="remove" data-act="delWeapon" data-i="${i}" data-j="${j}" title="Удалить">×</button></td>
    </tr>`).join('');
  const skills = e.skills.map((s,j)=>`<div class="enemy-skill">${input(i, `skills.${j}.0`, s[0], 'placeholder="Навык"')}${input(i, `skills.${j}.1`, s[1], 'type="number" placeholder="база" title="Стат + навык"')}<button type="button" class="weapon-btn" data-act="skill" data-i="${i}" data-j="${j}">1D10</button><button type="button" class="remove" data-act="delSkill" data-i="${i}" data-j="${j}">×</button></div>`).join('');
  return `<article class="enemy-card is-${c.key}${e.collapsed ? ' is-collapsed' : ''}" data-i="${i}">
    <header class="enemy-head">
      <input type="checkbox" class="enemy-select" data-e="${i}" data-f="selected"${e.selected ? ' checked' : ''} title="Отметить для группового попадания">
      <input class="enemy-name" data-e="${i}" data-f="name" value="${esc(e.name)}" placeholder="Противник ${i + 1}">
      <input class="enemy-kind" data-e="${i}" data-f="kind" value="${esc(e.kind)}" placeholder="тип / банда">
      <span class="badge" data-out="badge">${c.label}</span>
      ${headTools(i, e)}
    </header>
    <div class="hp-bar"><i data-out="hpbar" style="width:${hpPercent(e)}%"></i></div>
    <div class="enemy-body">
      <div class="enemy-stats">${stats.map((name,s)=>`<label>${name}${input(i, `stats.${s}`, e.stats[s], 'type="number" min="0" max="20"')}</label>`).join('')}</div>
      <div class="enemy-metrics">
        <div class="metric"><span>Хиты</span><strong>${input(i, 'hp', e.hp, `type="number" min="0" placeholder="${maxHp(e)}" aria-label="Текущие хиты"`)} / ${input(i, 'hpMax', e.hpMax, `type="number" min="0" placeholder="${formulaHp(e)}" aria-label="Максимум хитов" title="Пусто — по формуле"`)}</strong></div>
        <div class="metric"><span>Порог ранения</span><strong data-out="wound">${woundThreshold(e)}</strong></div>
        <div class="metric"><span>Испытание смерти</span><strong data-out="death"></strong></div>
        <div class="metric"><span>Скорость</span><strong data-out="move"></strong></div>
      </div>
      <div class="enemy-armor">
        <select data-act="armor" data-i="${i}" aria-label="Броня">${armorOptions(e.armor)}</select>
        <label>Голова SP${input(i, 'headSp', e.headSp, 'type="number" min="0"')}<span class="slash">/</span>${input(i, 'headSpMax', e.headSpMax, 'type="number" min="0"')}</label>
        <label>Тело SP${input(i, 'bodySp', e.bodySp, 'type="number" min="0"')}<span class="slash">/</span>${input(i, 'bodySpMax', e.bodySpMax, 'type="number" min="0"')}</label>
        <button type="button" class="weapon-btn" data-act="repair" data-i="${i}" title="Восстановить SP до максимума">ПОЧИНИТЬ</button>
      </div>
      <div class="enemy-hit">${hitControls(i, c, true)}</div>
      <div data-out="injuries">${injuryBlock(i, e)}</div>
      ${statusBlock(i, e)}
      ${typeof implantBlock === 'function' ? `<div data-out="implants">${implantBlock(i, e)}</div>` : ''}
      <div class="enemy-target">
        <span>ЦЕЛЬ</span>${rangeSelect(i, e)}
        <label title="DV вручную: укрытие, особые условия. Пусто — по таблице дистанции">DV${input(i, 'dv', e.dv, 'type="number" min="0" placeholder="авто"')}</label>
      </div>
      <div class="table-scroll">
        <table class="data-table enemy-weapons">
          <thead><tr><th>Оружие / тип</th><th>Атака</th><th>Урон</th><th>ROF</th><th>Патр./маг.</th><th></th></tr></thead>
          <tbody>${weapons || '<tr><td colspan="6" class="empty-cell">Нет оружия</td></tr>'}</tbody>
        </table>
      </div>
      <div class="enemy-row-add">
        <button type="button" class="add-row" data-act="addWeapon" data-i="${i}">+ ОРУЖИЕ</button>
        <select data-act="presetWeapon" data-i="${i}" aria-label="Оружие из книги">${presetWeaponOptions()}</select>
      </div>
      <div class="enemy-skills">${skills}</div>
      <div class="enemy-row-add">
        <button type="button" class="add-row" data-act="addSkill" data-i="${i}">+ НАВЫК</button>
        <button type="button" class="add-row" data-act="init" data-i="${i}" title="1d10 + РЕФ">ИНИЦИАТИВА</button>
        <button type="button" class="add-row" data-act="evade" data-i="${i}" title="1d10 + ЛВК + навык Уклонение, если он есть в списке">УКЛОНЕНИЕ</button>
      </div>
      <div class="enemy-texts">
        <label>Киберимпланты и снаряжение${area(i, 'gear', e.gear, 'Кибероружие, гранаты, наркотики...')}</label>
        <label>Заметки${area(i, 'notes', e.notes, 'Тактика, мотивация, что знает')}</label>
      </div>
    </div>
  </article>`;
}
// Компактная строка: всё для быстрого боя, полная карточка — по кнопке ▾.
function enemyRow(e, i){
  const c = condition(e);
  return `<article class="enemy-card enemy-row is-${c.key}" data-i="${i}">
    <input type="checkbox" class="enemy-select" data-e="${i}" data-f="selected"${e.selected ? ' checked' : ''} title="Отметить для группового попадания">
    <div class="row-name"><b>${esc(enemyName(e, i))}</b><span class="badge" data-out="badge">${c.label}</span></div>
    <div class="row-hp"><span class="hp-bar"><i data-out="hpbar" style="width:${hpPercent(e)}%"></i></span>${input(i, 'hp', e.hp, `type="number" min="0" placeholder="${maxHp(e)}" aria-label="Текущие хиты"`)}<small>/ ${maxHp(e)}</small></div>
    <div class="row-sp" title="SP головы / тела">SP ${input(i, 'headSp', e.headSp, 'type="number" min="0" aria-label="SP головы"')}<span class="slash">/</span>${input(i, 'bodySp', e.bodySp, 'type="number" min="0" aria-label="SP тела"')}</div>
    <div class="row-hit">${hitControls(i, c, false)}</div>
    <div class="row-weapons">${rangeSelect(i, e)}${e.weapons.map((w,j)=>`<span class="row-weapon" title="${esc(w[2])}${isBlank(w[4]) ? '' : `, патроны ${esc(w[4])}`}">${esc(w[0] || 'оружие')}${isBlank(w[4]) ? '' : ` <small>${esc(w[4])}</small>`} ${weaponButtons(i, j, w)}</span>`).join('')}</div>
    <span class="enemy-tools"><button type="button" data-act="expand" data-i="${i}" title="Открыть полную карточку">▾</button><button type="button" data-act="dead" data-i="${i}" title="${e.dead ? 'Вернуть в бой' : 'Отметить мёртвым'}">☠</button></span>
  </article>`;
}
function renderEnemies(){
  $('#enemyList').classList.toggle('is-compact', state.compact);
  $('#compactToggle').setAttribute('aria-pressed', String(state.compact));
  $('#compactToggle').classList.toggle('active', state.compact);
  $('#enemyList').innerHTML = state.enemies.map(state.compact ? enemyRow : enemyCard).join('') || '<div class="empty-search">Пока нет противников. Нажмите «+ ПРОТИВНИК» или выставьте шаблон из бестиария.</div>';
  state.enemies.forEach((e,i)=>updateCard(i));
}
// Обновляет вычисляемые поля карточек, не трогая ввод. Карточка одного противника может быть
// и на вкладке «Противники», и в панели текущего хода.
function updateCard(i){
  const e = state.enemies[i];
  if(!e) return;
  const c = condition(e);
  $$(`.enemy-card[data-i="${i}"]`).forEach(card=>{
    card.classList.remove('is-ok','is-serious','is-mortal','is-dead');
    card.classList.add(`is-${c.key}`);
    card.classList.toggle('is-collapsed', e.collapsed && !card.classList.contains('enemy-row'));
    const out = name => card.querySelector(`[data-out="${name}"]`);
    out('badge').textContent = c.label;
    out('hpbar').style.width = `${hpPercent(e)}%`;
    if(out('wound')) out('wound').textContent = woundThreshold(e);
    if(out('death')) out('death').textContent = `< ${stat(e, STAT_BODY)}${deathBase(e) ? ` (+${deathBase(e)})` : ''}`;
    if(out('move')) out('move').textContent = `${moveStat(e)} // ${moveMeters(e)} м`;
    card.classList.toggle('is-out', e.status.unconscious);
    card.querySelectorAll('[data-f="hp"]').forEach(el=>{ el.placeholder = maxHp(e); });
    card.querySelectorAll('[data-f="hpMax"]').forEach(el=>{ el.placeholder = formulaHp(e); });
    card.querySelector('[data-act="deathSave"]').hidden = c.key !== 'mortal';
  });
}
function updateSummary(){
  const alive = state.enemies.filter(e=>!e.dead);
  const wounded = alive.filter(e=>condition(e).key !== 'ok').length;
  $('#enemiesSummary').textContent = state.enemies.length ? `${alive.length} В БОЮ // ${wounded} РАНЕНО // ${state.enemies.length - alive.length} ПАЛО` : 'НЕТ ЦЕЛЕЙ';
  $('#combatStatus').textContent = state.init.length ? `РАУНД ${state.round}` : '';
  $('#sessionSummary').textContent = state.sessionTitle.trim() ? state.sessionTitle.trim().toUpperCase() : 'СИСТЕМА ГОТОВА';
  const selected = state.enemies.filter(e=>e.selected && !e.dead).length;
  $('#groupCount').textContent = selected ? `ОТМЕЧЕНО: ${selected}` : 'НИКТО НЕ ОТМЕЧЕН';
}
function renderOverview(){
  $('#battleOverview').innerHTML = state.enemies.map((e,i)=>{
    const c = condition(e);
    return `<button type="button" class="overview-row is-${c.key}" data-goto="${i}"><span>${esc(enemyName(e, i))}</span><span class="hp-bar"><i style="width:${hpPercent(e)}%"></i></span><b>${curHp(e)}/${maxHp(e)}</b><small>SP ${num(e.headSp)}/${num(e.bodySp)}</small></button>`;
  }).join('') || '<div class="dashboard-log">Противников нет.</div>';
  updateSummary();
}
// Всё, что зависит от хитов и брони противников.
function renderCombat(){
  renderEnemies();
  renderOverview();
  renderInit();
  save();
}

// --- Игроки и NPC ---
// Длинные поля (заметки) — многострочные и растут вместе с текстом.
const rowField = (type, i, j, value, label, note, placeholder = '') => note
  ? `<textarea class="grow-field" data-row="${type}" data-i="${i}" data-j="${j}" rows="1" aria-label="${esc(label)}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
  : `<input data-row="${type}" data-i="${i}" data-j="${j}" value="${esc(value)}" aria-label="${esc(label)}" placeholder="${esc(placeholder)}">`;
function renderPlayers(){
  $('#playersBody').innerHTML = state.players.map((row,i)=>`<tr>${playerColumns.map(({j,label,short,note})=>`<td${short ? ' class="short"' : ''}>${rowField('players', i, j, row[j], label, note)}</td>`).join('')}<td><button type="button" class="remove" data-del-row="players" data-i="${i}" title="Удалить">×</button></td></tr>`).join('')
    || `<tr><td colspan="${playerColumns.length + 1}" class="empty-cell">Пусто</td></tr>`;
  $$('#playersBody .grow-field').forEach(autoGrow);
}
// NPC — карточки: короткие поля сверху, заметки любой длины снизу; карточку можно свернуть.
function renderNpcs(){
  $('#npcList').innerHTML = state.npcs.map((row,i)=>{
    const collapsed = row[5] === 'true';
    const lines = row[4].trim() ? row[4].trim().split('\n').length : 0;
    return `<article class="npc-card${collapsed ? ' is-collapsed' : ''}" data-npc="${i}">
      <header class="npc-head">
        ${rowField('npcs', i, 0, row[0], 'Имя', false, 'Имя NPC')}
        <span class="npc-summary">${esc([row[1], row[2]].filter(s=>s.trim()).join(' · '))}${collapsed && lines ? ` · заметки: ${lines} стр.` : ''}</span>
        <span class="enemy-tools">
          <button type="button" class="${row[6] === 'true' ? 'is-pinned' : ''}" data-npc-pin="${i}" title="${row[6] === 'true' ? 'Закреплён: переживёт «Очистить». Нажмите, чтобы открепить' : 'Закрепить: NPC останется после «Очистить»'}">★</button>
          <button type="button" data-npc-toggle="${i}" title="${collapsed ? 'Развернуть' : 'Свернуть'}">${collapsed ? '▾' : '▴'}</button>
          <button type="button" data-npc-del="${i}" title="Удалить NPC">×</button>
        </span>
      </header>
      <div class="npc-body">
        <div class="npc-fields">${npcFields.slice(1).map(({j,label,placeholder})=>`<label>${esc(label)}${rowField('npcs', i, j, row[j], label, false, placeholder)}</label>`).join('')}</div>
        <label class="npc-notes">Заметки${rowField('npcs', i, 4, row[4], 'Заметки', true, 'Что знает, чего хочет, что обещали игроки, история встреч...')}</label>
      </div>
    </article>`;
  }).join('') || '<div class="empty-search">NPC пока нет.</div>';
  $$('#npcList .grow-field').forEach(autoGrow);
  filterNpcs();
}
// Поиск по всем полям NPC, без перерисовки — фокус в карточках не сбивается.
function filterNpcs(){
  const q = plain($('#npcSearch').value);
  let shown = 0;
  $$('#npcList .npc-card').forEach(card=>{
    const match = !q || plain(state.npcs[Number(card.dataset.npc)].slice(0, 5).join(' ')).includes(q);
    card.hidden = !match;
    if(match) shown++;
  });
  $('#npcCount').textContent = state.npcs.length ? (q ? `НАЙДЕНО ${shown} ИЗ ${state.npcs.length}` : `ВСЕГО ${state.npcs.length}`) : '';
}

// Импорт игроков из листа персонажа: те же поля, что в экспорте JSON основного листа.
function playerFromSheet(sheet, id = ''){
  const n = key => num(sheet[key]);
  const hpMax = 10 + 5*Math.ceil((n('stat8') + n('stat5'))/2);
  const hp = isBlank(sheet.currentHp) ? hpMax : n('currentHp');
  const role = roles[sheet.roleId]?.name || String(sheet.role || '');
  return {id, name:String(sheet.name || 'Без имени'), role:`${role}${role && sheet.roleRank ? ` ${sheet.roleRank}` : ''}`, ref:String(n('stat1')), hp:`${hp}/${hpMax}`,
    sp:`${n('armorHeadCurrent')}/${n('armorBodyCurrent')}`};
}
// Строка обновляется, если такой персонаж уже есть (по id листа или имени), иначе добавляется.
function upsertPlayer(p){
  let row = state.players.find(r=>(p.id && r[7] === p.id) || (r[1] && r[1] === p.name));
  if(!row){ row = Array(PLAYER_WIDTH).fill(''); state.players.push(row); }
  Object.assign(row, {1:p.name, 2:p.role, 3:p.hp, 4:p.sp, 6:p.ref});
  if(p.id) row[7] = p.id;
}
function importPlayersFromBrowser(){
  let index;
  try { index = JSON.parse(localStorage.getItem('cyberred-index') || 'null'); } catch { index = null; }
  const sheets = index?.sheets?.length ? index.sheets : [{id:'main'}];
  let count = 0;
  sheets.forEach(({id})=>{
    let data;
    try { data = JSON.parse(localStorage.getItem(id === 'main' ? 'cyberred-sheet' : `cyberred-sheet:${id}`) || 'null'); } catch { data = null; }
    if(!data || isBlank(data.name)) return;
    upsertPlayer(playerFromSheet(data, id));
    count++;
  });
  renderPlayers(); save();
  toast(count ? `Персонажей обновлено: ${count}` : 'В этом браузере нет листов персонажей. Используйте импорт JSON.');
}

// --- Инициатива ---
const effectText = ef => `${ef.text}${ef.rounds === '' ? '' : ` (${ef.rounds})`}`;
function initRow(item, i){
  const e = item.enemyId && enemyById(item.enemyId);
  const c = e ? condition(e) : null;
  return `<tr class="${i === state.turn ? 'is-turn' : ''}${c && c.key === 'dead' ? ' is-dead' : ''}">
    <td>${i === state.turn ? '▸' : ''}</td>
    <td><input data-init="${i}" data-k="name" value="${esc(e ? enemyName(e) : item.name)}"${e ? ' disabled title="Имя меняется в карточке противника"' : ''}></td>
    <td><input data-init="${i}" data-k="value" type="number" value="${esc(item.value)}"></td>
    <td>${e ? `${curHp(e)}/${maxHp(e)}` : '—'}</td>
    <td>${c ? `<span class="badge is-${c.key}">${c.label}</span>` : '<span class="muted">игрок / NPC</span>'}</td>
    <td class="effects-cell">${item.effects.map((ef,k)=>`<span class="effect-chip" title="${ef.rounds === '' ? 'Пока не снимут' : `Осталось раундов: ${ef.rounds}`}">${esc(effectText(ef))}<button type="button" data-effect-del="${i}" data-k="${k}" aria-label="Снять">×</button></span>`).join('')}<input class="effect-input" data-effect-add="${i}" placeholder="+ эффект 3" title="Текст и число раундов, например «горит 3». Без числа — пока не снимете. Enter — добавить"></td>
    <td><input data-init="${i}" data-k="note" value="${esc(item.note)}" placeholder="укрытие..."></td>
    <td><button type="button" class="remove" data-init-del="${i}" title="Убрать">×</button></td>
  </tr>`;
}
function renderInit(){
  $('#initBody').innerHTML = state.init.map(initRow).join('') || '<tr><td colspan="8" class="empty-cell">Очередь пуста. Добавьте игроков вручную или из таблицы игроков, а противников — кнопкой ⚑ или «ВСЕ В ИНИЦИАТИВУ».</td></tr>';
  $('#roundLabel').textContent = `РАУНД ${state.round}`;
  renderTurn();
  updateSummary();
}
// Панель текущего хода: для противника — его карточка, для игрока — эффекты и памятка.
function renderTurn(){
  const item = state.init[state.turn];
  const panel = $('#turnPanel');
  if(!item){ panel.innerHTML = ''; return; }
  const e = item.enemyId && enemyById(item.enemyId);
  const effects = item.effects.length ? `<p class="turn-effects">Эффекты: ${item.effects.map(ef=>esc(effectText(ef))).join(', ')}</p>` : '';
  const head = `<div class="section-title">СЕЙЧАС ХОДИТ // ${esc(e ? enemyName(e) : item.name || '—')} <span>РАУНД ${state.round}</span></div>`;
  const memo = '<p class="muted">За ход: одно перемещение (СКО × 2 м) и одно действие — атака, бег (ещё перемещение), уклонение, перезарядка, использование предмета.</p>';
  panel.innerHTML = e ? `<div class="turn-panel">${head}${effects}${memo}${enemyCard(e, state.enemies.indexOf(e))}</div>` : `<div class="panel turn-panel">${head}${effects}${memo}</div>`;
  if(e) updateCard(state.enemies.indexOf(e));
}
const sortInit = () => {
  const current = state.init[state.turn];
  state.init.sort((a,b)=>num(b.value) - num(a.value));
  state.turn = Math.max(0, state.init.indexOf(current));
};
function enemyInit(e){
  const r = roll({count:1, sides:10, bonus:0}, stat(e, STAT_REF) + initBonus(e), `${enemyName(e)}: инициатива`, {note: initBonus(e) ? `импланты +${initBonus(e)}` : ''});
  const existing = state.init.find(item=>item.enemyId === e.id);
  if(existing) existing.value = String(r.total);
  else state.init.push({id:uid(), name:'', value:String(r.total), enemyId:e.id, note:'', effects:[]});
}
// Новый раунд: у эффектов с таймером убавляется по раунду, истёкшие снимаются с записью в журнал.
function tickEffects(){
  state.init.forEach(item=>{
    item.effects = item.effects.filter(ef=>{
      if(ef.rounds === '') return true;
      ef.rounds -= 1;
      if(ef.rounds > 0) return true;
      const who = item.enemyId && enemyById(item.enemyId);
      addLog({kind:'text', tag:'ЭФФЕКТ', text:`${who ? enemyName(who) : item.name}: «${ef.text}» закончился`});
      return false;
    });
  });
}
function addEffect(i, text){
  const match = text.trim().match(/^(.*?)\s*(\d+)$/);
  const label = (match ? match[1] : text).trim();
  if(!label) return;
  state.init[i].effects.push({text:label, rounds: match ? Math.max(1, Number(match[2])) : ''});
  renderInit(); save();
}

// --- Бестиарий и сцены ---
// Свежая копия для боя: полные хиты, броня и магазины.
function freshEnemy(t, name){
  const e = normalizeEnemy(clone(t));
  e.id = uid();
  e.name = name;
  e.hp = ''; e.dead = false; e.deathPenalty = 0; e.injuries = ''; e.collapsed = false; e.selected = false;
  if(!isBlank(e.headSpMax)) e.headSp = e.headSpMax;
  if(!isBlank(e.bodySpMax)) e.bodySp = e.bodySpMax;
  e.weapons.forEach(w=>{ if(!isBlank(w[5])) w[4] = w[5]; });
  return e;
}
function spawn(index, count){
  const t = state.templates[index];
  if(!t) return;
  const n = Math.max(1, Math.min(20, Math.floor(num(count)) || 1));
  const base = t.name || 'Противник';
  const existing = state.enemies.filter(e=>e.name.startsWith(base)).length;
  for(let k = 0; k < n; k++) state.enemies.push(freshEnemy(t, n > 1 || existing ? `${base} ${existing + k + 1}` : base));
  toast(`${base}: выставлено ${n}`);
}
function renderTemplates(){
  $('#spawnTemplate').innerHTML = state.templates.length
    ? state.templates.map((t,i)=>`<option value="${i}">${esc(t.name || 'Без имени')}</option>`).join('')
    : '<option value="">— пусто —</option>';
  $('#bestiarySummary').textContent = `ШАБЛОНОВ: ${state.templates.length} // СЦЕН: ${state.scenes.length}`;
  $('#templateList').innerHTML = state.templates.map((t,i)=>`<div class="panel template-card">
      <div class="section-title">${esc(t.name || 'Без имени')} <span>${esc(t.kind)}</span></div>
      <div class="template-stats">${stats.map((n,s)=>`<span><small>${n}</small>${esc(t.stats[s] || '—')}</span>`).join('')}</div>
      <p>Хиты ${maxHp(t)} · SP ${num(t.headSpMax || t.headSp)}/${num(t.bodySpMax || t.bodySp)}${t.weapons.length ? ` · ${t.weapons.map(w=>esc(w[0] || 'оружие')).join(', ')}` : ''}</p>
      <div class="enemy-row-add">
        <input type="number" min="0" max="20" value="1" data-tpl-count="${i}" aria-label="Количество">
        <button type="button" class="quick-roll" data-tpl-spawn="${i}">В БОЙ</button>
        <button type="button" class="remove" data-tpl-del="${i}" title="Удалить шаблон">УДАЛИТЬ</button>
      </div>
    </div>`).join('') || '<div class="empty-search">Бестиарий пуст.</div>';
  $('#sceneList').innerHTML = state.scenes.map((sc,i)=>`<div class="scene-row">
      <b>${esc(sc.name || 'Без имени')}</b>
      <span class="muted">${esc(sc.enemies.map(e=>enemyName(e)).join(', ') || 'пусто')}</span>
      <button type="button" class="quick-roll" data-scene-spawn="${i}">ВЫСТАВИТЬ</button>
      <button type="button" class="remove" data-scene-del="${i}" title="Удалить сцену">УДАЛИТЬ</button>
    </div>`).join('') || '<p class="muted">Сцен пока нет: соберите противников на поле и сохраните их здесь.</p>';
}

// --- Сеть ---
const plain = text => text.toLowerCase().replace(/ё/g, 'е').trim();
// ЛЁД ищется по русскому или английскому названию, по прежнему имени листа, затем по началу названия.
function findIce(name){
  const q = plain(name);
  if(iceAliases[q]) return blackIce[iceAliases[q]];
  const list = Object.values(blackIce);
  return list.find(ice=>ice[0].split(/[()]/).some(part=>part.trim() && plain(part) === q)) || list.find(ice=>plain(ice[0]).startsWith(q));
}
const iceKey = ice => Object.keys(blackIce).find(k=>blackIce[k] === ice);
const iceText = ice => `${ice[0]}: PER ${ice[2]} SPD ${ice[3]} ATK ${ice[4]} DEF ${ice[5]} — ${ice[7]}`;
const iceFloor = name => {
  const found = findIce(name);
  return found ? ['', '', 'Чёрный ЛЁД', '', iceText(found), String(found[6]), String(found[6]), ''] : ['', '', 'Чёрный ЛЁД', '', name, '', '', ''];
};
// Строка таблицы → этажи [этаж, ветка, что, СЛ, содержимое, REZ, REZ макс., пройден].
// На одном этаже может быть несколько ЛЬДОВ: «ЛЁД: Адская гончая x2», «ЛЁД: Ворон, Аспид» — каждый своей строкой.
// СЛ берётся из строки («Пароль СЛ8»), иначе — по сложности архитектуры.
function floorsFromLine(line, dv){
  const text = line.trim();
  const ice = text.match(/^(?:лёд|лед|ice)\s*:\s*(.+)$/i);
  if(ice) return ice[1].split(',').flatMap(part=>{
    const m = part.trim().match(/^(.*?)\s*[xх×]\s*(\d+)$/i);
    return Array.from({length: m ? Math.min(6, Number(m[2])) : 1}, ()=>iceFloor(m ? m[1] : part.trim()));
  });
  const ownDv = text.match(/СЛ\s*(\d+)/i);
  const rest = text.replace(/СЛ\s*\d+/i, '');
  const kind = floorKinds.find(k=>plain(rest).startsWith(plain(k.split(' ')[0])));
  if(kind === 'Пароль' || kind === 'Файл' || kind === 'Узел управления') return [['', '', kind, ownDv ? ownDv[1] : String(dv), rest.replace(/^\S+(\s+управления)?/i, '').replace(/^[\s:—-]+/, '').trim(), '', '', '']];
  if(kind) return [['', '', kind, '', '', '', '', '']];
  return [['', '', 'Другое', '', text, '', '', '']];
}
// Бросок по таблице: 16 строк — 3d6 (строка 1 = 3), иначе равный шанс. used — уже выпавшие ЛЁД и Пароли:
// повторы перебрасываются (стр. 210), Файлы и Узлы могут повторяться.
function rollFloor(key, dv, used = new Set()){
  const lines = state.netGen[key].split('\n').map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return floorsFromLine('Пусто', dv);
  const once = line => /^(лёд|лед|ice|пароль)/i.test(line);
  let line = '';
  for(let tries = 0; tries < 30; tries++){
    line = lines.length === 16 ? lines[d(6) + d(6) + d(6) - 3] : pick(lines);
    if(!once(line) || !used.has(line)) break;
  }
  if(once(line)) used.add(line);
  return floorsFromLine(line, dv);
}
const branchLetters = ['А','Б','В','Г','Д'];
// Шаг 1 (стр. 210): 3d6 этажей; 1d10 ≥ 7 — ответвление, и бросок повторяется. Ветки отходят не раньше второго
// этажа основного пути, основной путь — самый длинный: у него есть «дно» для Вируса.
function planBranches(total, rollBranches){
  let count = 0;
  while(rollBranches && count < 4 && d(10) >= 7) count++;
  const lengths = [];
  for(let k = 0; k < count; k++){
    const left = total - lengths.reduce((a,b)=>a + b, 0);
    const len = 1 + Math.floor(Math.random() * Math.max(1, Math.floor((left - 3) / (count - k + 1))));
    if(left - len < Math.max(3, len + 1)) break;
    lengths.push(len);
  }
  const main = total - lengths.reduce((a,b)=>a + b, 0);
  return {main, branches:lengths.map(len=>({len, from: 2 + Math.floor(Math.random() * Math.max(1, main - 2))}))};
}
function generateNet(){
  const difficulty = $('#netDifficulty').value;
  const dv = netDifficulties[difficulty][1];
  const auto = isBlank($('#netFloors').value);
  const total = auto ? d(6) + d(6) + d(6) : Math.max(2, Math.min(40, Math.floor(num($('#netFloors').value))));
  const plan = planBranches(total, $('#netBranch').checked);
  const multi = plan.branches.length > 0;
  const used = new Set();
  const floors = [];
  const push = (list, number, branch) => list.forEach(f=>{ f[0] = String(number); f[1] = branch; floors.push(f); });
  for(let n = 1; n <= plan.main; n++) push(rollFloor(n <= 2 ? 'lobby' : difficulty, dv, used), n, multi ? 'А' : '');
  plan.branches.forEach((b, k)=>{ for(let m = 1; m <= b.len; m++) push(rollFloor(difficulty, dv, used), b.from + m, branchLetters[k + 1]); });
  const name = $('#netName').value.trim() || `Архитектура ${state.nets.length + 1}`;
  const branchText = plan.branches.map((b, k)=>`ветка ${branchLetters[k + 1]} после этажа ${b.from}`).join(', ');
  state.nets.push({name, notes: branchText ? `${branchText[0].toUpperCase()}${branchText.slice(1)}.` : '', difficulty, floors, demon:'', demonRez:''});
  $('#netName').value = '';
  renderNets(); save();
  addLog({kind:'text', tag:'СЕТЬ', text:`${name}: ${total} этажей${auto ? ' (3d6)' : ''}, ${netGenTitles[difficulty]}${branchText ? `, ${branchText}` : ''}`});
  toast(`Архитектура «${name}» создана`);
}
// Этаж перебрасывается по таблице своей архитектуры (лобби — для этажей 1–2 основного пути).
// Все строки этого этажа (несколько ЛЬДОВ) заменяются новым результатом.
function rerollFloor(n, r){
  const net = state.nets[n];
  const old = net.floors[r];
  const difficulty = net.difficulty || $('#netDifficulty').value;
  const lobby = num(old[0]) <= 2 && !['Б','В','Г','Д'].includes(old[1]);
  const used = new Set(net.floors.filter(f=>f[0] !== old[0] || f[1] !== old[1]).map(f=>f[2] === 'Пароль' ? `Пароль СЛ${f[3]}` : f[2] === 'Чёрный ЛЁД' ? `ЛЁД: ${iceName(f).split(' (')[0]}` : '').filter(Boolean));
  const fresh = rollFloor(lobby ? 'lobby' : difficulty, netDifficulties[difficulty][1], used);
  fresh.forEach(f=>{ f[0] = old[0]; f[1] = old[1]; });
  const first = net.floors.findIndex(f=>f[0] === old[0] && f[1] === old[1]);
  net.floors = net.floors.filter(f=>f[0] !== old[0] || f[1] !== old[1]);
  net.floors.splice(first, 0, ...fresh);
  renderNets(); save();
}
// Текст ЛЬДа «Имя: PER 6 SPD 6 ATK 6 DEF 2 — эффект» показывается карточкой; ✎ открывает его для правки.
const iceStats = ['PER','SPD','ATK','DEF'];
const editingFloors = new Set();
const openNetImages = new Set(); // архитектуры с открытой картинкой
function parseIce(text){
  const m = String(text).match(/^(.*?):\s*PER\s*(\d+)\s*SPD\s*(\d+)\s*ATK\s*(\d+)\s*DEF\s*(\d+)\s*(?:—\s*([\s\S]*))?$/);
  return m && {name:m[1].trim(), stats:m.slice(2, 6), effect:(m[6] || '').trim()};
}
// Chrome и Edge подгоняют высоту поля сами (field-sizing: content), остальным браузерам помогаем скриптом.
const nativeGrow = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
function autoGrow(el){
  if(nativeGrow || !el.offsetParent) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
function floorContent(n, r, f){
  const ice = f[2] === 'Чёрный ЛЁД' && !editingFloors.has(`${n}:${r}`) && parseIce(f[4]);
  if(!ice) return `<textarea class="grow-field" data-floor="${n}" data-r="${r}" data-j="4" rows="1" aria-label="Содержимое" placeholder="${f[2] === 'Чёрный ЛЁД' ? 'Имя: PER 6 SPD 6 ATK 6 DEF 2 — эффект' : 'что здесь, пароль, файл...'}">${esc(f[4])}</textarea>`;
  return `<div class="ice-view">
      <div class="ice-head"><b>${esc(ice.name)}</b><button type="button" class="ice-edit" data-floor-edit="${n}" data-r="${r}" title="Править текст ЛЬДа">✎</button></div>
      <div class="ice-stats">${iceStats.map((k,i)=>`<span><small>${k}</small>${esc(ice.stats[i])}</span>`).join('')}</div>
      ${ice.effect ? `<p>${esc(ice.effect)}</p>` : ''}
    </div>`;
}
const floorStat = (f, key) => { const m = f[4].match(new RegExp(`${key}\\s*(\\d+)`)); return m ? Number(m[1]) : null; };
const floorDice = f => (f[4].match(/\d+\s*[dд]\s*\d+/i) || [''])[0];
const iceName = f => f[4].split(':')[0].trim() || 'Чёрный ЛЁД';
// Броски ЛЬДА (стр. 205): атака ATK + 1d10 против Интерфейса + 1d10 (или ЗАЩ программы + 1d10);
// защита DEF + 1d10; встреча — SPD + 1d10 против Интерфейса + Скорость + 1d10; «Ускользнуть» — против PER + 1d10.
const iceRolls = {
  attack:['ATK', 'атака', 'против Интерфейса нетраннера + 1d10 (ЛЁД против программ — против ЗАЩ программы + 1d10)'],
  defense:['DEF', 'защита', 'атакующий должен превзойти: Интерфейс + ATK программы + 1d10'],
  speed:['SPD', 'встреча (СКО)', 'нетраннер бросает Интерфейс + бонус Скорости + 1d10; проиграл — сразу эффект ЛЬДА'],
  perception:['PER', 'восприятие (ВСП)', 'против «Ускользнуть»: Интерфейс + 1d10 нетраннера']
};
const iceRollLabels = {attack:'АТАКА', defense:'ЗАЩ', speed:'СКО', perception:'ВСП'};
function iceRoll(n, r, kind){
  const f = state.nets[n].floors[r];
  const [key, label, note] = iceRolls[kind];
  roll({count:1, sides:10, bonus:0}, floorStat(f, key) || 0, `${iceName(f)}: ${label}`, {crits:true, note});
}
function iceEffect(n, r){
  const f = state.nets[n].floors[r];
  const formula = parseDice(floorDice(f));
  if(formula) roll(formula, 0, `${iceName(f)}: эффект`, {note:f[4].split('—').slice(1).join('—').trim()});
}
// Демон (стр. 212): защищается и бьёт Разрядом Интерфейсом + 1d10; дронами и турелями — боевым номером + 1d10.
const demonRolls = {
  zap:['РАЗРЯД', 'против Интерфейса нетраннера + 1d10 или ЗАЩ программы + 1d10; успех — 1d6 мозгу или программе'],
  defense:['ЗАЩИТА', 'Интерфейс + 1d10: атакующий должен превзойти'],
  control:['УПРАВЛЕНИЕ', 'перехватить Узел — превзойти его СЛ или проверку того, кто им владеет'],
  combat:['БОЕВОЙ №', 'атака или защита дроном, турелью']
};
function demonRoll(n, kind){
  const [name, , iface, , combat] = demons[state.nets[n].demon];
  const [label, note] = demonRolls[kind];
  const r = roll({count:1, sides:10, bonus:0}, kind === 'combat' ? combat : iface, `${name}: ${label.toLowerCase()}`, {crits:true, note});
  if(kind === 'zap') roll({count:1, sides:6, bonus:0}, 0, `${name}: урон Разряда`, {note:`если ${r.total} больше защиты цели`, noCrit:true});
}
function demonBlock(net, n){
  const select = `<select data-net="${n}" data-k="demon" aria-label="Демон архитектуры">${options([['','без Демона'], ...Object.entries(demons).map(([k, dm])=>[k, `Демон: ${dm[0]}`])], net.demon)}</select>`;
  const demon = demons[net.demon];
  if(!demon) return `<div class="demon-box">${select}<span class="muted">Демон управляет Узлами и активной защитой (стр. 212).</span></div>`;
  const [name, rez, iface, actions, combat, icon] = demon;
  return `<div class="demon-box is-active">${select}
    <div class="ice-stats"><span><small>REZ</small><input data-net="${n}" data-k="demonRez" type="number" value="${esc(isBlank(net.demonRez) ? rez : net.demonRez)}" aria-label="REZ демона"> / ${rez}</span><span><small>ИНТЕРФЕЙС</small>${iface}</span><span><small>ДЕЙСТВИЙ</small>${actions}</span><span><small>БОЕВОЙ №</small>${combat}</span></div>
    <span class="row-btns">${Object.entries(demonRolls).map(([kind, [label, note]])=>`<button type="button" class="weapon-btn" data-demon-roll="${n}" data-kind="${kind}" title="${esc(note)}">${label}</button>`).join('')}</span>
    <small class="muted">${esc(name)}: ${esc(icon)}. Встаёт первым в очереди; сначала триггеры Узлов, остальными действиями — Разряд.</small></div>`;
}
const iceButtons = (n, r, f) => f[2] !== 'Чёрный ЛЁД' || floorStat(f, 'ATK') === null ? ''
  : Object.entries(iceRolls).map(([kind, [key, label]])=>`<button type="button" class="weapon-btn" data-ice-roll="${n}" data-r="${r}" data-kind="${kind}" title="1d10 + ${key}: ${esc(label)}">${iceRollLabels[kind]}</button>`).join('');
function renderNetGen(){
  $('#netDifficulty').innerHTML = options(Object.entries(netDifficulties).map(([k,[name,dv]])=>[k, `${name} — СЛ ${dv}`]), $('#netDifficulty').value || 'standard');
  $('#netGenTables').innerHTML = Object.keys(netGenDefaults).map(k=>`<label>${esc(netGenTitles[k])}<textarea data-netgen="${k}" rows="8">${esc(state.netGen[k])}</textarea></label>`).join('');
}
function renderNets(){
  $('#netList').innerHTML = state.nets.map((net,n)=>`<div class="panel net-panel">
      <div class="section-title"><input class="net-name" data-net="${n}" data-k="name" value="${esc(net.name)}" placeholder="Архитектура ${n + 1}"><button type="button" class="clear-log" data-net-del="${n}">УДАЛИТЬ</button><span>${net.difficulty ? esc(netGenTitles[net.difficulty]) : ''}${net.floors.length ? ` · ЭТАЖЕЙ ${new Set(net.floors.map(f=>`${f[1]}:${f[0]}`)).size}` : ''}</span></div>
      ${demonBlock(net, n)}
      <div class="table-scroll">
        <table class="data-table net-table">
          <thead><tr><th>Этаж</th><th>Ветка</th><th>Что там</th><th>СЛ</th><th>Содержимое / статы ЛЬДа</th><th>REZ</th><th>Пройден</th><th></th></tr></thead>
          <tbody>${net.floors.map((f,r)=>`<tr class="${f[7] === 'true' ? 'is-done' : ''} ${f[2] === 'Чёрный ЛЁД' || f[2] === 'Демон' ? 'is-ice' : ''}">
            <td class="short"><input data-floor="${n}" data-r="${r}" data-j="0" value="${esc(f[0])}" aria-label="Этаж"></td>
            <td class="short"><input data-floor="${n}" data-r="${r}" data-j="1" value="${esc(f[1])}" aria-label="Ветка" placeholder="—"></td>
            <td><select data-floor="${n}" data-r="${r}" data-j="2" aria-label="Что там">${options(floorKinds.map(k=>[k,k]), f[2])}</select></td>
            <td class="short"><input data-floor="${n}" data-r="${r}" data-j="3" type="number" value="${esc(f[3])}" aria-label="СЛ"></td>
            <td>${floorContent(n, r, f)}</td>
            <td class="rez"><input data-floor="${n}" data-r="${r}" data-j="5" type="number" value="${esc(f[5])}" aria-label="REZ"><span class="slash">/</span><input data-floor="${n}" data-r="${r}" data-j="6" type="number" value="${esc(f[6])}" aria-label="REZ макс."></td>
            <td class="short"><input type="checkbox" data-floor="${n}" data-r="${r}" data-j="7"${f[7] === 'true' ? ' checked' : ''} aria-label="Пройден"></td>
            <td class="row-btns">${iceButtons(n, r, f)}${f[2] === 'Чёрный ЛЁД' && floorDice(f) ? `<button type="button" class="weapon-btn" data-ice-effect="${n}" data-r="${r}" title="Кубики эффекта ЛЬДа">ЭФФЕКТ</button>` : ''}<button type="button" class="weapon-btn" data-floor-reroll="${n}" data-r="${r}" title="Перебросить этаж по таблице">⟳</button><button type="button" class="remove" data-floor-del="${n}" data-r="${r}" title="Удалить этаж">×</button></td>
          </tr>`).join('') || '<tr><td colspan="8" class="empty-cell">Этажей нет</td></tr>'}</tbody>
        </table>
      </div>
      <div class="enemy-row-add">
        <button type="button" class="add-row" data-floor-add="${n}">+ ЭТАЖ</button>
        <button type="button" class="add-row" data-net-reset="${n}" title="Снять отметки «пройден» и восстановить REZ">СБРОСИТЬ ПРОХОД</button>
        <button type="button" class="add-row${openNetImages.has(n) ? ' active' : ''}" data-net-image="${n}" title="Картинка архитектуры для Owlbear: с текстом, значками или без">КАРТИНКА</button>
      </div>
      ${openNetImages.has(n) ? `<div class="net-image" data-image-box="${n}"></div>` : ''}
      <textarea data-net="${n}" data-k="notes" rows="2" placeholder="Кто охраняет, что будет при тревоге...">${esc(net.notes)}</textarea>
    </div>`).join('') || '<div class="empty-search">Архитектур пока нет.</div>';
  $$('#netList .grow-field').forEach(autoGrow);
  if(typeof drawNetImages === 'function') drawNetImages(); // картинки архитектуры (net.js)
}

// --- Генераторы ---
// Имена — свои списки листа (не из книги), смесь культур Найт-Сити.
const firstNames = ['Алекс','Мира','Дэйв','Кира','Хиро','Лусия','Рико','Аиша','Ваня','Юки','Маркус','Зоя','Сантьяго','Нина','Кенджи','Фатима','Тео','Ада','Омар','Лин','Диего','Эйко','Бенни','Рэй','Соня','Мэй','Иван','Карла','Джин','Тарик'];
const lastNames = ['Морено','Като','Шульц','Окафор','Ривера','Ли','Новак','Андерсон','Сато','Петров','Мендес','Чен','Барнс','Хадид','Ковальски','Ямада','Ортис','Нгуен','Райт','Волков'];
const handles = ['Шрам','Хром','Ноль','Искра','Ржавый','Пиксель','Бритва','Сова','Глитч','Дымок','Кобра','Ватт','Гвоздь','Неон','Шёпот','Байт','Молот','Тень','Койот','Фантом'];
function generateNames(count = 5){
  return Array.from({length:count},()=>`${pick(firstNames)} «${pick(handles)}» ${pick(lastNames)}`);
}
function renderNames(list){
  $('#nameList').innerHTML = list.map(name=>`<div class="scene-row"><b>${esc(name)}</b><button type="button" class="add-row" data-name-npc="${esc(name)}">+ В NPC</button></div>`).join('');
}
function renderTables(){
  $('#tableList').innerHTML = state.tables.map((t,i)=>`<div class="panel random-table">
      <div class="section-title"><input class="net-name" data-table="${i}" data-k="name" value="${esc(t.name)}" placeholder="Таблица ${i + 1}"><button type="button" class="clear-log" data-table-del="${i}">УДАЛИТЬ</button></div>
      <textarea data-table="${i}" data-k="lines" rows="6" placeholder="Одна строка — один вариант">${esc(t.lines)}</textarea>
      <button type="button" class="quick-roll" data-table-roll="${i}">БРОСИТЬ</button>
    </div>`).join('') || '<div class="empty-search">Своих таблиц нет.</div>';
}
function rollTable(i){
  const t = state.tables[i];
  const lines = t.lines.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.length){ toast('Таблица пуста: впишите варианты, по одному в строке'); return; }
  const k = Math.floor(Math.random()*lines.length);
  addLog({kind:'text', tag:'ТАБЛИЦА', text:`${t.name || `Таблица ${i + 1}`} (1d${lines.length} = ${k + 1}): ${lines[k]}`});
  $('#diceResult').innerHTML = `<strong class="formula-roll-total">${esc(lines[k])}</strong><div class="roll-note"><span>${esc(t.name || 'Таблица')}: 1d${lines.length} = ${k + 1}</span></div>`;
  $('#diceDrawer').classList.add('open');
}

// --- Печать карточек ---
function printEnemies(){
  const chosen = state.enemies.filter(e=>e.selected);
  const list = chosen.length ? chosen : state.enemies;
  if(!list.length){ toast('Нечего печатать: противников нет'); return; }
  let sheet = $('.print-sheet');
  if(!sheet){ sheet = document.createElement('div'); sheet.className = 'print-sheet dm-print'; document.body.append(sheet); }
  sheet.innerHTML = list.map(e=>`<section class="dp-card">
      <h2>${esc(enemyName(e))}<small>${esc(e.kind)}</small></h2>
      <div class="dp-stats">${stats.map((n,s)=>`<span><small>${n}</small>${esc(e.stats[s] || '—')}</span>`).join('')}</div>
      <p><b>Хиты</b> ${maxHp(e)} · <b>ранение</b> &lt; ${woundThreshold(e)} · <b>SP</b> голова ${num(e.headSpMax || e.headSp)} / тело ${num(e.bodySpMax || e.bodySp)} · <b>СКО</b> ${moveMeters(e)} м</p>
      <div class="dp-boxes">${'<i></i>'.repeat(Math.min(maxHp(e), 80))}</div>
      ${e.weapons.length ? `<table><tr><th>Оружие</th><th>Атака</th><th>Урон</th><th>ROF</th><th>Маг.</th></tr>${e.weapons.map(w=>`<tr><td>${esc(w[0])}</td><td>${esc(w[1])}${autofireMult(w) ? ` / авто ${esc(w[7] || '—')} ×${autofireMult(w)}` : ''}</td><td>${esc(w[2])}</td><td>${esc(w[3])}</td><td>${esc(w[5])}</td></tr>`).join('')}</table>` : ''}
      ${e.skills.length ? `<p><b>Навыки:</b> ${e.skills.map(s=>`${esc(s[0])} ${esc(s[1])}`).join(', ')}</p>` : ''}
      ${e.gear.trim() ? `<p><b>Снаряжение:</b> ${esc(e.gear)}</p>` : ''}
      ${e.notes.trim() ? `<p><b>Заметки:</b> ${esc(e.notes)}</p>` : ''}
    </section>`).join('');
  window.print();
}

// --- Общее ---
function setPath(obj, path, value){
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o,k)=>o[k], obj)[last] = value;
}
let undo = null;
function toast(text, undoFn){
  $('#toastText').textContent = text;
  $('#toastUndo').hidden = !undoFn;
  undo = undoFn || null;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>{ $('#toast').hidden = true; undo = null; }, 5000);
}
function withUndo(text, mutate){
  const snapshot = JSON.stringify(state);
  mutate();
  renderAll();
  save();
  toast(text, ()=>{ state = normalize(JSON.parse(snapshot)); renderAll(); save(); });
}
function renderAll(){
  $$('[data-key]').forEach(el=>{ el.value = state[el.dataset.key] ?? ''; });
  renderEnemies();
  renderOverview();
  renderPlayers();
  renderNpcs();
  renderInit();
  renderTemplates();
  renderNetGen();
  renderNets();
  renderTables();
  renderLog();
  if(typeof renderCovers === 'function') renderCovers(); // вкладка правил (rules.js)
  if(typeof renderEcon === 'function') renderEcon(); // вкладка экономики (econ.js)
  if(typeof renderGen === 'function') renderGen(); // генераторы (gen.js)
}
function activateTab(id){
  $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab === id));
  $$('.tab-panel').forEach(p=>p.classList.toggle('active', p.id === id));
  $$(`#${id} .grow-field`).forEach(autoGrow);
  try { localStorage.setItem(`${DM_KEY}:tab`, id); } catch {}
}

// --- События ---
document.addEventListener('input', ev=>{
  const el = ev.target;
  const value = el.type === 'checkbox' ? el.checked : el.value;
  if(el.dataset.key){ state[el.dataset.key] = value; updateSummary(); save(); return; }
  if(el.dataset.e !== undefined){
    const i = Number(el.dataset.e);
    setPath(state.enemies[i], el.dataset.f, value);
    // То же поле в другой карточке этого противника (вкладка и панель хода).
    $$(`[data-e="${i}"][data-f="${el.dataset.f}"]`).forEach(other=>{ if(other !== el){ if(other.type === 'checkbox') other.checked = value; else other.value = value; } });
    updateCard(i);
    renderOverview();
    save();
    return;
  }
  if(el.dataset.row){
    state[el.dataset.row][Number(el.dataset.i)][Number(el.dataset.j)] = value;
    if(el.classList.contains('grow-field')) autoGrow(el);
    if(el.dataset.row === 'npcs'){
      const card = el.closest('.npc-card');
      const row = state.npcs[Number(el.dataset.i)];
      if(card) card.querySelector('.npc-summary').textContent = [row[1], row[2]].filter(s=>s.trim()).join(' · ');
    }
    save();
    return;
  }
  if(el.dataset.init !== undefined){ state.init[Number(el.dataset.init)][el.dataset.k] = value; save(); return; }
  if(el.dataset.net !== undefined){
    const net = state.nets[Number(el.dataset.net)];
    net[el.dataset.k] = value;
    if(el.dataset.k === 'demon'){ net.demonRez = ''; renderNets(); }
    save();
    return;
  }
  if(el.dataset.floor !== undefined){
    state.nets[Number(el.dataset.floor)].floors[Number(el.dataset.r)][Number(el.dataset.j)] = String(value);
    if(el.classList.contains('grow-field')) autoGrow(el);
    save();
    return;
  }
  if(el.dataset.table !== undefined){ state.tables[Number(el.dataset.table)][el.dataset.k] = value; save(); return; }
  if(el.dataset.netgen){ state.netGen[el.dataset.netgen] = value; save(); }
});
document.addEventListener('change', ev=>{
  const el = ev.target;
  // Тип оружия, дистанция и имя меняют другие части листа — перерисовываем после ввода.
  if(el.dataset.e !== undefined){
    if(/^weapons\.\d+\.6$/.test(el.dataset.f)){
      const [, j] = el.dataset.f.split('.');
      const w = state.enemies[Number(el.dataset.e)].weapons[Number(j)];
      const preset = weaponType(w);
      if(preset){ if(isBlank(w[2])) w[2] = preset[2]; if(isBlank(w[3])) w[3] = preset[4]; if(isBlank(w[5]) && preset[3]){ w[5] = preset[3]; w[4] = preset[3]; } }
      renderEnemies(); renderTurn();
    }
    if(el.dataset.f === 'selected') updateSummary();
    else if(!el.dataset.f.startsWith('weapons')) renderInit();
  }
  if(el.dataset.floor !== undefined){ editingFloors.delete(`${el.dataset.floor}:${el.dataset.r}`); renderNets(); }
  if(el.dataset.act === 'armor'){
    const e = state.enemies[Number(el.dataset.i)];
    e.armor = el.value;
    const preset = armorPresets[el.value];
    if(preset){ e.headSp = e.headSpMax = e.bodySp = e.bodySpMax = String(preset[1]); }
    renderCombat();
  }
  if(el.dataset.act === 'addInjury' && el.value){
    const e = state.enemies[Number(el.dataset.i)];
    const [zone, k] = el.value.split(':');
    addLog({kind:'text', tag:'ТРАВМА', text:`${enemyName(e)}: ${addInjury(e, zone, Number(k))}`});
    renderCombat();
  }
  if(el.dataset.act === 'addImplant' && el.value){
    const [kind, ...name] = el.value.split(':');
    installImplant(state.enemies[Number(el.dataset.i)], kind, name.join(':'));
    renderCombat();
  }
  if(el.dataset.act === 'fire'){
    const e = state.enemies[Number(el.dataset.i)];
    e.status.fire = num(el.value);
    renderCombat();
  }
  if(el.dataset.act === 'presetWeapon' && el.value){
    const e = state.enemies[Number(el.dataset.i)];
    const [name, , damage, mag, rof] = allWeapons[el.value];
    e.weapons.push([name, '', damage, rof, mag, mag, el.value, '']);
    renderEnemies(); renderTurn(); save();
  }
});
document.addEventListener('keydown', ev=>{
  const el = ev.target;
  if(ev.key !== 'Enter') return;
  if(el.dataset.effectAdd !== undefined){ addEffect(Number(el.dataset.effectAdd), el.value); return; }
  if(el.dataset.hit === 'damage') el.closest('.enemy-card')?.querySelector('[data-act="hit"]')?.click();
});

// Действия карточки: e — противник, i — его номер, j — строка оружия или навыка, card — карточка кнопки.
const enemyActions = {
  attack(e, i, j){ weaponAttack(e, j); renderCombat(); },
  autofire(e, i, j){ weaponAutofire(e, j); renderCombat(); },
  suppress(e, i, j){ weaponSuppress(e, j); renderCombat(); },
  damage(e, i, j){ weaponDamage(e, j); },
  shell(e, i, j){ weaponShell(e, j); renderCombat(); },
  reload(e, i, j){ const w = e.weapons[j]; if(!isBlank(w[5])){ w[4] = w[5]; renderCombat(); } },
  delWeapon(e, i, j){ e.weapons.splice(j, 1); renderCombat(); },
  addWeapon(e){ e.weapons.push(['','','','1','','','','']); renderCombat(); },
  skill(e, i, j){ enemyCheck(e, e.skills[j][1], e.skills[j][0] || 'навык'); },
  delSkill(e, i, j){ e.skills.splice(j, 1); renderCombat(); },
  addSkill(e){ e.skills.push(['','']); renderCombat(); },
  init(e){ enemyInit(e); sortInit(); renderCombat(); },
  evade(e){
    if(injuryMods(e).noDodge){ toast(`${enemyName(e)}: без ноги — не может уклоняться`); return; }
    const skill = e.skills.find(s=>/уклон/i.test(s[0]));
    enemyCheck(e, skill ? skill[1] : stat(e, STAT_DEX), skill ? 'уклонение' : 'уклонение (только ЛВК)');
  },
  hit(e, i, j, card){ applyHit(e, card); },
  heal(e, i, j, card){
    const amount = Math.floor(num(card.querySelector('[data-hit="damage"]').value));
    e.hp = String(amount ? Math.min(maxHp(e), curHp(e) + amount) : maxHp(e));
    if(curHp(e) > 0) e.deathPenalty = 0;
    addLog({kind:'text', tag:'ЛЕЧЕНИЕ', text:`${enemyName(e)}: ${e.hp}/${maxHp(e)}`});
    renderCombat();
  },
  deathSave(e){ deathSave(e); },
  delInjury(e, i, j){
    const list = enemyInjuries(e);
    addLog({kind:'text', tag:'ТРАВМА', text:`${enemyName(e)}: вылечено — ${list[j].line}`});
    e.injuries = list.filter((_, k)=>k !== j).map(inj=>inj.line).join('\n');
    renderCombat();
  },
  movedFar(e){ movedFar(e); renderCombat(); },
  delImplant(e, i, j){
    addLog({kind:'text', tag:'ИМПЛАНТ', text:`${enemyName(e)}: снят — ${e.implants[j].name}`});
    e.implants.splice(j, 1);
    renderCombat();
  },
  repair(e){
    if(!isBlank(e.headSpMax)) e.headSp = e.headSpMax;
    if(!isBlank(e.bodySpMax)) e.bodySp = e.bodySpMax;
    renderCombat();
  },
  dup(e, i){
    const copy = normalizeEnemy(clone(e));
    copy.id = uid();
    copy.name = e.name ? `${e.name} (копия)` : '';
    copy.selected = false;
    state.enemies.splice(i + 1, 0, copy);
    renderCombat();
  },
  template(e){
    const t = freshEnemy(e, enemyName(e).replace(/\s+\d+$/, ''));
    const at = state.templates.findIndex(x=>x.name === t.name);
    if(at >= 0) state.templates[at] = t; else state.templates.push(t);
    renderTemplates();
    toast(`${t.name}: ${at >= 0 ? 'шаблон обновлён' : 'сохранён в бестиарий'}`);
  },
  dead(e){ e.dead = !e.dead; renderCombat(); },
  collapse(e){ e.collapsed = !e.collapsed; renderEnemies(); renderTurn(); },
  expand(e, i){
    state.compact = false;
    e.collapsed = false;
    renderEnemies();
    activateTab('enemies');
    $(`#enemyList .enemy-card[data-i="${i}"]`)?.scrollIntoView({behavior:'smooth', block:'start'});
  },
  remove(e){
    withUndo(`${enemyName(e)}: удалён`, ()=>{
      state.enemies.splice(state.enemies.indexOf(e), 1);
      state.init = state.init.filter(item=>item.enemyId !== e.id);
      state.turn = Math.min(state.turn, Math.max(0, state.init.length - 1));
    });
  }
};

// Кнопки по data-атрибутам: [атрибут, обработчик(значение, кнопка)].
const clickHandlers = [
  ['goto', i=>{ activateTab('enemies'); $(`#enemyList .enemy-card[data-i="${i}"]`)?.scrollIntoView({behavior:'smooth', block:'start'}); }],
  ['add', type=>{
    state[type].push(Array(type === 'players' ? PLAYER_WIDTH : NPC_WIDTH).fill(''));
    if(type === 'players'){ renderPlayers(); save(); return; }
    $('#npcSearch').value = '';
    renderNpcs(); save();
    $('#npcList .npc-card:last-child input')?.focus();
  }],
  ['delRow', (type, el)=>{ state[type].splice(Number(el.dataset.i), 1); renderPlayers(); save(); }],
  ['npcPin', i=>{ const row = state.npcs[Number(i)]; row[6] = row[6] === 'true' ? '' : 'true'; renderNpcs(); save(); }],
  ['npcToggle', i=>{ const row = state.npcs[Number(i)]; row[5] = row[5] === 'true' ? '' : 'true'; renderNpcs(); save(); }],
  ['npcDel', i=>{ const row = state.npcs[Number(i)]; withUndo(`${row[0].trim() || 'NPC'}: удалён`, ()=>state.npcs.splice(Number(i), 1)); }],
  ['initDel', i=>{
    i = Number(i);
    state.init.splice(i, 1);
    if(i < state.turn) state.turn--;
    state.turn = Math.min(state.turn, Math.max(0, state.init.length - 1));
    renderInit(); renderEnemies(); save();
  }],
  ['effectDel', (i, el)=>{ state.init[Number(i)].effects.splice(Number(el.dataset.k), 1); renderInit(); save(); }],
  ['tplSpawn', i=>{ spawn(Number(i), $(`[data-tpl-count="${i}"]`).value); renderCombat(); activateTab('enemies'); }],
  ['tplDel', i=>{ const t = state.templates[Number(i)]; withUndo(`Шаблон «${t.name || 'Без имени'}» удалён`, ()=>state.templates.splice(Number(i), 1)); }],
  ['sceneSpawn', i=>{
    const sc = state.scenes[Number(i)];
    sc.enemies.forEach(e=>state.enemies.push(freshEnemy(e, e.name)));
    toast(`Сцена «${sc.name || 'Без имени'}»: выставлено ${sc.enemies.length}`);
    renderCombat(); activateTab('enemies');
  }],
  ['sceneDel', i=>{ const sc = state.scenes[Number(i)]; withUndo(`Сцена «${sc.name || 'Без имени'}» удалена`, ()=>state.scenes.splice(Number(i), 1)); }],
  ['netDel', n=>{ const net = state.nets[Number(n)]; withUndo(`Архитектура «${net.name || 'Без имени'}» удалена`, ()=>state.nets.splice(Number(n), 1)); }],
  ['floorAdd', n=>{ const floors = state.nets[Number(n)].floors; floors.push([String(floors.length + 1), '', 'Пароль', '', '', '', '', '']); renderNets(); save(); }],
  ['floorEdit', (n, el)=>{
    editingFloors.add(`${n}:${el.dataset.r}`);
    renderNets();
    const area = $(`textarea[data-floor="${n}"][data-r="${el.dataset.r}"]`);
    area?.focus();
    area?.setSelectionRange(area.value.length, area.value.length);
  }],
  ['floorReroll', (n, el)=>rerollFloor(Number(n), Number(el.dataset.r))],
  ['iceRoll', (n, el)=>iceRoll(Number(n), Number(el.dataset.r), el.dataset.kind)],
  ['demonRoll', (n, el)=>demonRoll(Number(n), el.dataset.kind)],
  ['netImage', n=>{ n = Number(n); if(openNetImages.has(n)) openNetImages.delete(n); else openNetImages.add(n); renderNets(); }],
  ['iceEffect', (n, el)=>iceEffect(Number(n), Number(el.dataset.r))],
  ['floorDel', (n, el)=>{ state.nets[Number(n)].floors.splice(Number(el.dataset.r), 1); renderNets(); save(); }],
  ['netReset', n=>{ const net = state.nets[Number(n)]; net.floors.forEach(f=>{ f[7] = ''; if(!isBlank(f[6])) f[5] = f[6]; }); net.demonRez = ''; renderNets(); save(); }],
  ['tableRoll', i=>rollTable(Number(i))],
  ['tableDel', i=>{ const t = state.tables[Number(i)]; withUndo(`Таблица «${t.name || 'Без имени'}» удалена`, ()=>state.tables.splice(Number(i), 1)); }],
  ['nameNpc', name=>{ state.npcs.push([name, '', '', '', '', '']); renderNpcs(); save(); toast(`${name}: добавлен в NPC`); }]
];
document.addEventListener('click', ev=>{
  const el = ev.target.closest('button, .tab');
  if(!el) return;
  if(el.classList.contains('tab')){ activateTab(el.dataset.tab); return; }
  const act = el.dataset.act;
  if(act === 'status'){
    const e = state.enemies[Number(el.dataset.i)];
    setStatus(e, el.dataset.j, !e.status[el.dataset.j]);
    renderCombat();
    return;
  }
  if(act && enemyActions[act]){
    const i = Number(el.dataset.i);
    enemyActions[act](state.enemies[i], i, Number(el.dataset.j), el.closest('.enemy-card'));
    save();
    return;
  }
  const handler = clickHandlers.find(([key])=>el.dataset[key] !== undefined);
  if(handler) handler[1](el.dataset[handler[0]], el);
});

$('#addEnemy').addEventListener('click', ()=>{
  state.enemies.push(blankEnemy());
  state.compact = false;
  renderCombat();
  $('#enemyList').lastElementChild?.querySelector('.enemy-name')?.focus();
});
$('#spawnBtn').addEventListener('click', ()=>{
  if(!state.templates.length){ toast('Бестиарий пуст: сохраните противника кнопкой ★'); return; }
  spawn(Number($('#spawnTemplate').value), $('#spawnCount').value);
  renderCombat();
});
$('#compactToggle').addEventListener('click', ()=>{ state.compact = !state.compact; renderEnemies(); save(); });
$('#groupHit').addEventListener('click', groupHit);
$('#selectAll').addEventListener('click', ()=>{
  const all = state.enemies.filter(e=>!e.dead).every(e=>e.selected);
  state.enemies.forEach(e=>{ e.selected = !all && !e.dead; });
  renderEnemies(); updateSummary(); save();
});
$('#allToInit').addEventListener('click', ()=>{
  state.enemies.forEach(e=>{ if(!e.dead) enemyInit(e); });
  sortInit(); renderCombat(); activateTab('initiative');
});
$('#clearDead').addEventListener('click', ()=>{
  const dead = state.enemies.filter(e=>e.dead);
  if(!dead.length){ toast('Мёртвых нет'); return; }
  withUndo(`Убрано павших: ${dead.length}`, ()=>{
    const ids = new Set(dead.map(e=>e.id));
    const current = state.init[state.turn];
    state.enemies = state.enemies.filter(e=>!ids.has(e.id));
    state.init = state.init.filter(item=>!ids.has(item.enemyId));
    state.turn = Math.max(0, state.init.indexOf(current));
  });
});
$('#printBtn').addEventListener('click', printEnemies);

// Ход переходит к следующему живому участнику; после последнего начинается новый раунд.
// Состояния противника срабатывают в конце его хода (огонь, ток, вакуум) и в начале следующего (удушье).
$('#nextTurn').addEventListener('click', ()=>{
  if(!state.init.length) return;
  const enemyAt = k => state.init[k]?.enemyId && enemyById(state.init[k].enemyId);
  const ending = enemyAt(state.turn);
  if(ending) endTurnEffects(ending);
  for(let step = 0; step < state.init.length; step++){
    state.turn++;
    if(state.turn >= state.init.length){ state.turn = 0; state.round++; tickEffects(); }
    const e = enemyAt(state.turn);
    if(!e || !e.dead) break;
  }
  const starting = enemyAt(state.turn);
  if(starting) startTurnEffects(starting);
  renderCombat();
});
$('#sortInit').addEventListener('click', ()=>{ sortInit(); renderInit(); save(); });
$('#rerollInit').addEventListener('click', ()=>{
  state.init.forEach(item=>{ const e = item.enemyId && enemyById(item.enemyId); if(e && !e.dead) enemyInit(e); });
  sortInit(); renderInit(); save();
});
$('#resetCombat').addEventListener('click', ()=>withUndo('Очередь очищена, раунд 1', ()=>{ state.init = []; state.turn = 0; state.round = 1; }));
$('#initAdd').addEventListener('click', ()=>{
  const name = $('#initName').value.trim();
  if(!name) return;
  state.init.push({id:uid(), name, value:$('#initValue').value, enemyId:'', note:'', effects:[]});
  $('#initName').value = ''; $('#initValue').value = '';
  sortInit(); renderInit(); save();
  $('#initName').focus();
});
$('#initValue').addEventListener('keydown', ev=>{ if(ev.key === 'Enter') $('#initAdd').click(); });
// Игроки бросают инициативу сами: в очередь они встают с пустым значением, его вписывает мастер.
$('#playersToInit').addEventListener('click', ()=>{
  const names = state.players.map(r=>r[1].trim() || r[0].trim()).filter(Boolean);
  const added = names.filter(name=>!state.init.some(item=>!item.enemyId && item.name === name));
  added.forEach(name=>state.init.push({id:uid(), name, value:'', enemyId:'', note:'', effects:[]}));
  renderInit(); save();
  toast(added.length ? `В очередь добавлено игроков: ${added.length}. Впишите их инициативу и нажмите «Сортировать».` : 'Все игроки уже в очереди');
});
$('#playersFromBrowser').addEventListener('click', importPlayersFromBrowser);
$('#playerImport').addEventListener('change', async ev=>{
  const files = [...ev.target.files];
  ev.target.value = '';
  let count = 0;
  for(const file of files){
    try {
      const data = JSON.parse(await file.text());
      if(data && typeof data === 'object' && !Array.isArray(data) && !('enemies' in data)){ upsertPlayer(playerFromSheet(data)); count++; }
    } catch {}
  }
  renderPlayers(); save();
  toast(count ? `Импортировано персонажей: ${count}` : 'Это не файлы листа персонажа');
});

$('#saveScene').addEventListener('click', ()=>{
  if(!state.enemies.length){ toast('На поле нет противников'); return; }
  const name = $('#sceneName').value.trim() || state.scene.trim().split('\n')[0].slice(0, 40) || `Сцена ${state.scenes.length + 1}`;
  const scene = {name, enemies:state.enemies.map(e=>freshEnemy(e, e.name))};
  const at = state.scenes.findIndex(sc=>sc.name === name);
  if(at >= 0) state.scenes[at] = scene; else state.scenes.push(scene);
  $('#sceneName').value = '';
  renderTemplates(); save();
  toast(`Сцена «${name}» ${at >= 0 ? 'обновлена' : 'сохранена'}`);
});
$('#generateNet').addEventListener('click', generateNet);
$('#netGenReset').addEventListener('click', ()=>withUndo('Таблицы генератора возвращены к таблицам книги', ()=>{ state = normalize({...state, netGen:{}}); }));
$('#addNet').addEventListener('click', ()=>{ state.nets.push({name:'', notes:'', difficulty:'', floors:[['1','','Пароль','','','','','']], demon:'', demonRez:''}); renderNets(); save(); });
$('#npcSearch').addEventListener('input', filterNpcs);
$('#npcCollapseAll').addEventListener('click', ()=>{
  const all = state.npcs.every(row=>row[5] === 'true');
  state.npcs.forEach(row=>{ row[5] = all ? '' : 'true'; });
  renderNpcs(); save();
});
$('#genNames').addEventListener('click', ()=>renderNames(generateNames()));
$('#addTable').addEventListener('click', ()=>{ state.tables.push({name:'', lines:''}); renderTables(); save(); });

$('#diceToggle').addEventListener('click', ()=>$('#diceDrawer').classList.toggle('open'));
$('#diceClose').addEventListener('click', ()=>$('#diceDrawer').classList.remove('open'));
$('#rollDice').addEventListener('click', ()=>{
  const f = parseDice($('#diceFormula').value);
  if(!f){ toast('Формула кубиков: 1d10, 2d6, 3d6+2'); return; }
  roll(f, num($('#diceModifier').value), $('#diceFormula').value.trim(), {crits:true});
});
$('#clearLog').addEventListener('click', ()=>{ state.log = []; renderLog(); save(); });
$('#toastUndo').addEventListener('click', ()=>{ undo?.(); $('#toast').hidden = true; undo = null; });

$('#exportBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  const title = state.sessionTitle.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'session';
  a.href = URL.createObjectURL(blob);
  a.download = `cyberred-dm-${title}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#importInput').addEventListener('change', async ev=>{
  const file = ev.target.files[0];
  ev.target.value = '';
  if(!file) return;
  try {
    const data = JSON.parse(await file.text());
    if(!data || typeof data !== 'object' || !('enemies' in data || 'templates' in data)) throw new Error();
    withUndo('Лист мастера загружен из файла', ()=>{ state = normalize(data); });
  } catch {
    toast('Это не файл листа мастера');
  }
});
$('#resetBtn').addEventListener('click', ()=>{
  // Бестиарий, сцены, архитектуры и свои таблицы переживают очистку: их готовят на всю кампанию.
  withUndo('Сессия очищена, бестиарий и заготовки сохранены', ()=>{
    const {templates, scenes, nets, tables, players, netGen, economy, gigs, factions, reputation, calendar} = state;
    const npcs = state.npcs.filter(row=>row[6] === 'true');
    state = {...blankState(), templates, scenes, nets, tables, players, netGen, economy, gigs, factions, reputation, calendar, npcs};
  });
});
window.addEventListener('beforeunload', ()=>{ if(saveTimer) persist(); });

$('#groupKind').innerHTML = options(damageKinds, '');
renderAll();
renderNames(generateNames());
try { const tab = localStorage.getItem(`${DM_KEY}:tab`); if(tab && $(`#${tab}`)) activateTab(tab); } catch {}
