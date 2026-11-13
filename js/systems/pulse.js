"use strict";
/* ============================================================
   SYSTEMS / PULSE — «Пульс»: видимый темп и события-вехи
   ------------------------------------------------------------
   Проблема, которую закрывает файл: между 6-й и 10-й минутой глубина
   растёт на 2–3 за минуту, и это не ощущается никак — нет ни числа,
   ни события, только растущий DPS. Пульс делает три вещи:

     1. Считает ТЕМП: глубин в минуту, золота в минуту (скользящее
        среднее за 30 с). Число на арене заметно шевелится — это и есть
        ощущение инкрементальности.
     2. Отмечает вехи глубины: каждые 5 глубин — короткий тик и всплывающая
        цифра. Каждые 25 — «ЭХО» с бонусом золота.
     3. Ловит застой: если 45+ секунд ни покупки, ни новой глубины —
        подсказывает КОНКРЕТНЫЙ рычаг: престиж, испытание, сделка, город.

   Состояние — рантайм (не сохраняется): после перезагрузки темп иначе
   «врёт» оффлайном.
   ============================================================ */

const PULSE = {
  goldEma:0, depthEma:0, buyEma:0,
  lastGold:0, lastDepth:0, lastBuy:0, lastSeenStage:1,
  idle:0, lastNudge:0, marks:[], nextDepthMark:5
};

function pulseReset(){
  PULSE.goldEma=0; PULSE.depthEma=0; PULSE.buyEma=0;
  PULSE.lastGold=S.totalGold||0; PULSE.lastDepth=S.maxStage||1;
  PULSE.lastBuy=0; PULSE.lastSeenStage=S.stage||1;
  PULSE.idle=0; PULSE.lastNudge=0; PULSE.marks=[];
  PULSE.nextDepthMark=(Math.floor((S.maxStage||1)/5)+1)*5;
}

/* Покупка в лавке держит темп живым */
function pulseBuy(){ PULSE.lastBuy=now(); }

function pulseTick(dt){
  if (!PULSE.lastGold) { pulseReset(); return; }
  /* скользящее среднее «в минуту»: окно ~30 секунд */
  const k = Math.min(1, dt / 30);
  const dGold = Math.max(0, (S.totalGold||0) - PULSE.lastGold);
  const dDepth = Math.max(0, (S.maxStage||1) - PULSE.lastDepth);
  PULSE.lastGold = S.totalGold||0;
  PULSE.lastDepth = S.maxStage||1;
  PULSE.goldEma += (dGold / Math.max(dt, 0.001) * 60 - PULSE.goldEma) * Math.min(1, k * 3);
  PULSE.depthEma += (dDepth / Math.max(dt, 0.001) * 60 - PULSE.depthEma) * Math.min(1, k * 3);

  /* --- вехи глубины --- */
  while (S.maxStage >= PULSE.nextDepthMark) {
    pulseMilestone(PULSE.nextDepthMark);
    PULSE.nextDepthMark += 5;
  }

  /* --- застой: 60 секунд без новой глубины и без покупки --- */
  const stale = (now() - PULSE.lastBuy) > 60000 && S.maxStage > 8;
  PULSE.idle = stale ? PULSE.idle + dt : 0;
  if (PULSE.idle > 45 && now() - PULSE.lastNudge > 120000) {
    PULSE.lastNudge = now();
    pulseNudge();
    PULSE.idle = 0;
  }
}

/* Веха: короткое, но осязаемое событие */
function pulseMilestone(d){
  const every = d % 25 === 0;
  const g = Math.ceil((60 + d * 4) * (1 + S.prestige * 0.2));
  S.gold += g; S.totalGold += g;
  spawnFloat('<b>' + d + '</b> ГЛУБИНА' + (every ? '<br>+' + nf(g) + ' золота' : ''), every ? 'sig' : 'exec');
  if (every) {
    sfx.level(); arenaShake();
    log('Веха: глубина <b>' + d + '</b>. Бездна отметила тебя: +' + nf(g) + ' золота.', 'ach');
  } else {
    sfx.crit();
    log('Глубина <b>' + d + '</b> взята.', 'kill');
  }
  checkAch();
  PULSE.marks.push(d);
  if (PULSE.marks.length > 8) PULSE.marks.shift();
}

/* Застой: не «играй активнее», а конкретный рычаг */
function pulseNudge(){
  const cands = [];
  if (canPrestige()) cands.push(['prest', 'Разрыв Оков доступен: ' + shardGain() + ' осколков ждут. Вкладка <b>Тьма</b>.']);
  if (S.trial && !S.trial.on && (S.trial.done.length || S.maxStage >= 15))
    cands.push(['trial', 'Печать Испытания даст ×2 к добыче — вкладка «Герой», блок <b>Испытания Бездны</b>.']);
  if (S.city && S.maxStage >= 6)
    cands.push(['town', 'Города ждут: цены дрейфуют, а караван приносит золото само. Клавиша <b>V</b>.']);
  if (S.pets && Object.keys(S.pets).length && S.exped.length < 1)
    cands.push(['exped', 'Свита простаивает — отправь фамильяра в экспедицию, он принесёт ресурсы. Вкладка <b>Дела</b>.']);
  if (S.sp > 0) cands.push(['skills', 'У тебя <b>' + S.sp + '</b> неистраченных очков навыка. Вкладка <b>Путь</b>.']);
  const pickMsg = cands.length ? pick(cands) : null;
  if (pickMsg) log(pickMsg[1], 'info');
}

/* ---------------- Рендер: строка темпа под ареной ---------------- */
function renderPulse(){
  const c = $('#pulseStrip');
  if (!c) return;
  const dm = PULSE.depthEma, gm = PULSE.goldEma;
  const nextMark = PULSE.nextDepthMark;
  c.innerHTML =
    '<span class="ps-item" title="Сколько глубин в минуту ты проходишь сейчас">' +
      IC.down + 'глубин/мин <b>' + (dm > 0.05 ? dm.toFixed(1) : '0') + '</b></span>' +
    '<span class="ps-item" title="Сколько золота в минуту приносит бой">' +
      IC.coin + nf(gm) + ' зол./мин</span>' +
    '<span class="ps-item' + (S.maxStage >= nextMark - 1 ? ' hot' : '') + '" title="Следующая веха глубины">' +
      IC.flag + 'веха <b>' + nextMark + '</b></span>';
}

//# sourceURL=js/systems/pulse.js
