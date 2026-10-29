// Вкладка «Бой: правила» листа Мастера: справочник по книге (таблицы — в ../data.js и dm-data.js)
// и интерактивные части — калькулятор модификаторов, шанс попадания, укрытия, броски оружия и манёвров.
// Использует общие функции dm.js: $, $$, esc, roll, parseDice, addLog, toast, save, state, options.

const table = (head, body, cls = '') => `<div class="table-scroll"><table class="data-table rules-table ${cls}"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const list = items => `<ul class="rules-points">${items.map(t=>`<li>${t}</li>`).join('')}</ul>`;
const formula = text => `<div class="rules-formula">${text}</div>`;
const section = (id, title, tag, body, open = false) => `<details class="panel net-details rules-section" data-rules="${id}"${open ? ' open' : ''}><summary>${title}<span>${tag}</span></summary><div class="rules-body">${body}</div></details>`;

// --- Шанс попадания ---
// Бросок 1d10 по правилам RED: 10 — ещё 1d10 сверху, 1 — 1d10 вычитается (стр. 130). Распределение результата.
const d10Dist = (() => {
  const dist = new Map();
  const add = (v, p) => dist.set(v, (dist.get(v) || 0) + p);
  for(let r = 2; r <= 9; r++) add(r, 0.1);
  for(let x = 1; x <= 10; x++){ add(10 + x, 0.01); add(1 - x, 0.01); }
  return [...dist];
})();
// Атакующий побеждает, только если превысил СЛ: ничья — за защитником.
const chanceVsDv = (base, dv) => d10Dist.reduce((p, [v, pv])=>p + (base + v > dv ? pv : 0), 0);
const chanceOpposed = (a, b) => d10Dist.reduce((p, [va, pa])=>p + pa * d10Dist.reduce((q, [vb, pb])=>q + (a + va > b + vb ? pb : 0), 0), 0);
const percent = p => `${Math.round(p * 100)}%`;
const chanceCell = (base, dv) => dv == null ? '<td class="chance is-none">—</td>' : `<td class="chance" style="--p:${chanceVsDv(base, dv)}">${percent(chanceVsDv(base, dv))}<small>DV ${dv}</small></td>`;
function renderChance(){
  const base = num($('#hcBase').value) + num($('#hcMod').value);
  const rowsHtml = Object.values(rangeDv).map(([name, dvs])=>`<tr><th>${esc(name)}</th>${dvs.map(dv=>chanceCell(base, dv)).join('')}</tr>`).join('')
    + Object.entries(autofireDv).map(([k, dvs])=>`<tr><th>${esc(rangeDv[k][0])}: автоогонь</th>${rangeBands.map((_, b)=>chanceCell(base, dvs[b])).join('')}</tr>`).join('');
  $('#hcTable').innerHTML = `<thead><tr><th>Оружие</th>${rangeBands.map(b=>`<th>${b}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody>`;
  const def = num($('#hcDef').value);
  $('#hcOpposed').textContent = `${percent(chanceOpposed(base, def))} — атака ${base} + 1d10 против защиты ${def} + 1d10`;
}

// --- Модификаторы ---
function renderModTotal(){
  const total = $$('[data-mod]').filter(el=>el.checked).reduce((sum, el)=>sum + num(el.dataset.mod), 0);
  $('#modTotal').textContent = total >= 0 ? `+${total}` : `−${Math.abs(total)}`;
  return total;
}

// --- Укрытия ---
const coverOptions = () => coverMaterials.flatMap(([name, thick, thin])=>[[`${name}|${thick}`, `${name}, толстое — ${thick} ПЗ`], ...(thin ? [[`${name}|${thin}`, `${name}, тонкое — ${thin} ПЗ`]] : [])])
  .concat(coverExamples.filter(([, , hp])=>typeof hp === 'number' && hp > 0).map(([name, , hp])=>[`${name}|${hp}`, `${name} — ${hp} ПЗ`]));
function renderCovers(){
  const box = $('#coverList');
  if(!box) return;
  box.innerHTML = state.covers.map((c, i)=>`<div class="cover-row${c.hp <= 0 ? ' is-broken' : ''}">
      <b>${esc(c.name)}</b>
      <span class="hp-bar"><i style="width:${c.max ? Math.max(0, c.hp) / c.max * 100 : 0}%"></i></span>
      <span class="cover-hp">${c.hp <= 0 ? 'РАЗРУШЕНО' : `${c.hp}/${c.max}`}</span>
      <input type="number" min="0" data-cover-dmg="${i}" placeholder="урон" aria-label="Урон по укрытию">
      <button type="button" class="weapon-btn" data-cover-hit="${i}">ПОПАДАНИЕ</button>
      <button type="button" class="weapon-btn" data-cover-fix="${i}" title="Восстановить ПЗ">↻</button>
      <button type="button" class="remove" data-cover-del="${i}" title="Убрать">×</button>
    </div>`).join('') || '<p class="muted">Укрытий на поле нет. Добавьте то, за чем прячутся участники боя.</p>';
}
// Урон по укрытию: при 0 ПЗ оно разрушено, лишний урон пропадает (кроме взрывчатки — стр. 182).
function hitCover(i){
  const c = state.covers[i];
  const field = $(`[data-cover-dmg="${i}"]`);
  const damage = Math.max(0, Math.floor(num(field.value)));
  if(!damage) return;
  const before = c.hp;
  c.hp = Math.max(0, c.hp - damage);
  addLog({kind:'text', tag:'УКРЫТИЕ', text:`${c.name}: ${damage} урона, ${before} → ${c.hp}/${c.max}${c.hp <= 0 ? '. РАЗРУШЕНО: за ним больше не спрятаться' : ''}`});
  renderCovers(); save();
}

// --- Каталог оружия ---
const altModes = {smg:'очередь ×3, подавление', heavySmg:'очередь ×3, подавление', assaultRifle:'очередь ×4, подавление', shotgun:'выстрел дробью', bow:'стрелы', grenadeLauncher:'взрыв', rocketLauncher:'взрыв'};
function weaponCatalog(){
  const standard = Object.entries(weaponTypes).map(([id, w])=>{
    const [price, hands, hide] = weaponExtras[id] || ['', '', false];
    return [`<b>${esc(w[0])}</b>`, esc(w[1]), w[2], w[3] || '—', w[4], hands, hide ? 'да' : 'нет', price, altModes[id] || '', id];
  });
  const exotic = Object.entries(exoticWeapons).map(([id, w])=>[`<b>${esc(w[0])}</b>`, esc(w[1]), w[2] || '—', w[3] || '—', w[4], '', '', esc(w[7]), esc(w[8].effect || w[8].note || ''), id]);
  const rowsHtml = (rows) => rows.map(r=>`<tr>${r.slice(0, 9).map(c=>`<td>${c}</td>`).join('')}<td class="row-btns">${parseDice(allWeapons[r[9]][2]) ? `<button type="button" class="weapon-btn" data-cat-roll="${r[9]}">УРОН</button>` : ''}</td></tr>`).join('');
  return `<div class="table-scroll"><table class="data-table rules-table catalog-table"><thead><tr><th>Оружие</th><th>Навык</th><th>Урон</th><th>Маг.</th><th>ROF</th><th>Рук</th><th>Скрыть</th><th>Цена</th><th>Особое</th><th></th></tr></thead>
    <tbody><tr class="group-row"><td colspan="10">ОРУЖИЕ ИЗ КНИГИ (стр. 91–94)</td></tr>${rowsHtml(standard)}<tr class="group-row"><td colspan="10">ЭКЗОТИЧЕСКОЕ (стр. 347–349) — всегда обычного качества, без модификаций и нестандартных патронов</td></tr>${rowsHtml(exotic)}</tbody></table></div>`;
}

function rulesHtml(){
  const melee = Object.entries(weaponTypes).filter(([, w])=>w[1] === 'Оружие ближнего боя');
  const meleeExamples = {lightMelee:'нож, томагавк', mediumMelee:'бита, лом, мачете', heavyMelee:'труба, меч, шипастая дубина', veryHeavyMelee:'бензопила, лопасть вертолёта, нагината, кувалда'};
  return [
    section('turn', 'ХОД И ДЕЙСТВИЯ', 'стр. 168–169',
      formula('Инициатива = РЕА + 1d10 (ничья — переброс) &nbsp;·&nbsp; Ход = 1 перемещение + 1 действие &nbsp;·&nbsp; Раунд ≈ 3 секунды')
      + table(['Действие', 'Что делает'], combatActions.map(([a, t])=>[`<b>${a}</b>`, t])), true),

    section('mods', 'МОДИФИКАТОРЫ БРОСКОВ', 'стр. 129–130',
      `<p class="muted">Отметьте, что действует на бросок: модификаторы складываются. Итог можно отправить в кубик или в расчёт шанса.</p>
      <div class="mod-groups">${rollModifiers.map(g=>`<div class="mod-group"><b>${g.group}</b>${g.items.map(([name, v])=>`<label class="mod-item"><input type="checkbox" data-mod="${v}"> <span>${esc(name)}</span><em class="${v > 0 ? 'is-plus' : ''}">${v > 0 ? '+' : '−'}${Math.abs(v)}</em></label>`).join('')}</div>`).join('')}</div>
      <div class="mod-total">ИТОГО <strong id="modTotal">+0</strong>
        <button type="button" class="quick-roll" id="modToDice">В КУБИК</button>
        <button type="button" class="add-row" id="modToChance">В ШАНС ПОПАДАНИЯ</button>
        <button type="button" class="add-row" id="modReset">СБРОС</button></div>
      <h3>Сложность (СЛ)</h3>
      ${table(['Сложность', 'СЛ', 'Описание'], difficultyLevels.map(([n, dv, t])=>[`<b>${n}</b>`, dv, t]))}
      ${list(['Проверка: СТАТ + навык + 1d10 против СЛ или против СТАТ + навык + 1d10 противника. Ничья — победа защищающегося.',
        'Без навыка — только СТАТ + 1d10. После провала повторить нельзя, пока не изменятся шансы: время, инструмент, смежный навык.',
        'Критический успех: на 1d10 выпала 10 — ещё 1d10 сверху. Критический провал: выпала 1 — 1d10 вычитается. Повторно не взрывается.',
        'Удача: перед броском очки УДЧ дают +1 каждое; восстанавливаются в начале сессии.'])}`, true),

    section('chance', 'ШАНС ПОПАДАНИЯ', 'по таблицам DV стр. 173',
      `<div class="chance-controls">
        <label>РЕА + навык оружия<input type="number" id="hcBase" value="12"></label>
        <label>Модификаторы<input type="number" id="hcMod" value="0"></label>
        <label>Защита цели: ЛВК + Уклонение<input type="number" id="hcDef" value="10"></label>
      </div>
      <p class="chance-opposed">Ближний бой или уклонение: <b id="hcOpposed"></b></p>
      <div class="table-scroll"><table class="data-table chance-table" id="hcTable"></table></div>
      <p class="muted">Шанс превысить DV с учётом критических 10 и 1. Цели с РЕА 8+ могут вместо DV уклоняться — тогда смотрите строку ближнего боя.</p>`, true),

    section('ranged', 'ДАЛЬНИЙ БОЙ, АВТООГОНЬ, ДРОБЬ, ВЗРЫВЫ', 'стр. 172–174',
      formula('РЕА + навык оружия + 1d10 &gt; DV по дистанции &nbsp;или&nbsp; &gt; ЛВК + Уклонение + 1d10 цели (если у неё РЕА 8+)')
      + table(['Оружие', ...rangeBands], Object.values(rangeDv).map(([name, dvs])=>[`<b>${esc(name)}</b>`, ...dvs.map(v=>v ?? 'нет')]))
      + '<h3>DV автоогня</h3>' + table(['Оружие', ...rangeBands.slice(0, 5)], Object.entries(autofireDv).map(([k, dvs])=>[`<b>${esc(rangeDv[k][0])}</b>`, ...dvs.slice(0, 5).map(v=>v ?? 'нет')]))
      + list([
        '<b>Автоогонь</b>: действие и 10 патронов (меньше 10 — нельзя). Навык «Автоматический огонь» по таблице DV автоогня, прицельный выстрел невозможен. Урон 2d6 × на сколько превышен DV, максимум ×3 у ПП и ×4 у штурмовой винтовки. Две шестёрки на 2d6 — критическая травма. Цели с РЕА 8+ могут уклоняться.',
        '<b>Огонь на подавление</b>: действие и 10 патронов. Каждый в 25 м на линии огня без укрытия бросает ВОЛЯ + Концентрация + 1d10 против РЕА + Автоогонь + 1d10 стрелка. Проигравшие тратят перемещение (или Бег), чтобы уйти в укрытие или к нему.',
        '<b>Выстрел дробью</b>: дробовик, РЕА + Тактическое оружие + 1d10 против СЛ 13. При успехе 3d6 каждому, кого видно в 6 м (3 клетки) перед стрелком; один бросок урона на всех, броня защищает. Прицельно нельзя. Цели с РЕА 8+ могут уклониться.',
        '<b>Взрывчатка</b>: урон всем (и местности) в квадрате 10 × 10 м вокруг точки попадания, один бросок на всех. Промах — ГМ решает, куда упало в пределах 10 × 10 м от цели. РЕА 8+ — можно уклониться и выскочить из зоны. Укрытие защищает, если взрыв его не разрушил; разрушил — полный урон.',
        '<b>Стрелы</b>: перезарядка лука и арбалета не требует действия. Стандартные стрелы можно вынуть из тела и использовать снова.',
        '<b>Бросок предмета</b>: ЛВК + Атлетика по DV гранатомёта, до 25 м. Холодное оружие наносит свой урон, но броня не делится пополам. Граната — как из гранатомёта.',
        '<b>Броня</b>: урон минус SP зоны (тело, или голова при прицельном выстреле). Если урон прошёл — броня этой зоны теряет 1 SP. Яд и огонь идут мимо брони.'
      ])),

    section('aimed', 'ПРИЦЕЛЬНЫЕ ВЫСТРЕЛЫ', 'стр. 170',
      formula('Одна атака за действие, штраф −8. Нельзя очередью, дробью и спецприёмами боевых искусств (если не сказано иное).')
      + table(['Цель', 'Эффект при попадании'], [
        ['<b>Голова</b>', 'урон, прошедший через броню головы, ×2 (×3 при травме «Перелом черепа»). Криты бросаются по таблице головы.'],
        ['<b>Предмет в руке</b>', 'если пробито хотя бы 1 очко брони — цель роняет предмет на ваш выбор, он падает перед ней.'],
        ['<b>Нога</b>', 'если пробито хотя бы 1 очко брони — цель получает травму «Перелом ноги», если у неё ещё есть несломанная нога.']])
      + '<p class="muted">На карточке противника выберите зону «Голова», «Нога» или «Предмет в руке» — лист сам применит эффект.</p>'),

    section('melee', 'БЛИЖНИЙ БОЙ И БОЕВЫЕ ИСКУССТВА', 'стр. 175–180',
      formula('ЛВК + навык атаки + 1d10 &gt; ЛВК + Уклонение + 1d10 защищающегося. Досягаемость 2 м. ROF 2, кроме очень тяжёлого оружия.')
      + table(['Тип', 'Примеры', 'Урон', 'ROF', 'Скрыть', 'Цена'], melee.map(([id, w])=>[`<b>${esc(w[0])}</b>`, meleeExamples[id], w[2], w[4], weaponExtras[id][2] ? 'да' : 'нет', weaponExtras[id][0]]))
      + list([
        'Холодное оружие и боевые искусства <b>игнорируют половину брони</b> (округление вверх). Рукопашный бой — нет.',
        'Персонаж с ТЕЛ 8+ может держать двуручное холодное оружие одной рукой.',
        'Рукопашный бой: урон по ТЕЛ (таблица ниже). С киберрукой урон не ниже 2d6 (выше, если ТЕЛ 7+).',
        '<b>Захват</b>: ЛВК + Рукопашный бой против того же у цели; нужна свободная рука. Оба в захвате получают −2 ко всем действиям; захваченного тащат при перемещении; двуручное оружие недоступно. Отпустить — без действия.',
        '<b>Удушение</b>: в захвате, действие — урон, равный ТЕЛ, мимо брони и без её порчи. На 0 ПЗ цель остаётся с 1 ПЗ без сознания; 3 раунда подряд — без сознания в любом случае.',
        '<b>Бросок захваченного</b>: урон, равный ТЕЛ, мимо брони; цель лёжа, захват кончается.'])
      + '<h3>Урон рукопашного боя и боевых искусств</h3>'
      + table(['ТЕЛ', '4 и меньше', '5–6 (или 4–6 с киберрукой)', '7–10', '11 и больше'], [['<b>Урон</b>', ...brawlDamage.map(([, dmg])=>dmg)]])
      + formula('Боевые искусства и спецприёмы: ЛВК + навык стиля + 1d10 против ЛВК + Уклонение + 1d10 или СЛ. Без очков в стиле — нельзя.')
      + table(['Стиль', 'Спецприём', 'Условие', 'Эффект'], martialMoves.map(m=>[`<b>${m.style}</b>`, m.name, m.need, m.text]))),

    section('catalog', 'КАТАЛОГ ОРУЖИЯ', 'стр. 91–95, 342–349',
      `<p class="muted">То же оружие выбирается у противника в «+ оружие из книги». Кнопка «УРОН» бросает кубики в журнал.</p>${weaponCatalog()}
      <h3>Модификации (3 слота у неэкзотического дальнего оружия)</h3>${table(['Модификация', 'Цена', 'Для чего', 'Эффект'], weaponMods)}
      <h3>Магазины</h3>${table(['Оружие', 'Стандартный', 'Увеличенный', 'Барабанный'], magazineSizes)}
      <h3>Качество</h3>${table(['Обычное', 'Низкое', 'Высокое'], weaponQuality)}
      <p class="muted">Низкое качество: на критическом провале атаки (1) оружие клинит — действие, чтобы починить. Высокое: +1 к атаке. Экзотическое всегда обычное. ${exoticGear.map(([n, t, p])=>`${n} (${p}): ${t}.`).join(' ')}</p>`),

    section('cover', 'УКРЫТИЯ И ЩИТЫ', 'стр. 182–184',
      formula('Вы в укрытии, только если полностью за чем-то, что остановит пулю. Если вас видно — вы не в укрытии. Частичного укрытия нет.')
      + `<div class="cover-add"><input id="coverName" placeholder="Название (необязательно)" aria-label="Название укрытия"><select id="coverPreset" aria-label="Материал">${options(coverOptions(), '')}</select><button type="button" class="quick-roll" id="coverAdd">+ УКРЫТИЕ</button></div>
      <div id="coverList" class="cover-list"></div>`
      + table(['Материал', 'Толстое', 'Тонкое'], coverMaterials.map(([n, a, b])=>[`<b>${n}</b>`, `${a} ПЗ`, b ? `${b} ПЗ` : 'не укрытие']))
      + table(['Пример', 'Материал и толщина', 'ПЗ'], coverExamples.map(([n, m, hp])=>[`<b>${n}</b>`, m, hp]))
      + list(['Укрытие атакуют как обычную цель: участок 2 × 2 м. При 0 ПЗ оно разрушено, лишний урон пропадает (кроме взрывов).',
        'Тонкое укрытие можно немного сдвинуть; толстое — только со снаряжением или при ТЕЛ 10+.',
        'Металлическое укрытие не повредить рукопашным боем и боевыми искусствами, кроме киберруки или ТЕЛ 10+.',
        '<b>Щит</b>: достать или убрать — действие. Пока ПЗ щита больше 0 — вы в укрытии от тех, кого видите; уклоняться нельзя; весь урон идёт в щит. Пуленепробиваемый щит — 10 ПЗ, 100eb.',
        '<b>Живой щит</b>: противник в вашем захвате. Не защищает от прицельного выстрела в голову; щит получает урон как обычно. Умер — становится щитом с ПЗ, равными его ТЕЛ.'])),

    section('wounds', 'РАНЕНИЯ, ТРАВМЫ И ЛЕЧЕНИЕ', 'стр. 186–188, 220–223',
      table(['Ранение', 'Когда', 'Эффект', 'Стабилизация'], woundStates.map(([a, b, c, dv])=>[`<b>${a}</b>`, b, c, dv]))
      + formula('Критическая травма: на 2+ кубиках урона выпали шестёрки. 2d6 по таблице зоны, пока не выпадет новая травма; +5 урона прямо в ПЗ (броню не портит).')
      + ['Body', 'Head'].map(zone=>`<h3>Травмы: ${zone === 'Head' ? 'голова (только прицельный выстрел в голову)' : 'тело'}</h3>`
        + table(['2d6', 'Травма', 'Эффект', 'Первая помощь', 'Лечение'], criticalInjuries[zone].map((name, k)=>[k + 2, `<b>${esc(name)}</b>`, injuryRules[zone][k].effect + (injuryRules[zone][k].mods.death ? ' <b>Штраф испытания смерти +1.</b>' : ''), injuryRules[zone][k].aid, injuryRules[zone][k].treat]))).join('')
      + list(['<b>Испытание смерти</b>: смертельно раненый в начале каждого своего хода бросает 1d10 + штраф; меньше ТЕЛ — жив. Выпала 10 — провал. После каждого испытания штраф +1, пока не стабилизируют до 1 ПЗ. Провал — смерть.',
        '<b>Стабилизация</b>: действие, ТЕХ + Первая помощь или Парамедик + 1d10 против СЛ ранения. Смертельно раненый получает 1 ПЗ и минуту лежит без сознания.',
        '<b>Восстановление</b>: после стабилизации — ПЗ, равные ТЕЛ, за каждый полный день отдыха с лёгкой активностью. День без отдыха — раны открываются, нужна новая стабилизация.',
        '<b>Первая помощь</b> снимает эффект травмы до конца дня (минута, можно себе). <b>Лечение</b> снимает её навсегда (4 часа, себе нельзя). Хирургия — только у медтехника.',
        '<b>Киберконечности и киберглаза</b>: травма и бонусный урон те же, но чинят их Кибертехникой с той же СЛ и временем.',
        '<b>Trauma Team</b>: Серебряный уровень — 500eb в месяц, Корпоративный — 1000eb в месяц.'])
      + '<p class="muted">На карточке противника травмы — чипы с эффектом при наведении; ×  — вылечить. Штрафы к броскам, СКО и испытанию смерти лист учитывает сам.</p>'),

    section('hazards', 'ОПАСНОСТИ И СОСТОЯНИЯ', 'стр. 177, 180–181',
      table(['Состояние', 'Правило', 'На карточке противника'], hazards.map(h=>[`<b>${h.name}</b>`, h.text, h.auto || '—']))
      + '<p class="muted">Состояния включаются кнопками на карточке противника. Огонь, ток и вакуум срабатывают в конце его хода, удушье — в начале, по кнопке «Следующий ход».</p>'),

    section('vehicles', 'ПОГОНЯ И ТРАНСПОРТ', 'стр. 189–192',
      `<div class="chance-controls">
        <label>РЕА + навык управления<input type="number" id="mvBase" value="12"></label>
        <label>Манёвр<select id="mvKind">${options(maneuvers.map(([n, dv], k)=>[k, `${n} — СЛ ${dv}`]), 0)}</select></label>
        <button type="button" class="quick-roll" id="mvRoll">БРОСОК</button>
        <button type="button" class="add-row" id="mvRam" title="6d6 и ТС, и тому, во что врезались; всем — травма «Перелом шеи»">ТАРАН 6D6</button>
      </div>`
      + list(vehicleRules)
      + table(['Транспорт', 'ПЗТ', 'Мест', 'СКО в бою', 'км/ч', 'Цена'], Object.entries(vehicleTypes).map(([id, v])=>[`<b>${esc(v[0])}</b>`, v[1], esc(v[2]), v[3], v[4], vehiclePrices[id] || ''])))
  ].join('');
}

function renderRules(){
  $('#rulesList').innerHTML = rulesHtml();
  renderChance();
  renderCovers();
  if(typeof setupPanels === 'function') setupPanels();
}
// Поиск без перерисовки: подходящие разделы раскрываются, остальные прячутся.
function filterRules(){
  const q = plain($('#rulesSearch').value);
  $$('.rules-section').forEach(sec=>{
    const match = !q || plain(sec.textContent).includes(q);
    sec.hidden = !match;
    if(q && match) sec.open = true;
  });
  highlightSearch($('#rulesList'), q);
}

$('#rulesSearch').addEventListener('input', filterRules);
$('#rulesToggle').addEventListener('click', ()=>{
  const sections = $$('.rules-section').filter(sec=>!sec.hidden);
  const open = !sections.every(sec=>sec.open);
  sections.forEach(sec=>{ sec.open = open; });
});
$('#rulesList').addEventListener('input', ev=>{
  if(ev.target.dataset.mod !== undefined) renderModTotal();
  if(['hcBase', 'hcMod', 'hcDef'].includes(ev.target.id)) renderChance();
});
$('#rulesList').addEventListener('keydown', ev=>{ if(ev.key === 'Enter' && ev.target.dataset.coverDmg !== undefined) hitCover(Number(ev.target.dataset.coverDmg)); });
$('#rulesList').addEventListener('click', ev=>{
  const el = ev.target.closest('button');
  if(!el) return;
  if(el.id === 'modToDice'){ $('#diceModifier').value = renderModTotal(); $('#diceDrawer').classList.add('open'); toast('Модификатор перенесён в кубик'); }
  if(el.id === 'modToChance'){ $('#hcMod').value = renderModTotal(); renderChance(); $('[data-rules="chance"]').open = true; }
  if(el.id === 'modReset'){ $$('[data-mod]').forEach(box=>{ box.checked = false; }); renderModTotal(); }
  if(el.id === 'coverAdd'){
    const [material, hp] = $('#coverPreset').value.split('|');
    state.covers.push({name:$('#coverName').value.trim() || material, hp:num(hp), max:num(hp)});
    $('#coverName').value = '';
    renderCovers(); save();
  }
  if(el.dataset.coverHit !== undefined) hitCover(Number(el.dataset.coverHit));
  if(el.dataset.coverFix !== undefined){ const c = state.covers[Number(el.dataset.coverFix)]; c.hp = c.max; renderCovers(); save(); }
  if(el.dataset.coverDel !== undefined){ state.covers.splice(Number(el.dataset.coverDel), 1); renderCovers(); save(); }
  if(el.dataset.catRoll){
    const w = allWeapons[el.dataset.catRoll];
    roll(parseDice(w[2]), 0, `${w[0]}, урон`, {noCrit:exoticWeapons[el.dataset.catRoll]?.[8].noCrit});
  }
  if(el.id === 'mvRoll'){
    const [name, dv] = maneuvers[num($('#mvKind').value)];
    roll({count:1, sides:10, bonus:0}, num($('#mvBase').value), name, {crits:true, judge: entry => entry.total > dv ? `УСПЕХ (СЛ ${dv})` : `ПРОВАЛ (СЛ ${dv})`});
  }
  if(el.id === 'mvRam') roll({count:6, sides:6, bonus:0}, 0, 'Таран', {noCrit:true, note:'и ТС, и препятствию; всем участникам — травма «Перелом шеи»'});
});

renderRules();
