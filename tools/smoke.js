#!/usr/bin/env node
/*
 * CURSEBOUND — headless-смоук-тест.
 *
 * Загружает игру в jsdom (как браузер: конкатенация скриптов в одну область),
 * прогоняет клики, тики, рендер всех вкладок и сохранение.
 * Плюс проверяет устойчивость к битым сейвам.
 *
 * Запуск:
 *   npm i -D jsdom        (единственная dev-зависимость)
 *   node tools/smoke.js
 *   node tools/smoke.js --fix-hints   # показать, что именно падает
 *
 * Код возврата 1, если что-то сломано — годится для GitHub Actions.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/core/utils.js', 'js/core/state.js', 'js/core/audio.js',
  'js/systems/combat.js', 'js/systems/shop.js', 'js/systems/skills.js',
  'js/systems/prestige.js', 'js/systems/pets.js', 'js/systems/inventory.js',
  'js/systems/craft.js', 'js/systems/map.js', 'js/systems/city.js',
  'js/systems/clans.js', 'js/systems/hidden.js',
  'js/ui/render.js', 'js/ui/modals.js', 'js/ui/hints.js',
  'js/main.js'
];

let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗ ' + msg); };
const pass = (msg) => console.log('  ✓ ' + msg);

function boot(save) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true
  });
  const w = dom.window;
  // canvas/scroll — заглушки, jsdom их не умеет
  w.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: (t, k) => k === 'canvas' ? { width: 1, height: 1 } : () => {} });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  if (save !== undefined)
    w.localStorage.setItem('cursebound_save_v5',
      typeof save === 'string' ? save : JSON.stringify(save));

  const src = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  // Мост: скрипты играют в глобальной области, но eval() создаёт свою лексику —
  // поэтому явно выставляем нужный API на window.
  const bridge = `
;window.__CB = {
  get S(){ return S; },
  clickAttack, gameTick, renderAll, save, exportSave, switchView,
  stats, bonuses, hpFor, buy, setBulk, renderShop, renderShopAfford,
  SHOP, nf, BOSS_TIME,
  resetBonusCounter(){ __bonusCalls = 0; },
  get bonusCalls(){ return __bonusCalls; }
};
// Счётчик вызовов bonuses(): internal call-sites ссылаются на саму привязку,
// поэтому подменяем её в том же лексическом окружении.
var __bonusCalls = 0;
{ const _b = bonuses; bonuses = function(){ __bonusCalls++; return _b(); }; }`;
  try { w.eval(src + bridge); return { w, error: null }; }
  catch (e) { return { w, error: e }; }
}

console.log('\n1. Чистая загрузка и базовый игровой цикл');
{
  const { w, error } = boot();
  if (error) fail('загрузка: ' + error.message);
  else {
    pass('скрипты загружены без ошибок');
    const api = w.__CB;
    const run = (name, fn) => {
      try { const v = fn(api, w); pass(name + (v !== undefined ? ' → ' + v : '')); }
      catch (e) { fail(name + ' :: ' + e.message); }
    };
    run('выбор класса', (a) => { a.S.cls = 'knight'; return 'knight'; });
    run('300 кликов', (a) => {
      for (let i = 0; i < 300; i++) a.clickAttack(false);
      return 'kills=' + a.S.kills + ' gold=' + a.nf(a.S.gold);
    });
    run('300 тиков', (a) => {
      for (let i = 0; i < 300; i++) a.gameTick();
      return 'dps=' + Math.round(a.stats().dps);
    });
    run('все вкладки', (a) => {
      for (const v of ['hero','codex','shop','map','forge','skills','pets','gear','deeds','dark']) {
        a.switchView('left', v); a.switchView('right', v);
      }
      return 'ok';
    });
    run('покупка всей лавки', (a) => {
      for (const it of a.SHOP) { a.S.gold += 1e7; a.buy(it.id); }
      return 'gold=' + a.nf(a.S.gold);
    });
    run('рендер всего', (a) => { a.renderAll(); return 'ok'; });
    run('экспорт сейва', (a) => a.exportSave().length + ' символов');
    run('сохранение/загрузка', (a, w) => {
      a.save();
      const raw = w.localStorage.getItem('cursebound_save_v5');
      return raw ? 'сейв ' + raw.length + ' Б' : 'пусто';
    });
  }
}

console.log('\n2. Устойчивость к битым сейвам (известные дефекты)');
const saves = {
  'битый JSON': '{not json',
  'gold: null': { v: 5, cls: 'knight', gold: null, stage: 5, lvl: 2 },
  'gold: строка': { v: 5, cls: 'knight', gold: 'много', stage: 5, lvl: 2 },
  'stage: NaN': { v: 5, cls: 'knight', stage: NaN, lvl: 2 },
  'level: -5': { v: 5, cls: 'knight', stage: 3, lvl: -5 },
  'предмет без st': { v: 5, cls: 'knight', stage: 3, equip: { weapon: { slot: 'weapon' } } },
  'предмет с rar: 99': { v: 5, cls: 'knight', stage: 3, inv: [{ slot: 'weapon', rar: 99, st: {}, n: 'b', id: 1 }] },
  'стат-значение строка': { v: 5, cls: 'knight', stage: 3, equip: { weapon: { slot: 'weapon', st: { dmg: 'x' }, rar: 1, n: 'a' } } }
};
for (const [name, sv] of Object.entries(saves)) {
  const { w, error } = boot(sv);
  if (error) { fail(name + ' — игра не стартует: ' + error.message); continue; }
  try {
    const a = w.__CB;
    a.clickAttack(false); a.gameTick(); a.renderAll(); a.save();
    pass(name + ' — выдержал');
  } catch (e) {
    fail(name + ' — краш в рантайме: ' + e.message);
  }
}

console.log('\n3. Производительность горячего пути лавки');
{
  const { w, error } = boot({ v: 5, cls: 'knight', stage: 40, lvl: 20, gold: 1e6 });
  if (error) fail('загрузка: ' + error.message);
  else {
    const a = w.__CB;
    a.setBulk('max');
    a.resetBonusCounter(); a.renderShop();
    const perRender = a.bonusCalls;
    a.resetBonusCounter();
    for (let i = 0; i < 10; i++) a.renderShopAfford();
    const per10 = a.bonusCalls;
    const r = { perRender, per10Afford: per10 };
    // ориентир: один рендер «Макс» не должен звать bonuses() тысячи раз
    if (r.perRender > 100)
      fail(`renderShop() в режиме «Макс» вызывает bonuses() ${r.perRender} раз (дефект maxAfford)`);
    else pass(`renderShop(): ${r.perRender} вызовов bonuses() — в норме`);
    if (r.per10Afford > 500)
      fail(`10× renderShopAfford(): ${r.per10Afford} вызовов bonuses()`);
    else pass(`10× renderShopAfford(): ${r.per10Afford} вызовов — в норме`);
  }
}

console.log('\n4. Баланс: проходимость Владыки');
{
  const { w, error } = boot();
  if (error) fail('загрузка: ' + error.message);
  else {
    // сколько DPS нужно, чтобы снять Владыку за отведённое время
    const a = w.__CB;
    const row = (d) => Math.round(a.hpFor(d) * 10 / a.BOSS_TIME);
    const d100 = row(100);
    pass(`для Владыки на глубине 100 нужно ${d100.toLocaleString('ru-RU')} DPS`);
    console.log('     (максимальный реалистичный DPS на этой глубине — единицы тысяч)');
  }
}

console.log(`\n${failures ? '✗ ПРОВАЛЕНО проверок: ' + failures : '✓ Всё чисто'}\n`);
process.exit(failures ? 1 : 0);
