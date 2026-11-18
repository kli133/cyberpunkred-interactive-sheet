// Вкладка роли / NET — вынесено из player/app.js. Глобалы: state, helpers из app/shared; t/term из i18n.
const isEnLang = () => typeof I18N !== 'undefined' && I18N.getLang && I18N.getLang() === 'en';
// Ability strings are "RU (English Name)" — show the English parenthetical in EN.
function roleAbilityLabel(ability){
  const raw = String(ability || '');
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if(m && isEnLang()) return m[2];
  return raw;
}
function renderRolePanel(){
  const role = currentRole(), id = viewRoleId();
  const tab = $('#roleTab'), panel = $('#role');
  tab.hidden = !role;
  renderRoleSummary();
  if(!role){
    tab.textContent = t('06 // Роль');
    panel.innerHTML = '';
    if(panel.classList.contains('active')) switchTab('character');
    return;
  }
  const n = charRoles().length;
  tab.textContent = n > 1 ? `06 // ${t('Роли')} (${n})` : `06 // ${term(role.name)}`;
  const specialties = role.specialties ? `<div class="panel role-specialties">
      <div class="section-title">${t('НАПРАВЛЕНИЯ')} <span class="section-meta" id="rolePointsInfo"></span></div>
      <table class="data-table"><thead><tr><th>${t('Направление')}</th><th>${t('Цена')}</th><th>${t('Уровень')}</th></tr></thead><tbody>${role.specialties.map(item=>`<tr>
        <td><strong>${esc(term(item.name))}</strong><small>${esc(t(item.effect))}</small></td>
        <td>${item.cost} ${t('оч.')}</td>
        <td><input data-key="${rolePointsKey(id, item.key)}" type="number" min="0" max="${item.max ?? ROLE_MAX_RANK}" value="${numeric(rolePointsKey(id, item.key))}" aria-label="${esc(t('Уровень') + ': ' + term(item.name))}"></td>
      </tr>`).join('')}</tbody></table>
      ${id === 'solo' ? `<div class="role-buttons solo-round-controls">
        <button type="button" class="weapon-btn" data-solo-new-round title="${esc(t('Сбросить Отражение и Слабое место на новый раунд'))}">${t('НОВЫЙ РАУНД')}</button>
        <button type="button" class="weapon-btn" data-solo-reallocate title="${esc(t('Обнулить очки и распределить заново. Вне боя — свободно; в бою — действием'))}">${t('ПЕРЕРАСПРЕДЕЛИТЬ ОЧКИ')}</button>
      </div>
      <label class="check-row"><input type="checkbox" data-key="soloInCombat"${isChecked('soloInCombat') ? ' checked' : ''}> ${t('Сейчас бой (перераспределение = действие)')}</label>
      <div class="role-info" id="soloRoundInfo"></div>` : ''}
    </div>` : '';
  const net = role.interfaceAbilities ? `<div class="panel role-net">
      <div class="section-title">${t('СЕТЬ')} <span class="section-meta net-tracker" id="netTracker"></span></div>
      <div class="armor-form">
        <label>${t('Кибердека')}<input data-key="netDeck" value="${esc(state.netDeck || '')}" placeholder="${esc(t('Модель кибердеки'))}"></label>
        <label>${t('Слоты программ')}<input data-key="netSlots" type="number" min="0" value="${esc(state.netSlots ?? '')}"></label>
      </div>
      <div class="net-attack">
        <div class="net-block-title">${t('СКОРОСТЬ В СЕТИ')} <small>${t('инициатива и встреча с Чёрным ЛЬДОМ: Интерфейс + бонус от программ + 1d10')}</small></div>
        <div class="role-buttons">
          <button type="button" class="weapon-btn" data-net-speed title="${esc(t('Интерфейс + бонус от программ + 1d10; результат против СКО ЛЬДА + 1d10'))}">${t('ПРОВЕРКА СКОРОСТИ')}</button>
        </div>
        <div class="net-block-title">${t('АТАКА РАЗРЯДОМ')} <small>${t('базовая атака по программе или нетраннеру')}</small></div>
        <div class="role-buttons">
          <button type="button" class="weapon-btn" data-interface="zap" title="${esc(t('Бросок на попадание: Интерфейс + 1d10; результат назовите мастеру'))}">${t('ПОПАДАНИЕ: ИНТЕРФЕЙС + 1D10')}</button>
          <button type="button" class="weapon-btn" data-zap-damage title="${esc(t('Урон Разряда после попадания: 1d6 программе или мозгу нетраннера'))}">${t('УРОН 1D6')}</button>
        </div>
      </div>
      <div class="net-block-title">${t('ФУНКЦИИ ИНТЕРФЕЙСА')} <small>${t('проверка: Интерфейс + 1d10')}</small></div>
      <div class="role-buttons">${role.interfaceAbilities.filter(([key])=>key !== 'zap').map(([key,name,hint])=>`<button type="button" class="weapon-btn" data-interface="${key}" title="${esc(t('Интерфейс + 1d10') + ': ' + t(hint))}">${esc(t(name))}</button>`).join('')}</div>
      <div class="net-summary"><span id="netBoostSummary"></span> <strong id="netBoostExtra"></strong></div>
      <div class="armor-form net-brain">
        <label>${t('Урон по мозгу')}<input id="brainDamage" type="number" min="0" placeholder="0"></label>
        <button type="button" class="death-save-button" data-brain-damage title="${esc(t('Урон от ЛЁДа и программ: мимо брони, с учётом включённых защитников'))}">${t('ПРИНЯТЬ УРОН')}</button>
      </div>
      <div class="damage-result" id="netDamageResult"></div>
    </div>` : '';
  const table = role.table ? `<div class="panel role-table-panel">
      <div class="section-title">${esc(t(role.table.title).toUpperCase())} <span class="section-meta" id="roleTableInfo"></span></div>
      ${cardRenderers[role.table.key] ? `<div class="${role.table.key === 'roleTeam' ? 'team-cards' : role.table.key === 'rolePrograms' ? 'program-cards' : 'team-cards'}" id="${role.table.key}Rows"></div>` : `<div class="table-scroll"><table class="data-table role-table${role.table.key === 'rolePrograms' ? ' program-table' : ''}"><thead><tr>${role.table.columns.map(column=>`<th>${esc(t(column))}</th>`).join('')}<th></th></tr></thead><tbody id="${role.table.key}Rows"></tbody></table></div>`}
      <button class="add-row" data-add="${role.table.key}">${t('+ ДОБАВИТЬ')}</button>
    </div>` : '';
  panel.innerHTML = `
    <div class="page-heading">
      <div><span class="eyebrow">ROLE ABILITY // 06</span><h1>${esc(term(role.name)).toUpperCase()}</h1></div>
      <div class="role-rank">
        <label>${t('РАНГ')}<input data-key="${rankKey(id)}" type="number" min="1" max="${ROLE_MAX_RANK}" value="${roleRank()}" aria-label="${esc(t('Ранг способности роли'))}"></label>
        <button type="button" class="skill-upgrade" data-role-upgrade hidden></button>
      </div>
    </div>
    ${multiclassPanel(id)}
    <div class="role-grid">
      <div class="panel role-ability">
        <div class="section-title">${esc(roleAbilityLabel(role.ability)).toUpperCase()}</div>
        <p>${esc(t(role.text))}</p>
        ${role.roll ? `<button type="button" class="primary role-roll" data-role-roll>${esc(t(role.roll)).toUpperCase()}: 1D10 + ${t('РАНГ')}</button>` : ''}
      </div>
      ${specialties}${net}${roleExtraPanels(id)}${table}
      <div class="panel role-notes">
        <div class="section-title">${t('ЗАМЕТКИ РОЛИ')}</div>
        <textarea data-key="roleNotes_${id}" rows="5" placeholder="${esc(t('Особенности, договорённости, долги, что обещано…'))}">${esc(state[`roleNotes_${id}`] || '')}</textarea>
      </div>
    </div>`;
  if(role.table) renderRows(role.table.key);
  refreshRolePanel();
  setupPanels();
}
// ---------- Дополнительные панели ролей ----------
const optionList = (entries, value) => entries.map(([id,name])=>`<option value="${esc(id)}"${String(id) === String(value) ? ' selected' : ''}>${esc(term(name) !== name ? term(name) : t(name))}</option>`).join('');
const roleSelect = (key, label, entries, fallback) => `<label>${t(label)}<select data-key="${key}">${optionList(entries, state[key] ?? fallback)}</select></label>`;
const roleCheck = (key, label) => `<label class="check-row"><input type="checkbox" data-key="${key}"${isChecked(key) ? ' checked' : ''}> ${t(label)}</label>`;
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
  const panel = (title, body, info = '') => `<div class="panel role-extra"><div class="section-title">${t(title)}${info ? ` <span class="section-meta" data-role-info="${info}"></span>` : ''}</div>${body}</div>`;
  if(id === 'rockerboy') return panel('ВЛИЯНИЕ НА ФАНАТОВ', `
    <div class="armor-form">${roleSelect('rbTarget', 'На кого', Object.entries(rockerTargets).map(([key,[name,dv]])=>[key, `${t(name)} — ${t('СЛ')} ${dv}`]), 'fan')}</div>
    <button type="button" class="primary role-roll" data-role-action="rbRoll">${t('ХАРИЗМАТИЧЕСКОЕ ДАВЛЕНИЕ: РАНГ + 1D10')}</button>
    <div class="role-info" data-role-info="rbTier"></div>`);
  if(id === 'tech') return panel('РАБОТА СОЗДАТЕЛЯ', `
    <div class="armor-form">
      ${roleSelect('techWork', 'Работа', [['upgrade','Модернизация'],['fabrication','Изготовление'],['invention','Изобретение']], 'upgrade')}
      ${roleSelect('techPrice', 'Ценовая категория', Object.entries(priceCategories).map(([key,[name,dv,time]])=>[key, `${t(name)} — ${t('СЛ')} ${dv}, ${t(time)}`]), 'costly')}
      ${roleSelect('techSkill', 'ТЕХ-навык ремонта предмета', techSkillEntries(), 'Знания техники')}
    </div>
    <button type="button" class="primary role-roll" data-role-action="techRoll">${t('БРОСОК: ТЕХ + НАВЫК + РАНГ СПЕЦИАЛИЗАЦИИ + 1D10')}</button>
    <div class="role-info" data-role-info="techInfo"></div>`);
  if(id === 'medtech') return panel('МЕДИЦИНСКИЕ НАВЫКИ', `
    <div class="role-info" data-role-info="medSkills"></div>
    <div class="role-buttons">
      <button type="button" class="weapon-btn" data-role-action="medSurgery">${t('ХИРУРГИЯ: ТЕХ + НАВЫК + 1D10')}</button>
      <button type="button" class="weapon-btn" data-role-action="medTech">${t('МЕДТЕХНОЛОГИИ: ТЕХ + НАВЫК + 1D10')}</button>
    </div>`) + panel('ФАРМАЦЕВТИКА', `
    <table class="data-table med-drugs"><thead><tr><th>${t('Изучен')}</th><th>${t('Препарат')}</th><th>${t('Доз')}</th><th></th></tr></thead><tbody>${Object.entries(medDrugs).map(([key,[name,effect]])=>`<tr>
      <td class="auto-cell"><input type="checkbox" data-key="medKnown_${key}"${isChecked(`medKnown_${key}`) ? ' checked' : ''} aria-label="${esc(t('Изучен') + ': ' + t(name))}"></td>
      <td><strong>${esc(t(name))}</strong><small>${esc(t(effect))}</small></td>
      <td><input data-key="medDoses_${key}" type="number" min="0" value="${numeric(`medDoses_${key}`)}" aria-label="${esc(t('Доз') + ': ' + t(name))}"></td>
      <td class="row-actions"><button type="button" class="weapon-btn" data-role-action="drugSynth" data-drug="${key}" title="${esc(t('Синтез: СЛ') + ' ' + MED_SYNTH_DV + t(', 1 час, 200eb'))}">${t('СИНТЕЗ')}</button><button type="button" class="weapon-btn" data-role-action="drugUse" data-drug="${key}" title="${esc(t('Ввести одну дозу (действие)'))}">${t('ВВЕСТИ')}</button>${key === 'speedheal' ? `<button type="button" class="weapon-btn" data-role-action="drugSelf" data-drug="speedheal" title="${esc(t('Ввести себе: +ТЕЛ + ВОЛЯ к ПЗ'))}">${t('СЕБЕ')}</button>` : ''}</td>
    </tr>`).join('')}</tbody></table>`, 'medKnownInfo') + panel('КРИОСИСТЕМЫ', '<div class="role-info" data-role-info="cryoInfo"></div>');
  if(id === 'media') return panel('СЛУХИ', `
    <div class="armor-form">
      ${roleSelect('mediaSkill', 'Навык поиска', mediaSkills.map(name=>[name,name]), 'Поиск информации')}
      ${roleSelect('mediaRumor', 'Качество слуха', Object.entries(rumorTiers).map(([key,[name,,passive,active]])=>[key, `${t(name)} — ${t('пасс. СЛ')} ${passive} / ${t('акт. СЛ')} ${active}`]), 'typical')}
    </div>
    <div class="role-buttons">
      <button type="button" class="weapon-btn" data-role-action="rumorPassive" title="${esc(t('Обычно бросает мастер, тайно, дважды в неделю'))}">${t('ПАССИВНО: ДОВЕРИЕ + 1D10')}</button>
      <button type="button" class="weapon-btn" data-role-action="rumorActive">${t('АКТИВНЫЙ ПОИСК: СТАТ + НАВЫК + 1D10')}</button>
    </div>`) + panel('ПУБЛИКАЦИЯ', `
    ${roleCheck('mediaProof1', 'Есть хотя бы одно легко проверяемое доказательство (+1)')}
    ${roleCheck('mediaProof4', 'Больше 4 неопровержимых доказательств (+2)')}
    <button type="button" class="primary role-roll" data-role-action="mediaPublish">${t('ПРОВЕРКА ДОСТОВЕРНОСТИ: 1D10')}</button>
    <div class="role-info" data-role-info="mediaTier"></div>`);
  if(id === 'exec') return panel('БОНУСЫ КОРПОРАЦИИ', '<div class="role-info" data-role-info="execPerks"></div>') + panel('НАЙМ И ЛОЯЛЬНОСТЬ', `
    <div class="armor-form">${roleSelect('execHireType', 'Тип подчинённого', Object.entries(execSubordinates).map(([key,item])=>[key, item.name]), 'bodyguard')}</div>
    <button type="button" class="weapon-btn" data-role-action="execHire" title="${esc(t('СТАТы — бросок 1d6 по таблице типа, лояльность — 1d6 + 1'))}">${t('НАНЯТЬ: БРОСИТЬ СТАТЫ')}</button>
    <div class="armor-form">
      <label>${t('Подчинённый')}<select data-role-select="execMember"></select></label>
      ${roleSelect('execEvent', 'Событие', Object.entries(loyaltyEvents).map(([key,[name,value]])=>[key, `${value > 0 ? '+' : ''}${value}: ${t(name)}`]), 'praise')}
    </div>
    <button type="button" class="weapon-btn" data-role-action="execLoyalty">${t('ИЗМЕНИТЬ ЛОЯЛЬНОСТЬ')}</button>`, 'execTeamInfo');
  if(id === 'lawman') return panel('ВЫЗОВ ПОДКРЕПЛЕНИЯ', `
    <div class="armor-form"><label>${t('Кого вызвать')}<select data-key="lawTier"></select></label></div>
    <button type="button" class="primary role-roll" data-role-action="lawCall">${t('ВЫЗВАТЬ: D10 НЕ БОЛЬШЕ РАНГА')}</button>
    <div class="role-info" data-role-info="lawTable"></div>`);
  if(id === 'fixer') return panel('ВОРОТИЛА', `
    <button type="button" class="primary role-roll" data-role-action="fixerHaggle">${t('ТОРГ: ХАР + ТОРГОВЛЯ + РАНГ + 1D10')}</button>
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
    info('rbTier').innerHTML = `<p><strong>${t('Где выступаете:')}</strong> ${esc(t(venue))}</p>` + list(Object.keys(rockerTargets).map((key,i)=>[true, `<span class="${key === target ? 'is-current' : ''}"><strong>${esc(t(rockerTargets[key][0]))} (${t('СЛ')} ${rockerTargets[key][1]}):</strong> ${esc(t(effects[i]))}</span>`]));
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
    info('techInfo').innerHTML = `<p>${t('СЛ')} ${dv}, ${t('время')} ${esc(t(time))}. ${t('Ранг специализации:')} ${numeric(rolePointsKey('tech', work))}. ${esc(t(notes[work]))}</p>`
      + (work === 'upgrade' ? `<p><strong>${t('Модернизация — один способ на раз:')}</strong></p><ul class="role-list">${upgrades.map(([what, where])=>`<li>${esc(t(what))} <small>— ${esc(t(where))}</small></li>`).join('')}</ul>` : '')
      + `<p>${t('Полевая экспертиза')} ${numeric(rolePointsKey('tech','field'))}: ${t('«подлатать» предмет на')} ${numeric(rolePointsKey('tech','field')) * 10} ${t('минут')}; ${t('бонус к ТЕХ-навыкам учтён в навыках.')}</p>`;
  }
  if(id === 'medtech' && info('medSkills')){
    info('medSkills').innerHTML = `<p><strong>${t('Хирургия')}:</strong> ${medSurgeryLevel()} (${t('итог')} ${medSurgeryLevel() + statValue(3)}) · <strong>${t('Медицинские технологии')}:</strong> ${medTechLevel()} (${t('итог')} ${medTechLevel() + statValue(3)})</p>`;
    const known = Object.keys(medDrugs).filter(key=>isChecked(`medKnown_${key}`)).length, allowed = numeric(rolePointsKey('medtech','pharma'));
    info('medKnownInfo').textContent = `${t('ИЗУЧЕНО')} ${known} / ${allowed}`;
    info('medKnownInfo').classList.toggle('is-over', known > allowed);
    const cryo = numeric(rolePointsKey('medtech','cryo'));
    info('cryoInfo').innerHTML = list(cryoBenefits.map((text,i)=>[i < cryo, `${i + 1}: ${esc(t(text))}`]));
  }
  if(id === 'media' && info('mediaTier')){
    const [, access, audience, chance, impact] = tierFor(mediaTiers, rank);
    const bonus = (isChecked('mediaProof1') ? 1 : 0) + (isChecked('mediaProof4') ? 2 : 0);
    info('mediaTier').innerHTML = `<p><strong>${t('Аудитория поверит:')}</strong> ${Math.min(10, chance + bonus)} ${t('из')} 10${bonus ? ` (${chance} + ${bonus} ${t('за доказательства')})` : ''}</p>` + list([[true, `<strong>${t('Доступ:')}</strong> ${esc(t(access))}`],[true, `<strong>${t('Аудитория:')}</strong> ${esc(t(audience))}`],[true, `<strong>${t('Влияние:')}</strong> ${esc(t(impact))}`]]);
  }
  if(id === 'exec' && info('execPerks')){
    info('execPerks').innerHTML = list(execPerks.map(([from, text])=>[rank >= from, `<strong>${t('Ранг')} ${from}:</strong> ${esc(t(text))}`]));
    const allowed = execSubordinateRanks.filter(from=>rank >= from).length, have = (state.roleTeam || []).filter(row=>!isBlank(row[0]) || !isBlank(row[4])).length;
    info('execTeamInfo').textContent = `${t('ПОДЧИНЁННЫХ')} ${have} / ${allowed}`;
    info('execTeamInfo').classList.toggle('is-over', have > allowed);
    const member = $('[data-role-select="execMember"]');
    if(member){
      const value = member.value;
      member.innerHTML = (state.roleTeam || []).map((row,i)=>{
        const label = row[0] ? t(row[0]) : (execSubordinates[row[4]] ? t(execSubordinates[row[4]].name) : `${t('Строка')} ${i + 1}`);
        return [i, label];
      }).map(([i,name])=>`<option value="${i}"${String(i) === value ? ' selected' : ''}>${esc(name)} (${t('лояльность')} ${esc(state.roleTeam[i][2] || 0)})</option>`).join('');
    }
  }
  if(id === 'lawman' && info('lawTable')){
    const select = $('[data-key="lawTier"]');
    if(select){
      const available = lawmanBackup.filter(([from])=>rank >= from);
      const current = Math.min(Number(state.lawTier ?? available.length - 1), available.length - 1);
      select.innerHTML = available.map(([from, to, who],i)=>`<option value="${i}"${i === current ? ' selected' : ''}>${t('Ранг')} ${from === to ? from : `${from}–${to}`}: ${esc(t(who.split(':')[0]))}</option>`).join('');
    }
    info('lawTable').innerHTML = `<div class="table-scroll"><table class="data-table law-table"><thead><tr><th>${t('Ранг')}</th><th>${t('Кто приезжает')}</th><th>${t('БН')}</th><th>${t('ОС')}</th><th>${t('ПЗ')}</th><th>${t('СКО')}/${t('ТЕЛ')}</th></tr></thead><tbody>${lawmanBackup.map(([from,to,who,bn,sp,hp,move])=>`<tr class="${rank >= from ? '' : 'is-locked'}"><td>${from === to ? from : `${from}–${to}`}</td><td>${esc(t(who))}</td><td>${bn}</td><td>${sp}</td><td>${hp}</td><td>${move}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if(id === 'fixer' && info('fixerTier')){
    const [, contacts, goods, haggle, culture] = tierFor(fixerTiers, rank);
    info('fixerTier').innerHTML = list([[true, `<strong>${t('Связи и клиенты')}:</strong> ${esc(t(contacts))}`],[true, `<strong>${t('Можно достать:')}</strong> ${esc(t(goods))}`],[true, `<strong>${t('Торг:')}</strong> ${esc(t(haggle))}`],[true, `<strong>${t('Свой чел:')}</strong> ${esc(t(culture))}`]]);
  }
  if(id === 'nomad' && info('nomadFleet')){
    const vehicles = (state.roleVehicles || []).filter(row=>!isBlank(row[0]) || !isBlank(row[3]));
    const upgrades = vehicles.reduce((sum,row)=>sum + String(row[1] || '').split(/[,;\n]/).filter(part=>part.trim()).length, 0);
    info('nomadFleet').innerHTML = `<p><strong>${t('Мото')} +${rank}</strong> ${t('к')} ${motoSkills.map(name=>String(term(name) || name).replace(/ \(x2\)$/,'')).join(', ')}.</p>
      <p><strong>${t('Выборов автопарка:')}</strong> ${vehicles.length + upgrades} ${t('из')} ${rank} (${t('транспорт')} ${vehicles.length}, ${t('улучшений')} ${upgrades}).</p>
      <p><strong>${t('Доступный транспорт:')}</strong> ${Object.values(vehicleTypes).filter(item=>rank >= item[5]).map(item=>esc(t(item[0]))).join(', ')}</p>
      <p><strong>${t('Улучшения')}:</strong></p>` + list(nomadUpgrades.map(([name, from, kind])=>[rank >= from, `${esc(t(name))} <small>— ${t('ранг')} ${from}, ${esc(t(kind))}</small>`]));
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
const programDisplayName = name => {
  const raw = String(name || '');
  if(!isEnLang()) return raw;
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? m[2] : raw;
};
function programPresetSelect(key, value){
  return `<select data-key="${key}" aria-label="${esc(t('Программа из книги'))}"><option value="">${t('Своя')}</option>${Object.entries(programPresets).map(([id,[name]])=>`<option value="${id}"${id === value ? ' selected' : ''}>${esc(programDisplayName(name))}</option>`).join('')}</select>`;
}
// Усиления программы: «цель:величина» через запятую в колонке 9 («cloak:2,speed:1»). В старых строках — одна цель
// без величины, она в колонке 10 или в пресете (по умолчанию 2). Величина может быть отрицательной — штраф.
const interfaceKeys = () => (roles.netrunner.interfaceAbilities || []).map(([id])=>id);
const boostTargets = () => [['all', t('все функции Интерфейса')], ...(roles.netrunner.interfaceAbilities || []).map(([id,name])=>[id, t(name.split(' (')[0])]),
  ['progatk', t('атаки программами')], ['speed', t('Скорость в Сети')], ['brain', t('урон по мозгу (снижение)')]];
const parseBoosts = data => String(data?.[9] || '').split(',').map(part=>part.trim()).filter(Boolean).map(part=>{
  const [target, amount] = part.split(':');
  return [target, amount !== undefined && amount !== '' ? Number(amount) || 0 : Number(data?.[10]) || (programPresets[data?.[6]]?.[7] ?? 2)];
});
const encodeBoosts = list => list.filter(([target])=>target).map(([target, amount])=>`${target}:${Number(amount) || 0}`).join(',');
function programBoostEditor(i, data){
  const k = j => `rolePrograms${i}_${j}`;
  const rows = parseBoosts(data).map(([target, amount], b)=>`<span class="boost-row">
      <select data-boost-target="${i}" data-b="${b}" aria-label="${esc(t('Что усиливает программа'))}">${boostTargets().map(([id, name])=>`<option value="${id}"${id === target ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select>
      <input type="number" step="1" data-boost-amount="${i}" data-b="${b}" value="${amount}" aria-label="${esc(t('Величина усиления'))}" title="${esc(t('Величина: плюс к проверке, Скорости или снижение урона; минус — штраф'))}">
      <button type="button" class="remove" data-boost-del="${i}" data-b="${b}" title="${esc(t('Убрать усиление'))}">×</button>
    </span>`).join('');
  return `<div class="boost-list">${rows}<button type="button" class="add-row" data-boost-add="${i}">${t('+ УСИЛЕНИЕ')}</button>
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
    tr.title = derezzed ? t('REZ исчерпан — программа снесена') : '';
    const attack = tr.querySelector('[data-program-attack]');
    if(attack) attack.disabled = /^(Усилит|Защит|Booster|Defen)/i.test(data[1] || '');
    const effect = data[13] === 'effect', ice = !isBlank(data[12]);
    const damage = tr.querySelector('[data-program-damage]:not([data-target])');
    if(damage){
      damage.disabled = !parseDamage(data[11]);
      damage.textContent = effect ? t('СВОЙСТВО') : ice ? t('ПО ПРОГРАММЕ') : t('УРОН');
      damage.title = effect ? `${t('Бросок свойства:')} ${t(data[5] || '')}` : ice ? t('Урон по обычной программе (после попадания)') : t('Бросок урона программы (после попадания)');
    }
    const iceButton = tr.querySelector('[data-program-damage][data-target="ice"]');
    if(iceButton){ iceButton.hidden = !ice || effect; iceButton.disabled = !parseDamage(data[12]); }
    const rollLabel = tr.querySelector('[data-program-roll-label]');
    if(rollLabel) rollLabel.textContent = effect ? t('Свойство') : ice ? t('Урон: прогр.') : t('Урон');
  });
  const summary = $('#netBoostSummary');
  if(summary){
    const active = (state.rolePrograms || []).filter(isProgramOn);
    summary.textContent = active.length ? `${t('Включены:')} ${active.map(data=>programName(data).split(' (')[0]).join(', ')}` : t('Включённых программ нет');
    const brain = programBoostTotal('brain'), speed = programBoostTotal('speed'), attacks = programBoostTotal('progatk');
    const abilities = (roles.netrunner.interfaceAbilities || []).map(([id, name])=>[programBoostTotal(id), t(name.split(' (')[0])]).filter(([value])=>value);
    $('#netBoostExtra').textContent = [...abilities.map(([value, name])=>`${name} ${withSign(value)}`), attacks && `${t('атаки программами')} ${withSign(attacks)}`,
      speed && `${t('Скорость в Сети')} ${withSign(speed)}`, brain && `${t('урон по мозгу')} −${brain}`].filter(Boolean).join(' · ');
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
  const pips = Array.from({length:Math.max(total, used)}, (_, k)=>`<button type="button" class="net-pip${k < used ? ' is-used' : ''}${k >= total ? ' is-over' : ''}" data-net-pip="${k}" aria-label="${esc(t('NET-действие') + ' ' + (k + 1))}" title="${esc(k < used ? t('Потрачено — нажмите, чтобы вернуть') : t('Отметить потраченным: подключение, отключение, другое'))}"></button>`).join('');
  box.title = `${t('NET-действий за ход:')} ${base} ${t('по рангу Интерфейса')}${extra ? `, ${extra > 0 ? '+' : '−'}${Math.abs(extra)} ${t('от мастера')}` : ''}. ${t('Функции Интерфейса (кроме Сканера), Разряд, включение и выключение программ тратят их сами; подключение, отключение и прочее — нажмите на квадратик. Перемещение по Архитектуре — не NET-действие.')}`;
  box.innerHTML = `<span class="net-label">NET</span>${pips}<b class="net-count${used > total ? ' is-over' : ''}">${used}/${total}</b>`
    + `${extra ? `<small class="net-bonus">${extra > 0 ? '+' : '−'}${Math.abs(extra)} ${t('ГМ')}</small>` : ''}`
    + `<button type="button" class="net-mini" data-net-extra="-1" title="${esc(t('Мастер убрал одно NET-действие'))}">−</button><button type="button" class="net-mini" data-net-extra="1" title="${esc(t('Мастер добавил NET-действие сверх положенного'))}">+</button>`
    + `<button type="button" class="net-mini net-reset" data-net-reset title="${esc(t('Новый ход: все NET-действия снова доступны'))}">↺</button>`;
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
    info.textContent = `${t('ОЧКИ')} ${spent} / ${budget}${capped.length ? ` · ${t('ВЫШЕ РАНГА:')} ${capped.map(item=>term(item.name)).join(', ')}` : ''}`;
    info.classList.toggle('is-over', spent > budget || capped.length > 0);
    info.title = [spent > budget && t('Распределено больше очков, чем даёт ранг'),
      capped.length && `${t('Каждый ранг Создателя даёт по 1 очку в двух разных специализациях — ни одна не может быть выше ранга')} (${rank})`].filter(Boolean).join('. ');
  }
  refreshSoloRoundUi();
  refreshNetTracker();
  refreshProgramRows();
  refreshVehicleCards();
  refreshRoleExtras();
  const tableInfo = $('#roleTableInfo');
  if(tableInfo) tableInfo.textContent = viewRoleId() === 'netrunner' && !isBlank(state.netSlots) ? `${t('ПРОГРАММ')} ${(state.rolePrograms || []).filter(row=>!isBlank(row[0])).length} / ${numeric('netSlots')}` : '';
  const upgrade = $('[data-role-upgrade]');
  if(upgrade){
    const cost = roleUpgradeCost();
    upgrade.hidden = state.creationMode !== false || rank >= ROLE_MAX_RANK;
    upgrade.textContent = `↑${cost} IP`;
    upgrade.disabled = numeric('ip') < cost;
    upgrade.title = `${t('Повысить ранг до')} ${rank + 1} ${t('за')} ${cost} IP`;
  }
  $$('[data-role-view]').forEach(btn=>{ btn.querySelector('b').textContent = rankOf(btn.dataset.roleView); });
  const take = $('[data-multiclass]');
  if(take){
    const reason = multiclassBlock();
    take.disabled = Boolean(reason) || !$('#multiclassPick')?.value;
    $('#multiclassNote').textContent = reason
      ? reason
      : `${t('Ранг 1 новой роли —')} ${ROLE_RANK_IP} IP. ${t('Следующую роль можно будет взять, когда эта дойдёт до ранга')} ${MULTICLASS_MIN_RANK}.`;
  }
  renderRoleSummary();
}
// Переключатель ролей на вкладке 06 и взятие новой роли (стр. 143).
function multiclassPanel(id){
  const owned = charRoles();
  const free = Object.entries(roles).filter(([rid])=>!owned.includes(rid));
  const tabs = owned.map(rid=>`<button type="button" class="skill-filter${rid === id ? ' active' : ''}" data-role-view="${rid}" aria-pressed="${rid === id}">${esc(term(roles[rid].name))} <b>${rankOf(rid)}</b></button>${rid === owned[0] ? '' : `<button type="button" class="remove" data-role-drop="${rid}" title="${esc(t('Убрать роль') + ' «' + term(roles[rid].name) + '» ' + t('(IP не возвращаются)'))}">×</button>`}`).join('');
  return `<div class="panel role-multiclass">
    <div class="role-switch">${tabs}</div>
    ${free.length ? `<div class="role-take">
      <span class="role-take-title">${t('МУЛЬТИКЛАСС')}</span>
      <select id="multiclassPick" aria-label="${esc(t('Новая роль'))}"><option value="">${t('новая роль…')}</option>${free.map(([rid, item])=>`<option value="${rid}">${esc(term(item.name))} — ${esc(roleAbilityLabel(item.ability))}</option>`).join('')}</select>
      <button type="button" class="add-row" data-multiclass>${t('ВЗЯТЬ РОЛЬ ЗА')} ${ROLE_RANK_IP} IP</button>
      <small id="multiclassNote"></small>
    </div>` : ''}
    ${owned.length > 1 ? `<small class="role-street">${t('На Улице персонажа знают как:')} <b>${esc(term(roles[lastRoleId()].name))}</b></small>` : ''}
  </div>`;
}
// Строка под выбором роли на вкладке «Персонаж»: остальные роли.
function renderRoleSummary(){
  const box = $('#roleExtraInfo');
  if(!box) return;
  const extra = charRoles().slice(1);
  box.hidden = !extra.length;
  box.textContent = extra.length
    ? `${t('Мультикласс:')} ${extra.map(id=>`${term(roles[id].name)} ${rankOf(id)}`).join(', ')}. ${t('На Улице —')} ${term(roles[lastRoleId()].name)}.`
    : '';
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
  toast(`${term(roles[id].name)}: ${roleAbilityLabel(roles[id].ability)}, ${t('ранг')} 1 ${t('за')} ${ROLE_RANK_IP} IP`);
}
function dropRole(id){
  const before = [...(state.extraRoles || [])], rank = state[rankKey(id)], view = state.roleView;
  const apply = () => { renderRolePanel(); bindInputs(); refreshSkills(); if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now(); };
  state.extraRoles = before.filter(rid=>rid !== id);
  if(state.roleView === id) state.roleView = state.roleId;
  apply();
  toast(`${t('Роль')} «${term(roles[id].name)}» ${t('убрана, IP не возвращены')}`, t('Вернуть'), ()=>{ state.extraRoles = before; state[rankKey(id)] = rank; state.roleView = view; apply(); });
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

