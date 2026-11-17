// Вкладка роли / NET — вынесено из player/app.js. Глобалы: state, helpers из app/shared.
function renderRolePanel(){
  const role = currentRole(), id = viewRoleId();
  const tab = $('#roleTab'), panel = $('#role');
  tab.hidden = !role;
  renderRoleSummary();
  if(!role){
    panel.innerHTML = '';
    if(panel.classList.contains('active')) switchTab('character');
    return;
  }
  tab.textContent = `06 // ${charRoles().length > 1 ? `Роли (${charRoles().length})` : role.name}`;
  const specialties = role.specialties ? `<div class="panel role-specialties">
      <div class="section-title">НАПРАВЛЕНИЯ <span id="rolePointsInfo"></span></div>
      <table class="data-table"><thead><tr><th>Направление</th><th>Цена</th><th>Уровень</th></tr></thead><tbody>${role.specialties.map(item=>`<tr>
        <td><strong>${esc(item.name)}</strong><small>${esc(item.effect)}</small></td>
        <td>${item.cost} оч.</td>
        <td><input data-key="${rolePointsKey(id, item.key)}" type="number" min="0" max="${item.max ?? ROLE_MAX_RANK}" value="${numeric(rolePointsKey(id, item.key))}" aria-label="Уровень: ${esc(item.name)}"></td>
      </tr>`).join('')}</tbody></table>
      ${id === 'solo' ? `<div class="role-buttons solo-round-controls">
        <button type="button" class="weapon-btn" data-solo-new-round title="Сбросить Отражение и Слабое место на новый раунд">НОВЫЙ РАУНД</button>
        <button type="button" class="weapon-btn" data-solo-reallocate title="Обнулить очки и распределить заново. Вне боя — свободно; в бою — действием">ПЕРЕРАСПРЕДЕЛИТЬ ОЧКИ</button>
      </div>
      <label class="check-row"><input type="checkbox" data-key="soloInCombat"${isChecked('soloInCombat') ? ' checked' : ''}> Сейчас бой (перераспределение = действие)</label>
      <div class="role-info" id="soloRoundInfo"></div>` : ''}
    </div>` : '';
  const net = role.interfaceAbilities ? `<div class="panel role-net">
      <div class="section-title">СЕТЬ <span class="net-tracker" id="netTracker"></span></div>
      <div class="armor-form">
        <label>Кибердека<input data-key="netDeck" value="${esc(state.netDeck || '')}" placeholder="Модель кибердеки"></label>
        <label>Слоты программ<input data-key="netSlots" type="number" min="0" value="${esc(state.netSlots ?? '')}"></label>
      </div>
      <div class="net-attack">
        <div class="net-block-title">СКОРОСТЬ В СЕТИ <small>инициатива и встреча с Чёрным ЛЬДОМ: Интерфейс + бонус от программ + 1d10</small></div>
        <div class="role-buttons">
          <button type="button" class="weapon-btn" data-net-speed title="Интерфейс + бонус от программ + 1d10; результат против СКО ЛЬДА + 1d10">ПРОВЕРКА СКОРОСТИ</button>
        </div>
        <div class="net-block-title">АТАКА РАЗРЯДОМ <small>базовая атака по программе или нетраннеру</small></div>
        <div class="role-buttons">
          <button type="button" class="weapon-btn" data-interface="zap" title="Бросок на попадание: Интерфейс + 1d10; результат назовите мастеру">ПОПАДАНИЕ: ИНТЕРФЕЙС + 1D10</button>
          <button type="button" class="weapon-btn" data-zap-damage title="Урон Разряда после попадания: 1d6 программе или мозгу нетраннера">УРОН 1D6</button>
        </div>
      </div>
      <div class="net-block-title">ФУНКЦИИ ИНТЕРФЕЙСА <small>проверка: Интерфейс + 1d10</small></div>
      <div class="role-buttons">${role.interfaceAbilities.filter(([key])=>key !== 'zap').map(([key,name,hint])=>`<button type="button" class="weapon-btn" data-interface="${key}" title="Интерфейс + 1d10: ${esc(hint)}">${esc(name)}</button>`).join('')}</div>
      <div class="net-summary"><span id="netBoostSummary"></span> <strong id="netBoostExtra"></strong></div>
      <div class="armor-form net-brain">
        <label>Урон по мозгу<input id="brainDamage" type="number" min="0" placeholder="0"></label>
        <button type="button" class="death-save-button" data-brain-damage title="Урон от ЛЁДа и программ: мимо брони, с учётом включённых защитников">ПРИНЯТЬ УРОН</button>
      </div>
      <div class="damage-result" id="netDamageResult"></div>
    </div>` : '';
  const table = role.table ? `<div class="panel role-table-panel">
      <div class="section-title">${esc(role.table.title).toUpperCase()} <span id="roleTableInfo"></span></div>
      ${cardRenderers[role.table.key] ? `<div class="${role.table.key === 'roleTeam' ? 'team-cards' : role.table.key === 'rolePrograms' ? 'program-cards' : 'team-cards'}" id="${role.table.key}Rows"></div>` : `<div class="table-scroll"><table class="data-table role-table${role.table.key === 'rolePrograms' ? ' program-table' : ''}"><thead><tr>${role.table.columns.map(column=>`<th>${esc(column)}</th>`).join('')}<th></th></tr></thead><tbody id="${role.table.key}Rows"></tbody></table></div>`}
      <button class="add-row" data-add="${role.table.key}">+ ДОБАВИТЬ</button>
    </div>` : '';
  panel.innerHTML = `
    <div class="page-heading">
      <div><span class="eyebrow">ROLE ABILITY // 06</span><h1>${esc(role.name).toUpperCase()}</h1></div>
      <div class="role-rank">
        <label>РАНГ<input data-key="${rankKey(id)}" type="number" min="1" max="${ROLE_MAX_RANK}" value="${roleRank()}" aria-label="Ранг способности роли"></label>
        <button type="button" class="skill-upgrade" data-role-upgrade hidden></button>
      </div>
    </div>
    ${multiclassPanel(id)}
    <div class="role-grid">
      <div class="panel role-ability">
        <div class="section-title">${esc(role.ability).toUpperCase()}</div>
        <p>${esc(role.text)}</p>
        ${role.roll ? `<button type="button" class="primary role-roll" data-role-roll>${esc(role.roll).toUpperCase()}: 1D10 + РАНГ</button>` : ''}
      </div>
      ${specialties}${net}${roleExtraPanels(id)}${table}
      <div class="panel role-notes">
        <div class="section-title">ЗАМЕТКИ РОЛИ</div>
        <textarea data-key="roleNotes_${id}" rows="5" placeholder="Особенности, договорённости, долги, что обещано…">${esc(state[`roleNotes_${id}`] || '')}</textarea>
      </div>
    </div>`;
  if(role.table) renderRows(role.table.key);
  refreshRolePanel();
  setupPanels();
}
// ---------- Дополнительные панели ролей ----------
const optionList = (entries, value) => entries.map(([id,name])=>`<option value="${esc(id)}"${String(id) === String(value) ? ' selected' : ''}>${esc(name)}</option>`).join('');
const roleSelect = (key, label, entries, fallback) => `<label>${label}<select data-key="${key}">${optionList(entries, state[key] ?? fallback)}</select></label>`;
const roleCheck = (key, label) => `<label class="check-row"><input type="checkbox" data-key="${key}"${isChecked(key) ? ' checked' : ''}> ${label}</label>`;
const tierFor = (tiers, rank) => [...tiers].reverse().find(tier=>rank >= tier[0]) || tiers[0];
const techSkillEntries = () => skills.map((name,i)=>[name,i]).filter(([,i])=>skillStatIndex(i) === 3).map(([name])=>[name, name]);
// Бросок из частей: [[значение, подпись], …] + 1d10 (luck — можно ли добавить удачу после броска).
function rollParts(label, parts, {judge, luck = true, crits = true} = {}){
  const all = parts.filter(([value])=>value);
  const modifier = all.reduce((sum,[value])=>sum + value, 0);
  return rollDicePool([{sides:10,count:1}], modifier, withNotes(label, all.map(([value,note])=>`${note} ${value >= 0 ? '+' : '−'}${Math.abs(value)}`)), {judge, crits, luck});
}
const beats = dv => entry => entry.total > dv ? `УСПЕХ (СЛ ${dv})` : `ПРОВАЛ (СЛ ${dv}; при равенстве — провал)`;
const skillPart = name => { const i = skills.indexOf(name); return [refLevel(`b${i}`), name.replace(' (x2)', '')]; };

function roleExtraPanels(id){
  const panel = (title, body, info = '') => `<div class="panel role-extra"><div class="section-title">${title}${info ? ` <span data-role-info="${info}"></span>` : ''}</div>${body}</div>`;
  if(id === 'rockerboy') return panel('ВЛИЯНИЕ НА ФАНАТОВ', `
    <div class="armor-form">${roleSelect('rbTarget', 'На кого', Object.entries(rockerTargets).map(([key,[name,dv]])=>[key, `${name} — СЛ ${dv}`]), 'fan')}</div>
    <button type="button" class="primary role-roll" data-role-action="rbRoll">ХАРИЗМАТИЧЕСКОЕ ДАВЛЕНИЕ: РАНГ + 1D10</button>
    <div class="role-info" data-role-info="rbTier"></div>`);
  if(id === 'tech') return panel('РАБОТА СОЗДАТЕЛЯ', `
    <div class="armor-form">
      ${roleSelect('techWork', 'Работа', [['upgrade','Модернизация'],['fabrication','Изготовление'],['invention','Изобретение']], 'upgrade')}
      ${roleSelect('techPrice', 'Ценовая категория', Object.entries(priceCategories).map(([key,[name,dv,time]])=>[key, `${name} — СЛ ${dv}, ${time}`]), 'costly')}
      ${roleSelect('techSkill', 'ТЕХ-навык ремонта предмета', techSkillEntries(), 'Знания техники')}
    </div>
    <button type="button" class="primary role-roll" data-role-action="techRoll">БРОСОК: ТЕХ + НАВЫК + РАНГ СПЕЦИАЛИЗАЦИИ + 1D10</button>
    <div class="role-info" data-role-info="techInfo"></div>`);
  if(id === 'medtech') return panel('МЕДИЦИНСКИЕ НАВЫКИ', `
    <div class="role-info" data-role-info="medSkills"></div>
    <div class="role-buttons">
      <button type="button" class="weapon-btn" data-role-action="medSurgery">ХИРУРГИЯ: ТЕХ + НАВЫК + 1D10</button>
      <button type="button" class="weapon-btn" data-role-action="medTech">МЕДТЕХНОЛОГИИ: ТЕХ + НАВЫК + 1D10</button>
    </div>`) + panel('ФАРМАЦЕВТИКА', `
    <table class="data-table med-drugs"><thead><tr><th>Изучен</th><th>Препарат</th><th>Доз</th><th></th></tr></thead><tbody>${Object.entries(medDrugs).map(([key,[name,effect]])=>`<tr>
      <td class="auto-cell"><input type="checkbox" data-key="medKnown_${key}"${isChecked(`medKnown_${key}`) ? ' checked' : ''} aria-label="Изучен: ${esc(name)}"></td>
      <td><strong>${esc(name)}</strong><small>${esc(effect)}</small></td>
      <td><input data-key="medDoses_${key}" type="number" min="0" value="${numeric(`medDoses_${key}`)}" aria-label="Доз: ${esc(name)}"></td>
      <td class="row-actions"><button type="button" class="weapon-btn" data-role-action="drugSynth" data-drug="${key}" title="Синтез: СЛ ${MED_SYNTH_DV}, 1 час, 200eb">СИНТЕЗ</button><button type="button" class="weapon-btn" data-role-action="drugUse" data-drug="${key}" title="Ввести одну дозу (действие)">ВВЕСТИ</button>${key === 'speedheal' ? '<button type="button" class="weapon-btn" data-role-action="drugSelf" data-drug="speedheal" title="Ввести себе: +ТЕЛ + ВОЛЯ к ПЗ">СЕБЕ</button>' : ''}</td>
    </tr>`).join('')}</tbody></table>`, 'medKnownInfo') + panel('КРИОСИСТЕМЫ', '<div class="role-info" data-role-info="cryoInfo"></div>');
  if(id === 'media') return panel('СЛУХИ', `
    <div class="armor-form">
      ${roleSelect('mediaSkill', 'Навык поиска', mediaSkills.map(name=>[name,name]), 'Поиск информации')}
      ${roleSelect('mediaRumor', 'Качество слуха', Object.entries(rumorTiers).map(([key,[name,,passive,active]])=>[key, `${name} — пасс. СЛ ${passive} / акт. СЛ ${active}`]), 'typical')}
    </div>
    <div class="role-buttons">
      <button type="button" class="weapon-btn" data-role-action="rumorPassive" title="Обычно бросает мастер, тайно, дважды в неделю">ПАССИВНО: ДОВЕРИЕ + 1D10</button>
      <button type="button" class="weapon-btn" data-role-action="rumorActive">АКТИВНЫЙ ПОИСК: СТАТ + НАВЫК + 1D10</button>
    </div>`) + panel('ПУБЛИКАЦИЯ', `
    ${roleCheck('mediaProof1', 'Есть хотя бы одно легко проверяемое доказательство (+1)')}
    ${roleCheck('mediaProof4', 'Больше 4 неопровержимых доказательств (+2)')}
    <button type="button" class="primary role-roll" data-role-action="mediaPublish">ПРОВЕРКА ДОСТОВЕРНОСТИ: 1D10</button>
    <div class="role-info" data-role-info="mediaTier"></div>`);
  if(id === 'exec') return panel('БОНУСЫ КОРПОРАЦИИ', '<div class="role-info" data-role-info="execPerks"></div>') + panel('НАЙМ И ЛОЯЛЬНОСТЬ', `
    <div class="armor-form">${roleSelect('execHireType', 'Тип подчинённого', Object.entries(execSubordinates).map(([key,item])=>[key, item.name]), 'bodyguard')}</div>
    <button type="button" class="weapon-btn" data-role-action="execHire" title="СТАТы — бросок 1d6 по таблице типа, лояльность — 1d6 + 1">НАНЯТЬ: БРОСИТЬ СТАТЫ</button>
    <div class="armor-form">
      <label>Подчинённый<select data-role-select="execMember"></select></label>
      ${roleSelect('execEvent', 'Событие', Object.entries(loyaltyEvents).map(([key,[name,value]])=>[key, `${value > 0 ? '+' : ''}${value}: ${name}`]), 'praise')}
    </div>
    <button type="button" class="weapon-btn" data-role-action="execLoyalty">ИЗМЕНИТЬ ЛОЯЛЬНОСТЬ</button>`, 'execTeamInfo');
  if(id === 'lawman') return panel('ВЫЗОВ ПОДКРЕПЛЕНИЯ', `
    <div class="armor-form"><label>Кого вызвать<select data-key="lawTier"></select></label></div>
    <button type="button" class="primary role-roll" data-role-action="lawCall">ВЫЗВАТЬ: D10 НЕ БОЛЬШЕ РАНГА</button>
    <div class="role-info" data-role-info="lawTable"></div>`);
  if(id === 'fixer') return panel('ВОРОТИЛА', `
    <button type="button" class="primary role-roll" data-role-action="fixerHaggle">ТОРГ: ХАР + ТОРГОВЛЯ + РАНГ + 1D10</button>
    <div class="role-info" data-role-info="fixerTier"></div>`);
  if(id === 'nomad') return panel('АВТОПАРК СЕМЬИ', '<div class="role-info" data-role-info="nomadFleet"></div>');
  return '';
}

function refreshRoleExtras(){
  const id = viewRoleId(), rank = roleRank();
  const info = name => $(`[data-role-info="${name}"]`);
  const list = items => `<ul class="role-list">${items.map(([on, html])=>`<li class="${on ? '' : 'is-locked'}">${html}</li>`).join('')}</ul>`;
  if(id === 'rockerboy' && info('rbTier')){
    const [, venue, ...effects] = tierFor(rockerTiers, rank);
    const target = state.rbTarget || 'fan';
    info('rbTier').innerHTML = `<p><strong>Где выступаете:</strong> ${esc(venue)}</p>` + list(Object.keys(rockerTargets).map((key,i)=>[true, `<span class="${key === target ? 'is-current' : ''}"><strong>${esc(rockerTargets[key][0])} (СЛ ${rockerTargets[key][1]}):</strong> ${esc(effects[i])}</span>`]));
  }
  if(id === 'tech' && info('techInfo')){
    const work = state.techWork || 'upgrade', [, dv, time] = priceCategories[state.techPrice || 'costly'];
    const notes = {upgrade:'Материалы той же ценовой категории, что и модернизируемый предмет (транспорт — как «Очень дорогое»).',
      fabrication:'Материалы на одну ценовую категорию дешевле (Супер роскошь — половина цены).',
      invention:'Опишите изобретение мастеру: он утверждает цену (минимум «Дорогое») и эффект.'};
    // Мастер модернизации (стр. 148): что можно улучшить и где это отметить в листе после успешного броска.
    const upgrades = [['повысить качество оружия со стандартного до отличного', 'Снаряжение → оружие → МОД / КАЧ. → «Качество»'],
      ['добавить 1 слот модификаций', 'окно МОД → «Модернизации Техника»'], ['сделать нескрываемое одноручное оружие скрываемым', 'окно МОД / КАЧ. → «Модернизации Техника»'],
      ['дать экзотическому оружию слоты модификаций или небазовые боеприпасы', 'окно МОД → «Модернизации Техника»'],
      ['+1 SP броне', 'Персонаж → Броня → «модернизация Техника +1 SP»'], ['снизить потерю Человечности импланта на 1d6 (если 2d6+, кроме Борг-оснащений)', 'бросьте 1d6 и поправьте ПЧ импланта'],
      ['упростить конструкцию: полный ремонт вдвое быстрее', 'заметка к предмету'], ['улучшение транспорта Кочевника 1-го ранга', 'заметка к транспорту'],
      ['модернизация, придуманная Мастером изобретателем', 'по описанию изобретения']];
    info('techInfo').innerHTML = `<p>СЛ ${dv}, время ${esc(time)}. Ранг специализации: ${numeric(rolePointsKey('tech', work))}. ${esc(notes[work])}</p>`
      + (work === 'upgrade' ? `<p><strong>Модернизация — один способ на раз:</strong></p><ul class="role-list">${upgrades.map(([what, where])=>`<li>${esc(what)} <small>— ${esc(where)}</small></li>`).join('')}</ul>` : '')
      + `<p>Полевая экспертиза ${numeric(rolePointsKey('tech','field'))}: «подлатать» предмет на ${numeric(rolePointsKey('tech','field')) * 10} минут; бонус к ТЕХ-навыкам учтён в навыках.</p>`;
  }
  if(id === 'medtech' && info('medSkills')){
    info('medSkills').innerHTML = `<p><strong>Хирургия:</strong> ${medSurgeryLevel()} (итог ${medSurgeryLevel() + statValue(3)}) · <strong>Медицинские технологии:</strong> ${medTechLevel()} (итог ${medTechLevel() + statValue(3)})</p>`;
    const known = Object.keys(medDrugs).filter(key=>isChecked(`medKnown_${key}`)).length, allowed = numeric(rolePointsKey('medtech','pharma'));
    info('medKnownInfo').textContent = `ИЗУЧЕНО ${known} / ${allowed}`;
    info('medKnownInfo').classList.toggle('is-over', known > allowed);
    const cryo = numeric(rolePointsKey('medtech','cryo'));
    info('cryoInfo').innerHTML = list(cryoBenefits.map((text,i)=>[i < cryo, `${i + 1}: ${esc(text)}`]));
  }
  if(id === 'media' && info('mediaTier')){
    const [, access, audience, chance, impact] = tierFor(mediaTiers, rank);
    const bonus = (isChecked('mediaProof1') ? 1 : 0) + (isChecked('mediaProof4') ? 2 : 0);
    info('mediaTier').innerHTML = `<p><strong>Аудитория поверит:</strong> ${Math.min(10, chance + bonus)} из 10${bonus ? ` (${chance} + ${bonus} за доказательства)` : ''}</p>` + list([[true, `<strong>Доступ:</strong> ${esc(access)}`],[true, `<strong>Аудитория:</strong> ${esc(audience)}`],[true, `<strong>Влияние:</strong> ${esc(impact)}`]]);
  }
  if(id === 'exec' && info('execPerks')){
    info('execPerks').innerHTML = list(execPerks.map(([from, text])=>[rank >= from, `<strong>Ранг ${from}:</strong> ${esc(text)}`]));
    const allowed = execSubordinateRanks.filter(from=>rank >= from).length, have = (state.roleTeam || []).filter(row=>!isBlank(row[0]) || !isBlank(row[4])).length;
    info('execTeamInfo').textContent = `ПОДЧИНЁННЫХ ${have} / ${allowed}`;
    info('execTeamInfo').classList.toggle('is-over', have > allowed);
    const member = $('[data-role-select="execMember"]');
    if(member){
      const value = member.value;
      member.innerHTML = (state.roleTeam || []).map((row,i)=>[i, row[0] || execSubordinates[row[4]]?.name || `Строка ${i + 1}`]).map(([i,name])=>`<option value="${i}"${String(i) === value ? ' selected' : ''}>${esc(name)} (лояльность ${esc(state.roleTeam[i][2] || 0)})</option>`).join('');
    }
  }
  if(id === 'lawman' && info('lawTable')){
    const select = $('[data-key="lawTier"]');
    if(select){
      const available = lawmanBackup.filter(([from])=>rank >= from);
      const current = Math.min(Number(state.lawTier ?? available.length - 1), available.length - 1);
      select.innerHTML = available.map(([from, to, who],i)=>`<option value="${i}"${i === current ? ' selected' : ''}>Ранг ${from === to ? from : `${from}–${to}`}: ${esc(who.split(':')[0])}</option>`).join('');
    }
    info('lawTable').innerHTML = `<div class="table-scroll"><table class="data-table law-table"><thead><tr><th>Ранг</th><th>Кто приезжает</th><th>БН</th><th>ОС</th><th>ПЗ</th><th>СКО/ТЕЛ</th></tr></thead><tbody>${lawmanBackup.map(([from,to,who,bn,sp,hp,move])=>`<tr class="${rank >= from ? '' : 'is-locked'}"><td>${from === to ? from : `${from}–${to}`}</td><td>${esc(who)}</td><td>${bn}</td><td>${sp}</td><td>${hp}</td><td>${move}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if(id === 'fixer' && info('fixerTier')){
    const [, contacts, goods, haggle, culture] = tierFor(fixerTiers, rank);
    info('fixerTier').innerHTML = list([[true, `<strong>Связи и клиенты:</strong> ${esc(contacts)}`],[true, `<strong>Можно достать:</strong> ${esc(goods)}`],[true, `<strong>Торг:</strong> ${esc(haggle)}`],[true, `<strong>Свой чел:</strong> ${esc(culture)}`]]);
  }
  if(id === 'nomad' && info('nomadFleet')){
    const vehicles = (state.roleVehicles || []).filter(row=>!isBlank(row[0]) || !isBlank(row[3]));
    const upgrades = vehicles.reduce((sum,row)=>sum + String(row[1] || '').split(/[,;\n]/).filter(part=>part.trim()).length, 0);
    info('nomadFleet').innerHTML = `<p><strong>Мото +${rank}</strong> к ${motoSkills.map(name=>name.replace(' (x2)','')).join(', ')}.</p>
      <p><strong>Выборов автопарка:</strong> ${vehicles.length + upgrades} из ${rank} (транспорт ${vehicles.length}, улучшений ${upgrades}).</p>
      <p><strong>Доступный транспорт:</strong> ${Object.values(vehicleTypes).filter(item=>rank >= item[5]).map(item=>esc(item[0])).join(', ')}</p>
      <p><strong>Улучшения:</strong></p>` + list(nomadUpgrades.map(([name, from, kind])=>[rank >= from, `${esc(name)} <small>— ранг ${from}, ${esc(kind)}</small>`]));
  }
}

const medSurgeryLevel = () => Math.min(10, numeric(rolePointsKey('medtech','surgery')) * 2);
const medTechLevel = () => Math.min(10, numeric(rolePointsKey('medtech','pharma')) + numeric(rolePointsKey('medtech','cryo')));
const wound = () => [-woundPenalty(), 'ранение'];

const roleActionHandlers = {
  rbRoll(data, rank){
    const [name, dv] = rockerTargets[state.rbTarget || 'fan'];
    rollParts(`Харизматическое давление: ${name}`, [[rank, 'ранг']], {judge: beats(dv)});
  },
  techRoll(data, rank){
    const work = state.techWork || 'upgrade', [price, dv, time] = priceCategories[state.techPrice || 'costly'];
    const skill = state.techSkill || 'Знания техники';
    const names = {upgrade:'Модернизация', fabrication:'Изготовление', invention:'Изобретение'};
    rollParts(`${names[work]} (${price})`, [[statValue(3), 'ТЕХ'], skillPart(skill), [numeric(rolePointsKey('tech', work)), 'специализация'], wound()],
      {judge: entry => entry.total > dv ? `УСПЕХ (СЛ ${dv}), время ${time}` : `ПРОВАЛ (СЛ ${dv}): потрачена половина времени, материалы целы`});
  },
  medSurgery(){ rollParts('Хирургия', [[statValue(3), 'ТЕХ'], [medSurgeryLevel(), 'Хирургия'], wound()]); },
  medTech(){ rollParts('Медицинские технологии', [[statValue(3), 'ТЕХ'], [medTechLevel(), 'Медтехнологии'], wound()]); },
  drugSynth(data){
    const key = data.drug, [name] = medDrugs[key];
    if(!isChecked(`medKnown_${key}`)){ toast(`${name}: препарат не изучен`); return; }
    const entry = rollParts(`Синтез: ${name}`, [[statValue(3), 'ТЕХ'], [medTechLevel(), 'Медтехнологии'], wound()],
      {judge: entry => entry.total > MED_SYNTH_DV ? `УСПЕХ (СЛ ${MED_SYNTH_DV}): +${medTechLevel()} доз, 1 час, 200eb` : `ПРОВАЛ (СЛ ${MED_SYNTH_DV}): материалы пропали`});
    if(entry.total > MED_SYNTH_DV){
      state[`medDoses_${key}`] = numeric(`medDoses_${key}`) + medTechLevel();
      setInput(`medDoses_${key}`, state[`medDoses_${key}`]);
      persist();
    }
  },
  drugUse(data, rank, action){
    const key = data.drug, [name, effect] = medDrugs[key];
    if(numeric(`medDoses_${key}`) <= 0){ toast(`${name}: доз нет`); return; }
    state[`medDoses_${key}`] = numeric(`medDoses_${key}`) - 1;
    setInput(`medDoses_${key}`, state[`medDoses_${key}`]);
    let text = `${name}: введена доза — ${effect}`;
    if(action === 'drugSelf'){
      if(isMortallyWounded()) text += '. Не действует: смертельное ранение';
      else {
        const heal = statValue(8) + numeric('stat5'), before = numeric('currentHp');
        state.currentHp = Math.min(maxHp(), before + heal);
        syncWoundsWithHp(); fillStaticInputs(); updateDerived();
        text += `. ХИТЫ ${before} → ${state.currentHp}`;
      }
    }
    addHistory({kind:'damage', text});
    toast(text);
    persist();
  },
  rumorPassive(data, rank){
    const [name,, dv] = rumorTiers[state.mediaRumor || 'typical'] || rumorTiers.typical;
    rollParts(`Слухи (пассивно): ${name}`, [[rank, 'Доверие']], {luck:false, judge: beats(dv)});
  },
  rumorActive(){
    const [name,,, dv] = rumorTiers[state.mediaRumor || 'typical'] || rumorTiers.typical;
    const skill = state.mediaSkill || 'Поиск информации', i = skills.indexOf(skill);
    rollParts(`Поиск слухов: ${name}`, [[refTotal(`b${i}`), skill]], {judge: beats(dv)});
  },
  mediaPublish(data, rank){
    const [, , , chance] = tierFor(mediaTiers, rank);
    const target = Math.min(10, chance + (isChecked('mediaProof1') ? 1 : 0) + (isChecked('mediaProof4') ? 2 : 0));
    rollDicePool([{sides:10,count:1}], 0, 'Достоверность публикации', {crits:false, judge: entry => entry.die <= target ? `ПОВЕРИЛИ (${target} из 10)` : `НЕ ПОВЕРИЛИ (${target} из 10)`});
  },
  execHire(){
    const type = state.execHireType || 'bodyguard', item = execSubordinates[type];
    const roll = d(6), stats = item.stats[roll - 1], loyalty = d(6) + 1;
    if(!state.roleTeam?.some(row=>row.some(cell=>!isBlank(cell)))) state.roleTeam = [];
    state.roleTeam.push([item.name, item.job, String(loyalty), '', type, stats.map((value,i)=>`${execStatNames[i]} ${value}`).join(' · ')]);
    renderRows('roleTeam'); bindInputs(); save();
    addHistory({kind:'damage', text:`Нанят: ${item.name} (СТАТы по 1d6 = ${roll}, лояльность 1d6 + 1 = ${loyalty})`});
    toast(`Нанят ${item.name}: лояльность ${loyalty}`);
  },
  execLoyalty(){
    const index = Number($('[data-role-select="execMember"]')?.value);
    const row = state.roleTeam?.[index];
    if(!row){ toast('Сначала добавьте подчинённого'); return; }
    const [name, change] = loyaltyEvents[state.execEvent || 'praise'];
    const before = Number(row[2]) || 0;
    row[2] = String(before + change);
    setInput(`roleTeam${index}_2`, row[2]);
    persist(); refreshRoleExtras();
    const who = row[0] || 'Подчинённый';
    toast(`${who}: лояльность ${before} → ${row[2]}${Number(row[2]) <= 0 ? ' — подчинённый уйдёт' : ''}`);
    addHistory({kind:'damage', text:`${who}: ${name} (${change > 0 ? '+' : ''}${change}), лояльность ${before} → ${row[2]}`});
  },
  loyaltyCheck(data){
    if(!state.roleTeam?.[data.index]) save();
    const row = state.roleTeam?.[data.index];
    if(!row) return;
    const loyalty = Number(row[2]) || 0;
    rollDicePool([{sides:6,count:1}], 0, `Лояльность: ${row[0] || 'подчинённый'} (${loyalty})`, {crits:false});
  },
  vehicleDamage(data){
    if(!state.roleVehicles?.[data.index]) save();
    const row = state.roleVehicles?.[data.index];
    const input = $(`[data-vehicle-damage="${data.index}"]`);
    const damage = Math.max(0, Math.floor(Number(input?.value) || 0));
    if(!row || !damage) return;
    const before = Number(row[4]) || 0;
    row[4] = String(Math.max(0, before - damage));
    setInput(`roleVehicles${data.index}_4`, row[4]);
    input.value = '';
    persist(); refreshVehicleCards(); refreshRoleExtras();
    const text = `${row[0] || 'Транспорт'}: −${damage} ПЗТ, ${before} → ${row[4]}${row[4] === '0' ? ' — уничтожен (семья чинит неделю за 500eb)' : ''}`;
    addHistory({kind:'damage', text});
    toast(text);
  },
  vehicleRepair(data){
    if(!state.roleVehicles?.[data.index]) save();
    const row = state.roleVehicles?.[data.index];
    if(!row || isBlank(row[5])) return;
    row[4] = row[5];
    setInput(`roleVehicles${data.index}_4`, row[4]);
    persist(); refreshVehicleCards();
    toast(`${row[0] || 'Транспорт'}: ПЗТ восстановлены (${row[5]})`);
  },
  lawCall(data, rank){
    const available = lawmanBackup.filter(([from])=>rank >= from);
    const index = Math.min(Number($('[data-key="lawTier"]')?.value ?? available.length - 1), available.length - 1);
    rollDicePool([{sides:10,count:1}], 0, 'Вызов подкрепления', {crits:false, judge: entry => {
      if(entry.die > rank) return `никто не откликнулся (нужно не больше ${rank}); можно повторить в следующем раунде`;
      const arrive = d(6);
      if(arrive < 6) return `откликнулись! Прибудут через ${arrive} р.: ${available[index][2]}`;
      if(index + 1 < lawmanBackup.length) return `откликнулись! На d6 выпало 6 — через 6 раундов прибудет подкрепление выше: ${lawmanBackup[index + 1][2]}`;
      return `откликнулись! На d6 выпало 6 — через 6 раундов прибудут две группы: ${available[index][2]}`;
    }});
  },
  fixerHaggle(data, rank){
    rollParts('Торг', [[statValue(4), 'ХАР'], skillPart('Торговля'), [rank, 'Воротила'], wound()]);
  }
};
roleActionHandlers.drugSelf = roleActionHandlers.drugUse;

function roleAction(action, data){
  const handler = roleActionHandlers[action];
  if(handler) handler(data || {}, roleRank(), action);
}

// Обновляет числа на вкладке роли без перерисовки (чтобы не сбивать фокус).
// ---------- Программы нетраннера ----------
function programPresetSelect(key, value){
  return `<select data-key="${key}" aria-label="Программа из книги"><option value="">Своя</option>${Object.entries(programPresets).map(([id,[name]])=>`<option value="${id}"${id === value ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select>`;
}
// Усиления программы: «цель:величина» через запятую в колонке 9 («cloak:2,speed:1»). В старых строках — одна цель
// без величины, она в колонке 10 или в пресете (по умолчанию 2). Величина может быть отрицательной — штраф.
const interfaceKeys = () => (roles.netrunner.interfaceAbilities || []).map(([id])=>id);
const boostTargets = () => [['all', 'все функции Интерфейса'], ...(roles.netrunner.interfaceAbilities || []).map(([id,name])=>[id, name.split(' (')[0]]),
  ['progatk', 'атаки программами'], ['speed', 'Скорость в Сети'], ['brain', 'урон по мозгу (снижение)']];
const parseBoosts = data => String(data?.[9] || '').split(',').map(part=>part.trim()).filter(Boolean).map(part=>{
  const [target, amount] = part.split(':');
  return [target, amount !== undefined && amount !== '' ? Number(amount) || 0 : Number(data?.[10]) || (programPresets[data?.[6]]?.[7] ?? 2)];
});
const encodeBoosts = list => list.filter(([target])=>target).map(([target, amount])=>`${target}:${Number(amount) || 0}`).join(',');
function programBoostEditor(i, data){
  const k = j => `rolePrograms${i}_${j}`;
  const rows = parseBoosts(data).map(([target, amount], b)=>`<span class="boost-row">
      <select data-boost-target="${i}" data-b="${b}" aria-label="Что усиливает программа">${boostTargets().map(([id, name])=>`<option value="${id}"${id === target ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select>
      <input type="number" step="1" data-boost-amount="${i}" data-b="${b}" value="${amount}" aria-label="Величина усиления" title="Величина: плюс к проверке, Скорости или снижение урона; минус — штраф">
      <button type="button" class="remove" data-boost-del="${i}" data-b="${b}" title="Убрать усиление">×</button>
    </span>`).join('');
  return `<div class="boost-list">${rows}<button type="button" class="add-row" data-boost-add="${i}">+ УСИЛЕНИЕ</button>
    <input type="hidden" data-key="${k(9)}" value="${esc(data?.[9] || '')}"><input type="hidden" data-key="${k(10)}" value="${esc(data?.[10] || '')}"></div>`;
}
// Список усилений программы из полей карточки → колонка 9 (величины записываются явно, колонка 10 больше не нужна).
function setProgramBoosts(i, list, rerender){
  const data = state.rolePrograms?.[i];
  if(!data) return;
  data[9] = encodeBoosts(list); data[10] = '';
  setInput(`rolePrograms${i}_9`, data[9]); setInput(`rolePrograms${i}_10`, '');
  if(rerender){ renderRows('rolePrograms'); bindInputs(); }
  save();
}
const boostListFromCard = i => $$(`[data-boost-target="${i}"]`).map(sel=>[sel.value, $(`[data-boost-amount="${i}"][data-b="${sel.dataset.b}"]`)?.value]);
const programName = data => data?.[0] || programPresets[data?.[6]]?.[0] || 'Программа';
const isProgramOn = data => data?.[8] === '1';
// Класс «Против …»: активация = атака (NET-действие на кнопке ПОПАДАНИЕ), не на галочке.
const isAttackProgram = data => /^Против/i.test(String(data?.[1] || ''));
const isDerezzed = data => !isBlank(data?.[4]) && Number(data[4]) > 0 && !isBlank(data?.[7]) && Number(data[7]) <= 0;
// Бонус активных программ: target — ключ способности Интерфейса, 'progatk', 'speed' или 'brain';
// усиление «все функции Интерфейса» действует на каждую функцию Интерфейса.
const programBoosts = target => (state.rolePrograms || []).filter(isProgramOn).flatMap(data=>parseBoosts(data)
  .filter(([t])=>t === target || (t === 'all' && interfaceKeys().includes(target)))
  .map(([, value])=>[value, programName(data).split(' (')[0]]));
const programBoostTotal = target => programBoosts(target).reduce((sum,[value])=>sum + value, 0);
function programRow(index){
  if(!state.rolePrograms?.[index]) save();
  return state.rolePrograms?.[index];
}
// Выбор транспорта из книги заполняет ПЗТ, места и скорость.
function applyVehiclePreset(key, value){
  const match = /^roleVehicles(\d+)_3$/.exec(key);
  const preset = match && vehicleTypes[value];
  if(!preset) return;
  const i = match[1];
  const [name, hp, seats, move, kmh] = preset;
  if(isStandardName(`roleVehicles${i}_0`, vehicleTypes)) setInput(`roleVehicles${i}_0`, name);
  setInput(`roleVehicles${i}_4`, hp);
  setInput(`roleVehicles${i}_5`, hp);
  setInput(`roleVehicles${i}_6`, `${seats} мест, СКО ${move}, ${kmh} км/ч`);
}
// Выбор программы из книги заполняет строку.
function applyProgramPreset(key, value){
  const match = /^rolePrograms(\d+)_6$/.exec(key);
  const preset = match && programPresets[value];
  if(!preset) return;
  const i = match[1];
  const [name, kind, attack, defense, rez, damage, boost, amount, effect, iceDamage = '', rollKind = ''] = preset;
  if(isStandardName(`rolePrograms${i}_0`, programPresets)) setInput(`rolePrograms${i}_0`, name);
  [[1,kind],[2,attack],[3,defense],[4,rez],[7,rez],[11,damage],[12,iceDamage],[13,rollKind],[9,boost],[10,amount],[5,effect]].forEach(([j,v])=>setInput(`rolePrograms${i}_${j}`, v));
}
// Снесённая программа (REZ 0) выключается; строки подсвечиваются по состоянию.
function refreshProgramRows(){
  $$('#roleProgramsRows .program-card').forEach((tr,i)=>{
    const data = state.rolePrograms?.[i];
    if(!data) return;
    const derezzed = isDerezzed(data);
    if(derezzed && isProgramOn(data)){
      data[8] = '';
      const toggle = tr.querySelector('[data-key$="_8"]');
      if(toggle) toggle.checked = false;
    }
    tr.classList.toggle('is-active', isProgramOn(data));
    tr.classList.toggle('is-derezzed', derezzed);
    tr.title = derezzed ? 'REZ исчерпан — программа снесена' : '';
    const attack = tr.querySelector('[data-program-attack]');
    if(attack) attack.disabled = /^(Усилит|Защит)/i.test(data[1] || '');
    const effect = data[13] === 'effect', ice = !isBlank(data[12]);
    const damage = tr.querySelector('[data-program-damage]:not([data-target])');
    if(damage){
      damage.disabled = !parseDamage(data[11]);
      damage.textContent = effect ? 'СВОЙСТВО' : ice ? 'ПО ПРОГРАММЕ' : 'УРОН';
      damage.title = effect ? `Бросок свойства: ${data[5] || ''}` : ice ? 'Урон по обычной программе (после попадания)' : 'Бросок урона программы (после попадания)';
    }
    const iceButton = tr.querySelector('[data-program-damage][data-target="ice"]');
    if(iceButton){ iceButton.hidden = !ice || effect; iceButton.disabled = !parseDamage(data[12]); }
    const rollLabel = tr.querySelector('[data-program-roll-label]');
    if(rollLabel) rollLabel.textContent = effect ? 'Свойство' : ice ? 'Урон: прогр.' : 'Урон';
  });
  const summary = $('#netBoostSummary');
  if(summary){
    const active = (state.rolePrograms || []).filter(isProgramOn);
    summary.textContent = active.length ? `Включены: ${active.map(data=>programName(data).split(' (')[0]).join(', ')}` : 'Включённых программ нет';
    const brain = programBoostTotal('brain'), speed = programBoostTotal('speed'), attacks = programBoostTotal('progatk');
    const abilities = (roles.netrunner.interfaceAbilities || []).map(([id, name])=>[programBoostTotal(id), name.split(' (')[0]]).filter(([value])=>value);
    $('#netBoostExtra').textContent = [...abilities.map(([value, name])=>`${name} ${withSign(value)}`), attacks && `атаки программами ${withSign(attacks)}`,
      speed && `Скорость в Сети ${withSign(speed)}`, brain && `урон по мозгу −${brain}`].filter(Boolean).join(' · ');
  }
}
// NET-действия на ход (стр. 197–198): по рангу Интерфейса (netActions) плюс сколько добавил или убрал мастер (netExtra).
// Функции Интерфейса (кроме Сканера — это мясное действие), Разряд, включение и выключение программы галочкой
// и атака невключённой программой тратят по одному сами; подключение, отключение и прочее — нажатием на квадратик.
// Перемещение по Архитектуре и копирование файлов NET-действий не требуют. Перерасход не запрещён, а подсвечивается.
const netActionsTotal = () => Math.max(0, netActionsForRank(rankOf('netrunner')) + (Number(state.netExtra) || 0));
function refreshNetTracker(){
  const box = $('#netTracker');
  if(!box) return;
  const base = netActionsForRank(rankOf('netrunner')), total = netActionsTotal(), used = Math.max(0, Number(state.netUsed) || 0), extra = Number(state.netExtra) || 0;
  const pips = Array.from({length:Math.max(total, used)}, (_, k)=>`<button type="button" class="net-pip${k < used ? ' is-used' : ''}${k >= total ? ' is-over' : ''}" data-net-pip="${k}" aria-label="NET-действие ${k + 1}" title="${k < used ? 'Потрачено — нажмите, чтобы вернуть' : 'Отметить потраченным: подключение, отключение, другое'}"></button>`).join('');
  box.title = `NET-действий за ход: ${base} по рангу Интерфейса${extra ? `, ${extra > 0 ? '+' : '−'}${Math.abs(extra)} от мастера` : ''}. Функции Интерфейса (кроме Сканера), Разряд, включение и выключение программ тратят их сами; подключение, отключение и прочее — нажмите на квадратик. Перемещение по Архитектуре — не NET-действие.`;
  box.innerHTML = `<span class="net-label">NET</span>${pips}<b class="net-count${used > total ? ' is-over' : ''}">${used}/${total}</b>`
    + `${extra ? `<small class="net-bonus">${extra > 0 ? '+' : '−'}${Math.abs(extra)} ГМ</small>` : ''}`
    + `<button type="button" class="net-mini" data-net-extra="-1" title="Мастер убрал одно NET-действие">−</button><button type="button" class="net-mini" data-net-extra="1" title="Мастер добавил NET-действие сверх положенного">+</button>`
    + `<button type="button" class="net-mini net-reset" data-net-reset title="Новый ход: все NET-действия снова доступны">↺</button>`;
}
function setNetUsed(value){
  state.netUsed = Math.max(0, value);
  refreshNetTracker();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}
function spendNetAction(label){
  const total = netActionsTotal(), used = (Number(state.netUsed) || 0) + 1;
  setNetUsed(used);
  if(used > total) toast(`NET-действие сверх положенного: ${used} из ${total} (${label}). Если мастер разрешил — добавьте его «+» в счётчике`);
}
function programAttack(index){
  const data = programRow(index);
  if(!data) return;
  // Атакующая программа: каждое ПОПАДАНИЕ — NET-действие (активация = атака), даже если галочка уже стояла.
  // Усилители/прочие: атака с выключенной — активация (NET); уже включённая оплачена галочкой.
  if(isAttackProgram(data) || !isProgramOn(data)) spendNetAction(`атака: ${programName(data).split(' (')[0]}`);
  const attack = Number(data[2]) || 0;
  const boosts = programBoosts('progatk');
  rollDicePool([{sides:10,count:1}], roleRank() + attack + boosts.reduce((sum,[value])=>sum + value, 0), withNotes(`${programName(data)}: попадание`, [`Интерфейс ${roleRank()}`, `ATK ${attack}`, ...boosts.map(([value, name])=>value && `${name} ${withSign(value)}`)]), {luck:true});
  if(isAttackProgram(data) && isProgramOn(data)){
    data[8] = '';
    $$(`[data-key="rolePrograms${index}_8"]`).forEach(el=>{ el.checked = false; });
    refreshProgramRows();
    persist();
  }
}

// Встреча с Чёрным ЛЬДОМ / инициатива в Сети (стр. 201): Интерфейс + бонус Скорости + 1d10 против СКО ЛЬДА + 1d10.
function rollNetSpeed(){
  const boosts = programBoosts('speed');
  const speed = boosts.reduce((sum, [value]) => sum + value, 0);
  rollDicePool(
    [{sides:10, count:1}],
    roleRank() + speed,
    withNotes('Скорость', [
      `Интерфейс ${roleRank()}`,
      ...boosts.map(([value, name]) => value && `${name} ${withSign(value)}`)
    ].filter(Boolean)),
    {luck:true}
  );
}
// Урон программы: по обычной программе (или человеку) либо по Чёрному ЛЬДУ, если урон по нему отличается.
// У программ вроде Суперклея кубики — свойство (длительность, штраф), а не урон.
function programDamage(index, target){
  const data = programRow(index);
  if(!data) return;
  const effect = data[13] === 'effect', ice = target === 'ice';
  const damage = parseDamage(ice ? data[12] : data[11]);
  if(!damage){ toast(`${programName(data)}: укажите ${effect ? 'кубики свойства' : 'урон'} в виде 3d6`); return; }
  const label = effect ? 'свойство' : ice ? 'урон по Чёрному ЛЬДУ' : !isBlank(data[12]) ? 'урон по программе' : 'урон';
  const entry = rollDicePool([{sides:damage.sides,count:damage.count}], damage.bonus, `${programName(data)}: ${label}`, {crits:false, judge: () => effect ? data[5] || '' : ''});
  // Узко: после броска урона по программе можно списать его с REZ этой строки (урон по вашей программе).
  if(!effect && entry){
    toast(`${programName(data)}: урон ${entry.total}`, '−REZ', () => applyProgramRezDamage(index, entry.total));
  }
}
function applyProgramRezDamage(index, amount){
  const data = programRow(index);
  if(!data || isBlank(data[7])) return;
  const before = Math.max(0, Math.floor(Number(data[7]) || 0));
  const after = Math.max(0, before - Math.max(0, Math.floor(Number(amount) || 0)));
  data[7] = String(after);
  setInput(`rolePrograms${index}_7`, data[7]);
  if(after === 0){
    data[8] = '';
    $$(`[data-key="rolePrograms${index}_8"]`).forEach(el=>{ el.checked = false; });
  }
  refreshProgramRows();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
  toast(`${programName(data)}: REZ ${before} → ${after}${after === 0 ? ' — снесена' : ''}`);
}
function programRestore(index){
  const data = programRow(index);
  if(!data || isBlank(data[4])) return;
  data[7] = data[4];
  setInput(`rolePrograms${index}_7`, data[7]);
  refreshProgramRows();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
  toast(`${programName(data)}: REZ восстановлен (${data[4]})`);
}
// Урон по мозгу проходит мимо брони; включённые защитники вроде «Брони» уменьшают его.
function applyBrainDamage(){
  const damage = Math.max(0, Math.floor(Number($('#brainDamage').value) || 0));
  if(!damage) return;
  const reduction = programBoostTotal('brain');
  const through = Math.max(0, damage - reduction);
  const hpBefore = numeric('currentHp');
  state.currentHp = Math.max(0, hpBefore - through);
  syncWoundsWithHp();
  fillStaticInputs();
  updateDerived();
  const status = state.currentHp === 0 ? ' СМЕРТЕЛЬНОЕ РАНЕНИЕ.' : isChecked('seriousWound') ? ' ТЯЖЁЛОЕ РАНЕНИЕ.' : '';
  const text = `Урон по мозгу ${damage}${reduction ? ` (защита −${reduction})` : ''}: −${through} ХИТ, ${hpBefore} → ${state.currentHp}/${maxHp()}.${status}`;
  $('#netDamageResult').textContent = text;
  addHistory({kind:'damage', text});
  $('#brainDamage').value = '';
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}

function refreshRolePanel(){
  const role = currentRole();
  if(!role || !$('#role').innerHTML) return;
  const rank = roleRank();
  const info = $('#rolePointsInfo');
  if(info){
    const spent = rolePointsSpent(viewRoleId()), budget = rolePointsBudget();
    // Техник (стр. 147): каждый ранг — по 1 очку в двух разных специализациях, значит ни одна не выше ранга.
    const capped = viewRoleId() === 'tech' ? (role.specialties || []).filter(item=>numeric(rolePointsKey('tech', item.key)) > rank) : [];
    $$('.role-specialties input[data-key^="rolePts_"]').forEach(el=>el.classList.toggle('is-over', capped.some(item=>el.dataset.key === rolePointsKey('tech', item.key))));
    info.textContent = `ОЧКИ ${spent} / ${budget}${capped.length ? ` · ВЫШЕ РАНГА: ${capped.map(item=>item.name).join(', ')}` : ''}`;
    info.classList.toggle('is-over', spent > budget || capped.length > 0);
    info.title = [spent > budget && 'Распределено больше очков, чем даёт ранг',
      capped.length && `Каждый ранг Создателя даёт по 1 очку в двух разных специализациях — ни одна не может быть выше ранга (${rank})`].filter(Boolean).join('. ');
  }
  refreshSoloRoundUi();
  refreshNetTracker();
  refreshProgramRows();
  refreshVehicleCards();
  refreshRoleExtras();
  const tableInfo = $('#roleTableInfo');
  if(tableInfo) tableInfo.textContent = viewRoleId() === 'netrunner' && !isBlank(state.netSlots) ? `ПРОГРАММ ${(state.rolePrograms || []).filter(row=>!isBlank(row[0])).length} / ${numeric('netSlots')}` : '';
  const upgrade = $('[data-role-upgrade]');
  if(upgrade){
    const cost = roleUpgradeCost();
    upgrade.hidden = state.creationMode !== false || rank >= ROLE_MAX_RANK;
    upgrade.textContent = `↑${cost} IP`;
    upgrade.disabled = numeric('ip') < cost;
    upgrade.title = `Повысить ранг до ${rank + 1} за ${cost} IP`;
  }
  $$('[data-role-view]').forEach(btn=>{ btn.querySelector('b').textContent = rankOf(btn.dataset.roleView); });
  const take = $('[data-multiclass]');
  if(take){
    const reason = multiclassBlock();
    take.disabled = Boolean(reason) || !$('#multiclassPick')?.value;
    $('#multiclassNote').textContent = reason || `Ранг 1 новой роли — ${ROLE_RANK_IP} IP. Следующую роль можно будет взять, когда эта дойдёт до ранга ${MULTICLASS_MIN_RANK}.`;
  }
  renderRoleSummary();
}
// Переключатель ролей на вкладке 06 и взятие новой роли (стр. 143).
function multiclassPanel(id){
  const owned = charRoles();
  const free = Object.entries(roles).filter(([rid])=>!owned.includes(rid));
  const tabs = owned.map(rid=>`<button type="button" class="skill-filter${rid === id ? ' active' : ''}" data-role-view="${rid}" aria-pressed="${rid === id}">${esc(roles[rid].name)} <b>${rankOf(rid)}</b></button>${rid === owned[0] ? '' : `<button type="button" class="remove" data-role-drop="${rid}" title="Убрать роль «${esc(roles[rid].name)}» (IP не возвращаются)">×</button>`}`).join('');
  return `<div class="panel role-multiclass">
    <div class="role-switch">${tabs}</div>
    ${free.length ? `<div class="role-take">
      <span class="role-take-title">МУЛЬТИКЛАСС</span>
      <select id="multiclassPick" aria-label="Новая роль"><option value="">новая роль…</option>${free.map(([rid, item])=>`<option value="${rid}">${esc(item.name)} — ${esc(item.ability)}</option>`).join('')}</select>
      <button type="button" class="add-row" data-multiclass>ВЗЯТЬ РОЛЬ ЗА ${ROLE_RANK_IP} IP</button>
      <small id="multiclassNote"></small>
    </div>` : ''}
    ${owned.length > 1 ? `<small class="role-street">На Улице персонажа знают как: <b>${esc(roles[lastRoleId()].name)}</b></small>` : ''}
  </div>`;
}
// Строка под выбором роли на вкладке «Персонаж»: остальные роли.
function renderRoleSummary(){
  const box = $('#roleExtraInfo');
  if(!box) return;
  const extra = charRoles().slice(1);
  box.hidden = !extra.length;
  box.textContent = extra.length ? `Мультикласс: ${extra.map(id=>`${roles[id].name} ${rankOf(id)}`).join(', ')}. На Улице — ${roles[lastRoleId()].name}.` : '';
}
function takeRole(id){
  const reason = multiclassBlock();
  if(reason){ toast(reason); return; }
  if(!roles[id] || hasRole(id)) return;
  state.ip = numeric('ip') - ROLE_RANK_IP;
  state.extraRoles = [...(state.extraRoles || []), id];
  state[rankKey(id)] = 1;
  state.roleView = id;
  setInput('ip', state.ip);
  // Держим select роли в синхроне со state — иначе следующий save() с пустым select сотрёт roleId.
  if(state.roleId) setInput('roleId', state.roleId);
  renderRolePanel(); bindInputs(); refreshSkills();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
  toast(`${roles[id].name}: ${roles[id].ability}, ранг 1 за ${ROLE_RANK_IP} IP`);
}
function dropRole(id){
  const before = [...(state.extraRoles || [])], rank = state[rankKey(id)], view = state.roleView;
  const apply = () => { renderRolePanel(); bindInputs(); refreshSkills(); if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now(); };
  state.extraRoles = before.filter(rid=>rid !== id);
  if(state.roleView === id) state.roleView = state.roleId;
  apply();
  toast(`Роль «${roles[id].name}» убрана, IP не возвращены`, 'Вернуть', ()=>{ state.extraRoles = before; state[rankKey(id)] = rank; state.roleView = view; apply(); });
}
// Проверка способности роли: 1d10 + ранг (удачу можно добавить после броска).
function rollRoleAbility(label, extras = []){
  rollDicePool([{sides:10,count:1}], roleRank() + extras.reduce((sum,[value])=>sum + value, 0), withNotes(label, extras.map(([value,note])=>value && `${note} ${withSign(value)}`)), {luck:true});
}
function upgradeRole(){
  const cost = roleUpgradeCost();
  if(roleRank() >= ROLE_MAX_RANK || numeric('ip') < cost) return;
  const key = rankKey(viewRoleId());
  state.ip = numeric('ip') - cost;
  state[key] = roleRank() + 1;
  setInput('ip', state.ip);
  setInput(key, state[key]);
  refreshSkills(); refreshRolePanel();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
  toast(`${currentRole().ability}: ранг ${state[key]} за ${cost} IP`);
}

