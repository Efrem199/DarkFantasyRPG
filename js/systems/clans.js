"use strict";
/* ============================================================
   SYSTEMS / CLANS — «Города Пепла»
   ------------------------------------------------------------
   Карта из шести городов, четыре клана с идеологиями, торговля
   с дрейфующими ценами, караваны, репутация и войны, в которых
   нужно ВЫБРАТЬ СТОРОНУ.

   Правила, которые делают выбор настоящим:
     • Союзы и вражда — зашиты в идеологии клана; нельзя усидеть
       на двух стульях.
     • Каждая помощь кому-то — минус у его врага (rep спарринг).
     • Войны решаются присягой: помогая одной стороне, ты
       навсегда портишь отношения со второй.
     • Кланы дают РАЗНЫЕ бонусы за услуги, а не «+X% по мелочи».

   Данные кланов/городов — константы, состояние — в S.city.
   ============================================================ */

/* ---------------- Кланы ---------------- */
const CLANS = {
  ash: {
    id:'ash', n:'Пепельный Конклав', short:'Конклав', ic:'candle', col:'#e8b94e',
    doctrine:'Порядок из пепла. Живые должны служить мёртвым, иначе всё рассыплется.',
    lore:'Жрецы, что пережили сожжение своих храмов и решили: раз пепел остался — он и есть закон.',
    likes:['ashen','cinders'], hates:['iron'],
    service:{ n:'Обряд Очищения', d:'Снять с себя Осквернение и получить 60 с лечения души.', ic:'candle',
      cost:{ash:20}, go(){ S.curse=null; S.curseT=0; S.buffs.all=Math.max(S.buffs.all,60); } },
    perk:'Пепел и Шёпот · +8% за каждые 25 репутации'
  },
  iron: {
    id:'iron', n:'Железный Договор', short:'Договор', ic:'shield', col:'#8f9bb3',
    doctrine:'Слово — металл. Всё продаётся, и цена известна заранее.',
    lore:'Кузнецы и торговцы, которые пережили три осады, ни разу не открыв ворот, и научились продавать осаждающим осадные машины.',
    likes:['ashen','cinders'], hates:['ash'],
    service:{ n:'Ковка Договора', d:'Перековать надетое без затрат Крови: +6% к случайному стату.', ic:'anvil',
      cost:{gold:200}, go(){ /* реализация ниже: clanReforge() */ } },
    perk:'Золото · +8% за каждые 25 репутации'
  },
  cinders: {
    id:'cinders', n:'Дети Углей', short:'Угли', ic:'flame', col:'#ff7a4c',
    doctrine:'Всё сгорит. Чем громче треск, тем честнее жизнь.',
    lore:'Беглецы из всех городов сразу. Они не строили стен — они сожгли чужие и поселились в углях.',
    likes:['ash','iron'], hates:[],
    service:{ n:'Кострище', d:'Сжечь Осквернённую вещь и получить Пепел и Кровь.', ic:'flame',
      cost:{gold:100}, go(){ /* реализация ниже: clanBurn() */ } },
    perk:'Урон · +8% за каждые 25 репутации'
  },
  ashen: {
    id:'ashen', n:'Немые Сёстры', short:'Сёстры', ic:'moon', col:'#9d8cff',
    doctrine:'Ничего не говорить. Всё слышать. Никого не прощать.',
    lore:'Они дали обет молчания, когда поняли: любое слово можно продать. Молчание — нельзя.',
    likes:['iron','cinders'], hates:[],
    service:{ n:'Тихий Дар', d:'Открыть карту: скрытая глубина или осколок Истины.', ic:'moon',
      cost:{whisper:12}, go(){ /* реализация ниже */ } },
    perk:'Опыт · +8% за каждые 25 репутации'
  }
};

/* ---------------- Города ---------------- */
const CITIES = [
  { id:'highspire', n:'Высокий Шпиль', ru:'Шпиль', cx:.50, cy:.10, clan:'ash',    ic:'crown',
    d:'Город на костях собора. Дым от богослужений не рассеивается уже двести лет.',
    mk:{ash:0.85, blood:1.10, gold:1.00}, req:6,
    lore:'Никто не помнит, кому молятся в Шпиле. Помнят только, что отвечают.' },
  { id:'redhill', n:'Красные Холмы', ru:'Холмы', cx:.14, cy:.42, clan:'ash',    ic:'blood',
    d:'Виноградники умерли, но вино осталось. Оно до сих пор считается лучшим.',
    mk:{blood:0.82, ash:1.05, whisper:1.00}, req:10,
    lore:'Почва здесь красная не от глины. Виноградари об этом не говорят.' },
  { id:'vermine', n:'Вермина', ru:'Вермина', cx:.50, cy:.52, clan:'iron',   ic:'shield',
    d:'Единственный город с настоящими воротами. Их ни разу не открыли бесплатно.',
    mk:{gold:1.30, ash:0.80, blood:0.95}, req:14,
    lore:'На воротах выбито: «Вход по счёту. Выход — по счёту тоже».' },
  { id:'hollowmir', n:'Холлоумир', ru:'Холлоумир', cx:.26, cy:.80, clan:'cinders', ic:'flame',
    d:'Город, который сгорел до основания и был отстроен из того, что не сгорело.',
    mk:{ash:0.70, blood:0.90, gold:1.10}, req:20,
    lore:'Мастерские здесь строят осадные машины из стен соседей. Соседи в курсе.' },
  { id:'whitcairn', n:'Белая Осыпь', ru:'Осыпь', cx:.80, cy:.74, clan:'cinders', ic:'urn',
    d:'Костяной город на склоне: дома пристроены друг к другу, как рёбра.',
    mk:{ash:0.75, whisper:0.85, blood:1.05}, req:26,
    lore:'Чем ниже спускаешься, тем старше кости. На дне — те, кто ещё разговаривает.' },
  { id:'grimgate', n:'Мрачные Врата', ru:'Врата', cx:.87, cy:.28, clan:'ashen', ic:'moon',
    d:'Столица молчания. Сюда приходят те, кому больше нечего сказать.',
    mk:{whisper:0.60, truth:0.90, ash:1.10}, req:34,
    lore:'У ворот нет стражи. Зачем охранять тех, кто уже молчит?' }
];
const CITY = id => CITIES.find(c => c.id === id);

/* Товары: что где покупают и продают */
const CGOODS = [
  { id:'ash',   n:'Пепел Душ',      ic:'urn',     base:14  },
  { id:'blood', n:'Кровь Владык',   ic:'drop',    base:48  },
  { id:'whisper', n:'Шёпот',        ic:'whisper', base:36  },
  { id:'gold',  n:'Золото',         ic:'coin',    base:1   },
  { id:'relice',n:'Реликвия',       ic:'orb',     base:900 }
];

const CITY_CD = 600000;   /* услуга клана — раз в 10 минут */

/* Выбранный город на карте — рантайм, не сохраняется */
const LAYOUT = { townSel:null };

/* ---------------- Состояние ---------------- */
function cityDef(){
  const rep = {}; Object.keys(CLANS).forEach(k => rep[k] = 0);
  return { rep, trade:{}, visited:[], caravan:null, war:null, services:{}, lastDay:0,
           trades:0, caravans:0, honors:{} };
}
/* Дрейф цен: синусоида по городам + событие недели. Детерминированно от времени. */
function cityPrice(cityId, goodId){
  const c = CITY(cityId); if (!c) return null;
  const g = CGOODS.find(x => x.id === goodId); if (!g) return null;
  const i = CITIES.indexOf(c), j = CGOODS.indexOf(g);
  const drift = 1 + 0.28 * Math.sin((now() / 3.6e6) + i * 1.7 + j * 2.3);   /* ±28% раз в час */
  const mk = c.mk[goodId] || 1;
  return Math.max(1, Math.round(g.base * mk * drift));
}
/* Репутация: 0..300. Помощь врагу клана уменьшает твою у него. */
function clanRep(id){ return (S.city && S.city.rep && S.city.rep[id]) || 0; }
function repTier(r){ return r >= 200 ? 3 : r >= 120 ? 2 : r >= 50 ? 1 : 0; }
const REP_NAMES = ['Чужак', 'Проситель', 'Друг', 'Кровный'];

function addRep(id, amount, reason){
  const st = S.city; if (!st) return;
  const before = clanRep(id);
  st.rep[id] = clamp(Math.round(before + amount), 0, 300);
  const cl = CLANS[id];
  if (amount > 0) {
    /* помощь врагу клана бьёт по его репутации */
    (cl.hates || []).forEach(h => {
      st.rep[h] = clamp(Math.round(clanRep(h) - amount * 0.6), 0, 300);
    });
  }
  const after = clanRep(id);
  if (Math.floor(before / 50) !== Math.floor(after / 50) && after > before) {
    log(`<b>${esc(cl.n)}</b>: теперь ты ${REP_NAMES[repTier(after)]}.`, 'ach');
    sfx.ach();
  }
}

/* Бонусы кланов в боевую математику */
function clanBonuses(B){
  const st = S.city; if (!st) return;
  const t = (id, div) => Math.floor(clanRep(id) / 25) * (div || 0.08);
  B.ashMul   += t('ash');
  B.whisMul  += t('ash');
  B.goldMul  *= 1 + t('iron');
  B.allMul   *= 1 + t('cinders');
  B.xpMul    *= 1 + t('ashen');
  /* война: +15% урона за сторону, которой присягнул */
  if (st.war && st.war.side) B.allMul *= 1.15;
}

/* ---------------- Города: открытие и посещение ---------------- */
const cityOpen = (c) => !!c && !!S.city && S.maxStage >= c.req;
function cityVisit(id){
  const c = CITY(id); if (!c || !cityOpen(c)) return;
  if (!S.city.visited.includes(id)) {
    S.city.visited.push(id);
    addRep(c.clan, 10, 'первое посещение');
    log(`Ты вошёл в <b>${esc(c.n)}</b>. ${esc(c.lore)}`, 'info');
    sfx.mark();
  }
  LAYOUT.townSel = id;
  renderTown(); save(true);
}

/* ---------------- Караваны ---------------- */
const CARAVAN_MIN = 2;
function caravanReady(){ return !S.city.caravan; }
function caravanTo(toId){
  const st = S.city;
  if (st.caravan || !cityOpen(CITY(toId))) return;
  const from = LAYOUT.townSel || 'vermine';
  const c = CITY(toId);
  st.caravan = { from, to:toId, end:now() + CARAVAN_MIN * 60000 };
  st.caravans++;
  sfx.voice();
  log(`Караван ушёл в <b>${esc(c.n)}</b>. Он вернётся через ${CARAVAN_MIN} мин.`, 'info');
  renderTown(); save(true);
}
function caravanArrive(){
  const st = S.city, cv = st.caravan; if (!cv) return;
  if (now() < cv.end) return;
  const to = CITY(cv.to);
  /* награда: ресурс, которого в городе дешевле всего */
  const best = ['ash', 'blood', 'whisper'].sort((a, b) => cityPrice(cv.to, a) - cityPrice(cv.to, b))[0];
  const amount = Math.max(2, Math.round(8 + S.maxStage * 0.25));
  addRes(best, amount, true);
  addRep(to.clan, 12, 'караван');
  /* доход каравана ограничен: он не должен обгонять сам бой */
  const g = Math.round((120 + Math.min(S.maxStage, 60) * 12) * (1 + clanRep(to.clan) / 300));
  S.gold += g; S.totalGold += g;
  st.caravan = null;
  log(`Караван вернулся из <b>${esc(to.n)}</b>: +${nf(g)} золота, +${amount} ${RES[best].n}.`, 'gold');
  renderTown(); renderGold();
  save(true);
}

/* ---------------- Торговля ---------------- */
function tradeAmount(goodId, cityId){
  /* максимум, что город готов взять/дать */
  const p = cityPrice(cityId, goodId);
  if (goodId === 'gold') return Math.max(1, Math.floor(S.gold / p));
  return S.res[goodId] || 0;
}
function sellGood(goodId, cityId, n){
  const c = CITY(cityId);
  if (!c || !cityOpen(c)) return;
  n = Math.max(1, Math.floor(n || 1));
  if (goodId === 'gold') return;
  const have = S.res[goodId] || 0;
  if (n > have) n = have;
  if (n < 1) return;
  const price = cityPrice(cityId, goodId);
  const total = Math.round(price * n * 1.0);
  S.res[goodId] -= n;
  S.gold += total; S.totalGold += total;
  S.city.trades++;
  addRep(c.clan, Math.max(1, Math.round(n * 0.25)), 'торговля');
  sfx.gold(); spawnFloat('+' + nf(total) + ' ' + IC.coin, 'gold');
  log(`Продано: ${n} ${RES[goodId].n} в ${esc(c.n)} за ${nf(total)} золота.`, 'gold');
  renderResBar(); renderGold(); renderTown(); save(true);
}
function buyGood(goodId, cityId, n){
  const c = CITY(cityId);
  if (!c || !cityOpen(c)) return;
  if (goodId === 'gold') return;
  n = Math.max(1, Math.floor(n || 1));
  const price = cityPrice(cityId, goodId);
  const total = Math.round(price * n * 1.15);   /* наценка города */
  if (S.gold < total) return;
  S.gold -= total;
  S.res[goodId] = (S.res[goodId] || 0) + n;
  S.city.trades++;
  addRep(c.clan, Math.max(1, Math.round(n * 0.25)), 'торговля');
  sfx.buy();
  log(`Куплено: ${n} ${RES[goodId].n} в ${esc(c.n)} за ${nf(total)} золота.`, 'buy');
  renderResBar(); renderGold(); renderTown(); save(true);
}

/* ---------------- Услуги кланов ---------------- */
function clanService(id){
  const cl = CLANS[id];
  if (!cl || !S.city) return;
  const st = S.city;
  st.services = st.services || {};
  const need = repTier(clanRep(id)) >= 1;      /* «Проситель» и выше */
  if (!need) {
    log(`${esc(cl.n)} не станет слушать чужака. Нужна репутация «Проситель» (50).`, 'info');
    return;
  }
  /* Стоимость услуги */
  const cost = cl.service.cost || {};
  for (const k in cost) {
    if (k === 'gold') { if (S.gold < cost[k]) { log('Не хватает золота.', 'info'); return; } }
    else if ((S.res[k] || 0) < cost[k]) { log('Не хватает ресурсов.', 'info'); return; }
  }
  /* Услуга — раз в 10 минут: иначе перековка и сожжение превращаются в спам */
  const cd = CITY_CD;
  if (st.services && st.services[id] && now() - st.services[id] < cd) {
    log(`<b>${esc(cl.n)}</b> занят. Возвращайся через ${fmtTime((cd - (now() - st.services[id])) / 1000)}.`, 'info');
    return;
  }
  /* плата взимается всегда — иначе услуга, которая «не сработала»,
     остаётся бесплатной наградой */
  for (const k in cost) { if (k === 'gold') S.gold -= cost[k]; else S.res[k] -= cost[k]; }
  st.services[id] = now();
  /* Спец-случаи */
  if (id === 'iron') { return clanReforge(); }
  if (id === 'cinders') { return clanBurn(); }
  if (id === 'ashen') { return clanSilentGift(); }
  cl.service.go();
  addRep(id, 3, 'услуга');
  sfx.sig();
  log(`<b>${esc(cl.n)}</b>: ${cl.service.n} исполнено.`, 'ach');
  renderResBar(); renderGold(); renderTown(); save(true);
}

/* Железо: перековка без Крови, раз в сутки */
function clanReforge(){
  const items = Object.values(S.equip).filter(Boolean);
  if (!items.length) { log('Нечего перековывать: надень снаряжение.', 'info'); return; }
  const it = items[0];
  const keys = Object.keys(it.st);
  if (!keys.length) return;
  const k = pick(keys);
  it.st[k] = Math.round((it.st[k] + 0.06) * 1000) / 1000;
  addRep('iron', 4, 'перековка');
  sfx.forge();
  log(`<b>Железный Договор</b> перековал «${esc(it.n)}»: ${STAT_DEF[k].n} +6%.`, 'ach');
  renderGear(); renderStats(); renderTown(); save(true);
}
/* Угли: сжечь предмет → Пепел и Кровь */
function clanBurn(){
  const junk = S.inv.filter(i => (RAR[i.rar] || {}).n !== 'Мифическая');
  if (!junk.length) { log('Нечего сжигать.', 'info'); return; }
  const it = junk[0];
  const idx = S.inv.indexOf(it); if (idx < 0) return;
  S.inv.splice(idx, 1);
  const ash = 6 + it.rar * 8, blood = 1 + Math.floor(it.rar / 2);
  addRes('ash', ash, true); addRes('blood', blood, true);
  addRep('cinders', 4, 'сожжение');
  sfx.forge();
  log(`<b>Дети Углей</b> сожгли «${esc(it.n)}»: +${ash} Пепла, +${blood} Крови.`, 'ach');
  renderResBar(); renderGear(); renderGold(); renderTown(); save(true);
}
/* Сёстры: скрытая глубина или осколок Истины */
function clanSilentGift(){
  addRep('ashen', 4, 'дар');
  if (Math.random() < 0.5 && HIDDEN_ZONES.some(z => !S.hidden.includes(z.id))) {
    const z = pick(HIDDEN_ZONES.filter(z => !S.hidden.includes(z.id)));
    unlockHidden(z.id);
    log(`<b>Немые Сёстры</b> показали путь: ${esc(z.z)}.`, 'ach');
  } else {
    addRes('truth', 1);
    log(`<b>Немые Сёстры</b> отдали молчание: +1 Осколок Истины.`, 'truth');
  }
  sfx.truth(); renderResBar(); renderTown(); save(true);
}

/* ---------------- Войны ---------------- */
/* Пара кланов, которые воюют; выбирается детерминированно по «неделе». */
function warPair(){
  const ids = Object.keys(CLANS);
  const week = Math.floor(now() / (6048e5));
  const a = ids[week % ids.length];
  let b = ids[(week * 3 + 1) % ids.length];
  if (b === a) b = ids[(ids.indexOf(a) + 1) % ids.length];
  return [a, b];
}
function ensureWar(){
  const st = S.city; if (!st) return;
  const [a, b] = warPair();
  const key = `${a}:${b}`;
  if (!st.war || st.war.key !== key) {
    /* новая неделя — новая война */
    st.war = { key, a, b, side:null, since:now(), won:false, aid:0 };
  }
}
function warSide(which){
  const st = S.city; if (!st || !st.war || st.war.side) return;
  const cl = CLANS[st.war[which]];
  st.war.side = which;
  addRep(cl.id, 60, 'присяга');
  addRep(CLANS[st.war[which === 'a' ? 'b' : 'a']].id, -70, 'предательство');
  sfx.prestige();
  log(`Ты присягнул <b>${esc(cl.n)}</b> в войне. ${esc(CLANS[st.war[which === 'a' ? 'b' : 'a']].n)} этого не забудет.`, 'boss');
  renderTown(); save(true);
}
function warHelp(){
  const st = S.city; if (!st || !st.war || !st.war.side) return;
  const cost = Math.max(50, Math.round(S.maxStage * 6));
  if (S.gold < cost) { log('Не хватает золота на снабжение.', 'info'); return; }
  S.gold -= cost;
  st.war.aid++;
  const mine = CLANS[st.war[st.war.side]].id;
  addRep(mine, 8, 'снабжение');
  sfx.buy();
  log(`Обоз ушёл на фронт: ${nf(cost)} золота. <b>${esc(CLANS[mine].n)}</b> запомнил.`, 'info');
  renderGold(); renderTown(); save(true);
}
function warReward(){
  const st = S.city; if (!st || !st.war || !st.war.side || st.war.won) return;
  if (st.war.aid < 5) { log('Союзники ещё не считают победу твоей. Помоги обозом (5 раз).', 'info'); return; }
  st.war.won = true;
  const cl = CLANS[st.war[st.war.side]];
  addRep(cl.id, 40, 'победа');
  addRes('truth', 1);
  const g = Math.round(2000 + S.maxStage * 120); S.gold += g;
  sfx.level();
  log(`<b>${esc(cl.n)}</b> победил в войне. Ты получил место за столом: +${nf(g)} золота и +1 Осколок Истины.`, 'boss');
  renderGold(); renderResBar(); renderStats(); renderTown(); save(true);
}

/* Что обещает сторона: её услуга, идеология и цена предательства */
function sideOffer(cl, which){
  const other = CLANS[S.city.war[which === 'a' ? 'b' : 'a']];
  return '<button class="tw-offer" data-side="' + which + '" style="--cc:' + cl.col + '">' +
    '<span class="to-nm">' + esc(cl.short) + '</span>' +
    '<span class="to-svc">' + IC[cl.service.ic] + esc(cl.service.n) + '</span>' +
    '<span class="to-cost">' + esc(other.short) + ' −70</span>' +
  '</button>';
}
/* Медианная цена товара по всем городам — чтобы видеть, где выгодно */
function priceMedian(goodId){
  const list = CITIES.map(c => cityPrice(c.id, goodId)).sort((a, b) => a - b);
  return list[Math.floor(list.length / 2)];
}

/* ---------------- Карта: позиции ---------------- */
function townPos(c) { return { x: c.cx * 100, y: c.cy * 100 }; }

/* ---------------- Рендер ---------------- */
function renderTown(){
  const st = S.city; if (!st) return;
  ensureWar();
  caravanArrive();
  const root = $('#townBody'); if (!root) return;

  const sel = CITY(LAYOUT.townSel) && cityOpen(CITY(LAYOUT.townSel)) ? LAYOUT.townSel : null;
  const war = st.war;
  const wA = CLANS[war.a], wB = CLANS[war.b];

  let h = '';

  /* --- газета недели: война --- */
  h += '<div class="town-war">' +
    '<div class="tw-head">' + IC.flame + 'Война недели</div>' +
    '<div class="tw-row">' +
      '<span class="tw-clan" style="color:' + wA.col + '">' + esc(wA.short) + '</span>' +
      '<span class="tw-vs">против</span>' +
      '<span class="tw-clan" style="color:' + wB.col + '">' + esc(wB.short) + '</span>' +
    '</div>' +
    (war.side
      ? '<div class="tw-note">Ты присягнул <b style="color:' + CLANS[war[war.side]].col + '">' +
        esc(CLANS[war[war.side]].short) + '</b>. Обозов отправлено: ' + war.aid + '/5.</div>' +
        (war.won ? '<div class="tw-note" style="color:var(--grn)">Победа. Место за столом твоё.</div>'
                 : '<div class="town-btns"><button class="mini" data-war="help">' + IC.coin +
                   'Снабдить обоз (' + nf(Math.max(50, Math.round(S.maxStage * 6))) + ')</button>' +
                   (war.aid >= 5 ? '<button class="mini sell" data-war="claim">' + IC.trophy + 'Забрать победу</button>' : '') +
                   '</div>')
      : '<div class="tw-note">Пока ты не выбрал сторону, обе считают тебя чужим — и обе ждут.</div>' +
        '<div class="tw-offers">' +
          sideOffer(wA, 'a') + sideOffer(wB, 'b') +
        '</div>') +
    '</div>';

  /* --- карта --- */
  h += '<div class="town-map">';
  /* линии между городами */
  CITIES.forEach((a, i) => {
    CITIES.slice(i + 1).forEach(b => {
      if (a.clan !== b.clan) return;
      const p1 = townPos(a), p2 = townPos(b);
      h += `<div class="town-road" style="left:${p1.x}%;top:${p1.y}%;width:${Math.hypot(p2.x - p1.x, p2.y - p1.y)}%;transform:rotate(${Math.atan2(p2.y - p1.y, p2.x - p1.x)}rad)"></div>`;
    });
  });
  CITIES.forEach(c => {
    const open = cityOpen(c);
    const p = townPos(c), cl = CLANS[c.clan];
    const on = LAYOUT.townSel === c.id;
    const visited = st.visited.includes(c.id);
    h += `<button class="town-node${open ? '' : ' locked'}${on ? ' on' : ''}" data-city="${c.id}"
       style="left:${p.x}%;top:${p.y}%;--cc:${cl.col}" title="${esc(c.n)}${open ? '' : ' — откроется на глубине ' + c.req}">
       <span class="tn-ic">${IC[open ? c.ic : 'lock']}</span>
       <span class="tn-nm">${esc(c.ru)}</span>
       <span class="tn-clan" style="color:${cl.col}">${esc(cl.short)}</span>
       ${visited ? '' : '<i class="tn-new"></i>'}
     </button>`;
  });
  /* караван на карте */
  if (st.caravan) {
    const from = townPos(CITY(st.caravan.from)), to = townPos(CITY(st.caravan.to));
    const left = Math.max(0, st.caravan.end - now()), total = CARAVAN_MIN * 60000;
    const t = 1 - left / total;
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    h += `<div class="town-caravan" style="left:${x}%;top:${y}%">${IC.anchor}</div>`;
  }
  h += '</div>';

  /* --- выбранный город --- */
  if (!sel) {
    h += '<div class="empty">Выбери город на карте. Красные крестики — ещё не открыты: они ждут тебя глубже.</div>';
  } else {
    h += renderCityCard(sel);
  }

  /* --- репутация --- */
  h += '<div class="sub">Репутация</div><div class="rep-list">';
  Object.values(CLANS).forEach(cl => {
    const r = clanRep(cl.id), tier = repTier(r);
    h += '<div class="rep-row">' +
      '<span class="rr-ic" style="color:' + cl.col + '">' + IC[cl.ic] + '</span>' +
      '<span class="rr-nm">' + esc(cl.n) + '<small>' + cl.perk + '</small></span>' +
      '<span class="rr-bar"><i style="width:' + clamp(r / 300 * 100, 0, 100) + '%;background:' + cl.col + '"></i></span>' +
      '<span class="rr-val" style="color:' + cl.col + '">' + r + '<small>' + REP_NAMES[tier] + '</small></span>' +
      '</div>';
  });
  h += '</div>';

  root.innerHTML = h;
}

function renderCityCard(id){
  const c = CITY(id), cl = CLANS[c.clan], st = S.city;
  const rep = clanRep(c.clan);
  let h = '<div class="city-card" style="--cc:' + cl.col + '">' +
    '<div class="cc-head"><div class="cc-ic" style="color:' + cl.col + '">' + IC[c.ic] + '</div>' +
    '<div class="cc-nm">' + esc(c.n) + '<small>' + esc(cl.n) + ' · ' + REP_NAMES[repTier(rep)] + '</small></div>' +
    '<div class="city-req">' + (cityOpen(c) ? 'открыт' : 'гл. ' + c.req) + '</div></div>' +
    '<div class="cc-body">' + esc(c.d) + '</div>' +
    '<div class="cc-lore">«' + esc(c.lore) + '»</div>';

  /* товары */
  h += '<div class="trade-head"><span>Товар</span><span>Цена</span><span></span></div>';
  CGOODS.forEach(g => {
    if (g.id === 'relice') return;
    const p = cityPrice(id, g.id);
    const have = g.id === 'gold' ? S.gold : (S.res[g.id] || 0);
    if (!have && g.id !== 'gold') return;
    /* где выгодно: сравниваем с медианой по всем городам */
    let tag = '';
    if (g.id !== 'gold') {
      const med = priceMedian(g.id);
      const d = (p - med) / med;
      if (d > 0.06) tag = '<b class="tr-tag hi">дорого</b>';
      else if (d < -0.06) tag = '<b class="tr-tag lo">дёшево</b>';
    }
    h += '<div class="trade-row">' +
      '<span class="tr-nm">' + IC[g.ic] + esc(g.n) + '<small>у тебя ' + nf(have) + '</small></span>' +
      '<span class="tr-pr">' + IC.coin + nf(p) + tag + '</span>' +
      (g.id === 'gold'
        ? '<span class="tr-btns"><span class="tr-hint">валюта</span></span>'
        : '<span class="tr-btns">' +
            '<button class="mini sell" data-trade="sell" data-good="' + g.id + '">Продать</button>' +
            '<button class="mini" data-trade="buy" data-good="' + g.id + '">Купить</button>' +
          '</span>') +
      '</div>';
  });

  /* караван */
  if (!st.caravan && cityOpen(c)) {
    h += '<div class="cc-foot"><button class="mini" data-caravan="' + id + '">' + IC.anchor +
         'Снарядить караван (' + CARAVAN_MIN + ' мин)</button></div>';
  } else if (st.caravan) {
    h += '<div class="cc-foot" style="color:var(--mut)">' + IC.clock + 'Караван в пути · ' +
         fmtTime((st.caravan.end - now()) / 1000) + '</div>';
  }

  /* что даёт дружба и чего стоит вражда */
  h += '<div class="city-mutual">' + IC.chain +
    '<span>Дружба с <b style="color:' + cl.col + '">' + esc(cl.short) + '</b> даёт ' +
    esc(cl.perk) + '. Но <b>' + (cl.hates || [])
      .map(h => esc(CLANS[h].short)).join(', ') + '</b> этого не забудет.</span></div>';

  /* услуга клана */
  const svc = cl.service;
  const cdLeft = st.services && st.services[cl.id] ? CITY_CD - (now() - st.services[cl.id]) : 0;
  const canSvc = repTier(rep) >= 1 && cdLeft <= 0;
  const why = repTier(rep) < 1 ? 'Нужна репутация «Проситель» (50)'
            : cdLeft > 0 ? 'Отдыхает · ' + fmtTime(cdLeft / 1000) : 'Доступно';
  h += '<div class="svc-card' + (canSvc ? '' : ' off') + '">' +
    '<div class="cc-head"><div class="cc-ic" style="color:' + cl.col + '">' + IC[svc.ic] + '</div>' +
    '<div class="cc-nm">' + esc(svc.n) + '<small>' + esc(svc.d) + '</small></div></div>' +
    '<div class="cc-foot">' +
      '<span class="svc-req">' + why + '</span>' +
      '<button class="mini' + (canSvc ? ' sell' : '') + '" data-service="' + cl.id + '"' + (canSvc ? '' : ' disabled') + '>Попросить</button>' +
    '</div></div>';

  h += '</div>';
  return h;
}

/* ---------------- Тик ---------------- */
function cityTick(){
  if (!S.city) return;
  const st = S.city;
  if (st.caravan && now() >= st.caravan.end) caravanArrive();
  ensureWar();
}
