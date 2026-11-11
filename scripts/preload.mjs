// Перелік модулів емулятора для boot.js: на комп'ютері вони підвантажуються паралельно (<link rel="modulepreload">), а не ланцюжком імпортів.
// На телефоні, де емулятор не запускається, нічого не вантажимо.
//   node scripts/preload.mjs          — оновити windowsemu/js/boot.js
//   node scripts/preload.mjs --check  — лише перевірити (код виходу 1, якщо список застарів)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname, ENTRY = resolve(ROOT, 'windowsemu/js/main.js'), BOOT = resolve(ROOT, 'windowsemu/js/boot.js');
const seen = new Set(), walk = f => {
  if (seen.has(f)) return; seen.add(f);
  for (const m of readFileSync(f, 'utf8').matchAll(/(?:import|export)\s[^'"`]*?from\s*['"](\.[^'"]+)['"]|import\s*['"](\.[^'"]+)['"]/g)) walk(resolve(dirname(f), m[1] || m[2]));
};
walk(ENTRY);
const mods = [...seen].map(f => relative(resolve(ROOT, 'windowsemu/js'), f)).sort();
const block = `/* preload */\nconst MODS = ${JSON.stringify(mods)};\n/* /preload */`;
const src = readFileSync(BOOT, 'utf8');
const next = /\/\* preload \*\/[\s\S]*?\/\* \/preload \*\//.test(src) ? src.replace(/\/\* preload \*\/[\s\S]*?\/\* \/preload \*\//, block) : src + '\n' + block + '\n';
if (process.argv.includes('--check')) { if (next !== src) { console.error('boot.js: список модулів застарів. Запустіть node scripts/preload.mjs'); process.exit(1); } console.log(`список модулів актуальний (${mods.length})`); }
else { writeFileSync(BOOT, next); console.log(`записано ${mods.length} модулів`); }
