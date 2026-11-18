const fs = require('fs');
const path = 'shared/i18n.js';
let src = fs.readFileSync(path, 'utf8');
const data = fs.readFileSync('shared/data.js', 'utf8');
const m = data.match(/const skillInfo = \{([\s\S]*?)\n\};/);
eval('var skillInfo = {' + m[1] + '};');

const EN = require('./skill-tip-en.json');
const missing = [];
for (const arr of Object.values(skillInfo)) {
  for (const tip of arr) if (!EN[tip]) missing.push(tip);
}
if (missing.length) {
  console.error('Missing', missing.length);
  missing.slice(0, 10).forEach(x => console.error(x));
  process.exit(1);
}
const block = Object.entries(EN).map(([ru, en]) => `  ${JSON.stringify(ru)}: ${JSON.stringify(en)},`).join('\n');
const marker = '  "Агент": "Agent",';
if (!src.includes(marker)) {
  console.error('marker missing');
  process.exit(1);
}
const sample = Object.keys(EN)[0];
if (src.includes(JSON.stringify(sample))) {
  console.log('already inserted');
  process.exit(0);
}
src = src.replace(marker, `${block}\n${marker}`);
fs.writeFileSync(path, src);
console.log('inserted', Object.keys(EN).length, 'skill tip phrases');
