"use strict";
/* ============================================================
   SYSTEMS / TRIALS — «Испытания Бездны»
   ------------------------------------------------------------
   Проблема: после 6-й минуты глубина ползёт по 2–3 за минуту, и это
   не видно никак — DPS растёт, а ощущения нет. Испытание делает рост
   видимым: включаешь печать, получаешь x2–x5 к добыче и глубине, но
   провал стирает забег до последней печати.

   Механика намеренно простая и читаемая:
     • 5 печатей с растущей ставкой.
     • Пока испытание активно — враги живучее на столько же, на сколько
       щедрее награда, но зато глубина растёт сразу на +N.
     • Провал (Владыка не убит вовремя) откатывает забег к чекпоинту.
     • Печать «Безмолвия» можно закрыть досрочно — и получить бонус.

   Состояние: S.trial = {on, seal, cp, fails, done}
   ============================================================ */

const TRIALS = [
  { id:'t1', n:'Печать Голода',      ic:'drop',    col:'#e8b94e', mult:2.0,  at:0,
    d:'×2 золота и опыта. Враги живучее в 1.5 раза.',
    hp:1.5,  need:20 },
  { id:'t2', n:'Печать Молчания',    ic:'whisper', col:'#7fd1c8', mult:2.6,  at:1,
    d:'×2.6 добычи. Провал откатывает к прошлой печати.',
    hp:1.9,  need:20 },
  { id:'t3', n:'Печать Голода II',   ic:'blood',   col:'#ff5c6e', mult:3.2,  at:2,
    d:'×3.2 добычи. Владыки получают вдвое больше HP.',
    hp:2.4,  need:20 },
  { id:'t4', n:'Печать Разлома',     ic:'rift',    col:'#9d8cff', mult:4.0,  at:3,
    d:'×4 добычи. Твари живучее в 3 раза.',
    hp:3.0,  need:20 },
  { id:'t5', n:'Последняя Печать',   ic:'skull',   col:'#ff7a4c', mult:5.0,  at:4,
    d:'×5 добычи. Всё живучее в 4 раза. Только для тех, кому мало.',
    hp:4.0,  need:20 }
];

function trialDef(){ return { on:false, seal:0, cp:1, fails:0, done:[], best:0, entered:0 }; }
const trialCur = () => (S.trial && S.trial.on ? TRIALS[S.trial.seal] : null);
const trialUnlocked = (i) => {
  if (i === 0) return S.prestige >= 0;
  return (S.trial.done || []).includes(TRIALS[i - 1].id);
};

/* Множитель награды и живучести — читается из bonuses() и makeMob() */
function trialGoldMul(){ const t = trialCur(); return t ? t.mult : 1; }
function trialHpMul(){ const t = trialCur(); return t ? t.hp : 1; }

function trialStart(i){
  const st = S.trial, seal = TRIALS[i];
  if (!seal || !trialUnlocked(i)) return;
  if (st.on) { log('Сначала закрой текущее испытание.', 'info'); return; }
  st.on = true;
  st.seal = i;
  st.cp = S.maxStage;          /* провал откатывает сюда */
  st.entered = now();
  S.mode = 'deeper';
  sfx.prestige(); arenaShake();
  log('<b>' + esc(seal.n) + '</b> зажжена. Ставка: ×' + seal.mult + ' добычи. Провал откатит тебя к глубине ' + st.cp + '.', 'boss');
  spawnMob(); renderAll(); save(true);
}

function trialStop(ok){
  const st = S.trial, seal = TRIALS[st.seal];
  if (!st.on) return;
  st.on = false;
  if (ok && seal){
    if (!st.done.includes(seal.id)) st.done.push(seal.id);
    st.best = Math.max(st.best, st.seal + 1);
    /* награда за закрытие — не только множитель */
    const sh = 2 + st.seal * 2;
    S.shards += sh; S.totalShards += sh;
    addRes('truth', 1);
    sfx.level();
    log('<b>' + esc(seal.n) + '</b> выдержана. +' + sh + ' осколков, +1 Осколок Истины.', 'ach');
  }
  renderTrialCard(); renderAll(); save(true);
}

/* Провал испытания: откат к чекпоинту, без потери вещей */
function trialFail(){
  const st = S.trial;
  if (!st.on) return false;
  st.fails++;
  const lost = Math.max(0, S.runMax - st.cp);
  S.stage = Math.max(1, st.cp);
  S.runMax = S.stage;
  st.on = false;
  sfx.death();
  log('Испытание провалено. Забег откатился на ' + S.stage + ' (потеряно ' + lost + ' глубин).', 'boss');
  renderTrialCard(); renderAll(); save(true);
  return true;
}

/* Сдача печати: 10 минут внутри или достигнут чекпоинт-плюс.
   Вызывается из тика; сама себя не спамит thanks to st.on. */
function trialAutoCheck(){
  const st = S.trial;
  if (!st || !st.on) return;
  const seal = TRIALS[st.seal];
  if (!seal) { st.on = false; return; }
  const timed = (now() - st.entered) > 600000;
  const deep  = S.runMax >= st.cp + seal.need;
  if (deep || timed) trialStop(true);
}

/* ---------------- Рендер: карточка в левой панели ---------------- */
function renderTrialCard(){
  const c = $('#trialCard');
  if (!c || !S.trial) return;
  const st = S.trial, cur = trialCur();
  if (cur){
    const left = Math.max(0, (st.entered + 600000) - now());   /* 10 минут на печать */
    c.innerHTML = '<div class="trial-card on" style="--tc:' + cur.col + '">' +
      '<div class="cc-head"><div class="cc-ic">' + IC[cur.ic] + '</div>' +
        '<div class="cc-nm">' + esc(cur.n) + '<small>Испытание идёт · ×' + cur.mult + ' добычи</small></div></div>' +
      '<div class="trial-meta">Чекпоинт: глубина <b>' + st.cp + '</b> · '
        + (left > 0 ? 'до сдачи ' + fmtTime(left / 1000) : 'можно сдавать') + '</div>' +
      '<div class="town-btns"><button class="mini sell" data-trial="stop">Сдать печать</button>' +
        '<button class="mini" data-trial="fail">Отступить (откат)</button></div>' +
    '</div>';
    return;
  }
  const list = TRIALS.map((t, i) => {
    const open = trialUnlocked(i);
    const done = st.done.includes(t.id);
    return '<button class="seal' + (open ? '' : ' locked') + (done ? ' done' : '') + '"' +
      (open ? ' data-trial="start" data-seal="' + i + '"' : ' disabled') + ' style="--tc:' + t.col + '">' +
      '<span class="se-ic">' + IC[open ? t.ic : 'lock'] + '</span>' +
      '<span class="se-n">' + esc(t.n) + '</span>' +
      '<span class="se-m">×' + t.mult + '</span>' +
    '</button>';
  }).join('');
  c.innerHTML = '<div class="trial-card">' +
    '<div class="cc-head"><div class="cc-ic">' + IC.rift + '</div>' +
      '<div class="cc-nm">Испытания Бездны<small>Печати дают ×2–×5 добычи ценой риска</small></div></div>' +
    '<div class="seals">' + list + '</div>' +
    '<div class="trial-meta">Провал откатывает забег к глубине, с которой ты вошёл. Вещи и ресурсы остаются.</div>' +
  '</div>';
}

//# sourceURL=js/systems/trials.js
