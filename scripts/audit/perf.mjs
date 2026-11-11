// Швидкодія: завантаження, ланцюжок модулів, відкриття вікон, розмір збереження, великі папки, пам'ять, CSS. npm run audit:perf (код виходу 1 при перевищенні бюджету)
import { startServer, launch, newPage, signIn } from '../../tests/_harness.mjs';
const server = await startServer(), b = await launch(), errors = [];
const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } });
const p = await newPage(ctx, errors); p.setDefaultTimeout(10000);
const cdp = await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: false }); await cdp.send('DOM.enable'); await cdp.send('CSS.enable'); await cdp.send('CSS.startRuleUsageTracking');
const reqs = []; p.on('requestfinished', async r => { const s = await r.sizes().catch(() => null); reqs.push([r.url().replace(server.url, ''), s?.responseBodySize || 0]); });
const t0 = Date.now(); await p.goto(server.url + '/'); await p.waitForFunction(() => window.WinEmu); await p.waitForSelector('#boot', { state: 'hidden' });
const load = Date.now() - t0, nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0), res: performance.getEntriesByType('resource').length }; });
console.log('ЗАВАНТАЖЕННЯ до робочого стола (мс):', load, JSON.stringify(nav));
const js = reqs.filter(r => r[0].endsWith('.js')), css = reqs.filter(r => r[0].endsWith('.css')), ext = await p.evaluate(() => performance.getEntriesByType('resource').filter(r => !r.name.startsWith(location.origin)).map(r => r.name));
console.log('JS файлів', js.length, 'байт', js.reduce((s, r) => s + r[1], 0), '| CSS', css.reduce((s, r) => s + r[1], 0), '| зовнішні запити:', ext.length ? ext.join(', ') : 'немає');
await signIn(p);
const open = async (a, path) => { const t = await p.evaluate(async ([a, pa]) => { const t = performance.now(); WinEmu.open(a, pa); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t; }, [a, path]); return [a, Math.round(t)]; };
const times = []; for (const a of ['explorer', 'cmd', 'notepad', 'taskmgr', 'settings', 'ncpa', 'browser', 'firewallcpl', 'security', 'wfmsc']) times.push(await open(a, a === 'explorer' ? 'C:\\Users\\Учень' : undefined));
console.log('ВІДКРИТТЯ вікна (мс):', JSON.stringify(times));
// велика папка
const big = await p.evaluate(async () => { const f = WinEmu.fs, H = 'C:\\Users\\Учень\\Documents'; f.mkdir(H + '\\Багато'); const t = performance.now(); for (let i = 0; i < 2000; i++) f.writeFile(H + '\\Багато\\файл' + i + '.txt', 'текст ' + i); const mk = performance.now() - t; const t2 = performance.now(); WinEmu.open('explorer', H + '\\Багато'); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return { create: Math.round(mk), render: Math.round(performance.now() - t2) }; });
console.log('2000 файлів у папці:', JSON.stringify(big));
await p.waitForTimeout(500);
const sv = await p.evaluate(() => { const s = localStorage.getItem('edvault-windows') || ''; return { kb: Math.round(s.length / 1024) }; }); console.log('ЗБЕРЕЖЕННЯ з 2000 файлами:', JSON.stringify(sv));
const heap = await p.evaluate(() => Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576)); console.log("ПАМ'ЯТЬ МБ:", heap);

const rules = await cdp.send('CSS.stopRuleUsageTracking'); const usedRules = rules.ruleUsage.filter(r => r.used).length; console.log('CSS правил використано:', usedRules, 'з', rules.ruleUsage.length, `(${Math.round(100 * usedRules / rules.ruleUsage.length)}%)`);
const budget = []; if (load > 2500) budget.push(`до робочого стола ${load} мс (бюджет 2500)`); if (big.render > 800) budget.push(`папка з 2000 файлів малюється ${big.render} мс (бюджет 800)`); if (sv.kb > 1500) budget.push(`збереження ${sv.kb} КБ (бюджет 1500)`); if (ext.length) budget.push('є зовнішні запити: ' + ext.join(', '));
console.log('помилки', errors.slice(0, 3)); console.log(budget.length ? 'БЮДЖЕТ ПЕРЕВИЩЕНО:\n ' + budget.join('\n ') : 'у межах бюджету'); process.exitCode = budget.length || errors.length ? 1 : 0;
await b.close(); server.close();
