// Безпека: підставляємо <img onerror> в імена файлів, вміст, команди й адреси, відкриваємо програми й дивимось, чи виконується код. npm run audit:xss (код виходу 1 при спрацюванні)
import { startServer, launch, newPage, signIn } from '../../tests/_harness.mjs';
const server = await startServer(), b = await launch(), errors = [];
const ctx = await b.newContext({ viewport: { width: 1366, height: 820 }, bypassCSP: true });
const p = await newPage(ctx, errors); p.setDefaultTimeout(8000);
await p.goto(server.url + '/'); await p.waitForFunction(() => window.WinEmu); await p.waitForSelector('#boot', { state: 'hidden' }); await signIn(p);
const PAY = n => `<img src=x onerror="window.__x=(window.__x||0)+1;window.__w=(window.__w||[]);window.__w.push('${n}')">`;
const results = [];
const probe = async (name, fn) => { console.error('…', name); try { await Promise.race([fn(), new Promise((_, r) => setTimeout(() => r(new Error('тайм-аут')), 15000))]); } catch (e) { results.push(`${name}: збій сценарію ${e.message.split('\n')[0].slice(0, 70)}`); } await p.waitForTimeout(150); const n = await p.evaluate(() => window.__x || 0); results.push(`${name}: виконань ${n}`); await p.evaluate(() => { window.__x = 0; }); };
const H = 'C:\\Users\\Учень';
// 1) імена та вміст напряму в стані (як у підробленому збереженні)
await p.evaluate(({ H }) => {
  const pay = n => `<img src=x onerror="window.__x=(window.__x||0)+1">`;
  const f = WinEmu.fs, doc = f.node(H + '\\Documents'), a = { r: false, h: false, s: false };
  doc.children.push({ id: 'x1', type: 'dir', name: pay(), attrs: { ...a }, children: [], created: 1, modified: 1 }, { id: 'x2', type: 'file', name: pay() + '.txt', attrs: { ...a }, content: pay(), created: 1, modified: 1 });
  f.s.bin.push({ id: 'b1', node: { id: 'x3', type: 'file', name: pay(), attrs: { ...a }, content: '', created: 1, modified: 1 }, from: pay(), at: 1 });
  f.emit('x');
}, { H });
await probe('Провідник: плитки й таблиця', async () => { await p.evaluate(H => WinEmu.open('explorer', H + '\\Documents'), H); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.win.active .ex-view-btn[data-view="details"], .win.active [data-view="details"]')?.click()); });
await probe('Провідник: Кошик', async () => { await p.evaluate(() => WinEmu.open('bin')); });
await probe('Блокнот: вміст і ім’я', async () => { await p.evaluate(H => { const f = WinEmu.fs.node(H + '\\Documents').children.find(c => c.id === 'x2'); WinEmu.open('notepad', H + '\\Documents\\' + f.name); }, H); });
await probe('Властивості файлу', async () => { await p.evaluate(() => { const w = WinEmu.WM.active(); w?.app_?.props?.(); }); await p.keyboard.press('Alt+Enter'); });
// 2) через інтерфейс: командний рядок
await probe('Командний рядок: echo, dir, type, mkdir', async () => {
  await p.evaluate(H => WinEmu.open('cmd', H), H); await p.waitForTimeout(200);
  const bad = `<img src=x onerror="window.__x=(window.__x||0)+1">`;
  for (const line of [`echo ${bad}`, `mkdir "${bad}"`, `cd Documents`, `dir`, `type ${bad}.txt`, `${bad}`, `ping ${bad}`, `help ${bad}`, `del ${bad}`, `netsh ${bad}`, `ipconfig ${bad}`, `tasklist /fi "imagename eq ${bad}"`, `taskkill /im ${bad}`, `copy ${bad} ${bad}`, `rename ${bad} ${bad}`, `attrib ${bad}`, `tree ${bad}`, `find "${bad}" ${bad}`]) { await p.locator('.win.active .con-in').fill(line); await p.locator('.win.active .con-in').press('Enter'); }
});
// 3) Блокнот: набраний текст, «Зберегти як», пошук
await probe('Блокнот: набраний текст і заголовок вікна', async () => {
  await p.evaluate(() => WinEmu.open('notepad')); await p.waitForTimeout(200);
  const bad = `<img src=x onerror="window.__x=(window.__x||0)+1">`;
  await p.locator('.win.active textarea').fill(bad); await p.keyboard.press('Control+s'); await p.waitForTimeout(200);
  await p.keyboard.type(bad + '.txt'); await p.keyboard.press('Enter');
});
// 4) браузер, диспетчер, налаштування, мережа, брандмауер, захисник
await probe('Браузер: адреса й сторінки', async () => {
  await p.evaluate(() => WinEmu.open('browser')); await p.waitForTimeout(300);
  const bad = `<img src=x onerror="window.__x=(window.__x||0)+1">`;
  for (const u of [bad, `http://${bad}/`, `${bad}.com`, `javascript:window.__x=1`, `search?q=${bad}`]) { const i = p.locator('.win.active input').first(); await i.fill(u); await i.press('Enter'); await p.waitForTimeout(200); }
});
await probe('Диспетчер завдань, налаштування, мережа', async () => { for (const a of ['taskmgr', 'settings', 'ncpa']) { await p.evaluate(a => WinEmu.open(a), a); await p.waitForTimeout(200); } });
await probe('Брандмауер і Захисник', async () => { for (const a of ['firewallcpl', 'security', 'wfmsc']) { await p.evaluate(a => WinEmu.open(a), a); await p.waitForTimeout(250); } });
console.log(results.join('\n')); console.log('помилки сторінки:', errors.slice(0, 3));
process.exitCode = results.some(r => /виконань [1-9]/.test(r)) ? 1 : 0;
await b.close(); server.close();
