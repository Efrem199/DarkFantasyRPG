#!/usr/bin/env node
/*
 * CURSEBOUND — тесты. Запуск: node tools/test.js   (или npm test)
 *
 * Три слоя:
 *   1. Юнит — чистые формулы (nf, depthCurve, закрытые цены лавки).
 *   2. Интеграция — реальная загрузка игры в jsdom: клики, тики, вкладки,
 *      сохранение, миграции старых сейвов, битые сейвы.
 *   3. Инварианты баланса — то, из-за чего забег упирался в стену:
 *      рост силы должен догонять рост HP.
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
  'js/systems/hidden.js',
  'js/ui/render.js', 'js/ui/modals.js', 'js/ui/hints.js',
  'js/main.js'
];

let pass = 0, fail = 0;

async function main() {
const ok = (name, extra) => { pass++; console.log('  ✓ ' + name + (extra ? ' — ' + extra : '')); };
const no = (name, why) => { fail++; console.log('  ✗ ' + name + (why ? ' — ' + why : '')); };
const is = (name, cond, extra) => cond ? ok(name, extra) : no(name, extra);
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-9) * Math.max(1, Math.abs(a), Math.abs(b));

function boot(save) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true
  });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: (t, k) => k === 'canvas' ? { width: 1, height: 1 } : () => {} });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  if (save !== undefined) {
    w.localStorage.setItem('cursebound_save_v5',
      typeof save === 'string' ? save : JSON.stringify(save));
  }
  const src = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  try { w.eval(src); return { w, api: w.CB, error: null }; }
  catch (e) { return { w, api: null, error: e }; }
}

/* ============================================================
   1. ЮНИТ: формулы
   ============================================================ */
console.log('\n1. Формулы');

{
  const { api, error } = boot();
  if (error) { no('загрузка', error.message); }
  else {
    // --- nf ---
    const nf = api.nf;
    is('nf(0)', nf(0) === '0');
    is('nf(999)', nf(999) === '999');
    is('nf(1000)', nf(1000) === '1.00K', nf(1000));
    is('nf(1e6)', nf(1e6) === '1.00M', nf(1e6));
    is('nf(1e12)', nf(1e12) === '1.00T', nf(1e12));
    is('nf(NaN) → ∞', nf(NaN) === '∞');
    is('nf(Infinity) → ∞', nf(Infinity) === '∞');
    is('nf(-500)', nf(-500) === '−500', nf(-500));
    is('nf не даёт «1000No»', !/\d{4}(No|Dc)/.test(nf(1e33) + nf(1e60)), nf(1e33) + ' / ' + nf(1e60));
    is('nf(1e60) — экспонента', /10\^60/.test(nf(1e60)), nf(1e60));

    // --- кривая глубины монотонна и непрерывна ---
    let mono = true, maxJump = 0;
    for (let d = 2; d <= 300; d++) {
      const a = api.depthCurve(d - 1), b = api.depthCurve(d);
      if (!(b > a)) mono = false;
      maxJump = Math.max(maxJump, b / a);
    }
    is('depthCurve монотонна на 1..300', mono);
    is('depthCurve без разрывов на стыках (≤1.17×)', maxJump <= 1.17, 'макс. шаг ' + maxJump.toFixed(4));

    // --- HP / золото / опыт положительны и растут ---
    let sane = true;
    for (let d = 1; d <= 300; d++) {
      if (!(api.hpFor(d) > 0 && api.goldFor(d) > 0 && api.xpFor(d) > 0)) sane = false;
    }
    is('hpFor/goldFor/xpFor положительны на 1..300', sane);
    is('hpFor(1) = 18', api.hpFor(1) === 18, String(api.hpFor(1)));

    // --- цена лавки: закрытая формула == сумма по уровням ---
    let costOk = true;
    for (const it of api.SHOP) {
      for (let n = 1; n <= 60; n++) {
        const ctx = { red: 0.2, gold: 1e12 };
        let sum = 0;
        for (let i = 0; i < n; i++) sum += api.upgCost(it, i, ctx);
        if (api.bulkCost(it, n, ctx) !== sum) costOk = false;
      }
    }
    is('bulkCost == Σ upgCost (60 уровней × все товары)', costOk);

    // --- maxAfford: не выходим за кошелёк и берём максимум ---
    let affordOk = true;
    for (const it of api.SHOP) {
      for (const gold of [0, 1, 30, 5e3, 1e6, 1e10]) {
        const ctx = { red: 0.2, gold };
        const n = api.maxAfford(it, ctx);
        if (api.bulkCost(it, n, ctx) > gold) affordOk = false;
        if (api.bulkCost(it, n + 1, ctx) <= gold) affordOk = false;
      }
    }
    is('maxAfford не превышает золото и не занижает его', affordOk);

    // --- «Макс» больше не упирается в жёсткие 500, лимит объясним ---
    const bladeMax = api.maxAfford(api.SHOP[0], { red: 0, gold: 1e18 });
    const awakenMax = api.maxAfford(api.SHOP.find(i => i.id === 'awaken'), { red: 0, gold: 1e18 });
    is('дешёвый товар покупается сотнями уровней', bladeMax > 200, bladeMax + ' ур. клинка');
    is('лимит пачки — MAX_BULK, а не глухие 500',
      bladeMax <= 100000 && awakenMax > 50, 'awaken ' + awakenMax + ' ур.');
  }
}

/* ============================================================
   2. ИНТЕГРАЦИЯ: игра
   ============================================================ */
console.log('\n2. Интеграция');

{
  const { w, api, error } = boot();
  if (error) { no('загрузка', error.message); }
  else {
    api.S.cls = 'knight';
    for (let i = 0; i < 300; i++) api.clickAttack(false);
    is('клики наносят урон', api.S.totalDmg > 0, 'урон ' + Math.round(api.S.totalDmg));
    is('убийства капают золотом', api.S.gold > 0, 'золото ' + Math.round(api.S.gold));

    for (let i = 0; i < 300; i++) api.gameTick();
    is('тик не падает', true);

    let viewsOk = true, brokenView = '';
    for (const v of ['hero', 'codex', 'shop', 'map', 'forge', 'skills', 'pets', 'gear', 'deeds', 'dark']) {
      for (const p of ['left', 'right']) {
        try { api.switchView(p, v); }
        catch (e) { viewsOk = false; brokenView = p + '/' + v + ': ' + e.message; }
      }
    }
    is('все 10 вкладок рендерятся (обе панели)', viewsOk, brokenView);

    let buyOk = true;
    for (const it of api.SHOP) {
      try { api.S.gold += 1e9; api.buy(it.id); } catch (e) { buyOk = false; }
    }
    is('покупка всех товаров лавки', buyOk);

    const raw = api.exportSave();
    is('экспорт сейва непустой', typeof raw === 'string' && raw.length > 100);
    is('импорт своего же сейва', api.importSave(raw) === true);
  }
}

/* ============================================================
   3. СЕЙВЫ: миграции и мусор
   ============================================================ */
console.log('\n3. Устойчивость сохранений');

{
  const item = (o) => Object.assign({ slot: 'weapon', rar: 2, st: { dmg: 0.5 }, n: 'Клинок', id: 1, lv: 3 }, o);
  const cases = {
    'битый JSON': '{not json',
    'пустой объект': {},
    'null': null,
    'массив вместо объекта': [],
    'gold: null': { v: 5, cls: 'knight', gold: null, lvl: 2 },
    'gold: строка': { v: 5, cls: 'knight', gold: 'много' },
    'gold: Infinity': { v: 5, cls: 'knight', gold: 1e308 * 10 },
    'stage: NaN': { v: 5, cls: 'knight', stage: NaN },
    'stage: -50': { v: 5, cls: 'knight', stage: -50 },
    'stage: 1e9': { v: 5, cls: 'knight', stage: 1e9, maxStage: 1e9 },
    'lvl: -5': { v: 5, cls: 'knight', lvl: -5 },
    'класс-выдумка': { v: 5, cls: 'necromancer' },
    'подкласс чужого класса': { v: 5, cls: 'knight', sub: 'silencereaper' },
    'предмет без st': { v: 5, cls: 'knight', equip: { weapon: item({ st: undefined }) } },
    'предмет с rar: 99': { v: 5, cls: 'knight', inv: [item({ rar: 99 })] },
    'стат строкой': { v: 5, cls: 'knight', equip: { weapon: item({ st: { dmg: 'x' } }) } },
    'неизвестный стат': { v: 5, cls: 'knight', inv: [item({ st: { teleport: 3 } })] },
    'кольцо в слоте оружия': { v: 5, cls: 'knight', equip: { weapon: item({ slot: 'ring' }) } },
    'res: строки': { v: 5, cls: 'knight', res: { blood: 'много', ash: -5 } },
    'buffs: NaN': { v: 5, cls: 'knight', buffs: { dmg: NaN } },
    'u: строки': { v: 5, cls: 'knight', u: { blade: 'x' } },
    'навыки: строки': { v: 5, cls: 'knight', skills: { might: 'много' }, ptree: { pWrath: {} } },
    'старый сейв v1': { v: 1, stage: 12, lvl: 9, gold: 5000 },
    'старый сейв v4': { v: 4, cls: 'seer', stage: 44, lvl: 30, maxStage: 44 }
  };
  let loaded = 0, broken = [];
  for (const [name, sv] of Object.entries(cases)) {
    const { api, error } = boot(sv);
    if (error) { broken.push(name + ' (старт: ' + error.message + ')'); continue; }
    try {
      api.clickAttack(false); api.gameTick(); api.renderAll(); api.save();
      // после загрузки все числа должны быть числами
      const S = api.S;
      const numsOk = ['gold', 'lvl', 'xp', 'stage', 'maxStage'].every(k => typeof S[k] === 'number' && isFinite(S[k]));
      const invOk = S.inv.every(i => api.validItem(i));
      if (!numsOk) broken.push(name + ' (в состоянии NaN)');
      else if (!invOk) broken.push(name + ' (битый предмет в сумке)');
      else loaded++;
    } catch (e) {
      broken.push(name + ' (краш: ' + e.message + ')');
    }
  }
  is(`все ${Object.keys(cases).length} сейвов грузятся и играются`, broken.length === 0, broken.slice(0, 4).join('; '));
  is('битые предметы вычищаются', loaded === Object.keys(cases).length, loaded + ' ок');

  /* Регрессия: Object.assign(fresh,data) подменял fresh.u ссылкой из сейва,
     из-за чего новые улучшения лавки не появлялись у старых сохранений
     и формулы получали NaN. Проверяем и данные, и результат формул. */
  const { api: oldApi, error: oldErr } = boot({ v: 5, cls: 'knight', u: { blade: 20, servant: 5 }, stage: 12 });
  if (oldErr || !oldApi) no('старый сейв без новых полей: загрузка', oldErr && oldErr.message);
  else {
    const keys = ['blade', 'servant', 'crit', 'greed', 'power', 'void', 'awaken', 'echo', 'crown'];
    const missing = keys.filter(k => typeof oldApi.S.u[k] !== 'number');
    is('все улучшения лавки — числа у старого сейва',
      missing.length === 0, missing.length ? 'нет: ' + missing.join(',') : 'все 9');
    is('значения из сейва сохранены', oldApi.S.u.blade === 20 && oldApi.S.u.servant === 5,
      `blade=${oldApi.S.u.blade}, servant=${oldApi.S.u.servant}`);
    is('новые улучшения стартуют с нуля', oldApi.S.u.awaken === 0 && oldApi.S.u.crown === 0);
    const st = oldApi.stats();
    is('формулы не дают NaN на старом сейве',
      isFinite(st.click) && isFinite(st.dps) && st.click > 0, `клик ${st.click.toFixed(2)}`);
  }
}

/* ============================================================
   4. ИНВАРИАНТЫ БАЛАНСА
   ============================================================ */
console.log('\n4. Баланс');

{
  const { w, api, error } = boot();
  if (error) { no('загрузка', error.message); }
  else {
    /* Меряем «силу за золото»: идеальный игрок скупает всё и мы считаем
       суммарный DPS (клик×5 + авто). Это нижняя граница того, что доступно. */
    const powerAtGold = (gold) => {
      const ids = api.SHOP.map(i => i.id);
      const save = {}; ids.forEach(k => save[k] = api.S.u[k]);
      ids.forEach(k => api.S.u[k] = 0);
      let g = gold;
      for (let guard = 0; guard < 6000; guard++) {
        let bought = false;
        for (const it of api.SHOP) {
          const c = api.upgCost(it, 0, { red: 0, gold: g });
          if (g >= c) { g -= c; api.S.u[it.id]++; bought = true; }
        }
        if (!bought) break;
      }
      const st = api.stats();
      const u = Object.assign({}, api.S.u);
      ids.forEach(k => api.S.u[k] = save[k]);
      return { dps: st.dps + st.click * 5, u };
    };
    const reachable = (dps) => { let d = 1; while (d < 400 && api.hpFor(d) * 10 / api.BOSS_TIME <= dps) d++; return d - 1; };

    const p4 = powerAtGold(1e4), p8 = powerAtGold(1e8), p12 = powerAtGold(1e12),
          p16 = powerAtGold(1e16), p24 = powerAtGold(1e24);
    is('мультипликативные товары покупаются',
      (p12.u.awaken + p12.u.echo + p12.u.crown) > 0,
      `на 1e12: awaken ${p12.u.awaken}, echo ${p12.u.echo}, crown ${p12.u.crown}`);
    /* Ключевой инвариант: каждый порядок золота должен двигать глубину.
       При чисто линейных апгрейдах (до правки) это ломалось на ~100. */
    is('каждые 10⁸ золота дают +3 глубины', reachable(p16.dps) - reachable(p8.dps) >= 8,
      `${reachable(p8.dps)} (1e8) → ${reachable(p16.dps)} (1e16)`);
    is('мид-гейм: глубина 100 достижима к 1e14 золота',
      reachable(powerAtGold(1e14).dps) >= 100, 'глубина ' + reachable(powerAtGold(1e14).dps));
    is('сила не «залипает» у 100-й глубины',
      reachable(p24.dps) >= 140 && reachable(p24.dps) > reachable(p12.dps) + 30,
      '1e12 → ' + reachable(p12.dps) + ', 1e24 → ' + reachable(p24.dps));
    is('ранняя игра не сломана: 1e4 золота не проходят 30 глубину',
      reachable(p4.dps) < 30, 'глубина ' + reachable(p4.dps));

    /* Владыка на 100: сила должна хотя бы догонять требование к тому моменту,
       когда такой запас золота накапливается на 95-й глубине. */
    const goldAt95 = api.goldFor(95) * 20000;  // накопления эпохи 100-й глубины
    const power95 = powerAtGold(goldAt95);
    const need95 = api.hpFor(100) * api.BOSS_HP_MULT / api.BOSS_TIME;
    is('Владыку на 100 реально снять', power95.dps > need95,
      `сила ${power95.dps.toExponential(2)} vs нужно ${need95.toExponential(2)} за ${api.BOSS_TIME}с`);

    // Мягкий закон глубин: с третьей неудачи откат прекращается
    api.S.cls = 'knight'; api.S.mode = 'deeper'; api.S.bossTries = 0;
    let rolled = 0, keptAfter3 = true;
    for (let i = 0; i < 4; i++) {
      api.S.stage = 40;
      const boss = api.makeMob(40);
      boss.boss = true; boss.mark = false; boss.riftBoss = false; boss.time = 0;
      api.__forceMob(boss);
      const before = api.S.stage;
      api.bossFail();
      if (api.S.stage < before) rolled++;
      if (i >= 2 && api.S.stage < before) keptAfter3 = false;
    }
    is('первые две неудачи откатывают, дальше — нет',
      api.S.bossTries >= 3 && rolled === 2 && keptAfter3,
      `попыток ${api.S.bossTries}, откатов ${rolled}`);
  }
}

/* ============================================================
   5. ПРОИЗВОДИТЕЛЬНОСТЬ
   ============================================================ */
console.log('\n5. Производительность');

{
  const { api, error } = boot({ v: 5, cls: 'knight', stage: 80, lvl: 40, gold: 1e12 });
  if (error) { no('загрузка', error.message); }
  else {
    // скорость закрытых формул при «Макс»
    let t = Date.now();
    for (let i = 0; i < 1000; i++) api.maxAfford(api.SHOP[5], { red: 0.2, gold: 1e14 });
    const dt = Date.now() - t;
    is('maxAfford ×1000 быстрее 300 мс', dt < 300, dt + ' мс');

    // тик не деградировал
    t = Date.now();
    for (let i = 0; i < 1000; i++) api.gameTick();
    const tick = Date.now() - t;
    is('1000 тиков быстрее 3 с', tick < 3000, tick + ' мс');
  }
}

/* ============================================================
   6. ЦЕЛОСТНОСТЬ РАЗМЕТКИ И РЕСУРСОВ
   Заменяет часть «визуальной» проверки там, где браузера нет:
   ловит битые пути, внешние запросы, дубли id и рассинхрон JS↔HTML.
   ============================================================ */
console.log('\n6. Целостность разметки и ресурсов');

{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const cssFiles = fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css'));
  const allCss = cssFiles.map(f => fs.readFileSync(path.join(ROOT, 'css', f), 'utf8')).join('\n');
  const jsAll = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

  // --- ни одного внешнего запроса: игра должна работать офлайн и с file:// ---
  const externals = [...html.matchAll(/(?:href|src)="(https?:)?\/\/[^"]+"/g)].map(m => m[0]);
  is('в index.html нет внешних ресурсов', externals.length === 0,
    externals.slice(0, 3).join(', '));
  const cssExternals = [...allCss.matchAll(/url\(\s*['"]?(?:https?:)?\/\//g)];
  is('в CSS нет внешних url()', cssExternals.length === 0);

  // --- все локальные ресурсы из HTML существуют ---
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map(m => m[1]).filter(u => !/^(data:|#|https?:|mailto:)/.test(u));
  const missing = refs.filter(u => !fs.existsSync(path.join(ROOT, u.split('?')[0])));
  is(`все ${refs.length} локальных ресурсов из index.html существуют`,
    missing.length === 0, missing.join(', '));

  // --- все url() из CSS указывают на реальные файлы (шрифты!) ---
  const cssUrls = [...allCss.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)]
    .map(m => m[1]).filter(u => !/^(data:|https?:)/.test(u));
  const cssMissing = cssUrls.filter(u => !fs.existsSync(path.join(ROOT, 'css', u)));
  is(`все ${cssUrls.length} url() из CSS существуют`, cssMissing.length === 0, cssMissing.join(', '));

  // --- шрифты действительно woff2 (магия первых байт), и непустые ---
  const fontFiles = fs.readdirSync(path.join(ROOT, 'css', 'fonts')).filter(f => f.endsWith('.woff2'));
  const badFonts = fontFiles.filter(f => {
    const b = fs.readFileSync(path.join(ROOT, 'css', 'fonts', f));
    return b.length < 2000 || b.slice(0, 4).toString('ascii') !== 'wOF2';
  });
  is(`${fontFiles.length} файлов .woff2 валидны`, badFonts.length === 0, badFonts.join(', '));
  const fontBytes = fontFiles.reduce((a, f) => a + fs.statSync(path.join(ROOT, 'css', 'fonts', f)).size, 0);
  is('шрифты весят меньше 250 КБ', fontBytes < 250000, Math.round(fontBytes / 1024) + ' КБ');

  // --- все id, которые ищет JS через $('#...'), где-то объявлены:
  //     либо в статической разметке, либо в шаблонах модалок ---
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  // id из шаблонных строк JS: id="..." или id=\'...\'
  for (const m of jsAll.matchAll(/id=["']([A-Za-z0-9_-]+)["']/g)) htmlIds.add(m[1]);
  const wanted = new Set([...jsAll.matchAll(/\$\('#([A-Za-z0-9_-]+)'\)/g)].map(m => m[1]));
  const absent = [...wanted].filter(id => !htmlIds.has(id));
  is(`все ${wanted.size} id, к которым обращается JS, объявлены`,
    absent.length === 0, absent.slice(0, 5).join(', '));

  // --- дубли id в разметке (ломают querySelector) ---
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  is('в разметке нет дублей id', dupes.length === 0, [...new Set(dupes)].join(', '));

  // --- порядок подключения скриптов: core → systems → ui → main ---
  // только реально подключённые скрипты (закомментированные не в счёт)
  const activeHtml = html.replace(/<!--[\s\S]*?-->/g, '');
  const order = [...activeHtml.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
  const idx = (re) => order.findIndex(f => re.test(f));
  const core = idx(/^js\/core\//), sys = idx(/^js\/systems\//), ui = idx(/^js\/ui\//), main = idx(/js\/main\.js$/);
  is('скрипты подключены в порядке core → systems → ui → main',
    core === 0 && core < sys && sys < ui && ui < main, order.length + ' файлов');
  const declared = order.slice().sort().join('|');
  const onDisk = FILES.slice().sort().join('|');
  is('список подключённых скриптов совпадает с проверяемым', declared === onDisk,
    order.length + ' против ' + FILES.length);

  // --- мобильная основа: viewport и safe-area ---
  is('есть корректный meta viewport', /name="viewport"[^>]*width=device-width/.test(html));
  is('учтён safe-area для iOS', allCss.includes('env(safe-area-inset-bottom)'));
  is('есть медиазапрос для мобильных', /@media \(max-width:1120px\)/.test(allCss));
  is('prefers-reduced-motion поддержан в CSS', allCss.includes('prefers-reduced-motion'));
  is('prefers-reduced-motion поддержан в JS (угли)', jsAll.includes('prefers-reduced-motion'));
}

/* ============================================================
   7. ОФЛАЙН-ЗАПУСК
   Грузим index.html через HTTP с настоящей загрузкой ресурсов
   (web-платформа jsdom) и убеждаемся, что наружу не уходит ни один
   запрос, а игра стартует. Именно это гарантирует работу с file://.
   ============================================================ */
console.log('\n7. Офлайн-запуск');
{
  const http = require('http');
  const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
                 '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
  const hits = [];
  const srv = http.createServer((req, res) => {
    hits.push(req.url);
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const jsErrors = [];
  let w;
  try {
    const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/index.html`, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
      beforeParse(win) {
        win.HTMLCanvasElement.prototype.getContext = () =>
          new Proxy({}, { get: (t, k) => k === 'canvas' ? { width: 1, height: 1 } : () => {} });
        win.HTMLElement.prototype.scrollIntoView = () => {};
        win.addEventListener('error', (e) => jsErrors.push(e.message));
      }
    });
    w = dom.window;
    await new Promise(r => setTimeout(r, 1500));
  } catch (e) {
    no('офлайн-запуск', e.message);
  }
  srv.close();

  if (w) {
    is('игра стартует с настоящей загрузкой скриптов',
      typeof w.CB === 'object' && w.CB && w.CB.S.stage >= 1, 'stage=' + (w.CB && w.CB.S.stage));
    is('показан экран выбора класса', !!w.document.querySelector('#modal.open'));
    is('ни одного JS-исключения при старте', jsErrors.length === 0, jsErrors.slice(0, 2).join('; '));
    const external = hits.filter(u => /^https?:\/\/(?!127\.0\.0\.1)/.test(u));
    is('нет запросов во внешнюю сеть', external.length === 0, external.join(', '));
    const missing = hits.filter(u => !fs.existsSync(path.join(ROOT, u.split('?')[0])));
    is('все запрошенные файлы отдались (нет 404)', missing.length === 0, missing.slice(0, 3).join(', '));
    const cssOk = [...w.document.styleSheets].filter(s => { try { return s.cssRules.length > 0; } catch (e) { return false; } });
    is('CSS подключился (таблицы стилей разобраны)', cssOk.length >= 8, cssOk.length + ' таблиц');
  }
}

console.log(`\n${fail ? '✗ провалено: ' + fail : '✓ все тесты прошли'} (успешно ${pass})\n`);

}   // main

main().then(() => process.exit(fail ? 1 : 0)).catch(e => {
  console.error('\n✗ тесты упали с исключением:', e && e.stack || e);
  process.exit(1);
});
