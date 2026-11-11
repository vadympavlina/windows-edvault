// Надійність: командний рядок із випадковими й шкідливими аргументами. Внутрішня помилка («Помилка: Cannot read…») або зависання — це знахідка. npm run audit:fuzz (код виходу 1, якщо є)
import { FS } from '../../windowsemu/js/fs.js';
import { Cmd, COMMANDS } from '../../windowsemu/js/cmd.js';
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
const ARGS = ['', ' /?', ' *', ' ..', ' \\', ' C:\\', ' D:\\', ' C:\\Windows\\System32', ' "', ' ""', ' %', ' %PATH%', ' /s', ' /q /f', ' -n 0', ' -n 999999', ' 999999999999', ' -1', ' NUL', ' CON', ' aux', ' a b c d e f g h', ' <', ' >', ' | more', ' > C:\\x.txt', ' >> NUL', ' &', ' && dir', ' ^', ' ' + 'я'.repeat(3000), ' \u0000', ' ../../../..', ' C:\\Users\\Учень\\..\\..\\..', ' "a b" "c d"', ' /t /a /v', ' 1.1.1.1', ' google.com', ' [::1]', ' \t\t', ' ' + '"'.repeat(51)];
const bad = new Map(), slow = []; let runs = 0;
const fresh = admin => { const fs = new FS(); return new Cmd(fs, { live: false, admin, open() {}, tasks: () => [{ name: 'notepad.exe', pid: 2210 }] }); };
const names = [...COMMANDS, 'cd', 'dir', 'set', 'echo', 'for', 'if', 'call', 'goto', 'exit', 'title', 'color', 'prompt', 'path', 'ver', 'cls'];
for (let i = 0; i < 6000; i++) {
  const admin = rnd() < .3, c = (i % 40 === 0) ? fresh(admin) : (globalThis.__c ||= fresh(admin)); if (i % 40 === 0) globalThis.__c = c;
  const line = rnd() < .15 ? Array.from({ length: 1 + Math.floor(rnd() * 12) }, () => String.fromCharCode(32 + Math.floor(rnd() * 600))).join('') : pick(names) + pick(ARGS) + (rnd() < .3 ? pick(ARGS) : '');
  const t = performance.now(); let res;
  try { res = c.run(line); } catch (e) { const k = 'ВИНЯТОК ' + e.message.slice(0, 70); const r = bad.get(k) || { n: 0, ex: line.slice(0, 60) }; r.n++; bad.set(k, r); continue; }
  runs++; const ms = performance.now() - t; if (ms > 500) slow.push(`${Math.round(ms)} мс: ${line.slice(0, 60)}`);
  for (const l of res.out || []) if (/^Помилка: /.test(l) && /(Cannot read|is not a function|is not iterable|undefined|null|Invalid|Maximum call)/.test(l)) { const k = l.slice(0, 80); const r = bad.get(k) || { n: 0, ex: line.slice(0, 60) }; r.n++; bad.set(k, r); }
  if (res.ask) c.pending = null;
}
console.log(`виконано ${runs} команд`); for (const [k, r] of [...bad].sort((a, b) => b[1].n - a[1].n)) console.log(String(r.n).padStart(4), k, '| напр.:', JSON.stringify(r.ex));
if (slow.length) console.log('повільні:', slow.slice(0, 5)); if (!bad.size && !slow.length) console.log('внутрішніх помилок і зависань немає');
process.exitCode = bad.size || slow.length ? 1 : 0;
