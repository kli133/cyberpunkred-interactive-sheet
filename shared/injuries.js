// Критические травмы (стр. 187–188): разбор строк и сумма mods из injuryRules (shared/data.js).
const injuryZoneLabels = {Body:'тело', Head:'голова'};
const injuryZoneLabel = zone => typeof term === 'function' ? term(injuryZoneLabels[zone] || zone) : (injuryZoneLabels[zone] || zone);
const plainInjuryText = text => String(text || '').toLowerCase().replace(/ё/g, 'е').trim();

function parseInjuryLine(line){
  const p = plainInjuryText(line);
  const zones = /\(голов/.test(p) ? ['Head', 'Body'] : ['Body', 'Head'];
  for(const zone of zones){
    const k = criticalInjuries[zone].findIndex((name, idx)=>
      p.startsWith(plainInjuryText(name)) || p.startsWith(plainInjuryText(injuryRules[zone][idx].old)));
    if(k >= 0) return {line, zone, k, name:criticalInjuries[zone][k], rule:injuryRules[zone][k]};
  }
  return {line};
}

function aggregateInjuryMods(injuries){
  const total = {all:0, ranged:0, melee:0, move:0, death:0, noDodge:false, headMult:2};
  injuries.forEach(({rule})=>{
    if(!rule) return;
    const m = rule.mods || {};
    ['all','ranged','melee','move','death'].forEach(k=>{ total[k] += Number(m[k]) || 0; });
    if(m.noDodge) total.noDodge = true;
    if(m.headMult) total.headMult = Math.max(total.headMult, m.headMult);
  });
  return total;
}

function formatInjuryLine(zone, k, rolled){
  // Keep Russian injury names in saved text so parsers stay stable; UI can translate via term() when shown.
  return `${criticalInjuries[zone][k]} (${injuryZoneLabels[zone]}${rolled ? `, 2d6 = ${rolled}` : ''})`;
}

// hasInjury(zone, k) / addInjury(zone, k, rolled) — колбэки листа (игрок или противник).
function rollUniqueInjury(hasInjury, addInjury, zone){
  for(let tries = 0; tries < 50; tries++){
    const r = d(6) + d(6);
    if(!hasInjury(zone, r - 2)) return addInjury(zone, r - 2, r);
  }
  return 'все травмы этой зоны уже есть';
}
