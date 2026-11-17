// Логика интерактивного листа Cyberpunk RED. Справочные таблицы — в data.js.
const skillEntries = Object.values(skillCategories).flat();
const skills = skillEntries.map(([name]) => name);
const penalizedStats = [1, 2, 7]; // РЕА, ЛВК, СКО
const rowTypes = {gear:3, weapon:12, relationship:3, ammo:3};
// Порядок колонок в таблицах: j — индекс значения в сохранённой строке (новые колонки оружия добавлены в конец).
// short — короткое однострочное значение (числа, урон); остальные текстовые ячейки многострочные и растут вместе с текстом.
const rowColumns = {
  gear:[{j:0},{j:1,short:true},{j:2,note:true}],
  // weapon: 7 — множитель автоогня (скрытое поле, заполняется типом), 8 — тип, 9 — автоогонь включён,
  // 11 — модификации (JSON, скрытое поле, правится в окне «МОД»).
  weapon:[{j:0,label:'Оружие'},{j:8,select:'type',label:'Тип'},{j:5,select:'skill',label:'Навык'},{j:1,short:true,placeholder:'3d6',label:'Урон'},{j:2,short:true,label:'Патр.'},{j:6,short:true,label:'Маг.'},{j:3,short:true,label:'ROF'},{j:9,toggle:true,label:'Авто'},{j:10,select:'loadedAmmo',label:'Боеприпасы'},{j:4,note:true,label:'Заметки'}],
  // ammo: 0 калибр, 1 тип, 2 количество; колонка «свойство» — справочная, не хранится.
  ammo:[{j:0,select:'caliber',label:'Калибр'},{j:1,select:'ammoType',label:'Тип'},{j:2,short:true,label:'Кол-во'},{j:-1,select:'ammoInfo'}],
  relationship:[{j:0},{j:1},{j:2}]
};
const INDEX_KEY = 'cyberred-index';
const LEGACY_KEY = 'cyberred-sheet';
const SKILL_POOL = 86, STAT_POOL = 62, MAX_SKILL = 10;
// Поля строк таблиц хранятся только в структурированном виде (state.gear, state.weapon...).
// Киберимпланты — в state.cyber (системы по книге). Таблицы ролей работают как остальные таблицы листа.
Object.values(roles).forEach(({table})=>{
  if(!table) return;
  rowTypes[table.key] = table.columns.length;
  rowColumns[table.key] = table.columns.map((_,j)=>({j}));
});
// Программы: 0 название, 1 класс, 2 ATK, 3 DEF, 4 REZ макс., 5 эффект, 6 тип из книги,
// 7 REZ текущий, 8 включена, 9 что усиливает, 10 на сколько (скрытое поле), 11 урон.
// 12 — урон по Чёрному ЛЬДУ (если отличается), 13 — 'effect': кубики — свойство, а не урон.
rowTypes.rolePrograms = 14;
rowColumns.rolePrograms = [{j:0},{j:6,select:'program'},{j:1},{j:2,short:true},{j:3,short:true},{j:7,short:true},{j:4,short:true},{j:8,toggle:true},{j:11,short:true},{j:9,select:'boost'},{j:5}];
// Команда корпората: 0 имя, 1 работа, 2 лояльность, 3 заметки, 4 тип подчинённого, 5 СТАТы.
rowTypes.roleTeam = 6;
rowColumns.roleTeam = [{j:0},{j:4,select:'teamType'},{j:1},{j:2,short:true},{j:5},{j:3}];
// Транспорт кочевника: 0 название, 1 улучшения, 2 заметки, 3 тип, 4 ПЗТ сейчас, 5 ПЗТ макс., 6 места и скорость.
rowTypes.roleVehicles = 7;
rowColumns.roleVehicles = [{j:0},{j:3,select:'vehicleType'},{j:4,short:true},{j:5,short:true},{j:6},{j:1},{j:2}];
const structuredKey = new RegExp(`^(${Object.keys(rowTypes).join('|')})\\d+_\\d+$|^cyberSlot_|^cskill\\d+_`);
const clampedKey = /^(stat|skill)\d+$|^(currentHp|luckCurrent|humanityCurrent|armorHeadCurrent|armorBodyCurrent|roleRank)$|^roleRank_\w+$/;
// $, $$, esc, d, now, isBlank — shared/dom.js

const field = (key, value='', type='text', placeholder='') => `<input data-key="${key}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
const numeric = key => Number(state[key]) || 0;
const statAlias = name => statAliases[name] || name;
const skillStatIndex = i => stats.indexOf(statAlias(skillEntries[i][1]));
const skillWeight = i => skills[i].includes('(x2)') ? 2 : 1;
const armorPenalty = () => Math.abs(numeric('armorPenalty'));
const statPenalty = statIndex => penalizedStats.includes(statIndex) ? armorPenalty() : 0;
const isChecked = key => state[key] === true || state[key] === 'true';
// Ранения по правилам RED: тяжёлое — −2 ко всем действиям, смертельное (0 хитов) — −4 и −6 к СКО.
const isMortallyWounded = () => isChecked('deathSave') || (!isBlank(state.currentHp) && numeric('currentHp') <= 0);
const woundPenalty = () => isMortallyWounded() ? 4 : (isChecked('seriousWound') && !cyberIgnoresWound()) ? 2 : 0;
// ЭМП падает вместе с человечностью: ЭМП = ⌊человечность / 10⌋, но не выше базового значения.
const currentEmp = () => isBlank(state.humanityCurrent) ? numeric('stat9') : Math.min(numeric('stat9'), Math.floor(numeric('humanityCurrent')/10));
const statValue = i => i === 9 ? currentEmp() : i === 8 ? cyberBody() : numeric(`stat${i}`);
const skillTotal = i => numeric(`skill${i}`) + statValue(skillStatIndex(i)) - statPenalty(skillStatIndex(i)) - woundPenalty();
// Навыки адресуются ссылкой: «b12» — навык из книги, «c3» — дополнительная специализация.
const customSkill = ref => state.customSkills?.[Number(ref.slice(1))];
const refBase = ref => ref[0] === 'b' ? Number(ref.slice(1)) : skills.indexOf(customSkill(ref)?.base);
const refLevel = ref => ref[0] === 'b' ? numeric(`skill${ref.slice(1)}`) : Number(customSkill(ref)?.level) || 0;
const refLabel = ref => ref[0] === 'b' ? skills[refBase(ref)] : `${customSkill(ref)?.base}: ${customSkill(ref)?.spec || '—'}`;
const refWeight = ref => skillWeight(refBase(ref));
const refMin = ref => state.creationMode !== false && ref[0] === 'b' && basicSkills.includes(skills[refBase(ref)]) ? 2 : 0;
// ---------- Критические травмы игрока (shared/injuries.js) ----------
const parsePlayerInjury = parseInjuryLine;
const playerInjuries = () => String(state.criticalInjuries || '').split('\n').map(line=>line.trim()).filter(Boolean).map(parseInjuryLine);
const hasPlayerInjury = (zone, k) => playerInjuries().some(inj=>inj.zone === zone && inj.k === k);
const playerInjuryMods = () => aggregateInjuryMods(playerInjuries());
function addPlayerInjury(zone, k, rolled){
  const injury = formatInjuryLine(zone, k, rolled);
  state.criticalInjuries = [String(state.criticalInjuries || '').trim(), injury].filter(Boolean).join('\n');
  setInput('criticalInjuries', state.criticalInjuries);
  return injury;
}
const rollPlayerInjury = zone => rollUniqueInjury(hasPlayerInjury, addPlayerInjury, zone);
const deathSaveTotalPenalty = () => numeric('deathSavePenalty') + playerInjuryMods().death;
// Штраф травм к проверке: all всегда; ranged/melee — по навыку оружия или явному kind.
function injuryCheckPenalty(kind = ''){
  const m = playerInjuryMods();
  const parts = [[m.all, 'травмы'], [kind === 'ranged' ? m.ranged : kind === 'melee' ? m.melee : 0, kind === 'ranged' ? 'травма глаза' : 'разрыв мышцы']].filter(([v])=>v > 0);
  return {total:parts.reduce((sum, [v])=>sum + v, 0), note:parts.map(([v, label])=>`${label} −${v}`).join(', ')};
}
const attackInjuryKind = skillName => rangedWeaponSkills.includes(skillName) ? 'ranged' : meleeWeaponSkills.includes(skillName) ? 'melee' : '';
// Бонус роли к навыку: Обнаружение угроз Соло, Полевая экспертиза Техника, Мото Кочевника.
const fieldExpertiseSkills = ['Знания техники','Кибертехника','Электроника/Безопасность (x2)','Оружейник','Автомеханика','Морская технология','Авиационные технологии'];
function roleSkillBonus(name){
  if(name === 'Внимательность' && soloLevel('threat')) return [soloLevel('threat'), 'Обнаружение угроз'];
  if(hasRole('tech') && fieldExpertiseSkills.includes(name) && numeric(rolePointsKey('tech','field'))) return [numeric(rolePointsKey('tech','field')), 'Полевая экспертиза (не для работ Создателя)'];
  if(hasRole('nomad') && motoSkills.includes(name)) return [rankOf('nomad'), 'Мото'];
  return [0, ''];
}
function skillBonus(name){
  const [role, roleNote] = roleSkillBonus(name);
  const [cyber, cyberNote] = cyberSkillBonus(name);
  return [role + cyber, [roleNote, cyberNote].filter(Boolean).join('; ')];
}
// В захвате (стр. 177) — −2 ко всем действиям, пока захват длится.
const grapplePenalty = () => isChecked('grappled') ? 2 : 0;
const refTotal = (ref, injuryKind = '') => {
  const s = skillStatIndex(refBase(ref));
  return refLevel(ref) + statValue(s) - statPenalty(s) - woundPenalty() - grapplePenalty() - injuryCheckPenalty(injuryKind || attackInjuryKind(skills[refBase(ref)])).total + skillBonus(skills[refBase(ref)])[0];
};
const allRefs = () => [...skills.map((_,i)=>`b${i}`), ...(state.customSkills || []).map((_,j)=>`c${j}`)];
const skillSpent = () => allRefs().reduce((sum,ref)=>sum + refLevel(ref)*refWeight(ref),0);
// Повышение навыка за очки улучшения: 20 × новый уровень, для (x2) — вдвое дороже.
const upgradeCost = ref => (refLevel(ref) + 1) * 20 * refWeight(ref);
const keyToRef = key => { const b = /^skill(\d+)$/.exec(key || ''); if(b) return `b${b[1]}`; const c = /^cskill(\d+)_level$/.exec(key || ''); return c ? `c${c[1]}` : null; };
function setRefLevel(ref, level){
  if(ref[0] === 'b') state[`skill${ref.slice(1)}`] = level;
  else customSkill(ref).level = level;
}
// Роль персонажа: способность с рангом и направлениями (см. roles в data.js).
// Мультикласс (стр. 143): первая роль — roleId с рангом roleRank, следующие — extraRoles по порядку, ранг в roleRank_<id>.
const charRoles = () => state.roleId && roles[state.roleId] ? [state.roleId, ...(state.extraRoles || []).filter(id=>roles[id] && id !== state.roleId)] : [];
const hasRole = id => charRoles().includes(id);
const rankKey = id => id === state.roleId ? 'roleRank' : `roleRank_${id}`;
const rankOf = id => hasRole(id) ? Math.max(0, Math.min(ROLE_MAX_RANK, numeric(rankKey(id)))) : 0;
// На вкладке 06 показана одна роль — выбранная переключателем; на Улице персонажа знают по последней взятой.
const viewRoleId = () => hasRole(state.roleView) ? state.roleView : state.roleId;
const lastRoleId = () => charRoles().at(-1);
const currentRole = () => roles[viewRoleId()];
const roleRank = () => rankOf(viewRoleId());
const rolesLabel = () => charRoles().map(id=>`${roles[id].name} ${rankOf(id)}`).join(' / ');
// Почему сейчас нельзя взять новую роль (пусто — можно).
const multiclassBlock = () => state.creationMode !== false ? 'Нельзя начать сразу в двух ролях: новую роль берут в режиме игры'
  : rankOf(lastRoleId()) < MULTICLASS_MIN_RANK ? `Сначала доведите роль «${roles[lastRoleId()].name}» до ранга ${MULTICLASS_MIN_RANK}`
  : numeric('ip') < ROLE_RANK_IP ? `Нужно ${ROLE_RANK_IP} IP` : '';
const rolePointsKey = (roleId, key) => `rolePts_${roleId}_${key}`;
const rolePointsBudget = () => roleRank() * (currentRole()?.pointsPerRank || 1);
const rolePointsSpent = roleId => (roles[roleId]?.specialties || []).reduce((sum,item)=>sum + numeric(rolePointsKey(roleId, item.key)) * item.cost, 0);
// Уровень направления Соло (Боевая готовность) — для автоматических бонусов.
const soloLevel = key => hasRole('solo') ? numeric(rolePointsKey('solo', key)) : 0;
// NET-действий за ход по рангу Интерфейса — netActionsForRank в shared/data.js.
const roleUpgradeCost = () => (roleRank() + 1) * ROLE_RANK_IP;
// Соло: Отражение и Слабое место — раз за раунд (сброс на инициативе / «Новый раунд»).
// Слабое место вооружается только после подтверждённого попадания (кнопка «ПОПАЛ»), не на сухом «Урон».
function resetSoloRound(silent){
  state.soloWeaknessUsed = false;
  state.soloWeaknessArmed = false;
  state.soloDeflectionUsed = false;
  refreshSoloRoundUi();
  if(!silent) toast('Новый раунд: Отражение и Слабое место снова доступны');
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}
function armSoloWeakness(){
  const n = soloLevel('weakness');
  if(!n || state.soloWeaknessUsed || state.soloWeaknessArmed) return;
  state.soloWeaknessArmed = true;
  refreshSoloRoundUi();
  persist();
  toast(`Слабое место +${n}: добавится к следующему урону`);
}
function consumeSoloWeakness(){
  const n = soloLevel('weakness');
  if(!n || state.soloWeaknessUsed || !state.soloWeaknessArmed) return 0;
  state.soloWeaknessUsed = true;
  state.soloWeaknessArmed = false;
  refreshSoloRoundUi();
  persist();
  return n;
}
function consumeSoloDeflection(amount){
  const n = soloLevel('deflection');
  if(!n || amount <= 0 || state.soloDeflectionUsed) return 0;
  const reduced = Math.min(amount, n);
  state.soloDeflectionUsed = true;
  refreshSoloRoundUi();
  persist();
  return reduced;
}
function refreshSoloRoundUi(){
  const el = $('#soloRoundInfo');
  if(!el) return;
  const weak = soloLevel('weakness'), def = soloLevel('deflection');
  const parts = [];
  if(def) parts.push(state.soloDeflectionUsed ? 'Отражение использовано' : `Отражение −${def} готово`);
  if(weak){
    parts.push(state.soloWeaknessUsed ? 'Слабое место использовано'
      : state.soloWeaknessArmed ? `Слабое место +${weak} к урону` : `Слабое место +${weak}: после попадания`);
  }
  el.textContent = parts.length ? parts.join(' · ') : 'Нет очков в Отражении / Слабом месте';
}
// Кнопки «ПОПАЛ / НЕ ПОПАЛ» на атаке: для умных патронов и/или Слабого места Соло.
function attackHitControls(onMiss, onHit){
  if(!onMiss && !onHit) return undefined;
  return () => {
    onMiss?.();
    if(onHit) toast('Промах — Слабое место не сработало');
  };
}
function withSoloHitConfirm(onMiss){
  const needWeak = soloLevel('weakness') > 0 && !state.soloWeaknessUsed && !state.soloWeaknessArmed;
  if(!needWeak && !onMiss) return {};
  return {
    onMiss: attackHitControls(onMiss, needWeak),
    onHit: needWeak ? armSoloWeakness : undefined
  };
}
// Жёсткий clamp очков специальностей: не выше max/ранга и не больше бюджета.
function clampRolePointValue(roleId, specKey, raw){
  const role = roles[roleId];
  const item = role?.specialties?.find(s => s.key === specKey);
  if(!item) return Math.max(0, Math.floor(Number(raw) || 0));
  const rank = rankOf(roleId);
  const maxLevel = Math.min(item.max ?? ROLE_MAX_RANK, roleId === 'tech' ? rank : (item.max ?? ROLE_MAX_RANK));
  const next = Math.max(0, Math.min(maxLevel, Math.floor(Number(raw) || 0)));
  const budget = rank * (role.pointsPerRank || 1);
  const others = (role.specialties || []).reduce((sum, s) => s.key === specKey ? sum : sum + numeric(rolePointsKey(roleId, s.key)) * s.cost, 0);
  return Math.min(next, Math.floor(Math.max(0, budget - others) / item.cost));
}
function clampAllRolePoints(roleId){
  const role = roles[roleId];
  if(!role?.specialties) return false;
  let changed = false;
  const rank = rankOf(roleId);
  role.specialties.forEach(item => {
    const key = rolePointsKey(roleId, item.key);
    const maxLevel = Math.min(item.max ?? ROLE_MAX_RANK, roleId === 'tech' ? rank : (item.max ?? ROLE_MAX_RANK));
    const cur = Math.max(0, Math.floor(Number(state[key]) || 0));
    const next = Math.min(cur, maxLevel);
    if(next !== cur){ state[key] = next; setInput(key, next); changed = true; }
  });
  const budget = rank * (role.pointsPerRank || 1);
  while(rolePointsSpent(roleId) > budget){
    const item = [...role.specialties].reverse().find(s => numeric(rolePointsKey(roleId, s.key)) > 0);
    if(!item) break;
    const key = rolePointsKey(roleId, item.key);
    state[key] = numeric(key) - 1;
    setInput(key, state[key]);
    changed = true;
  }
  return changed;
}
function reallocateSoloPoints(){
  if(!hasRole('solo')) return;
  (roles.solo.specialties || []).forEach(item => {
    const key = rolePointsKey('solo', item.key);
    state[key] = 0;
    setInput(key, 0);
  });
  refreshRolePanel();
  const inCombat = isChecked('soloInCombat');
  toast(inCombat
    ? 'Очки Боевого чутья сброшены — распределите заново (в бою это действие)'
    : 'Очки Боевого чутья сброшены — распределите заново (вне боя свободно)');
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}
const maxHp = () => 10 + 5*Math.ceil((statValue(8) + numeric('stat5'))/2);
const textValue = el => el.isContentEditable ? el.textContent : el.value;
const setVal = (el, value) => { if(el !== document.activeElement) el.value = value; };
const setInput = (key, value) => $$(`[data-key="${key}"]`).forEach(el=>{ el.value = value; });
const isSafeImage = src => /^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(String(src || ''));
const formulaHtml = (key, value) => {
  const formulas = state.formulaMarks?.[key] || [];
  let html = esc(value);
  formulas.forEach(formula => {
    const safe = esc(formula);
    html = html.replace(safe, `<span class="formula-marked" data-formula="${safe}">${safe}</span>`);
  });
  return html;
};

function migrate(data){
  const s = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  if(s.creationMode === undefined) s.creationMode = true;
  // Раньше человечность хранилась в двух независимых полях.
  if(s.humanityCurrent === undefined && s.humanityValue !== undefined) s.humanityCurrent = s.humanityValue;
  delete s.humanityValue;
  Object.keys(s).forEach(key => { if(structuredKey.test(key)) delete s[key]; });
  if(s.portrait && !isSafeImage(s.portrait)) delete s.portrait;
  // Боеприпасы v0.4.x: строка [калибр, тип, кол-во] → [калибр, «форма:тип», кол-во]. Калибры v0.4 совпадают с нынешними.
  if(Array.isArray(s.ammo)) s.ammo = s.ammo.map(row=>{
    if(!Array.isArray(row) || String(row[1] || '').includes(':') || !ammoKinds[row[0]]) return row;
    return [ammoKinds[row[0]][1], row[1] ? `${row[0]}:${row[1]}` : '', row[2] ?? ''];
  });
  // v0.5–0.7: пистолетные были одним калибром, винтовочные с дробовиком — «тактическим», гранаты с ракетами — «крупным».
  // Делим по книге (стр. 94): заряженное в оружие — по типу оружия, запас — по первому такому оружию персонажа.
  const weaponTypesOwned = (Array.isArray(s.weapon) ? s.weapon : []).map(row=>row?.[8]).filter(Boolean);
  const firstKind = (kinds, fallback) => weaponTypesOwned.flatMap(type=>weaponAmmoKinds[type] || []).find(kind=>kinds.includes(kind)) || fallback;
  const oldKind = {pistol:()=>firstKind(['mPistol','hPistol','vhPistol'], 'mPistol')};
  const oldCaliber = {pistol:oldKind.pistol, tactical:()=>firstKind(['rifle','slug'], 'rifle'), heavy:()=>firstKind(['grenade','rocket'], 'grenade')};
  if(Array.isArray(s.weapon)) s.weapon.forEach(row=>{
    const [kind, type] = String(row?.[10] || '').split(':');
    if(kind === 'pistol' && type) row[10] = `${(weaponAmmoKinds[row[8]] || []).find(k=>k.endsWith('Pistol')) || oldKind.pistol()}:${type}`;
  });
  if(Array.isArray(s.ammo)) s.ammo = s.ammo.map(row=>{
    if(!Array.isArray(row)) return row;
    let [kind, type] = String(row[1] || '').split(':');
    if(oldKind[kind]) kind = oldKind[kind]();
    if(ammoKinds[kind]) return [ammoKinds[kind][1], `${kind}:${type || ''}`.replace(/:$/, ''), row[2] ?? ''];
    if(oldCaliber[row[0]]) return [ammoKinds[oldCaliber[row[0]]()][1], '', row[2] ?? ''];
    return row;
  });
  if(Array.isArray(s.rolePrograms)) s.rolePrograms.forEach(row=>{
    const preset = programPresets[row?.[6]];
    if(!preset || !isBlank(row[12]) || !isBlank(row[13]) || (!preset[9] && !preset[10])) return;
    row[11] = String(preset[5] ?? ''); row[12] = String(preset[9] ?? ''); row[13] = String(preset[10] ?? '');
  });
  if(Array.isArray(s.roleTeam)) s.roleTeam.forEach(row=>{ if(row?.[4] && String(row[3] || '').startsWith('Прикрытие: ')) row[3] = ''; });
  delete s.targetDv;
  // Роль раньше была свободным текстом — узнаём её по названию.
  if(!s.roleId && !isBlank(s.role)){
    const text = String(s.role).toLowerCase().replace(/ё/g, 'е');
    const match = Object.entries(roles).flatMap(([id,item])=>item.aliases.map(alias=>[id, alias])).sort((a,b)=>b[1].length - a[1].length).find(([,alias])=>text.includes(alias));
    if(match) s.roleId = match[0];
  }
  if(s.roleId && !roles[s.roleId]) delete s.roleId;
  if(s.roleId && isBlank(s.roleRank)) s.roleRank = ROLE_START_RANK;
  if(Array.isArray(s.extraRoles)) s.extraRoles = [...new Set(s.extraRoles.filter(id=>roles[id] && id !== s.roleId))];
  else delete s.extraRoles;
  Object.entries(rowTypes).forEach(([type,width])=>{
    if(!Array.isArray(s[type])) { delete s[type]; return; }
    s[type] = s[type].map(row=>Array.from({length:width},(_,j)=>String(row?.[j] ?? '')));
  });
  s.customSkills = (Array.isArray(s.customSkills) ? s.customSkills : [])
    .filter(item=>variantSkills.includes(item?.base))
    .map(item=>({base:item.base, spec:String(item.spec ?? ''), level:Number(item.level) || 0}));
  s.cyber = migrateLegacyCyber(s);
  delete s.cyberSlots;
  delete s.cyberware;
  delete s.cyberHlApplied;
  return s;
}

// Несколько персонажей: список в cyberred-index, каждый лист — под своим ключом.
// Первый лист хранится под старым ключом, поэтому прежние сохранения подхватываются сами.
const sheetKey = id => id === 'main' ? LEGACY_KEY : `${LEGACY_KEY}:${id}`;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
function readJson(key, fallback){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function loadIndex(){
  const index = readJson(INDEX_KEY, null);
  if(index && Array.isArray(index.sheets) && index.sheets.length){
    if(!index.sheets.some(sheet=>sheet.id === index.current)) index.current = index.sheets[0].id;
    return index;
  }
  return {current:'main', sheets:[{id:'main', name:readJson(LEGACY_KEY, {})?.name || ''}]};
}
let sheetIndex = loadIndex();
const loadState = (id = sheetIndex.current) => migrate(readJson(sheetKey(id), {}));
let state = loadState();
let persistTimer = null;

// Немедленная запись в localStorage (смена листа, экспорт, закрытие вкладки).
function persistNow(){
  clearTimeout(persistTimer);
  persistTimer = null;
  try {
    localStorage.setItem(sheetKey(sheetIndex.current), JSON.stringify(state));
    const entry = sheetIndex.sheets.find(sheet=>sheet.id === sheetIndex.current);
    if(entry) entry.name = state.name || '';
    localStorage.setItem(INDEX_KEY, JSON.stringify(sheetIndex));
    return true;
  } catch {
    $('#saveStatus').textContent = t('ОШИБКА СОХРАНЕНИЯ: НЕТ МЕСТА');
    return false;
  }
}
// По умолчанию — debounce 300 ms как на листе Мастера; persist(true) — сразу.
function persist(immediate){
  if(immediate === true) return persistNow();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(()=>{
    if(persistNow()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
  }, 300);
  return true;
}
function flushPersist(){
  if(persistTimer) persistNow();
}
window.addEventListener('beforeunload', flushPersist);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') flushPersist(); });

function renderSheetSelect(){
  $('#sheetSelect').innerHTML = sheetIndex.sheets.map(sheet=>`<option value="${esc(sheet.id)}"${sheet.id === sheetIndex.current ? ' selected' : ''}>${esc((sheet.name || t('Без имени')).toUpperCase())}</option>`).join('');
}
function clearTransient(){
  $('#diceLog').innerHTML = '';
  $('#diceResult').textContent = '—';
  $('#damageResult').textContent = '';
}
function openSheet(id, data){
  sheetIndex.current = id;
  state = data ?? loadState(id);
  clearTransient();
  render();
  persist(true);
}
function switchSheet(id){
  if(id === sheetIndex.current) return;
  persist(true);
  openSheet(id);
}
function createSheet(data = {}){
  persist(true);
  const id = newId();
  sheetIndex.sheets.push({id, name:data.name || ''});
  openSheet(id, migrate(data));
}

function skillIndexByName(name){
  return skills.indexOf(name);
}

function templateWeaponRow(type){
  const preset = weaponTypes[type];
  if(!preset) return Array(rowTypes.weapon).fill('');
  const [name, skill, damage, magazine, rof, multiplier] = preset;
  const row = Array(rowTypes.weapon).fill('');
  row[0] = name; row[1] = damage; row[2] = String(magazine ?? ''); row[3] = String(rof ?? '');
  row[5] = skill; row[6] = String(magazine ?? ''); row[7] = String(multiplier || '');
  row[8] = type;
  const ammo = defaultAmmoForWeapon(type);
  if(ammo) row[10] = `${ammo.kind}:${ammo.type}`;
  return row;
}

function templateCyberState(installs){
  const cyber = blankCyber();
  (installs || []).forEach(item=>{
    const sys = cyber[item.sys] || blankCyberSys();
    cyber[item.sys] = sys;
    if(item.foundation){
      const name = cyberSystems[item.sys]?.foundation;
      if(!name) return;
      const piece = makeFromCatalog(name);
      piece.installed = true;
      piece.hl = String(item.hl ?? 0);
      sys.foundation = piece;
      return;
    }
    if(!item.catalog) return;
    const piece = makeFromCatalog(item.catalog);
    piece.installed = true;
    piece.hl = String(item.hl ?? 0);
    sys.options.push(piece);
  });
  return cyber;
}

function templateProgramRow(id){
  const preset = programPresets[id];
  const row = Array(rowTypes.rolePrograms).fill('');
  if(!preset) return row;
  const [name, kind, attack, defense, rez, damage, boost, amount, effect, iceDamage, rollKind] = preset;
  row[0] = name; row[1] = kind; row[2] = String(attack ?? ''); row[3] = String(defense ?? '');
  row[4] = String(rez ?? ''); row[5] = effect || ''; row[6] = id; row[7] = String(rez ?? '');
  row[9] = boost || ''; row[10] = amount != null ? String(amount) : ''; row[11] = damage || '';
  row[12] = iceDamage || ''; row[13] = rollKind || '';
  return row;
}

// Собирает лист из шаблона Streetrat (книга). СТАТы — строка броска 1; где «A или B» — первый вариант.
function buildStreetratSheet(roleId, rollIndex = 0){
  if(!streetratSkills[roleId] || !roles[roleId]) return null;
  const statsRow = (streetratStatTables[roleId] || [])[rollIndex] || streetratStatTables[roleId][0];
  const data = {creationMode:false, roleId, roleRank:ROLE_START_RANK, role:streetratRoleLabels[roleId] || roles[roleId].name};
  statsRow.forEach((value, i)=>{ data[`stat${i}`] = value; });
  data.luckCurrent = statsRow[6];
  const hl = streetratHumanityLoss[roleId] || 0;
  data.humanityCurrent = Math.max(0, statsRow[9] * 10 - hl);
  Object.entries(streetratSkills[roleId]).forEach(([name, level])=>{
    const i = skillIndexByName(name);
    if(i >= 0) data[`skill${i}`] = level;
  });
  data.customSkills = (streetratCustomSkills[roleId] || []).map(item=>({...item}));
  data.weapon = (streetratWeapons[roleId] || []).map(templateWeaponRow);
  data.ammo = (streetratAmmo[roleId] || []).map(([kind, type, qty])=>[
    ammoKinds[kind]?.[1] || kind, `${kind}:${type}`, String(qty)
  ]);
  data.gear = (streetratGear[roleId] || []).map(([name, qty, note])=>[name, String(qty), note || '']);
  data.armorHeadType = 'lightArmorjack';
  data.armorBodyType = 'lightArmorjack';
  data.armorHead = 11; data.armorHeadCurrent = 11;
  data.armorBody = 11; data.armorBodyCurrent = 11;
  data.armorPenalty = 0;
  data.cyber = templateCyberState(streetratCyber[roleId]);
  if(roleId === 'netrunner'){
    data.netSlots = 7;
    data.rolePrograms = (streetratPrograms.netrunner || []).map(templateProgramRow);
  }
  // Пресеты очков специальностей ранга 4 (Solo / Tech / Medtech) — streetratRolePts в data-templates.js.
  Object.entries(streetratRolePts[roleId] || {}).forEach(([key, level])=>{
    data[rolePointsKey(roleId, key)] = level;
  });
  // Кочевник: стартовый транспорт семьи (1 из 4 выборов ранга 4) — дорожный мотоцикл.
  if(roleId === 'nomad'){
    const [vName, vHp, vSeats, vMove, vKmh] = vehicleTypes.roadBike;
    data.roleVehicles = [[vName, '', 'Streetrat: 1 из 4 выборов Мото; остальные — улучшения или ещё транспорт', 'roadBike', String(vHp), String(vHp), `${vSeats} мест, СКО ${vMove}, ${vKmh} км/ч`]];
  }
  const body = statsRow[8], will = statsRow[5];
  const hp = 10 + 5 * Math.ceil((body + will) / 2);
  data.currentHp = hp;
  return data;
}

function openNewSheetDialog(){
  const dialog = $('#newSheetDialog');
  if(!dialog){ createSheet(); switchTab('character'); return; }
  const rolesBox = $('#newSheetRoles');
  if(rolesBox && !rolesBox.childElementCount){
    rolesBox.innerHTML = Object.keys(streetratRoleLabels).map(id=>
      `<button type="submit" value="${esc(id)}" class="ghost new-sheet-role">${esc(streetratRoleLabels[id])}</button>`
    ).join('');
  }
  if(dialog.showModal) dialog.showModal();
  else dialog.setAttribute('open', '');
}

function handleNewSheetDialog(e){
  e.preventDefault();
  const dialog = $('#newSheetDialog');
  const value = e.submitter?.value || 'cancel';
  if(dialog?.open) dialog.close();
  else dialog?.removeAttribute('open');
  if(value === 'cancel') return;
  if(value === 'blank'){ createSheet(); switchTab('character'); return; }
  const data = buildStreetratSheet(value);
  if(!data){ toast('Неизвестный шаблон роли'); return; }
  createSheet(data);
  syncCyberWeapons(true);
  updateDerived();
  switchTab('character');
  toast(`Streetrat: ${streetratRoleLabels[value] || value}`);
}

function deleteSheet(){
  const position = sheetIndex.sheets.findIndex(sheet=>sheet.id === sheetIndex.current);
  const removed = {id:sheetIndex.current, data:state};
  if(!confirm(`${t('Удалить персонажа «')}${state.name || t('Без имени')}${t('»?')}`)) return;
  localStorage.removeItem(sheetKey(removed.id));
  sheetIndex.sheets.splice(position, 1);
  if(sheetIndex.sheets.length) openSheet(sheetIndex.sheets[Math.max(0, position - 1)].id);
  else { const id = newId(); sheetIndex.sheets.push({id, name:''}); openSheet(id, migrate({})); }
  toast('Персонаж удалён', 'Вернуть', ()=>{
    persist();
    sheetIndex.sheets.splice(position, 0, {id:removed.id, name:removed.data.name || ''});
    openSheet(removed.id, removed.data);
  });
}

function normalizeStats(){
  if(state.creationMode === false) return stats.reduce((total,_,i)=>total + numeric(`stat${i}`),0);
  let total = 0;
  stats.forEach((_, i) => {
    const key = `stat${i}`;
    const value = Math.max(2, Math.min(8, Number(state[key]) || 2));
    state[key] = value;
    total += value;
  });
  return total;
}

function normalizeSkills(changedKey){
  const maxLevel = state.creationMode === false ? MAX_SKILL : 6;
  allRefs().forEach(ref=>setRefLevel(ref, Math.max(refMin(ref), Math.min(maxLevel, refLevel(ref)))));
  if(state.creationMode === false) return;
  let excess = skillSpent() - SKILL_POOL;
  // Срезаем в первую очередь навык, который только что меняли, затем — с конца списка.
  const changed = keyToRef(changedKey);
  for(const ref of changed ? [changed, ...allRefs().reverse()] : allRefs().reverse()){
    while(excess > 0 && refLevel(ref) > refMin(ref)){ setRefLevel(ref, refLevel(ref) - 1); excess -= refWeight(ref); }
    if(excess <= 0) break;
  }
}

function renderStats(){
  const oldBudget = $('.point-budget');
  if(oldBudget) oldBudget.remove();
  const total = normalizeStats();
  $('#statsGrid').innerHTML = stats.map((name,i) => {
    const label = term(name);
    const tip = termsIn(statTitle(name));
    const statValue = `<input class="stat-value" data-key="stat${i}" type="number" min="${state.creationMode === false ? 0 : 2}" max="${state.creationMode === false ? 99 : 8}" step="1" value="${esc(state[`stat${i}`] || 0)}" aria-label="${esc(label)}">`;
    if(i === 6 || i === 9){
      const key = i === 6 ? 'luckCurrent' : 'humanityCurrent';
      const max = i === 6 ? numeric('stat6') : numeric('stat9') * 10;
      const current = `<input class="resource-value" data-key="${key}" type="number" min="0" max="${max}" value="${esc(state[key] ?? max)}" aria-label="${esc(t('Текущее') + ' ' + label)}">`;
      return `<div class="stat-row has-resource"><span class="has-tip" data-tip="${esc(tip)}">${esc(label)}</span><div class="resource-pair">${current}<span class="resource-separator">${t('из')}</span>${statValue}</div></div>`;
    }
    return `<div class="stat-row"><span class="has-tip" data-tip="${esc(tip)}">${esc(label)}</span>${statValue}</div>`;
  }).join('');
  if(state.creationMode !== false){
    $('#statsGrid').insertAdjacentHTML('beforebegin', `<div class="point-budget">${t('ПУЛ СОЗДАНИЯ:')} <strong>${total}</strong> / ${STAT_POOL} <small>${t('Минимум 2, максимум 8.')}</small></div>`);
  }
}

function refreshStats(){
  $$('[data-key^="stat"]').forEach(el=>setVal(el, state[el.dataset.key] ?? 0));
  const budget = $('.point-budget strong');
  if(budget) budget.textContent = stats.reduce((sum,_,i)=>sum+numeric(`stat${i}`),0);
}

function refreshSkills(){
  const creation = state.creationMode !== false;
  $('#skillBudget').textContent = Math.max(0, SKILL_POOL - skillSpent());
  $('#ipInfo').textContent = numeric('ip');
  $$('[data-key^="skill"]').forEach(el=>setVal(el, state[el.dataset.key] ?? 0));
  $$('[data-key^="cskill"][data-key$="_level"]').forEach(el=>setVal(el, refLevel(keyToRef(el.dataset.key))));
  $$('[data-skill-total]').forEach(cell=>{
    const ref = cell.dataset.skillTotal;
    const s = skillStatIndex(refBase(ref));
    const armor = statPenalty(s), wound = woundPenalty();
    const empNote = s === 9 && currentEmp() < numeric('stat9') && `${t('ЭМП снижена человечностью до')} ${currentEmp()}`;
    const injury = injuryCheckPenalty(attackInjuryKind(skills[refBase(ref)]));
    const [bonus, bonusNote] = skillBonus(skills[refBase(ref)]);
    cell.textContent = refTotal(ref);
    cell.title = [armor && `${t('Штраф брони')} −${armor}`, wound && `${t('Штраф ранения')} −${wound}`, termsIn(injury.note), empNote, bonus && `${termsIn(bonusNote)} +${bonus}`].filter(Boolean).join(', ');
    cell.classList.toggle('is-penalized', armor + wound + injury.total > 0 || Boolean(empNote));
  });
  $$('[data-upgrade]').forEach(button=>{
    const ref = button.dataset.upgrade;
    const cost = upgradeCost(ref);
    button.hidden = creation || refLevel(ref) >= MAX_SKILL;
    button.textContent = `↑${cost}`;
    button.disabled = numeric('ip') < cost;
    button.title = `${t('Повысить до')} ${refLevel(ref) + 1} ${t('за')} ${cost} IP`;
  });
}

function skillRowHtml(ref, maxLevel){
  const base = refBase(ref);
  const custom = ref[0] === 'c';
  const j = ref.slice(1);
  const name = skills[base];
  const shown = term(name);
  const rollButton = `<button class="skill-roll" data-roll-skill="${ref}" title="${esc(t('Бросить 1d10 + стат + навык'))}">1d10</button>`;
  // Специализация — в контейнере с переносом, чтобы на узком экране поле и кнопка не наезжали на колонку «Стат».
  const tip = esc(termsIn(skillTitle(name)));
  const title = custom
    ? `<div class="skill-name"><span class="skill-variant has-tip" data-tip="${tip}">${esc(shown)}:</span><input class="skill-spec" data-key="cskill${j}_spec" value="${esc(customSkill(ref).spec)}" placeholder="${esc(t('специализация'))}" aria-label="${esc(t('специализация'))}">${rollButton}</div>`
    : `<span class="has-tip" data-tip="${tip}">${esc(shown)}</span>${basicSkills.includes(name) ? `<span class="basic-mark" title="${esc(t('Базовый навык: при создании не ниже 2'))}">Б</span>` : ''}${rollButton}`;
  const actions = [
    `<button type="button" class="skill-upgrade" data-upgrade="${ref}" hidden></button>`,
    !custom && variantSkills.includes(name) ? `<button type="button" class="skill-add-variant" data-add-variant="${esc(name)}" title="${esc(t('Добавить специализацию'))}">+</button>` : '',
    custom ? `<button type="button" class="remove" data-remove-skill="${j}" title="${esc(t('Удалить специализацию'))}">×</button>` : ''
  ].join('');
  const statAbbr = skillEntries[base][1];
  return `<tr class="${custom ? 'is-variant' : ''}"><td>${title}</td><td><span class="has-tip" data-tip="${esc(termsIn(statTitle(statAbbr)))}">${esc(term(statAbbr))}</span></td><td><input data-key="${custom ? `cskill${j}_level` : `skill${base}`}" type="number" min="${refMin(ref)}" max="${maxLevel}" value="${refLevel(ref)}" aria-label="${esc(t('Уровень навыка'))}"></td><td class="skill-total" data-skill-total="${ref}">${refTotal(ref)}</td><td class="skill-actions">${actions}</td></tr>`;
}

function renderSkills(){
  const creation = state.creationMode !== false;
  $('#skillBudget').closest('strong').classList.toggle('is-hidden', !creation);
  $('#ipInfo').closest('strong').classList.toggle('is-hidden', creation);
  $('.rules-note').classList.toggle('is-hidden', !creation);
  const query = searchFold(($('#skillSearch')?.value || '').trim());
  const activeCategory = $('.skill-filter.active')?.dataset.category || 'Все';
  const maxLevel = creation ? 6 : MAX_SKILL;
  const matches = text => !query || searchFold(text).includes(query);
  $('#skillsCategories').innerHTML = Object.entries(skillCategories).map(([category, entries]) => {
    if(activeCategory !== 'Все' && activeCategory !== category) return '';
    const rows = entries.flatMap(([name, stat]) => {
      const baseVisible = matches(`${name} ${stat} ${term(name)} ${term(stat)}`);
      const variants = (state.customSkills || []).map((item,j)=>item.base === name ? `c${j}` : null).filter(Boolean)
        .filter(ref=>baseVisible || matches(`${refLabel(ref)} ${stat}`));
      return baseVisible || variants.length ? [skillRowHtml(`b${skills.indexOf(name)}`, maxLevel), ...variants.map(ref=>skillRowHtml(ref, maxLevel))] : [];
    });
    if(!rows.length) return '';
    return `<article class="skill-category"><h2>${esc(term(category))}</h2><table class="skill-table"><thead><tr><th>${t('Название')}</th><th>${t('Стат')}</th><th>${t('Урв')}</th><th>${t('Сумм')}</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></article>`;
  }).join('') || `<div class="empty-search">${t('НАВЫКИ НЕ НАЙДЕНЫ')}</div>`;
  renderSkillFilters();
  refreshSkills();
  highlightSearch($('#skillsCategories'), query);
}

// Выбор категории навыков. На узком экране список категорий сворачивается, а страница плавно прокручивается к началу
// навыков под панелью поиска: высота списка удерживается на время прокрутки, чтобы браузер не прыгал вверх рывком.
function pickSkillCategory(filter){
  const list = $('#skillsCategories'), bar = $('.skill-search');
  const narrow = matchMedia('(max-width:900px)').matches;
  if(narrow) list.style.minHeight = `${list.offsetHeight}px`;
  $$('.skill-filter').forEach(x=>x.classList.remove('active'));
  filter.classList.add('active');
  renderSkills(); bindInputs();
  if(!narrow) return;
  toggleSkillFilters(false);
  // Куда ехать: к началу списка под панелью поиска, но не дальше, чем позволит страница после того, как список
  // станет короче, — иначе при снятии удерживаемой высоты браузер дёрнет прокрутку.
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  list.style.alignItems = 'start'; // карточки в сетке растягиваются на удерживаемую высоту — меряем без растяжения
  const natural = [...list.children].reduce((sum, el)=>sum + el.offsetHeight, 0) + gap * Math.max(0, list.children.length - 1);
  list.style.alignItems = '';
  const maxScroll = document.documentElement.scrollHeight - Math.max(0, list.offsetHeight - natural) - innerHeight;
  const top = Math.max(0, Math.min(list.getBoundingClientRect().top + scrollY - bar.offsetHeight - 16, maxScroll));
  const release = () => { list.style.minHeight = ''; };
  if(scrollY > top) smoothScrollTo(top, release); else release();
}
// Плавная прокрутка своей анимацией (~0,35 с), done — когда доехали; при «уменьшить движение» — сразу.
function smoothScrollTo(top, done){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ scrollTo(0, top); done?.(); return; }
  const start = scrollY, distance = top - start, startedAt = performance.now(), duration = 350;
  let finished = false;
  const finish = () => { if(finished) return; finished = true; scrollTo(0, top); done?.(); };
  const step = now => {
    if(finished) return;
    const k = Math.min(1, (now - startedAt) / duration);
    scrollTo(0, start + distance * (1 - Math.pow(1 - k, 3)));
    if(k < 1) requestAnimationFrame(step); else finish();
  };
  requestAnimationFrame(step);
  setTimeout(finish, duration + 650); // страховка: вкладка в фоне не получает кадров анимации
}
function toggleSkillFilters(open){
  $('.skill-search').classList.toggle('is-open', open);
  $('#skillFilterToggle').setAttribute('aria-expanded', String(open));
}

function renderSkillFilters(){
  const active = $('.skill-filter.active')?.dataset.category || 'Все';
  $('#skillFilters').innerHTML = ['Все', ...Object.keys(skillCategories)].map(category =>
    `<button class="skill-filter ${category === active ? 'active' : ''}" data-category="${category}">${esc(term(category))}</button>`
  ).join('');
  // На узком экране категории свёрнуты в кнопку рядом с поиском, на ней — выбранная категория.
  $('#skillFilterToggle').textContent = `${term(active)} ▾`;
}

function renderLife(){
  $('#lifeBasics').innerHTML = `<div class="section-title">${t('ПОВСЕДНЕВНАЯ ЖИЗНЬ')} <span>LIFESTYLE</span></div><div class="life-basics-fields">
    <label>${t('Образ жизни')}${growField('lifeStyle',state.lifeStyle||'', t('Например: Бродяга, Средний, Богатый'))}</label>
    <label>${t('Арендная плата')}${growField('lifeRent',state.lifeRent||'', t('Ежемесячная плата'))}</label>
    <label>${t('Жильё')}${growField('lifeHousing',state.lifeHousing||'', t('Тип и описание жилья'))}</label>
    <label>${t('Образ и стиль')}${growField('lifeLook',state.lifeLook||'', t('Внешний вид и стиль'))}</label>
  </div>`;
  const alias = `<label class="full">${t('Псевдоним')}${field('lifeAlias',state.lifeAlias||'')}</label>`;
  $('#lifeFields').innerHTML = alias + lifeFields.map((name,i)=>`<label class="${i===0?'full':''}">${esc(term(name))}${growField(`life${i}`,state[`life${i}`]||'')}</label>`).join('');
}
function weaponSkillSelect(key, value){
  const options = list => list.map(name=>`<option value="${esc(name)}"${name === value ? ' selected' : ''}>${esc(term(name))}</option>`).join('');
  return `<select data-key="${key}" aria-label="${esc(t('Навык оружия'))}"><option value="">—</option><optgroup label="${esc(t('Дальний бой'))}">${options(rangedWeaponSkills)}</optgroup><optgroup label="${esc(t('Ближний бой'))}">${options(meleeWeaponSkills)}</optgroup></select>`;
}
function weaponTypeSelect(key, value, multiplierKey, multiplier){
  const options = Object.entries(weaponTypes).map(([id,[name]])=>`<option value="${id}"${id === value ? ' selected' : ''}>${esc(term(name))}</option>`).join('');
  // У оружия из книги множитель очереди берётся из типа; у своего — выбирается рядом (ПП ×3, штурмовая винтовка ×4).
  const own = !weaponTypes[value];
  const multiplierField = own
    ? `<select class="autofire-pick" data-key="${multiplierKey}" aria-label="${esc(t('Автоматический огонь своего оружия'))}" title="${esc(t('Автоматический огонь своего оружия'))}">${[['', 'без очереди'], ['2', 'очередь ×2'], ['3', 'очередь ×3'], ['4', 'очередь ×4']].map(([v, label])=>`<option value="${v}"${String(multiplier || '') === v ? ' selected' : ''}>${t(label)}</option>`).join('')}</select>`
    : `<input type="hidden" data-key="${multiplierKey}" value="${esc(multiplier)}">`;
  return `<select data-key="${key}" aria-label="${esc(t('Тип оружия'))}" title="${esc(t('Тип оружия'))}"><option value="">${t('Своё')}</option>${options}</select>${multiplierField}`;
}
// Автоогонь: множитель из типа книги или из «очередь ×…» у своего оружия (поле 7).
const autofireMultiplier = data => Number(data?.[7]) || 0;
const isAutofireOn = data => autofireMultiplier(data) > 0 && data?.[9] === '1';
function row(type,data=[],index){
  const cells = rowColumns[type].map(({j,note,short,select,toggle,placeholder,label})=>{
    const key = `${type}${index}_${j}`;
    if(note && type === 'weapon' && /__cyber:/.test(data[j] || ''))
      return `<td><span class="muted">кибероружие</span><input type="hidden" data-key="${key}" value="${esc(data[j])}"></td>`;
    if(note) return `<td><div class="formula-editor" data-key="${key}" contenteditable="true">${formulaHtml(key,data[j]||'')}</div></td>`;
    if(select === 'skill') return `<td>${weaponSkillSelect(key, data[j] || '')}</td>`;
    if(select === 'type') return `<td>${weaponTypeSelect(key, data[j] || '', `${type}${index}_7`, data[7] || '')}</td>`;
    if(select === 'teamType') return `<td><select data-key="${key}" aria-label="Тип подчинённого"><option value="">—</option>${Object.entries(execSubordinates).map(([id,item])=>`<option value="${id}"${id === data[j] ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select></td>`;
    if(select === 'vehicleType') return `<td><select data-key="${key}" aria-label="Тип транспорта"><option value="">Свой</option>${Object.entries(vehicleTypes).map(([id,item])=>`<option value="${id}"${id === data[j] ? ' selected' : ''}>${esc(item[0])}</option>`).join('')}</select></td>`;
    if(select === 'caliber') return `<td><select data-key="${key}" aria-label="Калибр"><option value="">—</option>${Object.entries(ammoCalibers).map(([id,[name]])=>`<option value="${id}" title="${esc(caliberWeapons(id))}"${id === data[j] ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select>${data[j] ? `<small class="ammo-for">${esc(caliberWeapons(data[j]))}</small>` : ''}</td>`;
    if(select === 'ammoType') return `<td><select data-key="${key}" aria-label="Тип боеприпасов">${ammoTypeOptions(data[0], data[j])}</select></td>`;
    if(select === 'ammoInfo'){ const item = ammoTypes[String(data[1] || '').split(':')[1]]; return `<td class="ammo-info">${item ? `${esc(item[3])}<small>${esc(item[1])} за ${ammoCalibers[data[0]]?.[1] === 1 ? 'штуку' : '10 шт.'}</small>` : ''}</td>`; }
    if(select === 'loadedAmmo') return `<td><select data-key="${key}" aria-label="Заряжено">${loadedAmmoOptions(data)}</select></td>`;
    if(select === 'program') return `<td>${programPresetSelect(key, data[j] || '')}</td>`;
    if(select === 'boost') return `<td>${programBoostEditor(index, data)}</td>`;
    if(toggle && type !== 'weapon') return `<td class="auto-cell"><input type="checkbox" data-key="${key}" aria-label="Включено"${data[j] === '1' ? ' checked' : ''}></td>`;
    if(toggle) return `<td class="auto-cell"><input type="checkbox" data-key="${key}" aria-label="Автоматический огонь"${isAutofireOn(data) ? ' checked' : ''}${autofireMultiplier(data) ? '' : ' disabled'}></td>`;
    return short ? `<td>${field(key, data[j] || '', 'text', placeholder || '')}</td>` : `<td>${growField(key, data[j] || '')}</td>`;
  }).map((html,k)=>{ const label = rowColumns[type][k].label; return label ? html.replace('<td', `<td data-label="${label}"`) : html; }).join('');
  const ammoActions = type === 'ammo'
    ? `<button type="button" class="weapon-btn" data-ammo-pack="${index}" title="Купить пачку: +10 (гранаты и ракеты — +1)">+${ammoCalibers[data[0]]?.[1] ?? 10}</button>`
    : '';
  const programActions = type === 'rolePrograms'
    ? `<button type="button" class="weapon-btn" data-program-attack="${index}" title="Бросок на попадание: 1d10 + ранг Интерфейса + ATK; результат назовите мастеру">ПОПАДАНИЕ</button><button type="button" class="weapon-btn" data-program-damage="${index}" title="Бросок урона программы (после попадания)">УРОН</button><button type="button" class="weapon-btn" data-program-rez="${index}" title="Восстановить REZ до максимума">↺</button>`
    : '';
  const roleActions = type === 'roleTeam'
    ? `<button type="button" class="weapon-btn" data-role-action="loyaltyCheck" data-index="${index}" title="Проверка лояльности: мастер бросает 1d6">1D6</button>`
    : type === 'roleVehicles'
      ? `<button type="button" class="weapon-btn" data-role-action="vehicleRepair" data-index="${index}" title="Полностью починить: ПЗТ = максимум">↺</button>`
      : '';
  const weaponActions = type === 'weapon'
    ? `<button type="button" class="weapon-btn" data-weapon-attack="${index}">ПОПАДАНИЕ</button><button type="button" class="weapon-btn" data-weapon-damage="${index}">УРОН</button><button type="button" class="weapon-btn" data-weapon-suppress="${index}" title="Подавляющий огонь: 10 патронов, РЕА + Автоматический огонь + 1d10; цели в 25 м без укрытия бросают ВОЛЯ + Концентрация против результата" hidden>ПОДАВЛ.</button><button type="button" class="weapon-btn" data-weapon-reload="${index}" title="Перезарядить: патроны = магазин">↻</button>${weaponModButtons(index, data)}<input type="hidden" data-key="weapon${index}_11" value="${esc(data[11] || '')}">`
    : '';
  return `<tr>${cells}<td class="row-actions">${weaponActions}${programActions}${roleActions}${ammoActions}<button type="button" class="remove" data-remove="${type}" data-index="${index}" title="Удалить строку">×</button></td></tr>`;
}
// СТАТы подчинённого хранятся строкой «ИНТ 5 · РЕА 7 · …»; на карточке — сеткой полей.
const parseTeamStats = text => execStatNames.map(name=>{ const match = new RegExp(`${name}\\s*(\\d+)`).exec(String(text || '')); return match ? match[1] : ''; });
const formatTeamStats = values => values.map((value,i)=>isBlank(value) ? '' : `${execStatNames[i]} ${value}`).filter(Boolean).join(' · ');
// Карточка подчинённого корпората: шапка, сетка СТАТов, навыки и снаряжение из книги (свёрнуты), заметки.
function teamCard(data, i){
  const type = execSubordinates[data[4]];
  const stats = parseTeamStats(data[5]);
  const skills = type ? type.skills.split('; ').map(line=>{ const [bonus, list] = line.split(': '); return `<li><strong>${esc(bonus)}</strong> ${esc(list)}</li>`; }).join('') : '';
  return `<article class="team-card">
    <div class="team-head">
      <input class="team-name" data-key="roleTeam${i}_0" value="${esc(data[0] || '')}" placeholder="Имя подчинённого" aria-label="Имя">
      <label class="team-loyalty" title="Лояльность: проверка — 1d6 мастера">ЛОЯЛЬНОСТЬ<input data-key="roleTeam${i}_2" type="number" value="${esc(data[2] || '')}"></label>
      <button type="button" class="weapon-btn" data-role-action="loyaltyCheck" data-index="${i}" title="Проверка лояльности: мастер бросает 1d6">1D6</button>
      <button type="button" class="remove" data-remove="roleTeam" data-index="${i}" title="Уволить / удалить">×</button>
    </div>
    <div class="team-meta">
      <select data-key="roleTeam${i}_4" aria-label="Тип подчинённого"><option value="">Тип —</option>${Object.entries(execSubordinates).map(([id,item])=>`<option value="${id}"${id === data[4] ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}</select>
      ${growField(`roleTeam${i}_1`, data[1] || '', 'Работа')}
    </div>
    <div class="team-stats">${execStatNames.map((name,k)=>`<label><span class="has-tip" data-tip="${esc(statTitle(name))}">${name}</span><input data-team-stat="${i}" data-stat-index="${k}" type="number" min="0" max="10" value="${esc(stats[k])}" aria-label="${name}"></label>`).join('')}</div>
    <input type="hidden" data-key="roleTeam${i}_5" value="${esc(data[5] || '')}">
    ${type ? `<details class="team-details"><summary>Навыки и снаряжение</summary><p><strong>Прикрытие:</strong> ${esc(type.cover)}</p><ul>${skills}</ul><p><strong>Киберимпланты и снаряжение:</strong> ${esc(type.gear)}</p></details>` : ''}
    ${growField(`roleTeam${i}_3`, data[3] || '', 'Заметки')}
  </article>`;
}
// Программа кибердеки — компактная карточка: параметры в одну строку, эффект под ней.
function programCard(data, i){
  const k = j => `rolePrograms${i}_${j}`;
  const mini = (label, j, title = '') => `<label class="mini"${title ? ` title="${title}"` : ''}><span>${label}</span><input data-key="${k(j)}" value="${esc(data[j] || '')}"></label>`;
  return `<article class="program-card">
    <div class="program-main">
      <label class="program-on" title="Программа включена"><input type="checkbox" data-key="${k(8)}"${data[8] === '1' ? ' checked' : ''} aria-label="Включена"></label>
      <input class="program-name" data-key="${k(0)}" value="${esc(data[0] || '')}" placeholder="Программа" aria-label="Название">
      <div class="program-fields">
        <label class="mini wide"><span>Из книги</span>${programPresetSelect(k(6), data[6] || '')}</label>
        <label class="mini wide"><span>Класс</span><input data-key="${k(1)}" value="${esc(data[1] || '')}"></label>
        ${mini('ATK', 2)}${mini('ЗАЩ', 3)}
        <label class="mini rez" title="REZ сейчас / максимум"><span>REZ</span><span class="rez-pair"><input data-key="${k(7)}" value="${esc(data[7] || '')}" aria-label="REZ сейчас">/<input data-key="${k(4)}" value="${esc(data[4] || '')}" aria-label="REZ максимум"></span></label>
        <label class="mini"><span data-program-roll-label="${i}">${data[13] === 'effect' ? 'Свойство' : !isBlank(data[12]) ? 'Урон: прогр.' : 'Урон'}</span><input data-key="${k(11)}" value="${esc(data[11] || '')}"></label>
        <label class="mini" title="Урон по Чёрному ЛЬДУ, если он отличается"><span>Урон: Ч.ЛЁД</span><input data-key="${k(12)}" value="${esc(data[12] || '')}"></label>
        ${programPresets[data[6]] ? `<input type="hidden" data-key="${k(13)}" value="${esc(data[13] || '')}">`
          : `<label class="mini wide" title="Кубики своей программы: урон (атака) или свойство — длительность, штраф, как у Суперклея"><span>Кубики</span><select data-key="${k(13)}" aria-label="Что бросают кубики программы"><option value=""${data[13] === 'effect' ? '' : ' selected'}>урон</option><option value="effect"${data[13] === 'effect' ? ' selected' : ''}>свойство</option></select></label>`}
        <div class="mini wide boost-field"><span>Усиливает</span>${programBoostEditor(i, data)}</div>
      </div>
      <div class="row-actions"><button type="button" class="weapon-btn" data-program-attack="${i}" title="Бросок на попадание: 1d10 + ранг Интерфейса + ATK; результат назовите мастеру">ПОПАДАНИЕ</button><button type="button" class="weapon-btn" data-program-damage="${i}">УРОН</button><button type="button" class="weapon-btn" data-program-damage="${i}" data-target="ice" title="Урон по Чёрному ЛЬДУ (после попадания)">ПО ЧЁРНОМУ ЛЬДУ</button><button type="button" class="weapon-btn" data-program-rez="${i}" title="Восстановить REZ до максимума">↺</button><button type="button" class="remove" data-remove="rolePrograms" data-index="${i}" title="Удалить">×</button></div>
    </div>
    ${growField(k(5), data[5] || '', 'Эффект')}
  </article>`;
}
// Транспорт кочевника — карточка: ПЗТ с полоской, характеристики, улучшения галочками.
const vehicleUpgradeList = data => String(data?.[1] || '').split(/[;,\n]/).map(part=>part.trim()).filter(Boolean);
function vehicleCard(data, i){
  const k = j => `roleVehicles${i}_${j}`;
  const preset = vehicleTypes[data[3]];
  const chosen = vehicleUpgradeList(data);
  const rank = rankOf('nomad');
  const stats = preset
    ? `<div class="vehicle-stats"><div><span>Мест</span><strong>${esc(preset[2])}</strong></div><div><span>СКО в бою</span><strong>${preset[3]}</strong></div><div><span>Скорость</span><strong>${preset[4]} км/ч</strong></div></div><input type="hidden" data-key="${k(6)}" value="${esc(data[6] || '')}">`
    : growField(k(6), data[6] || '', 'Места, СКО в бою, скорость');
  const upgrades = nomadUpgrades.map(([name, from, kind])=>`<label class="check-row${rank >= from ? '' : ' is-locked'}" title="${esc(kind)}"><input type="checkbox" data-vehicle-upgrade="${i}" value="${esc(name)}"${chosen.includes(name) ? ' checked' : ''}${rank >= from || chosen.includes(name) ? '' : ' disabled'}> ${esc(name)} <small>ранг ${from}</small></label>`).join('');
  return `<article class="vehicle-card">
    <div class="team-head">
      <input class="team-name" data-key="${k(0)}" value="${esc(data[0] || '')}" placeholder="Транспорт" aria-label="Название">
      <select data-key="${k(3)}" aria-label="Тип транспорта"><option value="">Свой</option>${Object.entries(vehicleTypes).map(([id,item])=>`<option value="${id}"${id === data[3] ? ' selected' : ''}>${esc(item[0])}</option>`).join('')}</select>
      <button type="button" class="remove" data-remove="roleVehicles" data-index="${i}" title="Удалить">×</button>
    </div>
    <div class="vehicle-hp">
      <label>ПЗТ<span class="rez-pair"><input data-key="${k(4)}" value="${esc(data[4] || '')}" aria-label="ПЗТ сейчас">/<input data-key="${k(5)}" value="${esc(data[5] || '')}" aria-label="ПЗТ максимум"></span></label>
      <div class="hp-bar" data-vehicle-bar="${i}"><span></span></div>
      <input class="vehicle-damage" data-vehicle-damage="${i}" type="number" min="0" placeholder="урон" aria-label="Урон транспорту">
      <button type="button" class="weapon-btn" data-role-action="vehicleDamage" data-index="${i}" title="Снять урон с ПЗТ">УРОН</button>
      <button type="button" class="weapon-btn" data-role-action="vehicleRepair" data-index="${i}" title="Полностью починить">↺</button>
    </div>
    ${stats}
    <details class="team-details"><summary data-vehicle-summary="${i}">Улучшения</summary><div class="vehicle-upgrades">${upgrades}</div></details>
    <input type="hidden" data-key="${k(1)}" value="${esc(data[1] || '')}">
    ${growField(k(2), data[2] || '', 'Заметки')}
  </article>`;
}
function refreshVehicleCards(){
  $$('[data-vehicle-bar]').forEach(bar=>{
    const data = state.roleVehicles?.[Number(bar.dataset.vehicleBar)];
    const max = Number(data?.[5]) || 0, now = Math.max(0, Number(data?.[4]) || 0);
    const share = max ? Math.min(1, now / max) : 0;
    bar.firstElementChild.style.width = `${Math.round(share * 100)}%`;
    bar.classList.toggle('is-low', max > 0 && share <= .5);
    bar.title = max ? `${now} / ${max}${now === 0 ? ' — уничтожен' : ''}` : '';
  });
  $$('[data-vehicle-summary]').forEach(summary=>{
    const count = vehicleUpgradeList(state.roleVehicles?.[Number(summary.dataset.vehicleSummary)]).length;
    summary.textContent = count ? `Улучшения (${count})` : 'Улучшения';
  });
}
const cardRenderers = {roleTeam:teamCard, rolePrograms:programCard, roleVehicles:vehicleCard};
function renderRows(type){
  const rows = state[type]?.length ? state[type] : [[]];
  if(!$(`#${type}Rows`)) return;
  $(`#${type}Rows`).innerHTML = rows.map((data,i)=>cardRenderers[type] ? cardRenderers[type](data, i) : row(type,data,i)).join('');
  if(type === 'roleVehicles') refreshVehicleCards();
  if(type === 'weapon') refreshWeaponRows();
  if(type === 'rolePrograms') refreshProgramRows();
  autoGrowAll();
}
// Галочка «Авто» доступна только оружию с автоогнём; при включённой кнопка атаки — «ОЧЕРЕДЬ».
function refreshWeaponRows(){
  $$('#weaponRows tr').forEach((tr,i)=>{
    const data = state.weapon?.[i];
    const ammoSelect = tr.querySelector('[data-key$="_10"]');
    if(ammoSelect && ammoSelect !== document.activeElement) ammoSelect.innerHTML = loadedAmmoOptions(data);
    const toggle = tr.querySelector('[data-key$="_9"]');
    const multiplier = autofireMultiplier(data);
    if(toggle){
      toggle.disabled = !multiplier;
      // Сброс «Авто», если убрали множитель (своё: «без очереди» / тип без автоогня) — иначе в state остаётся «1».
      if(!multiplier && data?.[9] === '1') data[9] = '';
      toggle.checked = isAutofireOn(data);
      toggle.title = multiplier ? `Автоматический огонь (множитель до ×${multiplier})` : weaponTypes[data?.[8]] ? 'Этот тип оружия не стреляет очередями' : 'Своё оружие: выберите «очередь ×…» под типом оружия';
    }
    const on = isAutofireOn(data);
    tr.classList.toggle('is-autofire', on);
    const suppress = tr.querySelector('[data-weapon-suppress]');
    if(suppress) suppress.hidden = !multiplier;
    const attack = tr.querySelector('[data-weapon-attack]');
    const damage = tr.querySelector('[data-weapon-damage]');
    const loaded = loadedAmmo(data);
    const shell = !on && loaded?.kind === 'shell';
    if(attack){
      attack.textContent = t('ПОПАДАНИЕ');
      attack.title = on
        ? t('Бросок на попадание очередью: 10 патронов, 1d10 + РЕА + «Автоматический огонь»; результат назовите мастеру', 'Autofire attack roll: 10 rounds, 1d10 + REF + Autofire; tell the GM the result')
        : t('Бросок на попадание: 1d10 + стат + навык; результат назовите мастеру', 'Attack roll: 1d10 + STAT + skill; tell the GM the result');
    }
    if(damage){
      const effect = !on && loaded && loaded.type in ammoNoDamage;
      damage.textContent = on ? t('УРОН ОЧЕРЕДИ') : effect ? t('ЭФФЕКТ') : t('УРОН');
      damage.title = on ? t('Урон очереди после попадания: 2d6 × множитель, который назовёт мастер', 'Autofire damage after a hit: 2d6 × the multiplier the GM names')
        : effect ? `${term(ammoTypes[loaded.type][0])}: ${t('урона оружия нет —', 'no weapon damage —')} ${termsIn(ammoTypes[loaded.type][3])}`
        : shell ? t(`Запасной бросок урона дробью ${SHOTGUN_SHELL_DAMAGE} (основной — «ПОПАДАНИЕ» против СЛ ${SHELL_DV})`, `Backup shell damage ${SHOTGUN_SHELL_DAMAGE} (primary is ATTACK vs DV ${SHELL_DV})`) : t('Бросок урона после попадания', 'Damage roll after a hit');
    }
    if(attack && shell && !on){
      attack.title = `Дробь: 1d10 + стат + навык против СЛ ${SHELL_DV}; при успехе — ${SHOTGUN_SHELL_DAMAGE} всем в 6 м перед вами`;
    }
  });
}
// Многострочное поле, которое растёт по высоте вместе с текстом.
const growField = (key, value='', placeholder='') => `<textarea class="grow-field" data-key="${key}" rows="1" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
// Chrome и Edge подгоняют высоту сами (field-sizing: content), остальным браузерам помогаем скриптом.
const nativeGrow = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
function autoGrow(el){
  if(nativeGrow || !el.offsetParent) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
const autoGrowAll = () => $$('.grow-field').forEach(autoGrow);

function foundationOffLabel(conf){
  if(conf.meat) return 'Живая';
  if(conf.group === 'optic') return 'Обычный';
  if(conf.group === 'audio') return 'Обычный';
  if(conf.group === 'neural') return 'Нет';
  return 'Нет';
}
function syncWoundsWithHp(){
  if(isBlank(state.currentHp)) return;
  const hp = numeric('currentHp');
  state.seriousWound = hp < Math.ceil(maxHp() / 2);
  state.deathSave = hp <= 0;
  $$('[data-key="seriousWound"]').forEach(el=>{ el.checked = state.seriousWound; });
  $$('[data-key="deathSave"]').forEach(el=>{ el.checked = state.deathSave; });
}

// Проверка навыка: 1d10 + стат + навык с учётом штрафов брони, ранений и травм (удачу можно добавить после броска).
function rollCheck(ref, label = refLabel(ref), judge, extras = [], {attack = false, onMiss, onHit, injuryKind} = {}){
  const kind = injuryKind ?? (attack ? attackInjuryKind(skills[refBase(ref)]) : '');
  const wound = woundPenalty(), grapple = grapplePenalty(), injury = injuryCheckPenalty(kind);
  const modifier = refTotal(ref, kind) + extras.reduce((sum,[value])=>sum + value, 0);
  state.dicePool=[{sides:10,count:1}];
  renderDicePool();
  $('#diceModifier').value=modifier;
  return rollDicePool([{sides:10,count:1}], modifier, withNotes(label, [wound && `ранение −${wound}`, grapple && `захват −${grapple}`, injury.note, ...extras.map(([value,note])=>value && `${note} ${withSign(value)}`)]), {judge, attack, luck:true, onMiss, onHit});
}
const rollSkill = ref => rollCheck(typeof ref === 'number' ? `b${ref}` : String(ref));

// Инициатива: 1d10 + РЕА (со штрафом брони).
// Боевые действия на вкладке «Снаряжение» (стр. 168–177): строки одной высоты с итогом броска на кнопке; правило
// выбранного действия (нажатие на название или на метку справки) — одним блоком под списком.
let combatShown = null;
const shortSkill = name => name.replace(' (x2)', '').replace('Автоматический огонь', 'Автоогонь');
const chipLabels = {'Пилотирование (x2)':'Пилот.', 'Судовождение':'Судно', 'Вождение':'Вожд.', 'Первая помощь':'1-я помощь', 'Парамедик (x2)':'Парамедик'};
function combatChip(name, roll, many){
  if(roll === 'body') return `<span class="combat-roll is-static" title="Урон, равный ТЕЛ, мимо брони"><small>урон</small>ТЕЛ ${statValue(8)}</span>`;
  const ref = `b${skills.indexOf(roll)}`;
  return `<button type="button" class="combat-roll" data-combat-roll="${esc(roll)}" data-combat-name="${esc(name)}" title="${esc(`${skillEntries[refBase(ref)][1]} + ${shortSkill(roll)} + 1d10 — нажмите, чтобы бросить`)}">${many ? `<small>${esc(chipLabels[roll] || shortSkill(roll))}</small>` : ''}${withSign(refTotal(ref))}</button>`;
}
function renderCombatActions(){
  const box = $('#combatActions');
  if(!box) return;
  const grapple = grapplePenalty();
  const indexed = sheetCombatActions.map((action, k)=>[action, k]);
  const rows = indexed.filter(([[, , rolls]])=>rolls.length).map(([[name, , rolls, extra], k])=>{
    const toggle = extra === 'grapple' ? `<label class="combat-toggle" title="В захвате оба получают −2 ко всем действиям"><input type="checkbox" data-combat-grapple${grapple ? ' checked' : ''}> в захвате</label>` : '';
    return `<div class="combat-action${combatShown === k ? ' is-open' : ''}">
      <button type="button" class="combat-name" data-combat-info="${k}" aria-expanded="${combatShown === k}" title="Правило из книги">${esc(name)}</button>${toggle}
      <span class="combat-rolls">${rolls.map(roll=>combatChip(name, roll, rolls.length > 1)).join('')}</span></div>`;
  }).join('');
  const refs = indexed.filter(([[, , rolls]])=>!rolls.length);
  const shown = sheetCombatActions[combatShown];
  box.innerHTML = `<div class="combat-rows">${rows}</div>
    <div class="combat-refs"><span class="combat-refs-title">ДРУГИЕ ДЕЙСТВИЯ</span>${refs.map(([[name], k])=>`<button type="button" class="combat-tag${k === combatShown ? ' active' : ''}" data-combat-info="${k}" aria-pressed="${k === combatShown}">${esc(name)}</button>`).join('')}</div>
    ${shown && !shown[2].length ? `<p class="combat-ref-text"><b>${esc(shown[0])}.</b> ${esc(shown[1])}</p>` : ''}`;
  // Правило действия с бросками — сразу под его рядом сетки: после последней строки того же ряда.
  const grid = box.querySelector('.combat-rows'), open = grid.querySelector('.combat-action.is-open');
  if(shown && open){
    const items = [...grid.children], cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    const rowEnd = Math.min(items.length - 1, Math.floor(items.indexOf(open) / cols) * cols + cols - 1);
    items[rowEnd].insertAdjacentHTML('afterend', `<p class="combat-ref-text combat-row-rule"><b>${esc(shown[0])}.</b> ${esc(shown[1])}</p>`);
  }
  $('#combatGrappleNote').hidden = !grapple;
}
function combatClick(e){
  const info = e.target.closest('[data-combat-info]');
  if(info){ const k = Number(info.dataset.combatInfo); combatShown = combatShown === k ? null : k; renderCombatActions(); return; }
  const roll = e.target.closest('[data-combat-roll]');
  if(roll){ const skill = roll.dataset.combatRoll, name = roll.dataset.combatName; rollCheck(`b${skills.indexOf(skill)}`, name === shortSkill(skill) ? name : `${name}: ${shortSkill(skill)}`); }
}
function rollInitiative(){
  if(hasRole('solo')) resetSoloRound(true);
  const armor = statPenalty(1);
  const reaction = soloLevel('initiative');
  const cyber = cyberInitBonus();
  rollDicePool([{sides:10,count:1}], statValue(1) - armor + reaction + cyber, withNotes('Инициатива', [armor && `броня −${armor}`, reaction && `реакция +${reaction}`, cyber && `кибер +${cyber}`]), {crits:false, luck:true});
}

function upgradeSkill(ref){
  const cost = upgradeCost(ref);
  if(refLevel(ref) >= MAX_SKILL || numeric('ip') < cost) return;
  state.ip = numeric('ip') - cost;
  setRefLevel(ref, refLevel(ref) + 1);
  setInput('ip', state.ip);
  refreshSkills();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
  toast(`${refLabel(ref)}: уровень ${refLevel(ref)} за ${cost} IP`);
}

function addVariant(base){
  (state.customSkills ||= []).push({base, spec:'', level:0});
  renderSkills(); bindInputs(); persist();
  $(`[data-key="cskill${state.customSkills.length - 1}_spec"]`)?.focus();
}
function removeVariant(index){
  const [removed] = state.customSkills.splice(index, 1);
  renderSkills(); bindInputs(); save();
  toast('Специализация удалена', 'Вернуть', ()=>{
    state.customSkills.splice(index, 0, removed);
    renderSkills(); bindInputs(); save();
  });
}

// Урон оружия: «3d6», «2d6+2», «4к6».
function parseDamage(value){
  const match = String(value).trim().match(/^(\d+)\s*[dдк]\s*(\d+)(?:\s*([+\-−])\s*(\d+))?$/i);
  if(!match) return null;
  const formula = parseFormula(`${match[1]}d${match[2]}`);
  return formula && {...formula, bonus: match[3] ? (match[3] === '+' ? 1 : -1) * Number(match[4]) : 0};
}
function weaponRow(index){
  if(!state.weapon?.[index]) save();
  return state.weapon?.[index];
}
const isCriticalDamage = entry => entry.diceDetails.filter(die=>die.sides === 6 && die.value === 6).length >= 2;
// Патроны списываются, только если в колонке «Патр.» указано число.
function spendAmmo(index, data, need){
  if(isBlank(data[2])) return true;
  const ammo = Number(data[2]) || 0;
  if(ammo < need){ toast(`${data[0] || 'Оружие'}: патронов ${ammo}, нужно ${need}. Перезарядите.`); return false; }
  data[2] = String(ammo - need);
  setInput(`weapon${index}_2`, data[2]);
  return true;
}
const damageTable = (entry, multiplier) => [
  entry.autofireMult
    ? `${entry.total} ×${entry.autofireMult} = ${entry.total * entry.autofireMult}`
    : `введите × от мастера ниже (макс. ×${multiplier})`,
  isCriticalDamage(entry) && `КРИТИЧЕСКАЯ ТРАВМА у цели: +${CRITICAL_BONUS_DAMAGE} урона`
].filter(Boolean).join('. ');
// Атака: одиночный выстрел или удар — 1d10 + стат + навык оружия, дальний бой тратит 1 патрон.
// С включённым «Авто» — очередь: 10 патронов, 1d10 + РЕА + «Автоматический огонь».
// Попала ли атака, решает мастер: сравнивает результат с DV или броском уклонения цели.
function weaponAttack(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isAutofireOn(data)){
    if(!spendAmmo(index, data, AUTOFIRE_AMMO)) return;
    rollCheck(`b${skills.indexOf(AUTOFIRE_SKILL)}`, `${name}: попадание очередью`, entry => qualityJamNote(parseMods(data[11]), entry.die), [[soloLevel('precision'), 'точная атака'], ...modAttackExtras(data, true)], {attack:true, ...withSoloHitConfirm()});
    return;
  }
  const loaded = loadedAmmo(data);
  // Дробь (стр. 174): атака против СЛ 13, при успехе — 3d6 всем в конусе (как на листе Мастера).
  if(loaded?.kind === 'shell'){
    if(!spendAmmo(index, data, 1)) return;
    const skill = skills.indexOf(data[5]);
    const attack = rollCheck(`b${skill >= 0 ? skill : skills.indexOf('Тактическое оружие')}`, `${name}: дробь`,
      entry => `${entry.total > SHELL_DV ? 'ПОПАЛ' : 'ПРОМАХ'} (СЛ ${SHELL_DV}); цели с РЕА 8+ могут уклониться; при попадании — ${SHOTGUN_SHELL_DAMAGE} всем в 6 м перед вами`,
      [[soloLevel('precision'), 'точная атака'], ...modAttackExtras(data, false)], {attack:true, injuryKind:'ranged'});
    if(attack.total > SHELL_DV){
      armSoloWeakness();
      rollShellDamage(name, data);
    }
    return;
  }
  const skill = skills.indexOf(data[5]);
  if(skill < 0){ toast(`${name}: выберите тип или навык оружия`); return; }
  if(rangedWeaponSkills.includes(data[5]) && !spendAmmo(index, data, data[5] === AUTOFIRE_SKILL ? AUTOFIRE_AMMO : 1)) return;
  const smart = loaded?.type === 'smart';
  const jam = entry => qualityJamNote(parseMods(data[11]), entry.die);
  rollCheck(`b${skill}`, `${name}: попадание`, entry => [jam(entry), smart && 'Умные патроны: если мастер скажет, что вы промахнулись на 4 или меньше, нажмите «НЕ ПОПАЛ» — второй шанс'].filter(Boolean).join('. '),
    [[soloLevel('precision'), 'точная атака'], ...modAttackExtras(data, false)], {attack:true, ...withSoloHitConfirm(smart ? () => smartSecondChance(name) : undefined)});
}
function rollShellDamage(name, data){
  const weak = consumeSoloWeakness();
  rollDicePool([{sides:6,count:3}], weak, `${name}: урон дробью`, {crits:false,
    judge: entry => ['Дробь: один бросок урона для всех целей в конусе перед вами, броня каждой цели уменьшает урон',
      isCriticalDamage(entry) && `КРИТИЧЕСКАЯ ТРАВМА у цели: +${CRITICAL_BONUS_DAMAGE} урона`, weak && `Слабое место +${weak}`, ammoNote(data)].filter(Boolean).join('. ')});
}
// Подавляющий огонь (стр. 173): только из оружия с автоогнём, 10 патронов; РЕА + Автоматический огонь + 1d10.
// Все в 25 м без укрытия бросают ВОЛЯ + Концентрация + 1d10 против результата; проигравшие уходят в укрытие.
function weaponSuppress(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(!autofireMultiplier(data)){ toast(`${name}: подавляющий огонь — только из оружия с автоогнём`); return; }
  if(!spendAmmo(index, data, AUTOFIRE_AMMO)) return;
  rollCheck(`b${skills.indexOf(AUTOFIRE_SKILL)}`, `${name}: подавляющий огонь`);
  syncAmmoTable();
  refreshWeaponRows();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}
// Умные патроны (нужен Тактический прицел): промах на 4 или меньше — повторная проверка 1d10 + 10
// вместо СТАТ + навык, та же дистанция и СЛ; удачу добавить можно, цель может уклониться как обычно.
function smartSecondChance(name){
  rollDicePool([{sides:10,count:1}], 10, `${name}: умные патроны — второй шанс (1d10 + 10)`, {attack:true, luck:true,
    judge: () => 'Только если промах был на 4 или меньше. Та же СЛ; цель может уклониться как обычно'});
}
// Урон: формула оружия. Для очереди — 2d6; мастер называет множитель = превышение DV
// (не больше множителя оружия: ПП ×3, штурмовая ×4, своё — из «очередь ×…»).
// Две и больше шестёрок на кубиках урона — критическая травма у цели.
function weaponDamage(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isAutofireOn(data)){
    const max = autofireMultiplier(data);
    const weak = consumeSoloWeakness();
    if(!weak && soloLevel('weakness') && !state.soloWeaknessUsed) toast('Слабое место: сначала подтвердите попадание кнопкой «ПОПАЛ»');
    rollDicePool([AUTOFIRE_DAMAGE], weak, `${name}: урон очереди`, {crits:false, autofireMax: max, judge: entry => [damageTable(entry, max), weak && `Слабое место +${weak}`, ammoNote(data)].filter(Boolean).join('. ')});
    return;
  }
  const loaded = loadedAmmo(data);
  // Яд, ЭМИ, газ и т. п. урона оружия не наносят: цель делает проверку, при провале — эффект.
  if(loaded && loaded.type in ammoNoDamage){
    const [ammoName,,,effect] = ammoTypes[loaded.type];
    const dice = parseDamage(ammoNoDamage[loaded.type]);
    if(!dice){ toast(`${name}, ${ammoName}: ${effect}`); return; }
    rollDicePool([{sides:dice.sides,count:dice.count}], dice.bonus, `${name}: ${ammoName.toLowerCase()} — урон мимо брони`, {crits:false, judge: () => `Только если цель провалит проверку. ${effect}`});
    return;
  }
  // Дробь: основной бросок — «ПОПАДАНИЕ» против СЛ 13; кнопка урона — запасной повтор 3d6.
  if(loaded?.kind === 'shell'){ rollShellDamage(name, data); return; }
  const damage = parseDamage(data[1]);
  if(!damage){ toast(`${name}: укажите урон в виде 3d6 или 2d6+2`); return; }
  const weak = consumeSoloWeakness();
  if(!weak && soloLevel('weakness') && !state.soloWeaknessUsed) toast('Слабое место: сначала подтвердите попадание кнопкой «ПОПАЛ»');
  rollDicePool([{sides:damage.sides,count:damage.count}], damage.bonus + weak, `${name}: урон`, {crits:false,
    judge: entry => [isCriticalDamage(entry) && `КРИТИЧЕСКАЯ ТРАВМА у цели: +${CRITICAL_BONUS_DAMAGE} урона`, weak && `Слабое место +${weak}`, ammoNote(data)].filter(Boolean).join('. ')});
}
const ammoNote = data => { const loaded = loadedAmmo(data); return loaded && loaded.type !== 'basic' ? `${ammoTypes[loaded.type][0]}: ${ammoTypes[loaded.type][3]}` : ''; };
// ---------- Боеприпасы: запас в снаряжении и заряженные в оружие ----------
// Боеприпас — «форма:тип», например «slug:ap»: жаканы, бронебойные. Калибр формы — ammoKinds[форма][1].
const kindsOf = caliber => Object.keys(ammoKinds).filter(kind=>ammoKinds[kind][1] === caliber);
const kindLabel = kind => kindsOf(ammoKinds[kind][1]).length > 1 ? `${ammoCalibers[ammoKinds[kind][1]][0]}: ${ammoKinds[kind][0].toLowerCase()}` : ammoCalibers[ammoKinds[kind][1]][0];
const typesOfKind = kind => Object.entries(ammoTypes).filter(([, item])=>item[2].includes(ammoKinds[kind][2]));
// Список вариантов: при нескольких формах — группы, а в тексте варианта — форма (видно и в закрытом списке).
function ammoOptions(kinds, value, label){
  const names = kinds.map(kind=>ammoKinds[kind][0]);
  const prefix = kind => kinds.length < 2 ? '' : `${new Set(names).size < names.length ? kindLabel(kind) : ammoKinds[kind][0]}: `;
  const options = kind => typesOfKind(kind).map(([type,[name]])=>{ const id = `${kind}:${type}`; return `<option value="${id}"${id === value ? ' selected' : ''}>${esc(prefix(kind) + name)}${label ? esc(label(kind, type)) : ''}</option>`; }).join('');
  return kinds.length > 1 ? kinds.map(kind=>`<optgroup label="${esc(kindLabel(kind))}">${options(kind)}</optgroup>`).join('') : options(kinds[0]);
}
const ammoTypeOptions = (caliber, value) => '<option value="">—</option>' + (kindsOf(caliber).length ? ammoOptions(kindsOf(caliber), value) : '');
// Оружие, которое стреляет этим калибром.
const caliberWeapons = caliber => ammoCalibers[caliber]?.[2] || '';
// Своё оружие (тип не выбран) может брать любые боеприпасы, холодное — никакие.
const weaponKindList = data => isBlank(data?.[8]) ? Object.keys(ammoKinds) : weaponAmmoKinds[data[8]] || [];
const ammoStock = (kind, type) => (state.ammo || []).filter(row=>row[1] === `${kind}:${type}`).reduce((sum,row)=>sum + (Number(row[2]) || 0), 0);
// Заряжено: «форма:тип»; пусто — патроны не связаны со снаряжением (перезарядка без учёта запаса).
function loadedAmmoOptions(data){
  const kinds = weaponKindList(data);
  if(!kinds.length) return '<option value="">— не нужны</option>';
  return '<option value="">— без учёта запаса</option>' + ammoOptions(kinds, data?.[10], (kind, type)=>` (${ammoStock(kind, type)})`);
}
const loadedAmmo = data => { const [kind, type] = String(data?.[10] || '').split(':'); return ammoKinds[kind] && ammoTypes[type] ? {kind, type} : null; };
// Снять патроны из запаса (по строкам снаряжения), вернуть остаток в запас.
function takeAmmo(kind, type, count){
  let taken = 0;
  (state.ammo || []).forEach(row=>{
    if(taken >= count || row[1] !== `${kind}:${type}`) return;
    const part = Math.min(Number(row[2]) || 0, count - taken);
    row[2] = String((Number(row[2]) || 0) - part);
    taken += part;
  });
  return taken;
}
function returnAmmo(kind, type, count){
  if(count <= 0) return;
  if(!state.ammo?.some(row=>row.some(cell=>!isBlank(cell)))) state.ammo = [];
  const row = state.ammo.find(item=>item[1] === `${kind}:${type}`);
  if(row) row[2] = String((Number(row[2]) || 0) + count);
  else state.ammo.push([ammoKinds[kind][1], `${kind}:${type}`, String(count)]);
}
// После изменения запаса из кода — перерисовать таблицу боеприпасов, чтобы save() прочитал актуальные числа.
function syncAmmoTable(){ renderRows('ammo'); bindInputs(); }
// Зарядить магазин из запаса выбранного типа.
function loadFromStock(index, data){
  const loaded = loadedAmmo(data);
  const magazine = Number(data[6]) || 0;
  const current = Math.max(0, Number(data[2]) || 0);
  const taken = takeAmmo(loaded.kind, loaded.type, Math.max(0, magazine - current));
  data[2] = String(current + taken);
  setInput(`weapon${index}_2`, data[2]);
  return {taken, magazine, total:current + taken, left:ammoStock(loaded.kind, loaded.type), name:ammoTypes[loaded.type][0]};
}
// Смена заряженных патронов: остаток в магазине вернуть в запас старого типа и зарядить новым.
function applyWeaponAmmo(key, value){
  const match = /^weapon(\d+)_10$/.exec(key);
  if(!match) return;
  const index = Number(match[1]);
  const data = state.weapon?.[index];
  if(!data) return;
  const before = loadedAmmo(data);
  const current = Math.max(0, Number(data[2]) || 0);
  // Заряженные без учёта запаса патроны не возвращаются: магазин заряжается заново из снаряжения.
  if(before && current) returnAmmo(before.kind, before.type, current);
  data[10] = value;
  if(current && (before || loadedAmmo(data))){ data[2] = '0'; setInput(`weapon${index}_2`, '0'); }
  refreshWeaponRows();
  if(loadedAmmo(data) && !isBlank(data[6])){
    const result = loadFromStock(index, data);
    toast(`${data[0] || 'Оружие'}: заряжено ${result.name} — ${result.total} / ${result.magazine}, в запасе ${result.left}`);
  }
  syncAmmoTable();
}

// --- Модификации оружия (стр. 342–344) ---
// Колонка 11 — строка JSON модификаций (разбор, итоги, окно — в data.js, общие с листом Мастера).
const modsOf = i => parseMods($(`[data-key="weapon${i}_11"]`)?.value ?? state.weapon?.[i]?.[11]);
// Модификации только для оружия дальнего боя.
const isMeleeType = type => weaponTypes[type] && !rangedWeaponSkills.includes(weaponTypes[type][1]);
function weaponModButtons(index, data){
  const mods = parseMods(data[11]);
  if(isMeleeType(data[8])) return `<button type="button" class="weapon-btn mod-btn${mods.quality ? ' has-mods' : ''}" data-weapon-mods="${index}" title="Качество оружия: отличное +1 к атакам, низкое заклинивает">КАЧ.${qualityLabel(mods)}</button>`;
  const t = modTotals(mods);
  return `${t.bayonet ? `<button type="button" class="weapon-btn" data-weapon-bayonet="${index}" title="Удар штыком: 1d10 + ЛВК + «Оружие ближнего боя»">ШТЫК</button><button type="button" class="weapon-btn" data-weapon-bayonet-damage="${index}" title="Урон штыка 1d6 (лёгкое холодное оружие: SP цели вдвое меньше)">1D6</button>` : ''}<button type="button" class="weapon-btn mod-btn${t.slots ? ' has-mods' : ''}" data-weapon-mods="${index}" title="Модификации и качество оружия: слоты, прицелы, магазины, свои модификации">МОД ${t.slots}/${modSlotLimit(mods)}${qualityLabel(mods)}</button>`;
}
const modAttackExtras = (data, autofire) => { const mods = parseMods(data[11]); return modAttackParts(mods, !autofire && mods.far); };
// Магазин пересчитывается по модификациям; патроны в магазине не больше нового размера.
function applyModMagazine(i){
  const magKey = `weapon${i}_6`, curKey = `weapon${i}_2`;
  const {size, mods} = modMagazine(modsOf(i), $(`[data-key="weapon${i}_8"]`)?.value, $(`[data-key="${magKey}"]`)?.value ?? '');
  if(size !== '') setInput(magKey, size);
  const max = Number($(`[data-key="${magKey}"]`)?.value) || 0, loaded = Number($(`[data-key="${curKey}"]`)?.value) || 0;
  if(max && loaded > max) setInput(curKey, String(max));
  setInput(`weapon${i}_11`, JSON.stringify(mods));
}
function setWeaponMods(i, mods, rerenderDialog = true){
  setInput(`weapon${i}_11`, JSON.stringify(mods));
  applyModMagazine(i);
  save();
  renderRows('weapon'); bindInputs(); refreshWeaponRows();
  if(rerenderDialog) renderModDialog(i);
}
// Подствольный гранатомёт или дробовик — отдельная строка оружия со своим магазином и патронами.
function addUnderbarrel(i, id){
  const [type, magazine] = weaponModPresets[id][4].under;
  const [, skill, damage, , rof] = weaponTypes[type];
  const host = state.weapon?.[i]?.[0] || 'оружие';
  const row = Array(rowTypes.weapon).fill('');
  Object.assign(row, {0:`${weaponModPresets[id][0]} (${host})`, 1:damage, 2:String(magazine), 3:rof, 5:skill, 6:String(magazine), 8:type});
  state.weapon.push(row);
  renderRows('weapon'); bindInputs(); refreshWeaponRows(); save();
  toast(`Добавлена строка «${row[0]}»: стреляйте из неё, держа оружие двумя руками`);
}
let modDialogIndex = null;
function renderModDialog(i){
  const dialog = $('#modDialog');
  if(!dialog || !state.weapon?.[i]) return;
  modDialogIndex = i;
  const data = state.weapon[i];
  dialog.innerHTML = modDialogHtml({name:data[0], type:data[8], mods:parseMods(data[11]), magazine:data[6], farMode:'toggle',
    bayonetHint:'штык: кнопки «ШТЫК» и «1D6» в строке оружия', melee:isMeleeType(data[8])});
}
function openModDialog(i){
  save();
  renderModDialog(i);
  const dialog = $('#modDialog');
  if(dialog && !dialog.open) dialog.showModal ? dialog.showModal() : dialog.setAttribute('open', '');
}
function modDialogEvent(e){
  const i = modDialogIndex;
  if(i === null) return;
  const result = modDialogAction(modsOf(i), e);
  if(!result) return;
  setWeaponMods(i, result.mods, result.rerender);
  if(result.added && weaponModPresets[result.added][4].under) addUnderbarrel(i, result.added);
  if(weaponModPresets[result.removed?.id]?.[4].under) toast(`Строка «${weaponModPresets[result.removed.id][0]}» осталась в таблице оружия — удалите её, если она больше не нужна`);
}
function bayonetAttack(index){
  const data = weaponRow(index);
  if(!data) return;
  rollCheck(`b${skills.indexOf('Оружие ближнего боя')}`, `${data[0] || 'Оружие'}: штык`, () => 'Лёгкое холодное оружие: урон 1d6, SP цели вдвое меньше', [], {attack:true, injuryKind:'melee', ...withSoloHitConfirm()});
}
function bayonetDamage(index){
  const data = weaponRow(index);
  if(!data) return;
  const weak = consumeSoloWeakness();
  if(!weak && soloLevel('weakness') && !state.soloWeaknessUsed) toast('Слабое место: сначала подтвердите попадание кнопкой «ПОПАЛ»');
  rollDicePool([{sides:6, count:1}], weak, `${data[0] || 'Оружие'}: урон штыка`, {judge: () => ['Лёгкое холодное оружие: SP цели вдвое меньше', weak && `Слабое место +${weak}`].filter(Boolean).join('. ')});
}
function weaponReload(index){
  const data = weaponRow(index);
  if(!data) return;
  const name = data[0] || 'Оружие';
  if(isBlank(data[6])){ toast(`${name}: укажите размер магазина`); return; }
  if(loadedAmmo(data)){
    if((Number(data[2]) || 0) >= Number(data[6])){ toast(`${name}: магазин уже полон`); return; }
    const result = loadFromStock(index, data);
    syncAmmoTable();
    refreshWeaponRows();
    if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
    toast(result.taken ? `${name}: перезаряжено (${result.name}) — ${result.total} / ${result.magazine}, в запасе ${result.left}` : `${name}: нет патронов «${result.name}» в снаряжении`);
    return;
  }
  data[2] = data[6];
  setInput(`weapon${index}_2`, data[2]);
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
  toast(`${name}: перезаряжено (${data[6]})`);
}

let toastTimer;
// Короткое сообщение внизу экрана; с action — кнопка действия (например «Вернуть»).
function toast(message, actionLabel, action){
  const el = $('#toast');
  el.innerHTML = `<span>${esc(message)}</span>${actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  if(action) el.querySelector('button').onclick = () => { el.hidden = true; clearTimeout(toastTimer); action(); };
  toastTimer = setTimeout(()=>{ el.hidden = true; }, action ? 8000 : 4000);
}

// Испытание против смерти: 1d10 + штраф должен быть меньше ТЕЛ, десятка — всегда провал.
// Каждое испытание увеличивает штраф на 1, пока персонаж смертельно ранен; травмы с mods.death тоже входят в штраф.
function rollDeathSave(){
  const body = statValue(8), penalty = deathSaveTotalPenalty();
  rollDicePool([{sides:10,count:1}], penalty, 'Испытание против смерти', {crits:false,
    judge: entry => `${entry.die !== 10 && entry.total < body ? 'УСПЕХ' : 'ПРОВАЛ'} (нужно < ${body}${penalty ? `, штраф +${penalty}` : ''})`});
  state.deathSavePenalty = numeric('deathSavePenalty') + 1;
  updateDerived();
  persist();
}

function renderDicePool(){
  const pool=normalizeDicePool(state.dicePool || [{sides:10,count:1}]);
  $('#dicePool').innerHTML=pool.map((item,index)=>`<div class="dice-pool-row" data-dice-index="${index}">
    <label>ГРАНИ<select class="dice-sides"><option value="10"${item.sides===10?' selected':''}>D10</option><option value="6"${item.sides===6?' selected':''}>D6</option><option value="100"${item.sides===100?' selected':''}>D100</option></select></label>
    <label>КОЛИЧЕСТВО<input class="dice-count" type="number" min="1" max="100" value="${item.count}"></label>
    <button type="button" class="remove-die" aria-label="Удалить тип кубика"${pool.length===1?' disabled':''}>×</button>
  </div>`).join('');
}

function renderRollMode(){
  const mode=state.rollMode || '';
  [['advantageBtn','advantage'],['disadvantageBtn','disadvantage']].forEach(([id,value])=>{
    const button=$(`#${id}`);
    button.classList.toggle('active',mode===value);
    button.setAttribute('aria-pressed',String(mode===value));
  });
}

function readDicePool(){
  return $$('.dice-pool-row').map(row=>({
    sides:Number(row.querySelector('.dice-sides').value),
    count:Number(row.querySelector('.dice-count').value)
  }));
}

function renderDashboardLog(){
  const history = Array.isArray(state.rollHistory) ? state.rollHistory : [];
  $('#dashboardLog').innerHTML = history.length ? history.map(item => `<div><span>${esc(item.time)}</span> ${logLine(item)}</div>`).join('') : t('Пока нет бросков.');
}

function renderDashboard(){
  $('#dashboardGreeting').textContent = state.name ? `ОПЕРАТИВНИК: ${state.name.toUpperCase()}` : 'СИСТЕМА ГОТОВА';
  renderDashboardLog();
  const preview = $('#portraitPreview');
  const hasImage = isSafeImage(state.portrait);
  preview.classList.toggle('has-image', hasImage);
  preview.style.backgroundImage = hasImage ? `url("${state.portrait}")` : '';
}

const rowTypeNames = () => Object.keys(rowTypes);
const saveTouchesRows = key => !key || rowTypeNames().some(type => key === type || key.startsWith(type));
const saveTouchesRole = key => !key || key === 'roleId' || /^role|^net|^med|^rb|^tech|^exec|^law|^fixer|^solo|^media|^cryo/.test(key);
const saveTouchesCombat = key => !key || /^(stat|skill|seriousWound|deathSave|grappled|armor|currentHp|deathSavePenalty)/.test(key)
  || key.startsWith('stat') || key.startsWith('skill') || key.startsWith('cskill') || key.startsWith('armor') || key.startsWith('rolePts_solo');

function syncDomKey(el){
  const key = el.dataset.key;
  const custom = /^cskill(\d+)_(spec|level)$/.exec(key);
  if(custom){
    const item = state.customSkills?.[Number(custom[1])];
    if(item) item[custom[2]] = custom[2] === 'level' ? Number(el.value) || 0 : el.value;
    return;
  }
  if(!structuredKey.test(key)) state[key] = el.type === 'checkbox' ? el.checked : textValue(el);
}

function syncRowTables(){
  Object.entries(rowTypes).forEach(([type, width])=>{
    if(!$(`#${type}Rows`)) return;
    const pattern = new RegExp(`^${type}(\\d+)_(\\d+)$`);
    const rows = [];
    $$(`[data-key^="${type}"]`).forEach(el=>{
      const match = pattern.exec(el.dataset.key);
      if(match) (rows[Number(match[1])] ||= Array(width).fill(''))[Number(match[2])] = el.type === 'checkbox' ? (el.checked ? '1' : '') : textValue(el);
    });
    state[type] = Array.from(rows, data=>data || Array(width).fill(''));
  });
}

function save(changedKey){
  const roleSelectEl = document.querySelector('[data-key="roleId"]');
  // Пустой select роли при правке других полей — рассинхрон DOM; иначе save обнуляет roleId и ломает мультикласс.
  if(changedKey !== 'roleId' && roleSelectEl && !roleSelectEl.value && state.roleId && roles[state.roleId]){
    roleSelectEl.value = state.roleId;
  }
  // Скалярный ключ: синхронизируем только его; строки/полный скан — при таблицах или полном save().
  if(changedKey && !structuredKey.test(changedKey) && !/^cskill/.test(changedKey) && !saveTouchesRows(changedKey)){
    $$(`[data-key="${changedKey}"]`).forEach(syncDomKey);
  } else {
    $$('[data-key]').forEach(syncDomKey);
  }
  if(changedKey === 'currentHp') syncWoundsWithHp();
  if(state.roleId) state.roleRank = Math.max(1, Math.min(ROLE_MAX_RANK, Math.floor(numeric('roleRank')) || ROLE_START_RANK));
  charRoles().slice(1).forEach(id=>{ state[rankKey(id)] = Math.max(1, Math.min(ROLE_MAX_RANK, Math.floor(numeric(rankKey(id))) || 1)); });
  charRoles().forEach(id => clampAllRolePoints(id));
  normalizeStats();
  normalizeSkills(changedKey);
  if(saveTouchesRows(changedKey)){
    syncRowTables();
    refreshWeaponRows();
  }
  if(saveTouchesRole(changedKey)) refreshRolePanel();
  refreshStats();
  updateDerived();
  if(saveTouchesCombat(changedKey)) renderCombatActions();
  $('#dashboardGreeting').textContent = state.name ? `ОПЕРАТИВНИК: ${state.name.toUpperCase()}` : 'СИСТЕМА ГОТОВА';
  persist();
  if(changedKey === 'name') renderSheetSelect();
}

// Выбор типа оружия заполняет навык, урон, магазин (и патроны), ROF и множитель автоогня.
// Название меняется вместе с выбранным типом из книги, если оно пустое или само из книги (первое поле пресета);
// своё название («Militech Avenger») не трогаем.
const isStandardName = (key, presets) => {
  const current = String($(`[data-key="${key}"]`)?.value ?? '').trim();
  return !current || Object.values(presets).some(([presetName])=>presetName === current);
};
function applyWeaponType(key, value){
  const match = /^weapon(\d+)_8$/.exec(key);
  const preset = match && weaponTypes[value];
  if(!preset) return;
  const i = match[1];
  const [name, skill, damage, magazine, rof, multiplier] = preset;
  if(isStandardName(`weapon${i}_0`, weaponTypes)) setInput(`weapon${i}_0`, name);
  setInput(`weapon${i}_5`, skill);
  setInput(`weapon${i}_1`, damage);
  setInput(`weapon${i}_6`, magazine);
  setInput(`weapon${i}_2`, magazine);
  setInput(`weapon${i}_3`, rof);
  setInput(`weapon${i}_7`, multiplier || '');
  // Магазин с модификациями считается от магазина нового типа.
  const modsNow = modsOf(i);
  if(modsNow.base !== ''){ modsNow.base = magazine; setInput(`weapon${i}_11`, JSON.stringify(modsNow)); }
  applyModMagazine(i);
  if(!multiplier) $$(`[data-key="weapon${i}_9"]`).forEach(el=>{ el.checked = false; });
  // Патроны из снаряжения: заряженные вернуть в запас; если калибр подходит — зарядить заново из запаса.
  const data = state.weapon?.[i];
  const before = loadedAmmo(data);
  if(before){
    returnAmmo(before.kind, before.type, Math.max(0, Number(data[2]) || 0));
    data[2] = '0'; data[6] = magazine; data[8] = value;
    if(!(weaponAmmoKinds[value] || []).includes(before.kind)){ data[10] = ''; setInput(`weapon${i}_10`, ''); setInput(`weapon${i}_2`, '0'); }
    else loadFromStock(i, data);
    syncAmmoTable();
  }
}

// Выбор брони из списка заполняет SP и штраф; ручная правка максимума считается сменой брони.
function applyArmorInput(key, value){
  const typeKey = /^armor(Head|Body)Type$/.exec(key);
  if(typeKey){
    const preset = armorPresets[value];
    if(!preset) return;
    const sp = preset[1] + ($(`[data-key="armor${typeKey[1]}Tech"]`)?.checked ? 1 : 0);
    setInput(`armor${typeKey[1]}`, sp);
    setInput(`armor${typeKey[1]}Current`, sp);
    const penalties = ['Head','Body'].map(zone=>armorPresets[$(`[data-key="armor${zone}Type"]`).value]?.[2] || 0);
    setInput('armorPenalty', Math.max(...penalties));
    return;
  }
  // Модернизация Техника «+1 SP» (стр. 148): галочка прибавляет или убирает единицу у максимума и текущего SP зоны.
  const techKey = /^armor(Head|Body)Tech$/.exec(key);
  if(techKey){
    const delta = $(`[data-key="${key}"]`)?.checked ? 1 : -1;
    ['', 'Current'].forEach(part=>{
      const field = $(`[data-key="armor${techKey[1]}${part}"]`);
      if(field && !isBlank(field.value)) setInput(`armor${techKey[1]}${part}`, Math.max(0, (Number(field.value) || 0) + delta));
    });
    return;
  }
  const maxKey = /^armor(Head|Body)$/.exec(key);
  if(maxKey){
    setInput(`armor${maxKey[1]}Current`, value);
    setInput(`armor${maxKey[1]}Type`, '');
  }
}

const zoneName = zone => zone === 'Head' ? 'голову' : 'тело';

// Урон по правилам RED (паритет с damageEnemy на листе Мастера): SP, голова ×2/×3, абляция, травмы, mortal.
// Соло «Отражение»: первое повреждение в раунде меньше на уровень до применения брони (стр. 146).
function applyDamage(){
  const damageRaw = Math.max(0, Math.floor(Number($('#damageInput').value) || 0));
  const crit = $('#damageCrit').checked;
  const kind = $('#damageKind')?.value || '';
  if(!damageRaw && !crit && kind !== 'expansive') return;
  const zone = $('#damageZone').value;
  const head = zone === 'Head';
  const spKey = `armor${zone}Current`;
  const sp = numeric(spKey);
  const deflected = damageRaw > 0 ? consumeSoloDeflection(damageRaw) : 0;
  const damage = Math.max(0, damageRaw - deflected);
  const mult = head ? playerInjuryMods().headMult : 1;
  let {effectiveSp, soft, ablate, through} = resolvePenetratingDamage({damage, sp, kind, headMult: mult});
  const wasMortal = isMortallyWounded();
  const parts = [];
  if(through > 0 && sp > 0 && ablate > 0){
    state[spKey] = Math.max(0, sp - ablate);
    const note = ablationNote(sp, state[spKey], ablate);
    if(note) parts.push(note);
  }
  const injuries = [];
  if(!soft){
    if(crit) injuries.push(rollPlayerInjury(head ? 'Head' : 'Body'));
    if(through > 0 && kind === 'expansive' && !hasPlayerInjury(head ? 'Head' : 'Body', FOREIGN_BODY_INJURY)){
      injuries.push(addPlayerInjury(head ? 'Head' : 'Body', FOREIGN_BODY_INJURY));
    }
    // Смертельно раненый от каждого проникающего удара — новая травма и штраф испытания +1 (стр. 188).
    if(wasMortal && through > 0 && kind !== 'ignore'){
      injuries.push(rollPlayerInjury(head ? 'Head' : 'Body'));
      state.deathSavePenalty = numeric('deathSavePenalty') + 1;
      parts.push('штраф испытания смерти +1');
    }
  }
  if(injuries.length){
    through += CRITICAL_BONUS_DAMAGE * injuries.length;
    parts.push(`крит. травма: ${injuries.join(', ')} (+${CRITICAL_BONUS_DAMAGE * injuries.length})`);
  }
  const hpBefore = numeric('currentHp');
  let after = Math.max(0, hpBefore - through);
  if(soft && after < 1 && through > 0){ after = Math.min(hpBefore, 1); parts.push('без сознания (резина)'); }
  state.currentHp = after;
  syncWoundsWithHp();
  fillStaticInputs();
  updateDerived();
  const status = state.currentHp === 0 ? ' СМЕРТЕЛЬНОЕ РАНЕНИЕ — нужны испытания против смерти.' : isChecked('seriousWound') ? ' ТЯЖЁЛОЕ РАНЕНИЕ.' : '';
  const deflectNote = deflected ? ` Отражение −${deflected} до брони.` : '';
  const text = through > 0
    ? `${damageRaw} в ${zoneName(zone)}${deflectNote} (SP ${effectiveSp}${mult > 2 ? `, голова ×${mult}` : ''}): −${soft ? hpBefore - after : through} ХИТ, ${hpBefore} → ${state.currentHp}/${maxHp()}.${parts.length ? ` ${parts.join('. ')}.` : ''}${status}`
    : `${damageRaw} в ${zoneName(zone)}${deflectNote} остановлено бронёй (SP ${effectiveSp}).`;
  $('#damageResult').textContent = text;
  addHistory({kind:'damage', text});
  $('#damageInput').value = '';
  $('#damageCrit').checked = false;
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
}

function repairArmor(){
  state.armorHeadCurrent = numeric('armorHead');
  state.armorBodyCurrent = numeric('armorBody');
  fillStaticInputs();
  updateDerived();
  $('#damageResult').textContent = `Броня восстановлена: голова SP ${state.armorHeadCurrent}, тело SP ${state.armorBodyCurrent}.`;
  persist();
}

function bindInputs(){
  $$('[data-key]').forEach(el=>{
    if(el.dataset.bound) return;
    el.dataset.bound='true';
    el.addEventListener('input',()=>{
      const key=el.dataset.key;
      if(state.creationMode !== false && /^stat\d+$/.test(key)){
        const next=Math.max(2,Math.min(8,Number(el.value)||2));
        const otherTotal=stats.reduce((sum,_,i)=>sum+(key===`stat${i}`?0:numeric(`stat${i}`)),0);
        if(otherTotal+next>STAT_POOL){
          el.value=state[key];
          return;
        }
      }
      const pts = /^rolePts_(\w+)_(.+)$/.exec(key);
      if(pts){
        // Сначала записать текущее значение в state, чтобы clamp видел остальные поля актуально.
        state[key] = el.value;
        const next = clampRolePointValue(pts[1], pts[2], el.value);
        el.value = next;
        state[key] = next;
      }
      if(el.classList.contains('grow-field')) autoGrow(el);
      applyArmorInput(key, el.value);
      if(key === 'roleId' && el.value && isBlank(state.roleRank)) setInput('roleRank', ROLE_START_RANK);
      applyWeaponType(key, el.value);
      applyWeaponAmmo(key, el.value);
      applyProgramPreset(key, el.value);
      // Включить/выключить усилитель или защиту — NET-действие (стр. 198).
      // Атакующие («Против …»): NET-действие тратит ПОПАДАНИЕ; галочка только готовит программу.
      // Автоотключение (REZ 0 / после атаки) действия не тратит — оно не идёт через этот обработчик.
      const programToggle = /^rolePrograms(\d+)_8$/.exec(key);
      if(programToggle){
        const prog = state.rolePrograms?.[Number(programToggle[1])];
        const name = ($(`[data-key="rolePrograms${programToggle[1]}_0"]`)?.value || programName(prog)).split(' (')[0];
        if(!isAttackProgram(prog) || !el.checked) spendNetAction(`${el.checked ? 'включить' : 'выключить'} программу «${name}»`);
      }
      applyVehiclePreset(key, el.value);
      // Одно и то же значение может быть в нескольких полях (человечность).
      $$(`[data-key="${key}"]`).forEach(other=>{ if(other!==el && other.type!=='checkbox') other.value=el.value; });
      save(key);
      if(key === 'roleId'){
        if(state.extraRoles) state.extraRoles = state.extraRoles.filter(id=>id !== state.roleId);
        renderRolePanel(); bindInputs(); refreshSkills();
      }
      else if(/^weapon\d+_8$/.test(key)){ renderRows('weapon'); bindInputs(); }
      // Смена калибра сбрасывает неподходящий тип — перерисовать и сохранить; остатки видны в списках «Боеприпасы» у оружия.
      else if(/^ammo\d+_[01]$/.test(key)){ renderRows('ammo'); bindInputs(); save(); refreshWeaponRows(); }
      else if(/^ammo\d+_2$/.test(key)) refreshWeaponRows();
      else if(/^role(Team\d+_4|Vehicles\d+_3|Programs\d+_6)$/.test(key)){ renderRows(key.startsWith('roleTeam') ? 'roleTeam' : key.startsWith('roleVehicles') ? 'roleVehicles' : 'rolePrograms'); bindInputs(); refreshRolePanel(); }
      else if(currentRole()) refreshRoleExtras();
    });
    // После окончания ввода показываем значение с учётом ограничений.
    el.addEventListener('change',()=>{
      const key = el.dataset.key;
      if(clampedKey.test(key)) el.value = state[key];
      const ref = keyToRef(key);
      if(ref && ref[0] === 'c') el.value = refLevel(ref);
    });
  });
}

// Лист для печати: отдельная компактная вёрстка из данных персонажа (A4, около трёх страниц),
// собирается перед печатью. Значения выводятся текстом, без полей ввода.
// blank — пустой бланк для заполнения от руки: те же разделы, но без значений.
// ---------- Свёрнутые и скрытые блоки вкладок ----------
// Блок с тёмным заголовком сворачивается стрелкой в заголовке; шестерёнка в шапке вкладки скрывает блоки целиком.
// Это настройка интерфейса, общая для всех персонажей: хранится отдельно от листа и в экспорт не попадает.
const UI_KEY = 'cyberred-ui';
const uiPrefs = (() => {
  try { const v = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); return {collapsed:v.collapsed || {}, hidden:v.hidden || {}}; }
  catch { return {collapsed:{}, hidden:{}}; }
})();
const saveUiPrefs = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(uiPrefs)); } catch {} };
const PANEL_SELECTOR = '.panel, .stats-card';
const panelHead = panel => panel.querySelector(':scope > .section-title');
const panelTitle = panel => [...(panelHead(panel)?.childNodes || [])].filter(node=>node.nodeType === 3).map(node=>node.textContent).join(' ').replace(/\s+/g, ' ').trim();
const tabPanels = tab => [...tab.querySelectorAll(PANEL_SELECTOR)].filter(panel=>panelHead(panel) && panelTitle(panel) && !panel.parentElement.closest(PANEL_SELECTOR));
function setupPanels(){
  $$('.tab-panel').forEach(tab=>{
    const panels = tabPanels(tab);
    panels.forEach(panel=>{
      const key = `${tab.id}:${panelTitle(panel)}`, head = panelHead(panel);
      panel.dataset.panelKey = key;
      if(!head.querySelector('.panel-collapse')) head.insertAdjacentHTML('afterbegin', '<button type="button" class="panel-collapse" data-panel-collapse title="Свернуть или развернуть блок"></button>');
      const collapsed = !!uiPrefs.collapsed[key];
      panel.classList.toggle('is-collapsed', collapsed);
      head.querySelector('.panel-collapse').setAttribute('aria-expanded', String(!collapsed));
      panel.hidden = !!uiPrefs.hidden[key];
    });
    const heading = tab.querySelector(':scope > .page-heading');
    if(heading && panels.length > 1 && !heading.querySelector('.panel-gear')) heading.insertAdjacentHTML('beforeend', '<div class="panel-gear"><button type="button" class="panel-gear-btn" data-panel-gear title="Какие блоки показывать на вкладке" aria-haspopup="true" aria-expanded="false">⚙</button><div class="panel-gear-menu" hidden></div></div>');
    const hiddenCount = panels.filter(panel=>panel.hidden).length;
    const gear = heading?.querySelector('.panel-gear-btn');
    if(gear) gear.dataset.count = hiddenCount ? String(hiddenCount) : '';
  });
}
function renderPanelMenu(tab){
  const menu = tab.querySelector('.panel-gear-menu');
  if(!menu) return;
  menu.innerHTML = `<div class="panel-gear-title">БЛОКИ ВКЛАДКИ</div>${tabPanels(tab).map(panel=>`<label><input type="checkbox" data-panel-show="${esc(panel.dataset.panelKey)}"${panel.hidden ? '' : ' checked'}> ${esc(panelTitle(panel))}</label>`).join('')}
    <div class="panel-gear-actions"><button type="button" class="weapon-btn" data-panel-all="show">ПОКАЗАТЬ ВСЕ</button><button type="button" class="weapon-btn" data-panel-all="expand">РАЗВЕРНУТЬ ВСЕ</button></div>`;
}
function closePanelMenus(except){
  $$('.panel-gear-menu').forEach(menu=>{ if(menu !== except){ menu.hidden = true; menu.previousElementSibling?.setAttribute('aria-expanded', 'false'); } });
}
function panelClick(e){
  const gear = e.target.closest('[data-panel-gear]');
  if(gear){
    const tab = gear.closest('.tab-panel'), menu = gear.nextElementSibling;
    closePanelMenus(menu);
    if(menu.hidden){ renderPanelMenu(tab); menu.hidden = false; gear.setAttribute('aria-expanded', 'true'); }
    else { menu.hidden = true; gear.setAttribute('aria-expanded', 'false'); }
    return;
  }
  const all = e.target.closest('[data-panel-all]');
  if(all){
    const tab = all.closest('.tab-panel');
    tabPanels(tab).forEach(panel=>{ delete uiPrefs[all.dataset.panelAll === 'show' ? 'hidden' : 'collapsed'][panel.dataset.panelKey]; });
    saveUiPrefs(); setupPanels(); renderPanelMenu(tab);
    return;
  }
  if(!e.target.closest('.panel-gear')) closePanelMenus();
  // Свернуть: стрелка или пустое место заголовка — не кнопки, поля и ссылки в нём.
  const head = e.target.closest('.section-title');
  const panel = head?.parentElement;
  if(!head || !panel?.dataset.panelKey || panelHead(panel) !== head) return;
  if(!e.target.closest('[data-panel-collapse]') && e.target.closest('button, input, select, textarea, label, a')) return;
  const key = panel.dataset.panelKey;
  if(panel.classList.contains('is-collapsed')) delete uiPrefs.collapsed[key]; else uiPrefs.collapsed[key] = true;
  saveUiPrefs(); setupPanels();
}
document.addEventListener('click', panelClick);
document.addEventListener('change', e=>{
  const key = e.target.dataset?.panelShow;
  if(key === undefined) return;
  if(e.target.checked) delete uiPrefs.hidden[key]; else uiPrefs.hidden[key] = true;
  saveUiPrefs(); setupPanels();
});
document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closePanelMenus(); });

function render(){
  renderSheetSelect();
  normalizeSkills();
  renderStats();renderSkills();renderLife();renderRolePanel();renderCombatActions();Object.keys(rowTypes).forEach(type=>renderRows(type));renderCyber();renderDashboard();
  setupPanels();
  $('#creationMode').checked=state.creationMode !== false;
  renderDicePool();
  renderRollMode();
  fillStaticInputs();
  bindInputs();
  updateDerived();
}

function switchTab(tabName){
  flushPersist();
  $$('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));
  const tab=$(`.tab[data-tab="${tabName}"]`);
  const panel=document.getElementById(tabName);
  if(tab && panel){tab.classList.add('active');panel.classList.add('active');}
  autoGrowAll();
}

// Формулы в заметках привязаны к номеру строки: при удалении и возврате строки сдвигаем их.
// dir = −1 — строка удалена (возвращаются её отметки), dir = +1 — строка вставлена обратно.
function shiftFormulaMarks(type, index, dir = -1){
  const pattern = new RegExp(`^${type}(\\d+)_(\\d+)$`);
  const removed = {};
  state.formulaMarks = Object.entries(state.formulaMarks || {}).reduce((next,[key,value])=>{
    const match = pattern.exec(key);
    if(!match){ next[key] = value; return next; }
    const i = Number(match[1]);
    if(dir < 0 && i === index){ removed[match[2]] = value; return next; }
    const shifted = dir < 0 ? (i > index ? i - 1 : i) : (i >= index ? i + 1 : i);
    next[`${type}${shifted}_${match[2]}`] = value;
    return next;
  },{});
  return removed;
}

function removeRow(type, index){
  if(!state[type]?.length){ render(); save(); return; }
  const [removed] = state[type].splice(index, 1);
  const marks = shiftFormulaMarks(type, index);
  render(); save();
  toast('Строка удалена', 'Вернуть', ()=>{
    // Пустая строка-заготовка, появившаяся после удаления последней строки, не нужна.
    state[type] = (state[type] || []).filter(row=>row.some(cell=>!isBlank(cell)));
    state[type].splice(Math.min(index, state[type].length), 0, removed);
    shiftFormulaMarks(type, index, 1);
    Object.entries(marks).forEach(([j,value])=>{ state.formulaMarks[`${type}${index}_${j}`] = value; });
    render(); save();
  });
}

function loadPortrait(file){
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    // Уменьшаем портрет, чтобы не упереться в лимит localStorage (~5 МБ).
    const scale = Math.min(1, 512 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const previous = state.portrait;
    state.portrait = canvas.toDataURL('image/jpeg', 0.85);
    if(!persist()) state.portrait = previous;
    renderDashboard();
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Не удалось загрузить изображение.'); };
  img.src = url;
}

$$('[data-armor-zone]').forEach(select=>{
  select.innerHTML = `<option value="">${t('Своя / нет')}</option>` + Object.entries(armorPresets).map(([id,[name,sp,penalty]])=>`<option value="${id}">${esc(term(name))} — SP ${sp}${penalty ? `, −${penalty}` : ''}</option>`).join('');
});
$('#roleSelect').innerHTML = `<option value="">${t('— не выбрана —')}</option>` + Object.entries(roles).map(([id,item])=>`<option value="${id}">${esc(term(item.name))}</option>`).join('');
$$('[data-key]').forEach(el=>{ el.dataset.static='true'; });
$('#applyDamage').onclick=applyDamage;
$('#repairArmor').onclick=repairArmor;
$('#damageInput').onkeydown=e=>{ if(e.key==='Enter') applyDamage(); };
document.addEventListener('change', e=>{ if(e.target.id === 'multiclassPick') refreshRolePanel(); });
// Окно модификаций оружия: свои поля без data-key, данные идут в скрытую колонку 11 строки оружия.
$('#modDialog')?.addEventListener('click', e=>{ if(e.target === e.currentTarget) e.currentTarget.close(); else modDialogEvent(e); });
$('#modDialog')?.addEventListener('change', modDialogEvent);
$('#modDialog')?.addEventListener('input', modDialogEvent);
// Усиления программы: список строк «цель + величина» в карточке.
document.addEventListener('input', e=>{
  const i = e.target.dataset.boostTarget ?? e.target.dataset.boostAmount;
  if(i !== undefined) setProgramBoosts(Number(i), boostListFromCard(i), false);
});
document.addEventListener('click', e=>{
  const add = e.target.closest('[data-boost-add]'), del = e.target.closest('[data-boost-del]');
  if(add){ const i = add.dataset.boostAdd; setProgramBoosts(Number(i), [...boostListFromCard(i), ['all', 2]], true); }
  if(del){ const i = del.dataset.boostDel; setProgramBoosts(Number(i), boostListFromCard(i).filter((_, b)=>String(b) !== del.dataset.b), true); }
});
$('#creationMode').onchange=()=>{state.creationMode=$('#creationMode').checked;save();render();};

document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab');
  if(tab) switchTab(tab.dataset.tab);
  const add=e.target.closest('[data-add]');
  if(add){
    const type=add.dataset.add;
    // Пустой лист уже показывает одну строку по умолчанию.
    if(!state[type]?.length) state[type]=[[]];
    state[type].push([]);
    render();save();
  }
  const rem=e.target.closest('[data-remove]');
  if(rem) removeRow(rem.dataset.remove, Number(rem.dataset.index));
  const pack=e.target.closest('[data-ammo-pack]');
  if(pack){
    const row = state.ammo?.[Number(pack.dataset.ammoPack)];
    if(row){ row[2] = String((Number(row[2]) || 0) + (ammoCalibers[row[0]]?.[1] ?? 10)); syncAmmoTable(); save(); refreshWeaponRows(); }
  }
  const weapon=e.target.closest('[data-weapon-attack],[data-weapon-damage],[data-weapon-reload],[data-weapon-suppress]');
  if(weapon){
    const {weaponAttack:attack, weaponDamage:damage, weaponReload:reload, weaponSuppress:suppress} = weapon.dataset;
    if(suppress !== undefined) weaponSuppress(Number(suppress));
    if(attack !== undefined) weaponAttack(Number(attack));
    if(damage !== undefined) weaponDamage(Number(damage));
    if(reload !== undefined) weaponReload(Number(reload));
  }
  const mods = e.target.closest('[data-weapon-mods]');
  if(mods) openModDialog(Number(mods.dataset.weaponMods));
  const bayonet = e.target.closest('[data-weapon-bayonet]'), bayonetHit = e.target.closest('[data-weapon-bayonet-damage]');
  if(bayonet) bayonetAttack(Number(bayonet.dataset.weaponBayonet));
  if(bayonetHit) bayonetDamage(Number(bayonetHit.dataset.weaponBayonetDamage));
  const skillRoll=e.target.closest('[data-roll-skill]');
  if(skillRoll) rollSkill(skillRoll.dataset.rollSkill);
  const interfaceRoll=e.target.closest('[data-interface]');
  if(interfaceRoll){ const ability = currentRole()?.interfaceAbilities?.find(([key])=>key === interfaceRoll.dataset.interface); if(ability && ability[0] !== 'scanner') spendNetAction(ability[1]); if(ability) rollRoleAbility(ability[0] === 'zap' ? 'Разряд: попадание' : `Интерфейс: ${ability[1]}`, programBoosts(ability[0])); }
  const program=e.target.closest('[data-program-attack],[data-program-damage],[data-program-rez]');
  if(program){
    const {programAttack:attack, programDamage:damage, programRez:rez} = program.dataset;
    if(attack !== undefined) programAttack(Number(attack));
    if(damage !== undefined) programDamage(Number(damage), program.dataset.target);
    if(rez !== undefined) programRestore(Number(rez));
  }
  if(e.target.closest('[data-brain-damage]')) applyBrainDamage();
  const roleButton=e.target.closest('[data-role-action]');
  if(roleButton) roleAction(roleButton.dataset.roleAction, {...roleButton.dataset, index:Number(roleButton.dataset.index)});
  if(e.target.closest('[data-solo-new-round]')) resetSoloRound();
  if(e.target.closest('[data-solo-reallocate]')) reallocateSoloPoints();
  const netPip = e.target.closest('[data-net-pip]');
  if(netPip){ const k = Number(netPip.dataset.netPip); setNetUsed((Number(state.netUsed) || 0) === k + 1 ? k : k + 1); }
  if(e.target.closest('[data-net-reset]')) setNetUsed(0);
  const netExtra = e.target.closest('[data-net-extra]');
  if(netExtra){ state.netExtra = (Number(state.netExtra) || 0) + Number(netExtra.dataset.netExtra); refreshRolePanel(); if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now(); }
  if(e.target.closest('[data-zap-damage]')) rollDicePool([{sides:6,count:1}], 0, 'Разряд: урон', {crits:false});
  if(e.target.closest('[data-net-speed]')) rollNetSpeed();
  if(e.target.closest('[data-role-roll]')) rollRoleAbility(currentRole()?.roll || 'Способность роли');
  if(e.target.closest('[data-role-upgrade]')) upgradeRole();
  const roleView = e.target.closest('[data-role-view]');
  if(roleView && roleView.dataset.roleView !== viewRoleId()){ state.roleView = roleView.dataset.roleView; renderRolePanel(); bindInputs(); save(); }
  const roleDrop = e.target.closest('[data-role-drop]');
  if(roleDrop) dropRole(roleDrop.dataset.roleDrop);
  if(e.target.closest('[data-multiclass]')) takeRole($('#multiclassPick')?.value);
  const upgrade=e.target.closest('[data-upgrade]');
  if(upgrade) upgradeSkill(upgrade.dataset.upgrade);
  const addSkill=e.target.closest('[data-add-variant]');
  if(addSkill) addVariant(addSkill.dataset.addVariant);
  const removeSkill=e.target.closest('[data-remove-skill]');
  if(removeSkill) removeVariant(Number(removeSkill.dataset.removeSkill));
  const formula=e.target.closest('[data-formula]');
  if(formula) rollFormula(parseFormula(formula.dataset.formula));
  const filter=e.target.closest('.skill-filter');
  if(filter) pickSkillCategory(filter);
  if(e.target.closest('#skillFilterToggle')) toggleSkillFilters(!$('.skill-search').classList.contains('is-open'));
});
// Галочки улучшений транспорта собираются в строку (свои улучшения, вписанные текстом раньше, сохраняются).
document.addEventListener('change',e=>{
  const box = e.target.closest('[data-vehicle-upgrade]');
  if(!box) return;
  const i = box.dataset.vehicleUpgrade;
  const known = nomadUpgrades.map(([name])=>name);
  const custom = vehicleUpgradeList(state.roleVehicles?.[i]).filter(name=>!known.includes(name));
  const checked = $$(`[data-vehicle-upgrade="${i}"]:checked`).map(el=>el.value);
  setInput(`roleVehicles${i}_1`, [...checked, ...custom].join('; '));
  save(`roleVehicles${i}_1`);
});
// Поля СТАТов на карточке подчинённого собираются в строку роли.
document.addEventListener('input',e=>{
  const stat = e.target.closest('[data-team-stat]');
  if(!stat) return;
  const i = stat.dataset.teamStat;
  const values = $$(`[data-team-stat="${i}"]`).map(el=>el.value.trim());
  setInput(`roleTeam${i}_5`, formatTeamStats(values));
  save(`roleTeam${i}_5`);
});
document.addEventListener('contextmenu',e=>{
  const input=e.target.closest('.formula-editor');
  const selection=window.getSelection();
  if(!input || !selection || selection.isCollapsed || !input.contains(selection.anchorNode)) return;
  const selected=selection.toString();
  const formula=parseFormula(selected);
  if(!formula) return;
  e.preventDefault();
  const marker=document.createElement('span');
  marker.className='formula-marked';
  marker.dataset.formula=selected;
  try { selection.getRangeAt(0).surroundContents(marker); } catch { return; }
  const key=input.dataset.key;
  const marks=state.formulaMarks || (state.formulaMarks={});
  marks[key]=Array.from(new Set([...(marks[key] || []),selected]));
  save();
});
$('#diceToggle').onclick=()=>{
  $('#diceDrawer').classList.toggle('open');
  if($('#diceDrawer').classList.contains('open')) clearAutofireRollUi();
};
$('#diceClose').onclick=()=>$('#diceDrawer').classList.remove('open');
$('#addDie').onclick=()=>{state.dicePool=[...readDicePool(),{sides:6,count:1}];renderDicePool();persist();};
$('#dicePool').oninput=()=>{state.dicePool=readDicePool();persist();};
$('#dicePool').onclick=e=>{const remove=e.target.closest('.remove-die');if(!remove)return;const pool=readDicePool();pool.splice(Number(remove.closest('.dice-pool-row').dataset.diceIndex),1);state.dicePool=pool;renderDicePool();persist();};
$('#diceResult').addEventListener('click', e=>{
  if(e.target.closest('[data-roll-luck]')) addLuckToRoll();
  if(e.target.closest('[data-roll-hit]')){
    const onHit = lastRoll.onHit;
    lastRoll.onMiss = null;
    lastRoll.onHit = null;
    onHit?.();
    showRollResult();
  }
  const miss = e.target.closest('[data-roll-miss]');
  if(miss){ const onMiss = lastRoll.onMiss; lastRoll.onMiss = null; lastRoll.onHit = null; onMiss?.(); showRollResult(); }
});
$('#diceResult').addEventListener('input', e=>{
  if(e.target.id === 'autofireAfter') applyAutofireMult();
});
$('#rollDice').onclick=()=>{
  const pool=readDicePool();
  state.dicePool=pool;
  rollDicePool(pool,Number($('#diceModifier').value)||0,'Свободный бросок',{luck:true});
};
$('#initiativeBtn').onclick=rollInitiative;
$('#cyberware')?.addEventListener('click', handleCyberClick);
$('#cyberware')?.addEventListener('change', handleCyberChange);
$('#cyberware')?.addEventListener('input', e=>{
  const filter = e.target.closest('[data-cyber-filter]');
  if(filter){
    const q = filter.value.trim().toLowerCase();
    $$(`[data-cyber-picker="${filter.dataset.cyberFilter}"] .cyber-pick, [data-cyber-picker="${filter.dataset.cyberFilter}"] .cyber-pick.is-blocked`).forEach(el=>{
      const text = el.textContent.toLowerCase();
      el.hidden = Boolean(q) && !text.includes(q);
    });
    return;
  }
  const field = e.target.closest('[data-cyber-field]');
  if(!field || field.dataset.cyberField === 'hl') return;
  const found = findCyberPiece(field.dataset.cyberKey, field.dataset.cyberId);
  if(!found) return;
  found.piece[field.dataset.cyberField] = field.value;
  if(field.classList.contains('grow-field')) autoGrow(field);
  clearTimeout(handleCyberChange._t);
  handleCyberChange._t = setTimeout(()=>{ if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now(); }, 300);
});
$('#combatActions')?.addEventListener('click', combatClick);
$('#combatActions')?.addEventListener('change', e=>{
  if(!e.target.matches('[data-combat-grapple]')) return;
  state.grappled = e.target.checked;
  refreshSkills(); renderCombatActions();
  if(persist()) $('#saveStatus').textContent = t('СОХРАНЕНО') + ' ' + now();
});
// Удача восстанавливается до значения УДЧ в начале каждой игровой сессии (стр. 130).
$('#restoreLuck').onclick=()=>{state.luckCurrent=numeric('stat6');setInput('luckCurrent',state.luckCurrent);persist();updateDerived();toast(`Удача восстановлена: ${state.luckCurrent}`);};
$('#advantageBtn').onclick=()=>{state.rollMode=state.rollMode==='advantage'?'':'advantage';renderRollMode();persist();};
$('#disadvantageBtn').onclick=()=>{state.rollMode=state.rollMode==='disadvantage'?'':'disadvantage';renderRollMode();persist();};
$('#deathSaveButton').onclick=rollDeathSave;
$('#skillSearch').oninput=()=>{renderSkills();bindInputs();};
$('#clearLog').onclick=()=>{state.rollHistory=[];persist();renderDashboardLog();$('#diceLog').innerHTML='';};
$('#portraitInput').onchange=e=>{const file=e.target.files[0];if(file)loadPortrait(file);e.target.value='';};
$('#resetBtn').onclick=()=>{if(confirm(t('Очистить лист текущего персонажа?'))){state=migrate({});clearTransient();render();persist(true);$('#saveStatus').textContent = t('ЛИСТ ОЧИЩЕН');}};
$('#sheetSelect').onchange=e=>switchSheet(e.target.value);
$('#newSheet').onclick=openNewSheetDialog;
$('#newSheetDialog')?.addEventListener('submit', handleNewSheetDialog);
$('#deleteSheet').onclick=deleteSheet;
$('#printBtn').onclick=()=>printSheet(false);
$('#printBlankBtn').onclick=()=>printSheet(true);
// Ctrl+P печатает заполненный лист; после печати режим бланка сбрасывается.
window.addEventListener('beforeprint', ()=>renderPrintSheet());
window.addEventListener('afterprint', ()=>{ printBlank = false; });
$('#exportBtn').onclick=()=>{flushPersist();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.name||'cyberpunk-red-sheet').replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();URL.revokeObjectURL(a.href);};
$('#importInput').onchange=e=>{
  const file=e.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    let data;
    try{data=JSON.parse(reader.result);}catch{data=null;}
    if(!data || typeof data!=='object' || Array.isArray(data)){toast('Не удалось прочитать JSON-файл.');return;}
    // Импорт добавляет нового персонажа, а не перезаписывает текущего.
    createSheet(data);
    save();
    toast(`${t('Импортирован персонаж «')}${state.name || t('Без имени')}${t('»')}`);
  };
  reader.readAsText(file);
  e.target.value='';
};
render();
window.addEventListener('resize', autoGrowAll);
