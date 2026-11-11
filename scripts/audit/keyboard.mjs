// Клавіатура: видимість фокусу на робочому столі, у Провіднику й діалогах, Esc, масштаб 200 %, розміри цілей. npm run audit:keyboard (код виходу 1 при порушеннях)
import { startServer, launch, newPage, signIn } from '../../tests/_harness.mjs';
const server = await startServer(), b = await launch(), errors = [];
const ctx = await b.newContext({ viewport: { width: 1366, height: 820 } }); const p = await newPage(ctx, errors); p.setDefaultTimeout(8000);
await p.goto(server.url + '/'); await p.waitForFunction(() => window.WinEmu); await p.waitForSelector('#boot', { state: 'hidden' }); await signIn(p);
const ring = () => p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const vis = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'); const r = e.getBoundingClientRect(); return { vis, tag: e.tagName + (e.className ? '.' + String(e.className).split(' ')[0] : ''), w: r.width, h: r.height }; });
const scanTab = async (label, n) => { let seen = 0, vis = 0; const miss = []; for (let i = 0; i < n; i++) { await p.keyboard.press('Tab'); const r = await ring(); if (!r) continue; seen++; if (r.vis || /^(TEXTAREA|INPUT)/.test(r.tag)) vis++; else miss.push(r.tag); } console.log(`${label}: фокус видно у ${vis} з ${seen}${miss.length ? '; без кільця: ' + [...new Set(miss)].slice(0, 6).join(', ') : ''}`); return seen - vis; };
let bad = 0;
bad += await scanTab('робочий стіл і панель завдань', 20);
await p.evaluate(() => WinEmu.open('explorer', 'C:\\Users\\Учень')); await p.waitForTimeout(300); bad += await scanTab('Провідник', 25);
await p.evaluate(() => WinEmu.open('settings')); await p.waitForTimeout(300); bad += await scanTab('Параметри', 20);
await p.evaluate(() => WinEmu.open('notepad')); await p.waitForTimeout(300); bad += await scanTab('Блокнот', 15);
// діалог: пастка фокусу й Esc
await p.evaluate(() => WinEmu.open('notepad')); await p.locator('.win.active textarea').fill('x'); await p.keyboard.press('Control+n'); await p.waitForTimeout(300);
const dlg = await p.locator('.dlg').count(); let inside = 0; if (dlg) { for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); if (await p.evaluate(() => !!document.activeElement?.closest('.dlg'))) inside++; } await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
console.log(`діалог: ${dlg ? `фокус лишається всередині ${inside} з 12 Tab; Esc закриває: ${(await p.locator('.dlg').count()) === 0}` : 'не вдалося викликати'}`);
// цілі менше 24 px
const small = await p.evaluate(() => [...document.querySelectorAll('button, [role=button], a, .tb-app, .wb')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24) && getComputedStyle(e).visibility !== 'hidden'; }).map(e => `${e.tagName}.${String(e.className).split(' ')[0]} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`));
console.log('цілі менші за 24×24 px:', small.length, [...new Set(small)].slice(0, 8));
await p.setViewportSize({ width: 683, height: 410 }); await p.waitForTimeout(300);
console.log('помилки', errors.slice(0, 2)); process.exitCode = bad > 3 || errors.length ? 1 : 0;
await b.close(); server.close();
