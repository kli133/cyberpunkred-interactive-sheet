// Общий расчёт пробития брони (Player applyDamage / Dm damageEnemy).
// kind: '' | melee | ap | ap11 | ignore | nonlethal | rubber | expansive | incendiary
function resolvePenetratingDamage({damage, sp, kind = '', headMult = 1}){
  const effectiveSp = kind === 'melee' ? Math.ceil(sp / 2)
    : kind === 'ignore' || (kind === 'ap11' && sp < 11) ? 0
    : sp;
  const soft = kind === 'rubber' || kind === 'nonlethal';
  const ablate = typeof armorAblationLoss === 'function' ? armorAblationLoss(kind) : 1;
  const through = Math.max(0, (Number(damage) || 0) - effectiveSp) * (Number(headMult) || 1);
  return {effectiveSp, soft, ablate, through};
}

function ablationNote(spBefore, spAfter, ablate){
  if(!(spBefore > 0 && ablate > 0 && spAfter !== spBefore)) return '';
  return `SP ${spBefore} → ${spAfter}${ablate > 1 ? ' (AP −2)' : ''}`;
}
