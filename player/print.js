// Печать листа — вынесено из player/app.js. Глобалы: state, helpers из app/shared.
let printBlank = false;
function renderPrintSheet(blank = printBlank){
  const saved = state;
  if(blank) state = migrate({});
  try {
    $('#printSheet').innerHTML = printSheetHtml(blank);
    $('#printSheet').classList.toggle('p-blank', blank);
  } finally {
    state = saved;
  }
}
function printSheetHtml(blank){
  const text = value => isBlank(value) ? '' : esc(String(value).trim());
  const multiline = value => text(value).replace(/\n/g, '<br>');
  const rowsOrBlank = (rows, columns, minimum) => {
    const filled = rows.filter(cells => cells.some(cell => !isBlank(cell)));
    const empty = Array.from({length:Math.max(0, minimum - filled.length)}, () => Array(columns).fill(''));
    return [...filled, ...empty].map(cells => `<tr>${cells.map(cell => `<td>${cell === '' ? '&nbsp;' : cell}</td>`).join('')}</tr>`).join('');
  };
  const table = (className, head, body) => `<table class="p-table ${className}"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  const field = (label, value) => `<div class="p-field"><span>${label}</span><strong>${text(value) || '&nbsp;'}</strong></div>`;
  const section = (title, body, extra = '') => `<section class="p-section ${extra}"><h2>${title}</h2>${body}</section>`;
  const box = checked => checked ? '☑' : '☐';
  const slash = '&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;';

  const hp = maxHp(), emp = numeric('stat9');
  const moveModsPrint = playerInjuryMods();
  const movePenaltyPrint = (isMortallyWounded() ? 6 : 0) + moveModsPrint.move;
  const speedBase = Math.max(0, numeric('stat7') - statPenalty(7));
  const speed = movePenaltyPrint ? Math.max(Math.min(1, speedBase), speedBase - movePenaltyPrint) : speedBase;
  const deathPenPrint = deathSaveTotalPenalty();
  const statBoxes = stats.map((name,i)=>{
    const value = blank ? (i === 6 || i === 9 ? slash : '&nbsp;')
      : i === 6 ? `${numeric('luckCurrent')}/${numeric('stat6')}` : i === 9 && currentEmp() !== emp ? `${currentEmp()}/${emp}` : numeric(`stat${i}`);
    return `<div class="p-stat"><span>${name}</span><strong>${value}</strong></div>`;
  }).join('');
  const derived = [
    ['Хиты', blank ? slash : `${numeric('currentHp')} / ${hp}`],
    ['Порог ранения', blank ? '&nbsp;' : Math.ceil(hp/2)],
    ['Испытание смерти', blank ? '&lt;' : esc(`< ${statValue(8)}${deathPenPrint ? ` (+${deathPenPrint})` : ''}`)],
    ['Перемещение', blank ? '&nbsp;' : `${speed * 2} м`],
    ['Человечность', blank ? slash : `${numeric('humanityCurrent')} / ${emp*10}`]
  ].map(([label,value])=>`<div class="p-stat p-derived"><span>${label}</span><strong>${value}</strong></div>`).join('');
  const armorName = zone => armorPresets[state[`armor${zone}Type`]]?.[0] || '';
  const armorValue = zone => blank ? '' : `SP ${numeric(`armor${zone}Current`)} / ${numeric(`armor${zone}`)}${armorName(zone) ? ' — ' + armorName(zone) : ''}`;
  const wounds = `<div class="p-wounds">${box(!blank && isChecked('seriousWound'))} Тяжёлое ранение (−2 ко всем действиям) &nbsp;&nbsp; ${box(!blank && isMortallyWounded())} Смертельное ранение (−4, −6 СКО)</div>`;
  const armor = `<div class="p-grid p-grid-3">
    ${field('Голова: SP текущее / макс.', armorValue('Head'))}
    ${field('Тело: SP текущее / макс.', armorValue('Body'))}
    ${field('Штраф РЕА/ЛВК/СКО', blank ? '' : armorPenalty() ? `−${armorPenalty()}` : '0')}
  </div>${wounds}`;

  const weaponRows = (state.weapon || []).map(data=>{
    const skill = skills.indexOf(data[5]);
    const multiplier = autofireMultiplier(data);
    const attack = skill >= 0 ? `+${refTotal(`b${skill}`)}` : '';
    const autofire = multiplier ? `×${multiplier}, +${refTotal(`b${skills.indexOf(AUTOFIRE_SKILL)}`)}${isAutofireOn(data) ? ' (вкл.)' : ''}` : '';
    const ammo = isBlank(data[2]) && isBlank(data[6]) ? '' : `${text(data[2])} / ${text(data[6])}${loadedAmmo(data) ? ` ${esc(ammoTypes[loadedAmmo(data).type][0].toLowerCase())}${weaponKindList(data).length > 1 ? ` (${esc(ammoKinds[loadedAmmo(data).kind][0].toLowerCase())})` : ''}` : ''}`;
    const loaded = loadedAmmo(data);
    const damage = loaded && loaded.type in ammoNoDamage ? (ammoNoDamage[loaded.type] ? `${ammoNoDamage[loaded.type]} мимо брони` : 'эффект')
      : loaded?.kind === 'shell' ? `${SHOTGUN_SHELL_DAMAGE} дробь` : text(data[1]);
    const mods = parseMods(data[11]).list.map(m=>modInfo(m).name);
    return [text(data[0]), text(weaponTypes[data[8]]?.[0]), text(data[5]), attack, damage, ammo, text(data[3]), autofire, [text(data[4]), mods.length && `Модификации: ${esc(mods.join(', '))}`].filter(Boolean).join('<br>')];
  });
  const skillBlocks = Object.entries(skillCategories).map(([category, entries])=>{
    const rows = entries.flatMap(([name, stat])=>{
      const variants = (state.customSkills || []).map((item,j)=>item.base === name ? `c${j}` : null).filter(Boolean);
      return [`b${skills.indexOf(name)}`, ...variants].map(ref=>{
        const level = refLevel(ref);
        return blank
          ? `<tr><td>${esc(refLabel(ref))}${basicSkills.includes(name) ? ' <small>Б</small>' : ''}</td><td>${esc(stat)}</td><td></td><td></td></tr>`
          : `<tr class="${level ? 'is-trained' : ''}"><td>${esc(refLabel(ref))}</td><td>${esc(stat)}</td><td>${level}</td><td>${refTotal(ref)}</td></tr>`;
      });
    }).join('');
    return `<div class="p-skill-group"><h3>${category}</h3><table class="p-table p-skills"><tbody>${rows}</tbody></table></div>`;
  }).join('');
  const cyberRows = Object.entries(cyberSystems).flatMap(([key, conf])=>{
    const sys = state.cyber?.[key] || blankCyberSys();
    return [sys.foundation, ...sys.options].filter(Boolean).filter(p=>p.installed !== false || p.name || p.catalog)
      .map(p=>[esc(conf.title), multiline(pieceLabel(p)) + (p.installed === false ? ' <small>(не установлен)</small>' : ''), multiline(p.info), text(p.hl)]);
  });
  const lifeRows = [['Псевдоним', state.lifeAlias], ...lifeFields.map((name,i)=>[name, state[`life${i}`]])];
  const portrait = !blank && isSafeImage(state.portrait) ? `<img class="p-portrait" src="${state.portrait}" alt="">` : '';
  const cyberTitle = blank ? 'Киберимпланты' : `Киберимпланты <small>человечность ${numeric('humanityCurrent')} / ${emp*10}, потеря ${humanityLoss()}</small>`;

  return `
    <header class="p-header">
      ${portrait}
      <div class="p-title">
        <div class="p-brand">CYBERPUNK <b>RED</b> // ЛИСТ ПЕРСОНАЖА</div>
        ${blank ? field('Имя персонажа', '') : `<h1>${text(state.name) || '&nbsp;'}</h1>`}
        <div class="p-grid p-grid-4">${field(blank ? 'Роль и ранг' : 'Роль', blank ? '' : charRoles().length ? rolesLabel() : state.role)}${field('Репутация', state.reputation)}${field('Евродоллары', state.eddies)}${field('Очки улучшения', state.ip)}</div>
        <div class="p-grid p-grid-1">${field('Особая способность', state.ability)}</div>
      </div>
    </header>
    ${section('Характеристики', `<div class="p-stats">${statBoxes}</div><div class="p-stats p-stats-derived">${derived}</div>`)}
    ${section('Броня и здоровье', armor)}
    ${section('Оружие', table('p-weapons', ['Оружие','Тип','Навык','Атака','Урон','Патроны','ROF','Очередь','Заметки'], rowsOrBlank(weaponRows, 9, blank ? 7 : 4)))}
    <div class="p-grid p-grid-2">
      ${section('Критические травмы', `<div class="p-note">${multiline(state.criticalInjuries) || '&nbsp;'}</div>`)}
      ${section('Зависимости', `<div class="p-note">${multiline(state.addictions) || '&nbsp;'}</div>`)}
    </div>
    <div class="p-grid p-grid-gear">
      ${section('Снаряжение', table('p-gear', ['Предмет','Кол-во','Заметка'], rowsOrBlank((state.gear || []).map(row=>row.map(text)), 3, blank ? 8 : 5)))}
      ${section('Боеприпасы', table('p-ammo', ['Калибр','Тип','Кол-во'], rowsOrBlank((state.ammo || []).map(row=>{ const [kind, type] = String(row[1] || '').split(':'); return [text(ammoCalibers[row[0]]?.[0]), text(ammoTypes[type] ? `${kindsOf(row[0]).length > 1 ? `${ammoKinds[kind]?.[0] || ''}: ` : ''}${ammoTypes[type][0]}` : ''), text(row[2])]; }), 3, blank ? 8 : 5)))}
    </div>
    ${section(`Навыки <small>стат · уровень · итог${blank ? ' · Б — базовый навык, при создании не ниже 2' : ''}</small>`, `<div class="p-skill-columns">${skillBlocks}</div>`, 'p-page-break')}
    ${section(cyberTitle, table('p-cyber', ['Слот','Имплант','Информация','ПЧ'], rowsOrBlank(cyberRows, 4, blank ? 8 : 4)), 'p-page-break')}
    ${section('Жизненный путь', `<div class="p-grid p-grid-2">${[['Образ жизни', state.lifeStyle], ['Арендная плата', state.lifeRent], ['Жильё', state.lifeHousing], ['Образ и стиль', state.lifeLook], ...lifeRows].map(([label,value])=>field(esc(label), value)).join('')}</div>`)}
    ${section('Связи', table('p-relations', ['Персонаж','Кто это?','Что ему нужно?'], rowsOrBlank((state.relationship || []).map(row=>row.map(text)), 3, blank ? 6 : 4)))}
    ${blank ? '' : charRoles().map(id=>printRoleSection(id, section, table, rowsOrBlank, text, multiline)).join('')}
    ${section('Заметки', `<div class="p-note">${[multiline(state.roleplay), multiline(state.sessionNotes)].filter(Boolean).join('<br><br>') || '&nbsp;'}</div>`)}
  `;
}
function printRoleSection(id, section, table, rowsOrBlank, text, multiline){
  const role = roles[id], rank = rankOf(id);
  const specialties = (role.specialties || []).filter(item=>numeric(rolePointsKey(id, item.key)))
    .map(item=>`${esc(item.name)} — ${numeric(rolePointsKey(id, item.key))}`).join('; ');
  const net = role.interfaceAbilities ? `NET-действий за ход: ${netActionsForRank(rank)}${isBlank(state.netDeck) ? '' : `; кибердека: ${text(state.netDeck)}`}${isBlank(state.netSlots) ? '' : `, слотов ${text(state.netSlots)}`}` : '';
  const programs = role.table?.key === 'rolePrograms';
  const head = programs ? ['Программа','Класс','ATK','DEF','REZ','Вкл','Урон / свойство','Эффект'] : role.table?.columns.map(esc);
  const tableRows = (state[role.table?.key] || []).map(row=>programs
    ? [text(row[0]), text(row[1]), text(row[2]), text(row[3]), isBlank(row[4]) ? '' : `${text(isBlank(row[7]) ? row[4] : row[7])} / ${text(row[4])}`, row[8] === '1' ? '✓' : '', [text(row[11]), !isBlank(row[12]) && `Ч.ЛЁД ${text(row[12])}`].filter(Boolean).join(', '), text(row[5])]
    : rowColumns[role.table.key].map(({j,select})=>select === 'teamType' ? text(execSubordinates[row[j]]?.name) : select === 'vehicleType' ? text(vehicleTypes[row[j]]?.[0]) : text(row[j])));
  const rows = role.table ? table('p-role', head, rowsOrBlank(tableRows, head.length, 2)) : '';
  const notes = multiline(state[`roleNotes_${id}`]);
  return section(`${esc(role.ability)} <small>${esc(role.name)}, ранг ${rank}</small>`,
    [specialties && `<p>${specialties}</p>`, net && `<p>${net}</p>`, rows, notes && `<div class="p-note">${notes}</div>`].filter(Boolean).join(''));
}
function printSheet(blank){
  printBlank = blank;
  renderPrintSheet();
  window.print();
}

// Вкладка роли: появляется после выбора роли и собирается из описания роли в data.js.
