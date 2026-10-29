// Вкладка «Сеть» листа Мастера: справочник Сети (программы, Чёрный ЛЁД, демоны, оборудование, защита)
// с бросками и картинка архитектуры для Owlbear. Данные — в ../data.js и net-data.js,
// общие функции — в dm.js ($, esc, roll, parseDice, state, openNetImages) и rules.js (section, table, list, formula).

// --- Справочник ---
const firstDice = text => parseDice((String(text).match(/\d+\s*[dд]\s*\d+/i) || [''])[0]);
const enemyIface = () => num($('#netEnemyIface').value);
function programRow(id, p){
  const [name, cls, atk, def, rez, dmg, , , effect, iceDmg, kind] = p;
  const [price, icon] = programInfo[id] || ['', ''];
  const attack = cls.startsWith('Против');
  const buttons = (attack ? `<button type="button" class="weapon-btn" data-prog-roll="${id}" data-kind="attack" title="Интерфейс врага + ATK + 1d10">АТАКА</button>` : '')
    + `<button type="button" class="weapon-btn" data-prog-roll="${id}" data-kind="defense" title="ЗАЩ + 1d10 — защита программы">ЗАЩ</button>`
    + (dmg ? `<button type="button" class="weapon-btn" data-prog-roll="${id}" data-kind="damage">${kind === 'effect' ? 'СВОЙСТВО' : 'УРОН'}</button>` : '')
    + (iceDmg ? `<button type="button" class="weapon-btn" data-prog-roll="${id}" data-kind="ice">ПО ЛЬДУ</button>` : '');
  return [`<b>${esc(name)}</b>`, esc(cls), atk, def, rez, esc(programRules[id] || effect), esc(price), `<i>${esc(icon)}</i>`, `<span class="row-btns">${buttons}</span>`];
}
function iceRow(id, ice){
  const [name, target, per, spd, atk, def, rez, effect] = ice;
  const [price, icon] = iceInfo[id] || ['', ''];
  const buttons = [['attack','АТАКА'], ['defense','ЗАЩ'], ['speed','СКО'], ['perception','ВСП']].map(([kind, label])=>`<button type="button" class="weapon-btn" data-ice-ref="${id}" data-kind="${kind}">${label}</button>`).join('')
    + (firstDice(effect) ? `<button type="button" class="weapon-btn" data-ice-ref="${id}" data-kind="effect">ЭФФЕКТ</button>` : '');
  return [`<b>${esc(name)}</b>`, esc(target), per, spd, atk, def, rez, esc(effect), esc(price), `<i>${esc(icon)}</i>`, `<span class="row-btns">${buttons}</span>`];
}
function netRefHtml(){
  const groups = [['Усилитель', 'Усилители — пока активны, улучшают функции'], ['Защита', 'Защитные — пока активны, останавливают или ослабляют атаки'], ['Против', 'Атакующие — выключаются сами после применения']];
  const programs = groups.map(([cls, title])=>`<h3>${title}</h3>` + table(['Программа', 'Класс', 'ATK', 'ЗАЩ', 'REZ', 'Эффект', 'Цена', 'Иконка', ''],
    Object.entries(programPresets).filter(([, p])=>p[1].startsWith(cls)).map(([id, p])=>programRow(id, p)), 'net-ref-table')).join('');
  return [
    section('netrules', 'ПРАВИЛА СЕТИ', 'стр. 197–205',
      formula('За ход: одно мясное действие ИЛИ столько сетевых действий, сколько даёт Интерфейс. Перемещаться можно в любом случае.')
      + table(['Ранг Интерфейса', ...netActionsByRank.map(([r])=>r)], [['<b>Сетевых действий</b>', ...netActionsByRank.map(([, a])=>a)]])
      + table(['Сетевое действие', 'Что делает'], netActions.map(([a, t])=>[`<b>${a}</b>`, t]))
      + '<h3>Функции Интерфейса — Интерфейс + 1d10 против СЛ</h3>'
      + table(['Функция', 'Что делает'], interfaceFunctions.map(([a, t])=>[`<b>${a}</b>`, t]))
      + '<h3>Бой в Сети</h3>' + formula('Интерфейс + ATK программы + 1d10 (или ATK ЛЬДА + 1d10) против Интерфейса цели + 1d10 (или ЗАЩ программы / ЛЬДА + 1d10). При попадании — эффект.')
      + list(netCombatRules), true),
    section('programs', 'ПРОГРАММЫ', 'стр. 202–204',
      `<p class="muted">АТАКА — Интерфейс врага (поле выше) + ATK + 1d10. Атакующая программа выключается после применения. Каждую программу можно включить раз за раунд; копии одной программы складываются, если не сказано иное.</p>${programs}`),
    section('ice', 'ЧЁРНЫЙ ЛЁД', 'стр. 205–207',
      `<p class="muted">ВСП — насколько трудно ускользнуть, СКО — кто быстрее при встрече, ATK и ЗАЩ — к броскам атаки и защиты, REZ — здоровье. Свой ЛЁД в деке занимает 2 слота.</p>`
      + table(['ЛЁД', 'Класс', 'ВСП', 'СКО', 'ATK', 'ЗАЩ', 'REZ', 'Эффект', 'Цена', 'Иконка', ''], Object.entries(blackIce).map(([id, ice])=>iceRow(id, ice)), 'net-ref-table')),
    section('demons', 'ДЕМОНЫ', 'стр. 212',
      table(['Демон', 'REZ', 'Интерфейс', 'Сетевых действий', 'Боевой номер', 'Иконка'], Object.values(demons).map(([n, rez, i, a, c, icon])=>[`<b>${n}</b>`, rez, i, a, c, `<i>${esc(icon)}</i>`]))
      + list(['Демон — ИИ Чёрного ЛЬДА для защиты Узлов и пространства. Не бьёт программами и ЛЬДОМ: только Разряд и Управление.', 'Каждый Узел срабатывает раз за ход, но Демон может управлять несколькими Узлами.', 'Демон действует по «триггерам»: турель знает, кого бить, но не отличит подменённую ID-карту.', 'Выберите Демона в карточке архитектуры — там его REZ и броски.'])),
    section('gear', 'ОБОРУДОВАНИЕ НЕТРАННЕРА', 'стр. 196, 208, 351, 359',
      table(['Кибердека', 'Цена', 'Слотов'], cyberdecks.map(([n, p, sl])=>[`<b>${n}</b>`, p, sl]))
      + '<h3>Оборудование для кибердеки</h3>' + table(['Оборудование', 'Слотов', 'Цена', 'Что делает'], deckHardware.map(([n, sl, p, t])=>[`<b>${n}</b>`, sl, p, t]))
      + '<h3>Импланты и снаряжение</h3>' + table(['Предмет', 'Цена', 'Что даёт'], netrunnerGear.map(([n, p, t])=>[`<b>${n}</b>`, p, t]))
      + `<p class="muted">${netInstallNote}</p>`),
    section('defenses', 'ЗАЩИТА И ЛОВУШКИ', 'стр. 212–216',
      `<p class="muted">${defenseNote}</p>`
      + '<h3>Активная защита (нужен Демон или нетраннер)</h3>' + table(['Тип', 'Описание', 'Взлом Электроника/Безопасность', 'Триггер', 'Характеристики'], activeDefenses.map(([n, ...r])=>[`<b>${n}</b>`, ...r]))
      + '<h3>Стационарная защита</h3>' + table(['Тип', 'Описание', 'Взлом', 'Триггер', 'Характеристики'], stationaryDefenses.map(([n, ...r])=>[`<b>${n}</b>`, ...r]))
      + '<h3>Ловушки</h3>' + table(['Ловушка', 'Описание', 'Взлом', 'Триггер', 'Характеристики'], traps.map(([n, ...r])=>[`<b>${n}</b>`, ...r]))),
    section('buy', 'ПОКУПКА АРХИТЕКТУРЫ И СЛОЖНОСТЬ', 'стр. 210, 217',
      table(['Сложность', 'СЛ паролей, файлов, узлов', 'Интерфейс с шансом на победу', 'Интерфейс, который вероятно погибнет'], Object.entries(netDifficulties).map(([k, [n, dv]])=>[`<b>${n}</b>`, `СЛ ${dv}`, netDifficultyGuide[k][0], netDifficultyGuide[k][1]]))
      + '<h3>Покупка (Ночной рынок, фиксер 4+ ранга)</h3>'
      + table(['Этажей', 'Максимум Узлов', 'Переносная', 'Цена'], netBuyFloors)
      + table(['СЛ взлома паролей, узлов, файлов', 'Цена'], netBuyDv)
      + list(['Этажи после покупки не добавить: размер архитектуры выбирается сразу.', 'Узлы управления (турели, камеры, двери) покупаются отдельно.', 'Хорошо, если у каждого Файла и Узла есть объяснение в реальном мире: что в этом здании и кто знает пароли.']))
  ].join('');
}
function renderNetRef(){
  $('#netRef').innerHTML = netRefHtml();
  renderDifficultyGuide();
  if(typeof setupPanels === 'function') setupPanels();
}
function renderDifficultyGuide(){
  const key = $('#netDifficulty').value || 'standard';
  const [name, dv] = netDifficulties[key];
  const [win, dies] = netDifficultyGuide[key];
  $('#netDifficultyGuide').innerHTML = `<b>${esc(name)}</b>: СЛ ${dv} · Интерфейс с шансом на победу — <b>${win}</b> · вероятно погибнет — <b>${esc(dies)}</b>`;
}
function filterNetRef(){
  const q = plain($('#netSearch').value);
  $$('#netRef .rules-section').forEach(sec=>{
    const match = !q || plain(sec.textContent).includes(q);
    sec.hidden = !match;
    if(q && match) sec.open = true;
  });
  highlightSearch($('#netRef'), q);
}
function programRoll(id, kind){
  const [name, , atk, def, , dmg, , , effect, iceDmg, type] = programPresets[id];
  const short = name.split(' (')[0];
  const d10 = {count:1, sides:10, bonus:0};
  if(kind === 'attack') roll(d10, enemyIface() + atk, `${short}: атака`, {crits:true, note:`Интерфейс ${enemyIface()} + ATK ${atk}; против Интерфейса цели + 1d10 или ЗАЩ программы + 1d10`});
  if(kind === 'defense') roll(d10, def, `${short}: защита`, {crits:true, note:`ЗАЩ ${def} + 1d10`});
  if(kind === 'damage') roll(parseDice(dmg), 0, `${short}: ${type === 'effect' ? 'свойство' : 'урон'}`, {noCrit:true, note:effect});
  if(kind === 'ice') roll(parseDice(iceDmg), 0, `${short}: урон Чёрному ЛЬДУ`, {noCrit:true});
}
function iceRefRoll(id, kind){
  const [name, , per, spd, atk, def, , effect] = blackIce[id];
  const short = name.split(' (')[0];
  if(kind === 'effect'){ roll(firstDice(effect), 0, `${short}: эффект`, {noCrit:true, note:effect}); return; }
  const value = {attack:atk, defense:def, speed:spd, perception:per}[kind];
  roll({count:1, sides:10, bonus:0}, value, `${short}: ${iceRolls[kind][1]}`, {crits:true, note:iceRolls[kind][2]});
}

// --- Картинка архитектуры ---
// Режимы: full — всё (номер, что на этаже, СЛ, статы ЛЬДА), icons — значки без текста, blank — только строение.
const imageModes = [['full','С текстом: этажи, СЛ, ЛЁД'], ['icons','Значки без текста'], ['blank','Только строение']];
const imageOptions = {};
const imageOpts = n => imageOptions[n] || (imageOptions[n] = {mode:'full', numbers:true, transparent:false});
const kindColors = {'Пароль':'#f5c542', 'Файл':'#3fd0ff', 'Узел управления':'#45e08a', 'Чёрный ЛЁД':'#ff2d55', 'Демон':'#c35bff', 'Другое':'#c9c4be', 'Пусто':'#6b6b6b'};
const BRAND = '#e52b32';
const FONT = 'Tektur, Arial, sans-serif';

// Этажи → колонки: основная ветка слева, ответвления правее; ветка, отходящая ниже, — ближе к основной,
// чтобы соединительные линии не пересекали другие колонки.
function netLayout(net){
  const groups = new Map();
  net.floors.forEach(f=>{
    const key = `${f[1]}|${num(f[0])}`;
    if(!groups.has(key)) groups.set(key, {branch:f[1], floor:num(f[0]), rows:[]});
    groups.get(key).rows.push(f);
  });
  const byBranch = {};
  groups.forEach(g=>{ (byBranch[g.branch] = byBranch[g.branch] || []).push(g); });
  Object.values(byBranch).forEach(list=>list.sort((a,b)=>a.floor - b.floor));
  const branches = Object.keys(byBranch);
  const main = branches.includes('А') ? 'А' : branches.includes('') ? '' : branches.sort((a,b)=>byBranch[b].length - byBranch[a].length)[0];
  const side = branches.filter(b=>b !== main).sort((a,b)=>(byBranch[b][0]?.floor || 0) - (byBranch[a][0]?.floor || 0));
  const columns = [main, ...side].filter(b=>b !== undefined).map(b=>({branch:b, groups:byBranch[b]}));
  const deepest = columns.reduce((best, c)=>!best || c.groups.length > best.groups.length ? c : best, null);
  const maxFloor = Math.max(1, ...net.floors.map(f=>num(f[0])));
  return {columns, deepest, maxFloor};
}
const groupLines = g => g.rows.map(f=>{
  const dv = isBlank(f[3]) ? '' : `СЛ ${f[3]}`;
  if(f[2] === 'Чёрный ЛЁД'){
    const ice = parseIce(f[4]);
    if(!ice) return f[4] || 'Чёрный ЛЁД';
    return `${ice.name.split(' (')[0]}  ·  ВСП ${ice.stats[0]}  СКО ${ice.stats[1]}  АТК ${ice.stats[2]}  ЗАЩ ${ice.stats[3]}${isBlank(f[6]) ? '' : `  REZ ${f[5] || 0}/${f[6]}`}`;
  }
  return [dv, f[4]].filter(Boolean).join('  ·  ') || '';
});
const groupKind = g => g.rows.some(f=>f[2] === 'Чёрный ЛЁД') ? 'Чёрный ЛЁД' : g.rows[0][2];
const kindTitle = (g) => {
  const ices = g.rows.filter(f=>f[2] === 'Чёрный ЛЁД').length;
  return ices > 1 ? `ЧЁРНЫЙ ЛЁД ×${ices}` : groupKind(g).toUpperCase();
};

function chamfer(ctx, x, y, w, h, c){
  ctx.beginPath();
  ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c);
  ctx.closePath();
}
function fitText(ctx, text, width){
  if(ctx.measureText(text).width <= width) return text;
  let t = text;
  while(t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t}…`;
}
// Значки этажей, нарисованные линиями: замок, файл, узел, череп ЛЬДА, рогатый демон.
function glyph(ctx, kind, cx, cy, s, color){
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, s / 9);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const r = s / 2;
  if(kind === 'Пароль'){
    ctx.strokeRect(cx - r * .75, cy - r * .1, r * 1.5, r * 1.05);
    ctx.beginPath(); ctx.arc(cx, cy - r * .1, r * .45, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + r * .35, r * .14, 0, Math.PI * 2); ctx.fill();
  } else if(kind === 'Файл'){
    ctx.beginPath(); ctx.moveTo(cx - r * .6, cy - r); ctx.lineTo(cx + r * .25, cy - r); ctx.lineTo(cx + r * .6, cy - r * .6);
    ctx.lineTo(cx + r * .6, cy + r); ctx.lineTo(cx - r * .6, cy + r); ctx.closePath(); ctx.stroke();
    [-.15, .2, .55].forEach(k=>{ ctx.beginPath(); ctx.moveTo(cx - r * .35, cy + r * k); ctx.lineTo(cx + r * .35, cy + r * k); ctx.stroke(); });
  } else if(kind === 'Узел управления'){
    const pts = [[0, -.8], [.75, .45], [-.75, .45]];
    pts.forEach(([px, py])=>{ ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + px * r, cy + py * r); ctx.stroke(); });
    pts.forEach(([px, py])=>{ ctx.beginPath(); ctx.arc(cx + px * r, cy + py * r, r * .2, 0, Math.PI * 2); ctx.fill(); });
    ctx.beginPath(); ctx.arc(cx, cy, r * .3, 0, Math.PI * 2); ctx.stroke();
  } else if(kind === 'Чёрный ЛЁД' || kind === 'Демон'){
    ctx.beginPath(); ctx.arc(cx, cy - r * .15, r * .7, Math.PI * .85, Math.PI * .15); ctx.lineTo(cx + r * .4, cy + r * .85); ctx.lineTo(cx - r * .4, cy + r * .85); ctx.closePath(); ctx.stroke();
    [-1, 1].forEach(k=>{ ctx.beginPath(); ctx.arc(cx + k * r * .28, cy - r * .1, r * .16, 0, Math.PI * 2); ctx.fill(); });
    if(kind === 'Демон') [-1, 1].forEach(k=>{ ctx.beginPath(); ctx.moveTo(cx + k * r * .45, cy - r * .6); ctx.lineTo(cx + k * r * .85, cy - r * 1.1); ctx.lineTo(cx + k * r * .2, cy - r * .8); ctx.stroke(); });
  } else if(kind === 'Пусто'){
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, r * .7, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx, cy - r * .8); ctx.lineTo(cx + r * .8, cy); ctx.lineTo(cx, cy + r * .8); ctx.lineTo(cx - r * .8, cy); ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}
function glow(ctx, color, blur){ ctx.shadowColor = color; ctx.shadowBlur = blur; }

function drawArchitecture(net, opts){
  const {columns, deepest, maxFloor} = netLayout(net);
  const full = opts.mode === 'full', icons = opts.mode === 'icons';
  const maxRows = Math.max(1, ...columns.flatMap(c=>c.groups.map(g=>g.rows.length)));
  const CELL_W = full ? 440 : icons ? Math.max(170, 74 + maxRows * 40) : 260;
  const CELL_H = full ? 46 + 20 * maxRows : icons ? 64 : 64;
  const GAP_Y = 34, GAP_X = full ? 90 : 70, PAD = 40;
  const TITLE = full ? 64 : 0, ACCESS = 70;
  const width = PAD * 2 + columns.length * CELL_W + (columns.length - 1) * GAP_X;
  const height = PAD * 2 + TITLE + ACCESS + maxFloor * (CELL_H + GAP_Y) + 50;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale; canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  if(!opts.transparent){
    ctx.fillStyle = '#08090a'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(229,43,50,.07)'; ctx.lineWidth = 1;
    for(let x = 0; x < width; x += 24){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for(let y = 0; y < height; y += 24){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }
  const colX = k => PAD + k * (CELL_W + GAP_X);
  const rowY = floor => PAD + TITLE + ACCESS + (floor - 1) * (CELL_H + GAP_Y);
  if(full){
    ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`; ctx.textBaseline = 'top';
    ctx.fillText(fitText(ctx, (net.name || 'Архитектура').toUpperCase(), width - PAD * 2), PAD, PAD);
    ctx.fillStyle = BRAND; ctx.font = `700 12px ${FONT}`;
    const diff = net.difficulty ? `${netDifficulties[net.difficulty][0].toUpperCase()} · СЛ ${netDifficulties[net.difficulty][1]}` : 'АРХИТЕКТУРА СЕТИ';
    ctx.fillText(`${diff}${net.demon ? ` · ДЕМОН: ${demons[net.demon][0].toUpperCase()}` : ''}`, PAD, PAD + 32);
  }
  const line = (points, color = BRAND) => {
    ctx.save(); glow(ctx, color, 8); ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); points.forEach(([x, y], i)=>i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
  };
  const pulse = (x, y) => { ctx.save(); ctx.fillStyle = '#fff'; glow(ctx, BRAND, 10); ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill(); ctx.restore(); };
  // Точка доступа над первым этажом основной ветки.
  const mainX = colX(0) + CELL_W / 2;
  const accessY = PAD + TITLE + 18;
  line([[mainX, accessY + 14], [mainX, rowY(columns[0]?.groups[0]?.floor || 1)]]);
  ctx.save(); glow(ctx, BRAND, 16); ctx.fillStyle = '#08090a'; ctx.strokeStyle = BRAND; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(mainX, accessY, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.fillStyle = BRAND; ctx.beginPath(); ctx.arc(mainX, accessY, 5, 0, Math.PI * 2); ctx.fill();
  if(full){ ctx.fillStyle = '#fff'; ctx.font = `700 11px ${FONT}`; ctx.textBaseline = 'middle'; ctx.fillText('ТОЧКА ДОСТУПА', mainX + 24, accessY); }
  // Связи: по ветке сверху вниз, ответвление — от этажа, после которого оно начинается.
  columns.forEach((col, k)=>{
    const x = colX(k) + CELL_W / 2;
    col.groups.forEach((g, i)=>{
      const next = col.groups[i + 1];
      if(next){ line([[x, rowY(g.floor) + CELL_H], [x, rowY(next.floor)]]); pulse(x, (rowY(g.floor) + CELL_H + rowY(next.floor)) / 2); }
    });
    if(k > 0 && col.groups.length){
      const from = col.groups[0].floor - 1;
      const parent = columns.slice(0, k).find(c=>c.groups.some(g=>g.floor === from)) || columns[0];
      const parentK = columns.indexOf(parent);
      const y = rowY(Math.max(1, from)) + CELL_H / 2;
      line([[colX(parentK) + CELL_W, y], [x, y], [x, rowY(col.groups[0].floor)]]);
      pulse((colX(parentK) + CELL_W + x) / 2, y);
    }
  });
  // Этажи.
  columns.forEach((col, k)=>col.groups.forEach(g=>{
    const x = colX(k), y = rowY(g.floor);
    const kind = groupKind(g);
    const color = opts.mode === 'blank' ? BRAND : kindColors[kind] || BRAND;
    const done = g.rows.every(f=>f[7] === 'true');
    ctx.save();
    ctx.globalAlpha = full && done ? .45 : 1;
    glow(ctx, color, 14);
    chamfer(ctx, x, y, CELL_W, CELL_H, 12);
    ctx.fillStyle = 'rgba(18,19,22,.95)'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color; ctx.fillRect(x, y + 12, 5, CELL_H - 12);
    ctx.textBaseline = 'middle';
    const numW = opts.numbers || full ? 56 : 0;
    if(numW){
      ctx.fillStyle = '#fff'; ctx.font = `700 ${full ? 26 : 22}px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(String(g.floor).padStart(2, '0'), x + 6 + numW / 2, y + (full ? 26 : CELL_H / 2));
      if(full){ ctx.font = `700 9px ${FONT}`; ctx.fillStyle = '#9a9693'; ctx.fillText(g.branch ? `ЭТАЖ · ${g.branch}` : 'ЭТАЖ', x + 6 + numW / 2, y + 46); }
      ctx.textAlign = 'left';
    }
    const left = x + 12 + numW;
    if(full){
      ctx.fillStyle = color; ctx.font = `700 13px ${FONT}`;
      ctx.fillText(kindTitle(g), left, y + 18);
      if(done){ ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText('✓ ПРОЙДЕН', x + CELL_W - 14, y + 18); ctx.textAlign = 'left'; }
      ctx.fillStyle = '#e8e4df'; ctx.font = `400 12px ${FONT}`;
      groupLines(g).forEach((text, i)=>{ if(text) ctx.fillText(fitText(ctx, text, CELL_W - (left - x) - 14), left, y + 40 + i * 20); });
    } else if(icons){
      g.rows.forEach((f, i)=>glyph(ctx, f[2], left + 16 + i * 40, y + CELL_H / 2, 26, kindColors[f[2]] || BRAND));
    }
    ctx.restore();
  }));
  // «Дно» самой длинной ветки — сюда нетраннер оставляет Вирус.
  const last = deepest?.groups[deepest.groups.length - 1];
  if(last){
    const k = columns.indexOf(deepest);
    const x = colX(k) + CELL_W / 2, y = rowY(last.floor) + CELL_H + 26;
    line([[x, rowY(last.floor) + CELL_H], [x, y - 10]]);
    ctx.save(); glow(ctx, BRAND, 16); ctx.fillStyle = BRAND;
    ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 12, y); ctx.closePath(); ctx.fill(); ctx.restore();
    if(full){ ctx.fillStyle = '#fff'; ctx.font = `700 11px ${FONT}`; ctx.textBaseline = 'middle'; ctx.fillText('ДНО · ВИРУС', x + 22, y); }
  }
  return canvas;
}

let fontReady = null;
function drawNetImages(){
  fontReady = fontReady || (document.fonts?.load ? Promise.all([document.fonts.load(`700 16px Tektur`), document.fonts.load(`400 12px Tektur`)]).catch(()=>{}) : Promise.resolve());
  $$('[data-image-box]').forEach(box=>{
    const n = Number(box.dataset.imageBox);
    const o = imageOpts(n);
    box.innerHTML = `<div class="net-image-tools">
        <select data-img-opt="${n}" data-k="mode" aria-label="Что рисовать">${options(imageModes, o.mode)}</select>
        <label><input type="checkbox" data-img-opt="${n}" data-k="numbers"${o.numbers ? ' checked' : ''}> номера этажей</label>
        <label><input type="checkbox" data-img-opt="${n}" data-k="transparent"${o.transparent ? ' checked' : ''}> прозрачный фон</label>
        <button type="button" class="quick-roll" data-img-save="${n}">СКАЧАТЬ PNG</button>
        <button type="button" class="add-row" data-img-copy="${n}" title="Скопировать картинку и вставить в Owlbear через Ctrl+V">КОПИРОВАТЬ</button>
      </div>
      <div class="net-image-view"></div>`;
    fontReady.then(()=>{
      if(!state.nets[n]) return;
      const canvas = drawArchitecture(state.nets[n], o);
      canvas.className = 'net-canvas';
      canvas.style.width = `${canvas.width / 2}px`;
      box.querySelector('.net-image-view').replaceChildren(canvas);
    });
  });
}
const imageFileName = n => `${(state.nets[n].name || 'architecture').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'architecture'}-${imageOpts(n).mode}.png`;
function imageBlob(n){
  return new Promise(resolve=>drawArchitecture(state.nets[n], imageOpts(n)).toBlob(resolve, 'image/png'));
}

$('#netSearch').addEventListener('input', filterNetRef);
$('#netDifficulty').addEventListener('change', renderDifficultyGuide);
$('#netRef').addEventListener('click', ev=>{
  const el = ev.target.closest('button');
  if(el?.dataset.progRoll) programRoll(el.dataset.progRoll, el.dataset.kind);
  if(el?.dataset.iceRef) iceRefRoll(el.dataset.iceRef, el.dataset.kind);
});
$('#netList').addEventListener('change', ev=>{
  const el = ev.target;
  if(el.dataset.imgOpt === undefined) return;
  const o = imageOpts(Number(el.dataset.imgOpt));
  o[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
  drawNetImages();
});
$('#netList').addEventListener('click', async ev=>{
  const el = ev.target.closest('button');
  if(!el) return;
  if(el.dataset.imgSave !== undefined){
    const n = Number(el.dataset.imgSave);
    const blob = await imageBlob(n);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = imageFileName(n);
    a.click();
    URL.revokeObjectURL(a.href);
  }
  if(el.dataset.imgCopy !== undefined){
    try {
      const blob = await imageBlob(Number(el.dataset.imgCopy));
      await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
      toast('Картинка скопирована: вставьте её в Owlbear через Ctrl+V');
    } catch {
      toast('Браузер не дал скопировать картинку — используйте «СКАЧАТЬ PNG»');
    }
  }
});

renderNetRef();
drawNetImages();
