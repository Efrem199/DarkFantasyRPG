"use strict";
/* ============================================================
   SYSTEMS / PACTS — «Сделки»: постоянный поток решений
   ------------------------------------------------------------
   Проблема, которую закрывает файл: между покупками (раз в 15–30 с)
   и престижем (раз в 10 минут) в игре НЕ БЫЛО решений вообще. Игрок
   смотрел на растущее число. Сделки дают каждые несколько минут
   настоящий вопрос с ценой: взять сейчас силу — или подождать?

   Как устроено:
     • Раз в 2–4 минуты на арене появляется знак Сделки.
     • У сделки 2–3 ВАРИАНТА, у каждого — цена и срок.
     • Отказ тоже вариант (но знак уйдёт и вернётся не скоро).
     • Сделки необратимы: взял — живёшь с этим.

   Состояние — в S.pact. Ноль глобальных имён с префиксом city/CLANS.
   ============================================================ */

/* Виды сделок. `opts` — варианты; у каждого своя цена и эффект.
   `dur` — длительность эффекта в секундах (0 — навсегда/мгновенно). */
const PACTS = [
  {
    id:'blood', n:'Кровавая Сделка', ic:'blood', col:'#ff5c6e',
    lore:'Кто-то очень хочет, чтобы ты стал сильнее. Он готов заплатить собой.',
    opts:[
      { k:'take', n:'Взять кровь', d:'+35% ко всему урону на 3 минуты', dur:180,
        cost:'—', run(){ pactBuff('all',180,0.35); } },
      { k:'deep', n:'Взять глубже', d:'Вся Кровь Владык уходит, но +25% урона на 6 минут',
        cost:'вся Кровь', dur:360,
        can(){ return (S.res.blood||0)>=3; },
        run(){ S.res.blood=0; pactBuff('all',360,0.25); } }
    ]
  },
  {
    id:'greed', n:'Сделка Жадности', ic:'coin', col:'#e8b94e',
    lore:'Пепел торгуется. Он всегда просит меньше, чем даёт — в первый раз.',
    opts:[
      { k:'gold', n:'Взять золото', d:'Мгновенно: золота как за 3 минуты боя', dur:0,
        cost:'—', run(){ const st=stats(), g=Math.ceil(st.dps*180/hpFor(S.stage)*goldFor(S.stage)*st.goldMul);
          if (g>0){ S.gold+=g; S.totalGold+=g; spawnFloat('+'+nf(g)+' '+IC.coin,'gold'); } } },
      { k:'curse', n:'Взять вдвойне', d:'×2 к золоту на 4 минуты, но −20% урона', dur:240,
        cost:'−20% урона', run(){ pactBuff('gold',240,1.0); pactBuff('all',240,-0.20); } }
    ]
  },
  {
    id:'echo', n:'Эхо Чужого Забега', ic:'ghost', col:'#9d8cff',
    lore:'Кто-то уже умирал здесь. Его опыт ещё тёплый.',
    opts:[
      { k:'xp', n:'Взять память', d:'Мгновенно большой опыт', dur:0,
        cost:'—', run(){ gainXP(Math.ceil(xpFor(S.stage)*8*(1+S.prestige*0.3))); } },
      { k:'shard', n:'Взять осколок', d:'+1 Осколок Истины, но −1 уровень', dur:0,
        cost:'−1 уровень', can(){ return S.lvl>3; },
        run(){ addRes('truth',1); S.lvl=Math.max(1,S.lvl-1); renderStats(); } }
    ]
  },
  {
    id:'hunt', n:'Знак Охоты', ic:'target', col:'#ff7a4c',
    lore:'Тебе показывают, где спрятано то, что стоит забрать.',
    opts:[
      { k:'mark', n:'Принять метку', d:'Следующий враг — меченый (гарантированная добыча)', dur:0,
        cost:'—', run(){ S.markPending=true; } },
      { k:'elite', n:'Принять стаю', d:'Три элиты подряд, но добыча +30% на 2 минуты', dur:120,
        cost:'3 элиты', run(){ S.pact.elites=3; pactBuff('drop',120,0.30); } }
    ]
  },
  {
    id:'silence', n:'Сделка Молчания', ic:'whisper', col:'#7fd1c8',
    lore:'Сёстры предлагают забыть. Забвение — тоже сила.',
    opts:[
      { k:'calm', n:'Взять тишину', d:'Сбросить Осквернение и получить ×2 Шёпот на 5 минут', dur:300,
        cost:'—', run(){ S.curse=null; S.curseT=0; pactBuff('whis',300,1.0); } },
      { k:'burn', n:'Взять забвение', d:'Сжечь проклятие: −1 Осквернение навсегда, но −10% золота', dur:0,
        cost:'−10% золота', can(){ return !!S.curse; },
        run(){ S.curse=null; S.curseT=0; pactBuff('gold',3600,-0.10); } }
    ]
  },
  {
    id:'oath', n:'Сделка Присяги', ic:'chain', col:'#e8b94e',
    lore:'Одна клятва. Один шанс. Обратно дороги не будет.',
    opts:[
      { k:'pow', n:'Присягнуть силе', d:'+45% ко всему урону на 5 минут, но комбо больше не растёт', dur:300,
        cost:'без комбо', run(){ pactBuff('all',300,0.45); pactBuff('nocombo',300,1); } },
      { k:'fast', n:'Присягнуть скорости', d:'×1.6 к автоурону на 5 минут', dur:300,
        cost:'—', run(){ pactBuff('dps',300,0.6); } }
    ]
  }
];

/* ---------------- Состояние ---------------- */
function pactDef(){ return { now:null, next:0, taken:0, refused:0, elites:0, buffs:[],
                            log:[], lastId:null }; }

/* Эффект живёт в отдельном списке, а не в S.buffs: он не должен
   сбрасываться зельями и оффлайном. */
function pactBuff(kind, sec, val){
  const st = S.pact;
  st.buffs.push({ k:kind, until:now()+sec*1000, v:val });
}

function pactLeft(b){ return Math.max(0, b.until - now()); }

/* Суммарный бонус по типу (перемножение множителей, сумма процентов) */
function pactMul(kind){
  let add = 1;
  for (const b of S.pact.buffs) {
    if (b.k !== kind || pactLeft(b) <= 0) continue;
    add *= (1 + b.v);
  }
  return add;
}
function pactHas(kind){
  return S.pact.buffs.some(b => b.k === kind && pactLeft(b) > 0);
}

/* ---------------- Выпадение сделки ---------------- */
function maybePact(){
  const st = S.pact;
  if (!st || st.now || S.maxStage < 8) return;
  if (now() < st.next) return;
  offerPact();
}

function offerPact(){
  const st = S.pact;
  const pool = PACTS.filter(p => p.id !== st.lastId &&
    p.opts.some(o => !o.can || o.can()));
  if (!pool.length) { st.next = now() + 60000; return; }
  const p = pick(pool);
  st.now = p.id;
  st.lastId = p.id;
  st.expires = now() + 90000;   /* окно живёт 90 секунд */
  sfx.mark();
  log('<b>Сделка</b> ждёт решения: '+esc(p.n)+'.', 'boss');
  hint('pact','Сделки','Знак Сделки — это выбор с ценой. Варианты расходятся навсегда: один билет в руки, второй в спину. Окно живёт 90 секунд.');
  renderPactBadge();
  renderPactCard();
}

function closePact() {
  const st = S.pact;
  st.now = null;
  st.expires = 0;
  st.next = now() + (120 + Math.random()*120) * 1000;
  renderPactBadge();
  renderPactCard();
}

function takePact(optKey){
  const st = S.pact, p = PACTS.find(x => x.id === st.now);
  if (!p) return;
  const o = p.opts.find(x => x.k === optKey);
  if (!o || (o.can && !o.can())) return;
  o.run();
  st.taken++;
  st.log.unshift({ id:p.id, k:o.k, at:now() });
  if (st.log.length > 12) st.log.pop();
  sfx.level(); arenaShake();
  log('<b>'+esc(p.n)+'</b> заключена: '+esc(o.n)+'.', 'ach');
  closePact();
  renderResBar(); renderStats(); renderGold();
  save(true);
}

function refusePact(){
  const st = S.pact;
  if (!st.now) return;
  st.refused++;
  /* отказ не бесплатен: следующий знак придёт позже, но дадут «залог» */
  st.next = now() + (300 + Math.random()*180) * 1000;
  addRes('whisper', 2, true);
  log('Ты отказался от Сделки. Тьма оценила это по-своему.', 'info');
  closePact();
  renderResBar();
  save(true);
}

/* ---------------- Тик ---------------- */
function pactsTick(){
  const st = S.pact;
  if (!st) return;
  /* сгоревшие эффекты */
  if (st.buffs.length) {
    const before = st.buffs.length;
    st.buffs = st.buffs.filter(b => pactLeft(b) > 0);
    if (st.buffs.length !== before) renderPactBuffs();
  }
  /* знак живёт 90 секунд */
  if (st.now && st.expires && now() > st.expires) {
    log('Знак Сделки погас. Тьма не ждёт.', 'info');
    st.now = null;
    st.next = now() + 90000;
    renderPactBadge();
    renderPactCard();
  }
  maybePact();
}

/* Элиты по сделке «Знак Охоты».
   makeMob() вызывается в том числе «вхолостую» (предпросмотр, тесты),
   поэтому счётчик тратится только когда враг реально уходит на арену. */
function pactForcedElite(){ return !!(S.pact && S.pact.elites > 0); }
function pactConsumeElite(){ if (S.pact && S.pact.elites > 0) S.pact.elites--; }

/* ---------------- Рендер ---------------- */
function renderPactBadge(){
  const st = S.pact, c = $('#pactBadge');
  if (!c) return;
  c.classList.toggle('on', !!(st && st.now));
  if (st && st.now) {
    const p = PACTS.find(x => x.id === st.now);
    c.innerHTML = IC[p.ic] + '<span>' + esc(p.n) + '</span>';
  }
}

function renderPactBuffs(){
  const c = $('#pactBuffs');
  if (!c || !S.pact) return;
  const ico = { all:'sword', gold:'coin', dps:'dps', drop:'gem', whis:'whisper', nocombo:'chain' };
  const names = { all:'Урон', gold:'Золото', dps:'Автоурон', drop:'Добыча', whis:'Шёпот', nocombo:'Без комбо' };
  const live = S.pact.buffs.filter(b => pactLeft(b) > 0);
  c.innerHTML = live.map(b => {
    const pct = b.k === 'nocombo' ? '' : ' ' + (b.v < 0 ? '' : '+') + Math.round(b.v * 100) + '%';
    return '<span class="pb ' + (b.v < 0 ? 'bad' : '') + '">' + IC[ico[b.k] || 'zap'] +
      names[b.k] + pct + ' · ' + fmtTime(pactLeft(b) / 1000) + '</span>';
  }).join('');
  c.classList.toggle('on', live.length > 0);
}

/* Карточка сделки — открывается поверх арены, когда знак активен */
function renderPactCard(){
  const c = $('#pactCard');
  if (!c || !S.pact) return;
  const st = S.pact, p = st.now ? PACTS.find(x => x.id === st.now) : null;
  c.classList.toggle('open', !!p);
  if (!p) { c.innerHTML = ''; return; }
  const left = st.expires ? Math.max(0, st.expires - now()) : 90000;
  const opts = p.opts.map(o => {
    const can = !o.can || o.can();
    return '<button class="pc-opt' + (can ? '' : ' off') + '" data-pact="' + o.k + '"' +
      (can ? '' : ' disabled') + '>' +
      '<span class="po-n">' + esc(o.n) + '</span>' +
      '<span class="po-d">' + esc(o.d) + '</span>' +
      '<span class="po-c">' + esc(o.cost) + '</span>' +
    '</button>';
  }).join('');
  c.innerHTML = '<div class="pact-card" style="--pc:' + p.col + '">' +
    '<div class="pc-head"><div class="pc-ic">' + IC[p.ic] + '</div>' +
      '<div class="pc-nm">' + esc(p.n) + '<small>' + esc(p.lore) + '</small></div>' +
      '<div class="pc-timer">' + Math.ceil(left / 1000) + 'с</div></div>' +
    '<div class="pc-opts">' + opts + '</div>' +
    '<button class="pc-no" data-pact="refuse">Отказаться (знак погаснет)</button>' +
  '</div>';
}

//# sourceURL=js/systems/pacts.js
