// На телефоні емулятор не запускається: екран замалий для вікон і панелі завдань — показуємо повідомлення,
// яке не можна закрити. Планшет і комп'ютер працюють повноцінно. Якщо на комп'ютері звузити вікно браузера,
// повідомлення з'являється, а після розширення — зникає, і робота продовжується.
/* preload */
const MODS = ["cmd.js","console.js","defender.js","explorer.js","fs.js","fw.js","icons.js","lock.js","main.js","net.js","notepad.js","procs.js","props.js","uac.js","ui.js"];
/* /preload */
const small = () => innerWidth < 600 || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 600);
const block = document.getElementById('smallScreen');
let started = false;
const check = () => {
  const s = small();
  document.documentElement.classList.toggle('phone', s);
  block.hidden = !s;
  for (const el of document.body.children) if (el !== block) el.inert = s;
  if (!s && !started) { started = true; for (const m of MODS) { const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = new URL(m, import.meta.url).href; document.head.appendChild(l); } import('./main.js'); }
};
check();
addEventListener('resize', check);
addEventListener('orientationchange', check);
