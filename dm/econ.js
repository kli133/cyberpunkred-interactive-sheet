// Вкладка «Экономика» листа Мастера: месячные расходы команды, дела, халтурки, очки улучшения, цены.
// Данные — econ-data.js; общие функции — dm.js ($, esc, roll, state, save, toast) и rules.js (section, table, list).

const roleOptions = value => options([['', 'роль…'], ...Object.entries(roles).map(([id, r])=>[id, r.name])], value);
const housingById = id => housings.find(h=>h[0] === id);
const lifestyleById = id => lifestyles.find(l=>l[0] === id);
const money = n => `${Number(n).toLocaleString('ru-RU')}eb`;
// Корпорат получает жильё и страховку от компании по рангу (стр. 154).
const execPerk = (list, p) => p.roleId === 'exec' ? [...list].reverse().find(([from])=>num(p.rank) >= from)?.[1] || '' : '';
function monthCost(p){
  const freeHome = execPerk(execHousing, p);
  const home = housingById(p.housing);
  const rent = home && typeof home[2] === 'number' && !(freeHome && p.housing === freeHome) ? home[2] : 0;
  const life = lifestyleById(p.lifestyle)?.[3] || 0;
  const freeTrauma = execPerk(execTrauma, p);
  const trauma = p.trauma && p.trauma !== freeTrauma && !(freeTrauma === 'corp' && p.trauma === 'silver') ? traumaPlans.find(t=>t[0] === p.trauma)[2] : 0;
  return {rent, life, trauma, extra:num(p.extra), total:rent + life + trauma + num(p.extra), freeHome, freeTrauma};
}
// Подсказка о деньгах: сколько месяцев протянет игрок при таких тратах.
function moneyHint(p, c){
  if(isBlank(p.cash)) return '';
  const months = c.total ? num(p.cash) / c.total : Infinity;
  if(months < 1) return '<span class="econ-warn">не хватает на месяц — подкиньте дело</span>';
  if(months < 2) return '<span class="econ-warn">хватит на месяц</span>';
  if(months > 6) return '<span class="econ-rich">денег много — Ночной рынок?</span>';
  return `<span class="muted">хватит на ${Math.floor(months)} мес.</span>`;
}
function renderMonth(){
  const people = state.economy.people;
  $('#econMonth').innerHTML = people.map((p, i)=>{
    const c = monthCost(p);
    const home = housingById(p.housing), life = lifestyleById(p.lifestyle);
    const homeLabel = h => `${h[1]} — ${typeof h[2] === 'number' ? (h[2] ? money(h[2]) : 'бесплатно') : 'от корпорации'}`;
    return `<article class="econ-card${p.paid ? ' is-paid' : ''}">
      <header>
        <input data-econ="${i}" data-k="name" value="${esc(p.name)}" placeholder="Персонаж" aria-label="Персонаж">
        <select data-econ="${i}" data-k="roleId" aria-label="Роль">${roleOptions(p.roleId)}</select>
        <label class="econ-rank" title="Ранг ролевой способности">ранг<input type="number" min="1" max="10" data-econ="${i}" data-k="rank" value="${esc(p.rank)}"></label>
        <button type="button" class="remove" data-econ-del="${i}" title="Убрать">×</button>
      </header>
      <div class="econ-fields">
        <label>Жильё<select data-econ="${i}" data-k="housing">${options(housings.map(h=>[h[0], homeLabel(h)]), p.housing)}</select></label>
        <label>Образ жизни<select data-econ="${i}" data-k="lifestyle">${options(lifestyles.map(l=>[l[0], `${l[1]} — ${money(l[3])}`]), p.lifestyle)}</select></label>
        <label>Страховка<select data-econ="${i}" data-k="trauma">${options(traumaPlans.map(([k, n, v])=>[k, v ? `${n} — ${money(v)}` : n]), p.trauma)}</select></label>
        <label>Прочее в месяц<input type="number" min="0" data-econ="${i}" data-k="extra" value="${esc(p.extra)}" placeholder="0"></label>
        <label>Деньги сейчас<input type="number" data-econ="${i}" data-k="cash" value="${esc(p.cash)}" placeholder="?"></label>
      </div>
      <div class="econ-total">В МЕСЯЦ <strong>${money(c.total)}</strong>
        <small>жильё ${money(c.rent)} · еда и досуг ${money(c.life)}${c.trauma ? ` · страховка ${money(c.trauma)}` : ''}${c.extra ? ` · прочее ${money(c.extra)}` : ''}</small>
        ${moneyHint(p, c)}
        <label class="econ-paid"><input type="checkbox" data-econ="${i}" data-k="paid"${p.paid ? ' checked' : ''}> оплачено</label></div>
      ${c.freeHome || c.freeTrauma ? `<p class="econ-perk">Корпорат: ${[c.freeHome && `бесплатно — ${housingById(c.freeHome)[1]}`, c.freeTrauma && `бесплатно — ${traumaPlans.find(t=>t[0] === c.freeTrauma)[1]}`].filter(Boolean).join('; ')}</p>` : ''}
      <details class="econ-perks"><summary>Что даёт уровень жизни</summary>
        <p><b>${esc(home[1])}:</b> ${esc(home[4])}. <i>Бонус (домашнее правило):</i> ${esc(home[5])}.</p>
        <p><b>${esc(life[1])}:</b> ${esc(life[2])}. <i>Бонус (домашнее правило):</i> ${esc(life[4])}.</p>
      </details>
    </article>`;
  }).join('') || '<div class="empty-search">Добавьте игроков: «ИЗ ТАБЛИЦЫ ИГРОКОВ» или «+ ПЕРСОНАЖ».</div>';
  const total = people.reduce((s, p)=>s + monthCost(p).total, 0);
  $('#econSummary').textContent = people.length ? `КОМАНДА В МЕСЯЦ: ${money(total)} · ОПЛАТИЛИ ${people.filter(p=>p.paid).length} ИЗ ${people.length}` : '';
}
const blankPerson = (name = '', roleId = '', rank = 4) => ({name, roleId, rank:String(rank), housing:'container', lifestyle:'kibble', trauma:'', extra:'', cash:'', paid:false});
function peopleFromPlayers(){
  let added = 0;
  state.players.forEach(row=>{
    const name = row[1].trim() || row[0].trim();
    if(!name || state.economy.people.some(p=>p.name === name)) return;
    const m = String(row[2]).trim().match(/^(.*?)\s*(\d+)?$/);
    const roleId = m && Object.keys(roles).find(k=>roles[k].aliases.some(a=>plain(m[1]).startsWith(a))) || '';
    state.economy.people.push(blankPerson(name, roleId, m?.[2] || 4));
    added++;
  });
  renderMonth(); save();
  toast(added ? `Добавлено: ${added}` : 'Новых игроков в таблице «Игроки» нет');
}

// --- Дела, халтурки, ОУ ---
function gigResult(){
  const [name, , , pay] = gigPay[num($('#gigKind').value)];
  const crew = Math.max(1, num($('#gigCrew').value));
  const fixer = num($('#gigFixer').value);
  // Фиксер 5+ — надбавка 20% к вознаграждению; 10 — двойная плата за опасное дело (стр. 160).
  const mult = fixer >= 10 && name === 'Опасное дело' ? 2 : fixer >= 5 ? 1.2 : 1;
  const each = Math.round(pay * mult);
  $('#gigOut').innerHTML = `<b>${money(each)}</b> каждому · <b>${money(each * crew)}</b> всей команде${mult > 1 ? ` <small>(фиксер ×${mult})</small>` : ''}`;
}
function rollHustle(){
  const id = $('#hustleRole').value;
  const rank = num($('#hustleRank').value);
  const col = rank >= 8 ? 3 : rank >= 5 ? 2 : 1;
  const r = d(6);
  const [what, ...pay] = hustles[id][r - 1];
  addLog({kind:'text', tag:'ХАЛТУРКА', text:`${roles[id].name}, ранг ${rank}: 1d6 = ${r} — ${what}. ${money(pay[col - 1])}`});
  $('#hustleOut').innerHTML = `<b>1d6 = ${r}:</b> ${esc(what)} — <strong>${money(pay[col - 1])}</strong>`;
  $$('#hustleTable tbody tr').forEach((tr, k)=>tr.classList.toggle('is-hit', k === r - 1));
}
const hustleTable = id => `<div class="table-scroll"><table class="data-table rules-table" id="hustleTable"><thead><tr><th>1d6</th><th>Что сделали за неделю</th><th>Ранг 1–4</th><th>5–7</th><th>8–10</th></tr></thead><tbody>${hustles[id].map((row, k)=>`<tr><td>${k + 1}</td><td>${esc(row[0])}</td><td>${row[1]}eb</td><td>${row[2]}eb</td><td>${row[3]}eb</td></tr>`).join('')}</tbody></table></div>`;
function renderIp(){
  $('#ipRows').innerHTML = state.economy.people.map((p, i)=>{
    const award = Math.max(num(p.ipGroup), num(p.ipStyleLevel));
    return `<tr><td><b>${esc(p.name || `Персонаж ${i + 1}`)}</b></td>
      <td><select data-econ="${i}" data-k="ipGroup" aria-label="Группа">${options([['', '—'], ...ipTable.map(([v])=>[v, v])], p.ipGroup)}</select></td>
      <td><select data-econ="${i}" data-k="ipStyle" aria-label="Стиль">${options(ipStyles.slice(1).map(s=>[s, s]), p.ipStyle || 'Войны')}</select></td>
      <td><select data-econ="${i}" data-k="ipStyleLevel" aria-label="За стиль">${options([['', '—'], ...ipTable.map(([v])=>[v, v])], p.ipStyleLevel)}</select></td>
      <td class="ip-award">${award ? `${award} ОУ` : '—'}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="empty-cell">Добавьте персонажей в «Месяц команды»</td></tr>';
}
function econHtml(){
  const hustleRole = Object.keys(hustles)[0];
  return [
    section('month', 'МЕСЯЦ КОМАНДЫ: ЖИЛЬЁ И ОБРАЗ ЖИЗНИ', 'стр. 376–379',
      `<div class="econ-toolbar"><button type="button" class="quick-roll" id="econFromPlayers">ИЗ ТАБЛИЦЫ ИГРОКОВ</button><button type="button" class="add-row" id="econAdd">+ ПЕРСОНАЖ</button><button type="button" class="add-row" id="econNewMonth" title="Снять отметки «оплачено» и списать месяц с денег">НОВЫЙ МЕСЯЦ</button><span id="econSummary" class="econ-summary"></span></div>
      <div id="econMonth" class="econ-list"></div>
      ${list(livingRules)}
      <p class="muted">Бонусы за уровень жизни — домашнее правило листа (предложение для DM), в книге их нет. Остальное — по книге.</p>
      ${table(['Образ жизни', 'Что значит', 'В месяц', 'Бонус (домашнее правило)'], lifestyles.map(l=>[`<b>${l[1]}</b>`, l[2], money(l[3]), `<i>${l[4]}</i>`]))}
      ${table(['Жильё', 'Аренда', 'Покупка', 'Что это', 'Бонус (домашнее правило)'], housings.map(h=>[`<b>${h[1]}</b>`, typeof h[2] === 'number' ? (h[2] ? money(h[2]) : '—') : 'платит корпорация', h[3], h[4], `<i>${h[5]}</i>`]))}`, true),
    section('gigs', 'ДЕЛА И ХАЛТУРКИ', 'стр. 381–385',
      `<h3>Плата за дело</h3>
      <div class="chance-controls"><label>Вид дела<select id="gigKind">${options(gigPay.map(([n, , , pay], k)=>[k, `${n} — ${pay}eb каждому`]), 1)}</select></label>
        <label>Эджраннеров<input type="number" id="gigCrew" min="1" value="4"></label>
        <label>Ранг фиксера<input type="number" id="gigFixer" min="0" max="10" value="0"></label></div>
      <p class="gig-out" id="gigOut"></p>
      ${table(['Дело', 'Что ждать', 'Пример', 'Каждому'], gigPay.map(([n, t, e, p])=>[`<b>${n}</b>`, t, `<i>${e}</i>`, money(p)]))}
      <p class="muted">Это лучший сценарий: после покупок и дележа добычи обычно выходит меньше. Фиксер 5+ ранга — +20% к вознаграждению, 10 ранга — двойная плата за опасное дело.</p>
      <h3>Халтурка за неделю</h3><p class="muted">${hustleRules}</p>
      <div class="chance-controls"><label>Роль<select id="hustleRole">${options(Object.keys(hustles).map(id=>[id, roles[id].name]), hustleRole)}</select></label>
        <label>Ранг<input type="number" id="hustleRank" min="1" max="10" value="4"></label>
        <button type="button" class="quick-roll" id="hustleRoll">БРОСИТЬ 1D6</button></div>
      <p class="gig-out" id="hustleOut"></p>
      <div id="hustleTableBox">${hustleTable(hustleRole)}</div>`),
    section('ip', 'ОЧКИ УЛУЧШЕНИЯ', 'стр. 409–411',
      list(ipRules)
      + `<h3>Выдача после сессии</h3><div class="table-scroll"><table class="data-table rules-table"><thead><tr><th>Персонаж</th><th>Группа</th><th>Стиль</th><th>За стиль</th><th>Итого</th></tr></thead><tbody id="ipRows"></tbody></table></div>
      <button type="button" class="quick-roll gap-top" id="ipLog">ЗАПИСАТЬ В ЖУРНАЛ</button>
      <h3>Таблица ОУ</h3>${table(['ОУ', ...ipStyles], ipTable.map(([v, cells])=>[`<b>${v}</b>`, ...cells]))}
      <h3>Расходование</h3>${table(['Что повышаем', ...Array.from({length:10}, (_, k)=>k + 1)], ipSpend.map(([n, base])=>[`<b>${n}</b>`, ...Array.from({length:10}, (_, k)=>base * (k + 1))]))}
      <p class="muted">Цена — за новый уровень: поднять навык с 5 до 6 стоит 20 × 6 = 120 ОУ.</p>`),
    section('prices', 'ЦЕНЫ', 'стр. 349–356, 376, 385',
      `<p class="muted">${priceNote}</p>${table(['Категория', 'Цена'], priceTiers)}
      <h3>Услуги и развлечения</h3>${table(['Услуга', 'Цена'], services)}
      <h3>Снаряжение</h3>${table(['Предмет', 'Цена', 'Заметка'], gearPrices)}
      <h3>Броня</h3>${table(['Броня', 'SP', 'Штраф', 'Цена'], armorPrices)}
      <h3>Одежда</h3>${table(['Стиль', 'Как выглядит', ...fashionCols], fashion.map(([n, t, p])=>[`<b>${n}</b>`, t, ...p.map(v=>`${v}eb`)]))}
      <p class="muted">Оружие и боеприпасы — в каталоге вкладки «Бой: правила», импланты и наркотики — в «Справочнике».</p>`)
  ].join('');
}
function renderEcon(){
  $('#econList').innerHTML = econHtml();
  renderMonth(); renderIp(); gigResult();
}

$('#econList').addEventListener('input', ev=>{
  const el = ev.target;
  if(el.dataset.econ !== undefined){
    const p = state.economy.people[Number(el.dataset.econ)];
    p[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
    save();
    if(el.tagName === 'SELECT' || el.type === 'checkbox'){ renderMonth(); renderIp(); }
    return;
  }
  if(['gigKind', 'gigCrew', 'gigFixer'].includes(el.id)) gigResult();
  if(el.id === 'hustleRole') $('#hustleTableBox').innerHTML = hustleTable(el.value);
});
// Числа пересчитываются по уходу из поля, чтобы перерисовка не сбивала ввод.
$('#econList').addEventListener('change', ev=>{ if(ev.target.dataset.econ !== undefined && ev.target.tagName === 'INPUT' && ev.target.type !== 'checkbox'){ renderMonth(); renderIp(); } });
$('#econList').addEventListener('click', ev=>{
  const el = ev.target.closest('button');
  if(!el) return;
  if(el.id === 'econFromPlayers'){ peopleFromPlayers(); renderIp(); }
  if(el.id === 'econAdd'){ state.economy.people.push(blankPerson()); renderMonth(); renderIp(); save(); }
  if(el.dataset.econDel !== undefined){ const p = state.economy.people[Number(el.dataset.econDel)]; withUndo(`${p.name || 'Персонаж'}: убран из экономики`, ()=>state.economy.people.splice(Number(el.dataset.econDel), 1)); }
  if(el.id === 'econNewMonth') withUndo('Новый месяц: траты списаны, отметки сняты', ()=>{
    state.economy.people.forEach(p=>{
      if(!isBlank(p.cash)) p.cash = String(num(p.cash) - monthCost(p).total);
      p.paid = false;
    });
    addLog({kind:'text', tag:'МЕСЯЦ', text:state.economy.people.map(p=>`${p.name || 'персонаж'} −${monthCost(p).total}eb`).join(', ')});
  });
  if(el.id === 'hustleRoll') rollHustle();
  if(el.id === 'ipLog'){
    const text = state.economy.people.map(p=>`${p.name || 'персонаж'} ${Math.max(num(p.ipGroup), num(p.ipStyleLevel))} ОУ`).join(', ');
    if(text) addLog({kind:'text', tag:'ОУ', text});
    toast('ОУ записаны в журнал');
  }
});

renderEcon();
