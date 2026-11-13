#!/usr/bin/env node
/*
 * CURSEBOUND — симуляция баланса на реальном коде игры.
 *
 * Загружает игру в jsdom и играет «идеальным игроком»:
 *   - жмёт N кликов/сек (по умолчанию 5, человеческий темп);
 *   - скупает в лавке всё, что может, каждый тик;
 *   - тратит очки навыков по приоритету;
 *   - делает Разрыв Оков, как только порог достигнут (кулдаун обнулён);
 *   - повторяет `--cycles` забегов.
 *
 * Печатает по каждому забегу: время, макс. глубину, причину остановки.
 *
 * Запуск:  node tools/balance.js [--cycles 8] [--cps 5] [--class knight]
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
  'js/systems/clans.js', 'js/systems/pacts.js', 'js/systems/trials.js',
  'js/systems/pulse.js', 'js/systems/hidden.js',
  'js/ui/render.js', 'js/ui/modals.js', 'js/ui/hints.js',
  'js/main.js'
];

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const CYCLES = +arg('cycles', 8);
const CPS = +arg('cps', 5);
const CLS = arg('class', 'knight');
const NOPREST = process.argv.includes('--noprest');
const MAXMIN = +arg('max', 15);   // лимит одного забега, минут

function load() {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    runScripts: 'outside-only', url: 'http://localhost/', pretendToBeVisual: true
  });
  const w = dom.window;
  w.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: (t, k) => k === 'canvas' ? { width: 1, height: 1 } : () => {} });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const src = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  // Стабы тяжёлого DOM-рендера + мост наружу.
  const stubs = `
;['renderStats','renderShop','renderShopHead','renderShopAfford','renderGold','renderResBar',
  'renderSkillBar','renderBuffs','renderChips','renderGear','renderPets','renderPetLayer',
  'renderDeeds','renderMap','renderCodex','renderTrees','renderPTree','renderPrestCard',
  'renderTabBadges','renderXP','renderTitle','updateHP','renderStanceBar','renderModeChip',
  'renderForge','renderAch','renderGoals','spawnFloat','coinFly','soulBurst','arenaShake',
  'dropToast','petToast','truthToast','toast','hint','zoneBanner','showWeak','hideWeak',
  'log','voiceOfAbyss','classModal','subModal','offlineModal','checkHidden'
].forEach(function(n){ try{ eval(n+'=function(){}'); }catch(e){} });
// Фейковые часы: gameTick берёт dt из performance.now()
var __fakeNow = 1000;
performance.now = function(){ return __fakeNow; };
// кулдауны (престиж, колодец, метка, разлом) считаются от Date.now()
Date.now = function(){ return __fakeNow; };
lastTick = __fakeNow;

// считаем провалы Владык, подменяя bossFail в том же лексическом окружении
var __bossFails = 0;
{ const _bf = bossFail; bossFail = function(){ __bossFails++; return _bf(); }; }

window.__B = {
  get S(){return S}, set S(v){S=v},
  stats, bonuses, gameTick, clickAttack, spawnMob, killMob,
  canPrestige, shardGain, applyPrestige, prestReq, hpFor, goldFor, xpFor, xpNeed,
  SHOP, upgCost, buy, learnSkill, SK_COMMON, SK_CLASS, pLv, pCost, PN,
  learnP, renderAll, travelTo, setMode,
  get mob(){return mob}, get mobDead(){return mobDead}, set mobDead(v){mobDead=v},
  BOSS_TIME, PREST_REQ, prestReq,
  get bossFails(){ return __bossFails; },
  advance(ms){ __fakeNow += ms; },
  syncClock(){ lastTick = __fakeNow; }
};`;
  w.eval(src + stubs);
  return w;
}

function runCycle(w, mf) {
  const B = w.__B;
  B.syncClock();
  let simSec = 0;
  const TICK = 0.1;
  const clicks = CPS;
  let clickAcc = 0;
  let stallSince = null;
  let lastDepthChange = 0;
  let lastBossAt = 0, stuckAt = null;
  const bossFailsStart = B.bossFails;

  // играем до 10 сим-минут на забег (600 с) или до престижа
  const MAX = MAXMIN * 60;
  while (simSec < MAX) {
    B.advance(TICK * 1000);            // двигаем фейковые часы на один тик
    // клики равномерно по тикам
    clickAcc += clicks * TICK;
    while (clickAcc >= 1) { clickAcc -= 1; try { B.clickAttack(false); } catch (e) {} }
    try { B.gameTick(); } catch (e) { return { sec: simSec, depth: B.S.stage, why: 'CRASH ' + e.message }; }

    // в игре после убийства spawnMob вызывается через setTimeout(spawnMob, 620)
    // следим за Владыками: не убили за отведённое время → откат
    const m = B.mob;
    if (m && (m.boss||m.mark||m.riftBoss) && !B.mobDead) {
      if (m !== lastBossAt) { lastBossAt = m; if (!stuckAt) stuckAt = m.stage; }
    }
    if (B.mobDead) {
      simSec += 0.62; B.advance(620);
      B.mobDead = false;
      try { B.spawnMob(); } catch (e) {}
      B.syncClock();
    }

    // скупка: всё, что можем
    for (let guard = 0; guard < 100; guard++) {
      let bought = false;
      for (const it of B.SHOP) {
        const c = B.upgCost(it, 0);
        if (B.S.gold >= c) { B.S.gold -= c; B.S.u[it.id]++; bought = true; }
      }
      if (!bought) break;
    }
    // очки навыков
    if (B.S.sp > 0) {
      try {
        const nodes = (B.SK_COMMON || []).concat(B.SK_CLASS[B.S.cls] || []);
        for (const n of nodes) {
          if (B.S.sp <= 0) break;
          if (n.subNode) continue;
          const lv = B.S.skills[n.id] || 0;
          if (lv >= n.max || !n.apply) continue;
          if (n.req && !(B.S.skills[n.req] > 0)) continue;
          B.S.sp -= n.cost; B.S.skills[n.id] = lv + 1;
        }
      } catch (e) {}
    }
    // очки Вечной Тьмы
    if (B.S.shards > 0) {
      try {
        for (const n of ['pWrath','pGreed','pLore','pEdge','pSlumber','pDusk','pCrown','pStart','pGate']) {
          const node = B.PN(n); if (!node) continue;
          let guard2 = 0;
          while (B.S.shards >= B.pCost(node) && B.pLv(n) < node.max && guard2++ < 20) {
            if (node.req && B.pLv(node.req) < 1) break;
            B.S.shards -= B.pCost(node); B.S.ptree[n] = B.pLv(n) + 1;
          }
        }
      } catch (e) {}
    }

    if (B.S.maxStage > (global.__bestDepth || 0)) {
      global.__bestDepth = B.S.maxStage;
      global.__milestones = global.__milestones || [];
      global.__milestones.push({ sec: simSec, depth: B.S.maxStage, cycle: B.S.prestige + 1 });
    }
    // отслеживаем «застревание»: глубина не растёт 3 минуты
    if (B.S.stage !== stallSince) { stallSince = B.S.stage; lastDepthChange = simSec; }
    if (simSec - lastDepthChange > 180) {
      return { sec: simSec, depth: B.S.stage, maxRun: B.S.runMax, why: 'ЗАСТРЯЛ',
               bossFail: B.bossFails - bossFailsStart, stuckAt: stuckAt || B.S.stage };
    }
    // престиж
    if (!NOPREST && B.canPrestige()) {
      const gain = B.shardGain();
      if (gain > 0) {
        B.S.prestAt = 0;
        return { sec: simSec, depth: B.S.runMax, gain, why: 'ПРЕСТИЖ', bossFail: B.bossFails - bossFailsStart, stuckAt: stuckAt || B.S.runMax };
      }
    }
    simSec += TICK;
  }
  return { sec: simSec, depth: B.S.stage, maxRun: B.S.runMax, why: 'ТАЙМАУТ' };
}

const w = load();
const B = w.__B;
B.S.cls = CLS;
B.S.muted = true;
B.S.mode = 'deeper';

console.log(`\nСимуляция: класс=${CLS}, ${CPS} кликов/сек, ${CYCLES} забегов, лимит забега 15 мин\n`);
console.log('забег | время  | макс.глубина | престижей | осколки | итог');
console.log('------|--------|--------------|-----------|---------|------');

let total = 0;
const trace = [];
for (let i = 1; i <= CYCLES; i++) {
  const r = runCycle(w);
  trace.push({ cycle: i, sec: r.sec, depth: r.depth, why: r.why,
    bossFail: r.bossFail, stuckAt: r.stuckAt,
    dps: Math.round(B.stats().dps + B.stats().click * CPS),
    gold: B.S.gold, u: Object.assign({}, B.S.u), res: Object.assign({}, B.S.res) });
  total += r.sec;
  let applied = '';
  if (r.why === 'ПРЕСТИЖ') {
    B.S.prestAt = 0;
    B.applyPrestige(r.gain, { pow: 1, gold: 1, xp: 1 });
    applied = '+ ' + r.gain + ' оск.';
  }
  console.log(
    String(i).padStart(5) + ' | ' +
    (r.sec / 60).toFixed(1).padStart(5) + 'м | ' +
    String(r.depth).padStart(12) + ' | ' +
    String(B.S.prestige).padStart(9) + ' | ' +
    String(B.S.shards).padStart(7) + ' | ' +
    r.why + ' ' + applied
  );
  if (i === CYCLES) {
    console.log('\nТрассировка по забегам (суммарный DPS, включая клики):');
    console.log('забег | глубина | DPS        | золото      | blade servant power greed crit void | кровь пепел');
    for (const t of trace) {
      console.log(String(t.cycle).padStart(5)+' | '+String(t.depth).padStart(7)+' | '+
        String(t.dps).padStart(10)+' | '+String(Math.round(t.gold)).padStart(11)+' | '+
        [t.u.blade,t.u.servant,t.u.power,t.u.greed,t.u.crit,t.u.void].map(x=>String(x).padStart(5)).join(' ')+' | '+
        t.res.blood+' '+t.res.ash+' | провалов Владык: '+(t.bossFail||0)+
        ' | мк-' + t.u.awaken + '/' + t.u.echo + '/' + t.u.crown);
    }
  }
  if (global.__milestones && (i === CYCLES)) {
    console.log('\nВехи по максимальной глубине:');
    const m = global.__milestones.filter((x, idx, a) => idx === 0 || x.depth - a[idx-1].depth >= 10 || x.depth >= 190);
    console.log('  ' + m.map(x => x.depth + '(забег ' + x.cycle + ')').join(' · '));
  }
  if (i === CYCLES) {
    console.log(`\nИтого времени: ${(total / 60).toFixed(1)} мин`);
    console.log(`Макс. глубина за всё: ${B.S.maxStage}`);
    console.log(`Престижей: ${B.S.prestige}, осколков: ${B.S.shards}`);
  }
}
process.exit(0);
