// Вкладка «Справочник» листа Мастера: роли с ползунком ранга, СТАТы и навыки, бестиарий книги,
// наркотики и препараты, киберимпланты. Данные — ../data.js и ref-data.js; общие функции — dm.js и rules.js.

// --- Роли ---
const roleTier = (list, rank) => [...list].reverse().find(row=>rank >= row[0]) || list[0];
const lockList = items => `<ul class="role-points">${items.map(([on, html])=>`<li class="${on ? '' : 'is-locked'}">${html}</li>`).join('')}</ul>`;
// Что даёт ранг: по таблицам роли из книги.
function rankPerks(id, rank){
  if(id === 'rockerboy'){
    const [, venue, ...effects] = roleTier(rockerTiers, rank);
    return `<p><b>Где выступает:</b> ${esc(venue)}</p>` + lockList(Object.values(rockerTargets).map(([name, dv], i)=>[true, `<b>${esc(name)} (СЛ ${dv}):</b> ${esc(effects[i])}`]));
  }
  if(id === 'solo') return `<p><b>Очков Боевого чутья:</b> ${rank}. Распределяются перед инициативой или действием в бою.</p>`
    + lockList(roles.solo.specialties.map(s=>[true, `<b>${esc(s.name)}</b> — ${s.cost} очк. за уровень${s.max ? `, максимум ${s.max}` : ''}: ${esc(s.effect)}`]));
  if(id === 'netrunner'){
    const actions = netActionsByRank.find(([r])=>{ const [a, b] = r.split('–').map(Number); return rank >= a && rank <= (b || a); })?.[1];
    return `<p><b>Сетевых действий за ход:</b> ${actions}. Ко всем функциям Интерфейса: +${rank}.</p>` + lockList(roles.netrunner.interfaceAbilities.map(([, name, text])=>[true, `<b>${esc(name)}</b> — ${esc(text)}`]));
  }
  if(id === 'tech') return `<p><b>Очков специализаций:</b> ${rank * 2} (по 1 в две разные за ранг).</p>` + lockList(roles.tech.specialties.map(s=>[true, `<b>${esc(s.name)}</b>: ${esc(s.effect)}`]))
    + table(['Цена предмета', 'СЛ', 'Время'], Object.values(priceCategories).map(([n, dv, t])=>[n, dv, t]));
  if(id === 'medtech') return `<p><b>Очков Медицины:</b> ${rank}: Хирургия (+2 за очко), Фармацевтика и Криосистемы (+1 к Медтехнологиям), в каждую не больше 5.</p>`
    + lockList(Object.values(medDrugs).map(([n, t])=>[true, `<b>${esc(n)}</b>: ${esc(t)}`]));
  if(id === 'media'){
    const [, access, audience, chance, impact] = roleTier(mediaTiers, rank);
    return lockList([[true, `<b>Аудитория поверит:</b> ${chance} из 10`], [true, `<b>Доступ к источникам:</b> ${esc(access)}`], [true, `<b>Аудитория:</b> ${esc(audience)}`], [true, `<b>Влияние:</b> ${esc(impact)}`]])
      + table(['Слух', 'Что даёт', 'СЛ пассивно', 'СЛ поиска'], Object.values(rumorTiers).map(([n, t, a, b])=>[n, t, a, b]));
  }
  if(id === 'exec') return lockList(execPerks.map(([from, text])=>[rank >= from, `<b>Ранг ${from}:</b> ${esc(text)}`]))
    + `<p class="muted">Подчинённые: ${Object.values(execSubordinates).map(s=>s.name).join(', ')}.</p>`;
  if(id === 'lawman') return table(['Ранг', 'Кто приезжает', 'БН', 'ОС', 'ПЗ', 'СКО/ТЕЛ'], lawmanBackup.map(([from, to, who, bn, sp, hp, move])=>[`<span class="${rank >= from ? '' : 'is-locked'}">${from === to ? from : `${from}–${to}`}</span>`, esc(who), bn, sp, hp, move]))
    + '<p class="muted">Вызов — действие: d10 ≤ ранг — откликнулись, d6 — через сколько раундов; на 6 прибывает подкрепление уровнем выше.</p>';
  if(id === 'fixer'){
    const [, contacts, goods, haggle, culture] = roleTier(fixerTiers, rank);
    return lockList([[true, `<b>Связи:</b> ${esc(contacts)}`], [true, `<b>Можно достать:</b> ${esc(goods)}`], [true, `<b>Торг:</b> ${esc(haggle)}`], [true, `<b>Свой чел:</b> ${esc(culture)}`]]);
  }
  if(id === 'nomad') return `<p><b>Бонус к вождению и ТЕХ-навыкам транспорта:</b> +${rank}.</p><p><b>Доступный транспорт:</b> ${Object.values(vehicleTypes).filter(v=>rank >= v[5]).map(v=>esc(v[0])).join(', ')}</p>`
    + lockList(nomadUpgrades.map(([name, from, kind])=>[rank >= from, `${esc(name)} <small>— ранг ${from}, ${esc(kind)}</small>`]));
  return '';
}
const refRole = {id:'solo', rank:4};
function renderRole(){
  const {id, rank} = refRole;
  const role = roles[id], memo = roleMemos[id];
  $('#roleCard').innerHTML = `<div class="role-card-head"><b>${esc(role.name)}</b><span>${esc(role.ability)} · ранг ${rank}</span></div>
    <p>${esc(memo.does)}</p>
    <p class="muted">${esc(role.text)}</p>
    <h3>Что бросать</h3>${list(memo.roll.map(esc))}
    <h3>На ранге ${rank}</h3>${rankPerks(id, rank)}
    <h3>Советы Мастеру</h3>${list(memo.tips.map(esc))}`;
  $('#roleRankOut').textContent = rank;
  $$('[data-ref-role]').forEach(b=>b.classList.toggle('active', b.dataset.refRole === id));
}
// Игроки из таблицы «Игроки»: роль и ранг берутся из колонки «Роль» («Соло 4»).
function playerRoleButtons(){
  return state.players.flatMap(row=>parsePlayerRoles(row[2]).map(({id, rank})=>
    `<button type="button" class="add-row" data-player-role="${id}" data-rank="${rank || 4}">${esc(row[1] || row[0] || 'Игрок')}: ${esc(roles[id].name)} ${rank}</button>`)).join('');
}

// --- Бестиарий книги ---
const skillRows = text => text.replace(/^С учётом[^:]*:\s*/, '').split(/,\s*/).map(part=>part.trim().match(/^(.*?)\s+(\d+)$/)).filter(Boolean).map(m=>[m[1], m[2]]);
function bookEnemy(b){
  const e = blankEnemy();
  e.name = b.name;
  e.kind = b.tier;
  e.stats = b.stats.map(String);
  e.hpMax = String(b.hp);
  e.armor = b.armor;
  e.headSp = e.headSpMax = e.bodySp = e.bodySpMax = String(b.sp);
  e.weapons = b.weapons.map(([name, base, type, auto, note])=>{
    const w = allWeapons[type];
    const mag = /гранатомёт/i.test(name) && note ? '1' : w[3];
    return [name, String(base), w[2], w[4], mag, mag, type, auto ? String(auto) : ''];
  });
  e.skills = skillRows(b.skills);
  e.gear = b.gear;
  if(b.init) e.implants = [{name:'Керезников', kind:'cyber'}];
  e.notes = b.weapons.filter(w=>w[4]).map(w=>`${w[0]}: ${w[4]}`).join('\n');
  return normalizeEnemy(e);
}
function bestiaryHtml(){
  return `<p class="muted">${Object.entries(bestiaryTiers).map(([t, d])=>`<b>${t}</b> — ${d}`).join('. ')}. Суммы навыков уже включают СТАТ; у этих NPC нет ролей и Удачи, если не сказано иное.</p>
    <div class="book-bestiary">${bookBestiary.map((b, i)=>`<article class="book-enemy">
      <header><b>${esc(b.name)}</b><span class="tier tier-${plain(b.tier).replace(/\s+/g, '-')}">${esc(b.tier)}</span></header>
      <div class="template-stats">${stats.map((n, s)=>`<span><small>${n}</small>${b.stats[s] || '—'}</span>`).join('')}</div>
      <p><b>ПЗ</b> ${b.hp} · <b>ранение</b> ${Math.ceil(b.hp / 2)} · <b>SP</b> ${b.sp}${b.armor ? ` (${esc(armorPresets[b.armor][0])})` : ' (подкожная)'}</p>
      <p><b>Оружие:</b> ${b.weapons.map(([n, base, type])=>`${esc(n)} ${esc(allWeapons[type][2])} (атака ${base})`).join(', ')}</p>
      <details><summary>Навыки и снаряжение</summary><p>${esc(b.skills)}</p><p><b>Снаряжение:</b> ${esc(b.gear)}</p></details>
      <div class="enemy-row-add"><input type="number" min="1" max="20" value="1" data-book-count="${i}" aria-label="Количество"><button type="button" class="quick-roll" data-book-spawn="${i}">В БОЙ</button><button type="button" class="add-row" data-book-template="${i}" title="Сохранить в «Бестиарий и сцены», чтобы править">★ В ШАБЛОНЫ</button></div>
    </article>`).join('')}</div>`;
}
function spawnBook(i, count){
  const b = bookBestiary[i];
  const n = Math.max(1, Math.min(20, Math.floor(num(count)) || 1));
  const existing = state.enemies.filter(e=>e.name.startsWith(b.name)).length;
  for(let k = 0; k < n; k++){
    const e = bookEnemy(b);
    if(n > 1 || existing) e.name = `${b.name} ${existing + k + 1}`;
    state.enemies.push(e);
  }
  renderCombat();
  toast(`${b.name}: выставлено ${n}`);
}

// --- Импланты и препараты на противнике ---
const implantHasFx = fx => fx && ['init','stat','statMin','sp','weapon','skill','ignoreWound','move'].some(k=>fx[k]);
const implantOptions = () => `<option value="">+ имплант / наркотик…</option>${Object.entries(cyberCatalog).map(([group, items])=>`<optgroup label="${esc(group)}">${items.map(it=>`<option value="cyber:${esc(it[0])}">${esc(it[0])}${implantHasFx(it[5]) ? ' ★' : ''}</option>`).join('')}</optgroup>`).join('')}<optgroup label="Уличные наркотики">${streetDrugs.map(d=>`<option value="drug:${esc(d[0])}">${esc(d[0])} ★</option>`).join('')}</optgroup>`;
// Разовые эффекты при установке: броня, оружие, навыки. Постоянные (СТАТы, инициатива, боль) считаются в stat() и checkPenalty().
function installImplant(e, kind, name){
  const fx = (kind === 'drug' ? drugIndex[name] : cyberIndex[name])?.fx || {};
  const notes = [];
  if(fx.sp){
    ['head', 'body'].forEach(z=>{ if(num(e[`${z}Sp`]) < fx.sp){ e[`${z}Sp`] = String(fx.sp); e[`${z}SpMax`] = String(Math.max(fx.sp, num(e[`${z}SpMax`]))); } });
    notes.push(`SP ${fx.sp}`);
  }
  if(fx.weapon){
    const [wname, type, mag] = fx.weapon;
    const w = allWeapons[type];
    const melee = /ближнего/.test(w[1]);
    const skill = e.skills.find(s=>plain(s[0]).startsWith(plain(melee ? 'Оружие ближ' : w[1].split(' ')[0])));
    const base = skill ? skill[1] : String(stat(e, melee ? STAT_DEX : STAT_REF));
    e.weapons.push([wname, base, w[2], w[4], mag ? String(mag) : w[3], mag ? String(mag) : w[3], type, '']);
    notes.push(`оружие: ${wname} ${w[2]}`);
  }
  if(fx.skill){
    const [names, bonus] = fx.skill;
    const hit = e.skills.filter(s=>names.split('|').some(n=>plain(s[0]).startsWith(plain(n))));
    hit.forEach(s=>{ s[1] = String(num(s[1]) + bonus); });
    notes.push(hit.length ? `${hit.map(s=>s[0]).join(', ')} +${bonus}` : `${names.replace('|', ', ')} +${bonus} (навыка нет в списке)`);
  }
  if(fx.note) notes.push(fx.note);
  e.implants.push({name, kind});
  addLog({kind:'text', tag:kind === 'drug' ? 'НАРКОТИК' : 'ИМПЛАНТ', text:`${enemyName(e)}: ${name}${notes.length ? ` — ${notes.join('; ')}` : ''}`});
}
// Чипы на карточке: что стоит у противника и что это меняет.
function implantBlock(i, e){
  const chips = e.implants.map((imp, k)=>{
    const info = imp.kind === 'drug' ? streetDrugs.find(d=>d[0] === imp.name) : cyberIndex[imp.name]?.item;
    const hint = info ? (imp.kind === 'drug' ? `${info[4]} (${info[2]})` : info[2]) : '';
    return `<span class="injury-chip implant-chip${imp.kind === 'drug' ? ' is-drug' : ''}" title="${esc(hint)}">${esc(imp.name)}<button type="button" data-act="delImplant" data-i="${i}" data-j="${k}" aria-label="Убрать">×</button></span>`;
  }).join('');
  const changed = stats.map((n, s)=>stat(e, s) !== num(e.stats[s]) ? `${n} ${stat(e, s)}` : '').filter(Boolean);
  const extras = [...changed, initBonus(e) && `инициатива +${initBonus(e)}`, ignoresWound(e) && 'без штрафа тяжёлого ранения'].filter(Boolean);
  return `<div class="enemy-injuries"><span class="injury-title">ИМПЛАНТЫ</span>${chips || '<span class="muted">нет</span>'}<select data-act="addImplant" data-i="${i}" aria-label="Имплант или наркотик">${implantOptions()}</select></div>${extras.length ? `<p class="injury-effects implant-effects">Действует: ${extras.join(' · ')}</p>` : ''}`;
}

// --- Разметка вкладки ---
function refHtml(){
  const statRows = statInfo.map(([s, n, g, t])=>[`<b>${s}</b>`, n, g, t]);
  const skills = Object.entries(skillCategories).map(([cat, list])=>`<h3>${esc(cat)}</h3>` + table(['Навык', 'СТАТ', 'Что это', '10', '14', '18'],
    list.map(([name, st])=>{ const info = skillInfo[name] || ['', '', '', '']; return [`<b>${esc(name)}</b>`, `<span class="has-tip" data-tip="${esc(statTitle(st))}">${statAliases[st] || st}</span>`, esc(info[0]), esc(info[1]), esc(info[2]), esc(info[3])]; }), 'skill-ref-table')).join('');
  const cyberFx = fx => fx && ['init','stat','statMin','sp','weapon','skill','ignoreWound','move'].some(k=>fx[k]);
  const cyber = Object.entries(cyberCatalog).map(([group, items])=>`<h3>${esc(group)}</h3>` + table(['Имплант', 'Установка', 'Что делает', 'Цена', 'Потеря Человечности', 'На враге'],
    items.map(([n, inst, t, p, h, fx])=>[`<b>${esc(n)}</b>`, inst, esc(t), p, h, cyberFx(fx) ? '★' : '']), 'cyber-ref-table')).join('');
  return [
    section('roles', 'РОЛИ И РАНГИ', 'стр. 143–165',
      `<div class="role-picker">${Object.entries(roles).map(([id, r])=>`<button type="button" class="add-row" data-ref-role="${id}">${esc(r.name)}</button>`).join('')}</div>
      <div class="role-rank"><label>Ранг <b id="roleRankOut">4</b><input type="range" id="roleRank" min="1" max="10" value="4"></label><span class="role-players" id="rolePlayers"></span></div>
      <div id="roleCard" class="role-card"></div>
      <p class="muted">Ранг ролевой способности повышается за ОУ: 60 × новый ранг. При создании персонажа — ранг 4. Советы — от листа, не из книги.</p>`, true),
    section('stats', 'СТАТЫ И НАВЫКИ', 'стр. 72, 128–142',
      `<h3>Что бросить</h3>${table(['Ситуация', 'Проверка', 'Ориентир'], situationChecks.map(([a, b, c])=>[esc(a), `<b>${esc(b)}</b>`, esc(c)]))}
      <h3>СТАТы</h3>${table(['СТАТ', 'Название', 'Группа', 'Что значит'], statRows)}
      ${table(['Производное', 'Как считается'], derivedStats)}
      <p class="muted">Проверка: СТАТ + навык + 1d10. Без навыка — только СТАТ + 1d10. Навыки (x2) стоят вдвое дороже. Колонки 10 / 14 / 18 — каким специалистом персонаж выглядит с такой суммой СТАТ + навык.</p>
      ${skills}`),
    section('bestiary', 'БЕСТИАРИЙ КНИГИ', 'стр. 412–416', bestiaryHtml()),
    section('drugs', 'НАРКОТИКИ, ПРЕПАРАТЫ, ЯДЫ', 'стр. 149–150, 227–230, 355–357',
      list(drugRules)
      + table(['Наркотик', 'Цена', 'Действует', 'СЛ', 'Основной эффект', 'Вторичный эффект (зависимость)', ''], streetDrugs.map(([n, p, t, dv, a, b], k)=>[`<b>${n}</b>`, p, t, dv, esc(a), esc(b), `<button type="button" class="weapon-btn" data-drug-check="${k}" title="ВОЛЯ + Сопрот. пыткам/наркотикам + 1d10 против СЛ">ЗАВИСИМОСТЬ</button>`]))
      + '<h3>Препараты медтехника (синтез: Медтехнологии СЛ 13, час, 200eb)</h3>' + table(['Препарат', 'Эффект'], Object.values(medDrugs).map(([n, t])=>[`<b>${n}</b>`, esc(t)]))
      + '<h3>Яды для клинков</h3>' + table(['Флакон', 'Цена', 'Эффект'], bladePoisons)
      + '<h3>Терапия</h3>' + table(['Терапия', 'Что это', 'Цена', 'Эффект', 'СЛ Медтехнологий'], therapies)
      + '<p class="muted">Наркотик можно дать противнику: «+ имплант / наркотик» на его карточке. Буст и Синтококс сами меняют СТАТы, Чёрное кружево снимает штраф тяжёлого ранения.</p>'),
    section('cyber', 'КИБЕРИМПЛАНТЫ', 'стр. 358–367',
      list(cyberRules) + `<p class="muted">★ — лист сам применяет эффект к противнику: «+ имплант / наркотик» на карточке врага. СТАТы, инициатива и боль считаются, пока имплант стоит; броня, оружие и навыки добавляются при установке.</p>` + cyber)
  ].join('');
}
function renderRef(){
  $('#refList').innerHTML = refHtml();
  $('#rolePlayers').innerHTML = playerRoleButtons();
  renderRole();
}
function filterRef(){
  const q = plain($('#refSearch').value);
  $$('#refList .rules-section').forEach(sec=>{
    const match = !q || plain(sec.textContent).includes(q);
    sec.hidden = !match;
    if(q && match) sec.open = true;
    // внутри раздела прячем строки таблиц, где нет совпадения
    sec.querySelectorAll('tbody tr').forEach(tr=>{ tr.hidden = q && !plain(tr.textContent).includes(q) && !plain(sec.querySelector('summary').textContent).includes(q); });
  });
  highlightSearch($('#refList'), q);
}

$('#refSearch').addEventListener('input', filterRef);
$('#refToggle').addEventListener('click', ()=>{
  const sections = $$('#refList .rules-section').filter(sec=>!sec.hidden);
  const open = !sections.every(sec=>sec.open);
  sections.forEach(sec=>{ sec.open = open; });
});
$('#refList').addEventListener('input', ev=>{
  if(ev.target.id === 'roleRank'){ refRole.rank = num(ev.target.value); renderRole(); }
});
$('#refList').addEventListener('click', ev=>{
  const el = ev.target.closest('button');
  if(!el) return;
  if(el.dataset.refRole){ refRole.id = el.dataset.refRole; renderRole(); }
  if(el.dataset.playerRole){ refRole.id = el.dataset.playerRole; refRole.rank = Math.max(1, Math.min(10, num(el.dataset.rank) || 4)); $('#roleRank').value = refRole.rank; renderRole(); }
  if(el.dataset.bookSpawn !== undefined){ spawnBook(Number(el.dataset.bookSpawn), $(`[data-book-count="${el.dataset.bookSpawn}"]`).value); activateTab('enemies'); }
  if(el.dataset.bookTemplate !== undefined){
    const t = bookEnemy(bookBestiary[Number(el.dataset.bookTemplate)]);
    const at = state.templates.findIndex(x=>x.name === t.name);
    if(at >= 0) state.templates[at] = t; else state.templates.push(t);
    renderTemplates(); save();
    toast(`${t.name}: в шаблонах бестиария`);
  }
  if(el.dataset.drugCheck !== undefined){
    const [name, , , dv] = streetDrugs[Number(el.dataset.drugCheck)];
    roll({count:1, sides:10, bonus:0}, 0, `${name}: проверка зависимости`, {crits:true, judge: entry => `прибавьте ВОЛЯ + Сопрот. пыткам/наркотикам; нужно больше ${dv}`});
  }
});

// Игроки могли измениться на вкладке «Сессия»: кнопки ролей обновляются при открытии справочника.
document.querySelector('.tab[data-tab="ref"]').addEventListener('click', ()=>{ $('#rolePlayers').innerHTML = playerRoleButtons(); });

renderRef();
