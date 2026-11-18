// Броски кубиков — вынесено из player/app.js. Глобалы: state, helpers из app/shared.
function normalizeDicePool(pool){
  const normalized=[];
  let totalCount=0;
  (Array.isArray(pool) ? pool : []).forEach(item=>{
    const sides=Math.max(1,Math.min(1000,Number(item?.sides)||10));
    const count=Math.max(1,Math.min(100,Number(item?.count)||1));
    const allowed=Math.min(count,100-totalCount);
    if(allowed>0){normalized.push({sides,count:allowed});totalCount+=allowed;}
  });
  return normalized.length ? normalized : [{sides:10,count:1}];
}

function rollDie(sides){
  const first=Math.floor(Math.random()*sides)+1;
  if(state.rollMode !== 'advantage' && state.rollMode !== 'disadvantage') return first;
  const second=Math.floor(Math.random()*sides)+1;
  return state.rollMode === 'advantage' ? Math.max(first,second) : Math.min(first,second);
}

function rollModeLabel(){
  return state.rollMode === 'advantage' ? 'ПРЕИМУЩЕСТВО' : state.rollMode === 'disadvantage' ? 'ПОМЕХА' : '';
}

const signed = value => value >= 0 ? String(value) : '−'+Math.abs(value);
const critPart = item => item.critical && Number(item.critExtra) ? ` ${Number(item.die) === 10 ? '+' : '−'} крит ${Number(item.critExtra)}` : '';
const diceText = item => (item.diceDetails ? item.diceDetails.map(die=>`D${Number(die.sides)}: ${Number(die.value)}`).join(' + ') : (Array.isArray(item.dice) ? item.dice.map(Number).join(' + ') : Number(item.die))) + critPart(item);
const critText = item => item.critical ? ` <em>${Number(item.die) === 10 ? 'КРИТИЧЕСКИЙ УСПЕХ' : 'КРИТИЧЕСКИЙ ПРОВАЛ'}</em>` : '';
const rollTotalText = item => item.autofireMult
  ? `${signed(Number(item.total))} ×${item.autofireMult} = ${signed(Number(item.total) * item.autofireMult)}`
  : signed(Number(item.total));
const logLine = item => item.kind === 'damage'
  ? `<b class="log-tag">УРОН</b> ${esc(item.text)}`
  : `${esc(item.label)}${item.mode ? ` [${esc(item.mode)}]` : ''}: <b>${diceText(item)}</b>${Number(item.modifier) ? ` + ${signed(Number(item.modifier))}` : ''}${item.luck ? ` + удача ${item.luck}` : ''} = <strong>${rollTotalText(item)}</strong>${critText(item)}${item.note ? ` <em>${esc(item.note)}</em>` : ''}`;

function addHistory(entry){
  state.rollHistory = [{...entry, time:now()}, ...(state.rollHistory || [])].slice(0, 30);
  renderDashboardLog();
}

// crits: по правилам RED (стр. 130) 10 на 1d10 — критический успех: бросается ещё 1d10 и прибавляется;
// 1 — критический провал: ещё 1d10 вычитается. Повторная 10 или 1 на втором кубике нового крита не даёт.
// attack — бросок атаки: «Умелое обращение» Соло отменяет критический провал только на атаках (стр. 146).
// luck — к результату можно добавить Удачу кнопкой в окне кубика; onMiss/onHit — кнопки «ПОПАЛ / НЕ ПОПАЛ»
// (умные патроны: «НЕ ПОПАЛ» бросает второй шанс; Соло «Слабое место»: «ПОПАЛ» вооружает бонус к урону).
let lastRoll = null;
function rollDicePool(pool, modifier, label='Свободный бросок', {crits=true, judge, attack=false, luck=false, onMiss, onHit, autofireMax=0}={}){
  const dicePool=normalizeDicePool(pool);
  const diceDetails=dicePool.flatMap(({sides,count})=>Array.from({length:count},()=>({sides,value:rollDie(sides)})));
  const die = diceDetails.reduce((sum,item)=>sum+item.value,0);
  const fumbleRecovered = crits && attack && diceDetails.length === 1 && diceDetails[0].sides === 10 && die === 1 && soloLevel('fumble') > 0;
  const critical = crits && diceDetails.length === 1 && diceDetails[0].sides === 10 && (die === 10 || (die === 1 && !fumbleRecovered));
  const critExtra = critical ? d(10) : 0;
  const total = die + modifier + (die === 10 ? critExtra : -critExtra);
  const entry = {label, die, diceDetails, modifier, total, critical, critExtra, mode:rollModeLabel()};
  const fumbleNote = fumbleRecovered ? 'единица не критический провал (Умелое обращение)' : '';
  const noteFor = item => [judge?.(item), fumbleNote].filter(Boolean).join('. ');
  entry.note = noteFor(entry);
  addHistory(entry);
  persist();
  lastRoll = {entry, noteFor, luck, onMiss, onHit, history:state.rollHistory[0], autofireMax: Number(autofireMax) > 0 ? Number(autofireMax) : 0};
  showRollResult();
  $('#diceLog').insertAdjacentHTML('afterbegin', `<div>${logLine(entry)}</div>`);
  $('#diceDrawer').classList.add('open');
  return entry;
}
function showRollResult(){
  const {entry, luck, onMiss, onHit, autofireMax} = lastRoll;
  const {diceDetails, critical, critExtra, die, total} = entry;
  const critDie = critical ? `<span class="formula-die is-crit" aria-label="Кубик крита">${die === 10 ? '+' : '−'}${critExtra}<small>КРИТ</small></span>` : '';
  const luckDie = entry.luck ? `<span class="formula-die is-luck" aria-label="Удача">+${entry.luck}<small>УДЧ</small></span>` : '';
  const left = numeric('luckCurrent');
  const luckControls = luck ? `<div class="roll-actions">${left > 0
    ? `<label>УДАЧА<input id="luckAfter" type="number" min="1" max="${left}" value="1"></label><button type="button" class="weapon-btn" data-roll-luck>+ К РЕЗУЛЬТАТУ</button><small>осталось ${left}</small>`
    : '<small>Удачи не осталось</small>'}</div>` : '';
  const hitControls = (onMiss || onHit) ? `<div class="roll-actions"><button type="button" class="weapon-btn" data-roll-hit>ПОПАЛ</button><button type="button" class="weapon-btn" data-roll-miss title="${onMiss ? 'Промах на 4 или меньше: второй шанс 1d10 + 10' : 'Промах — Слабое место не сработает'}">НЕ ПОПАЛ</button></div>` : '';
  const showAutofire = autofireMax > 0 && /урон очереди/i.test(entry.label || '');
  const autofireControls = showAutofire ? `<div class="roll-actions"><label title="Множитель = на сколько атака превысила DV цели, не больше ×${autofireMax}">× ОТ ДМ<input id="autofireAfter" type="number" min="1" max="${autofireMax}" value="${entry.autofireMult || ''}" placeholder="?"></label><small>макс. ×${autofireMax}</small></div>` : '';
  $('#diceResult').innerHTML = `<div class="formula-roll-values">${diceDetails.map((item,index)=>`<span class="formula-die${critical && index === 0 ? ' is-crit-source' : ''}" aria-label="D${item.sides}, кубик ${index + 1}">${item.value}<small>D${item.sides}</small></span>`).join('')}${critDie}${luckDie}</div><strong class="formula-roll-total" id="rollTotal">${showAutofire ? autofireTotalLabel(entry) : `СУММА: ${signed(total)}`}</strong>${critText(entry) || entry.note ? `<div class="roll-note" id="rollNote">${critText(entry)}${entry.note ? `<span>${esc(entry.note)}</span>` : ''}</div>` : ''}${luckControls}${hitControls}${autofireControls}`;
  if(showAutofire) $('#autofireAfter')?.focus();
}
// Убрать поле «× ОТ ДМ», если открыли обычный кубик или сделали другой бросок.
function clearAutofireRollUi(){
  if(!lastRoll?.autofireMax) return;
  lastRoll.autofireMax = 0;
  if(lastRoll.entry) showRollResult();
}
const autofireTotalLabel = entry => entry.autofireMult
  ? `СУММА: ${signed(entry.total)} ×${entry.autofireMult} = ${signed(entry.total * entry.autofireMult)}`
  : `СУММА: ${signed(entry.total)}`;
function syncAutofireResult(){
  const {entry} = lastRoll;
  const totalEl = $('#rollTotal');
  if(totalEl) totalEl.textContent = autofireTotalLabel(entry);
  const noteEl = $('#rollNote');
  if(noteEl) noteEl.innerHTML = `${critText(entry)}${entry.note ? `<span>${esc(entry.note)}</span>` : ''}`;
  Object.assign(lastRoll.history, entry);
  persist();
  renderDashboardLog();
  const logItem = $('#diceLog').firstElementChild;
  if(logItem) logItem.innerHTML = logLine(entry);
}
// Удача добавляется к уже выпавшему результату и списывается с текущей УДЧ.
function addLuckToRoll(){
  if(!lastRoll?.luck) return;
  const spend = Math.max(0, Math.min(Math.floor(Number($('#luckAfter')?.value) || 0), numeric('luckCurrent')));
  if(!spend) return;
  const {entry} = lastRoll;
  state.luckCurrent = numeric('luckCurrent') - spend;
  setInput('luckCurrent', state.luckCurrent);
  entry.luck = (entry.luck || 0) + spend;
  entry.total += spend;
  entry.note = lastRoll.noteFor(entry);
  Object.assign(lastRoll.history, entry);
  persist();
  renderDashboardLog();
  updateDerived();
  const logItem = $('#diceLog').firstElementChild;
  if(logItem) logItem.innerHTML = logLine(entry);
  showRollResult();
}
// Множитель автоогня от мастера: урон = 2d6 × (превышение DV), не больше множителя оружия.
// Поле только после урона очереди; итог пересчитывается сразу при вводе.
function applyAutofireMult(){
  if(!lastRoll?.autofireMax) return;
  const input = $('#autofireAfter');
  if(!input) return;
  const raw = Math.floor(Number(input.value));
  const {entry} = lastRoll;
  if(!Number.isFinite(raw) || raw < 1){
    if(!entry.autofireMult) return;
    delete entry.autofireMult;
    entry.note = lastRoll.noteFor(entry);
    syncAutofireResult();
    return;
  }
  const mult = Math.min(lastRoll.autofireMax, raw);
  if(Number(input.value) > lastRoll.autofireMax) input.value = String(mult);
  if(entry.autofireMult === mult) return;
  entry.autofireMult = mult;
  entry.note = lastRoll.noteFor(entry);
  syncAutofireResult();
}

function parseFormula(value){
  const match = String(value).trim().match(/^(\d+)\s*[dд]\s*(\d+)$/i);
  if(!match) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  return count > 0 && count <= 100 && sides > 0 && sides <= 1000 ? {count,sides} : null;
}

function rollFormula(formula){
  if(!formula) return;
  rollDicePool([formula], 0, `${formula.count}d${formula.sides}`, {crits:false});
}

const withNotes = (label, notes) => notes.filter(Boolean).length ? `${label} (${notes.filter(Boolean).join(', ')})` : label;

