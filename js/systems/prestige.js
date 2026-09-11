"use strict";
/* ============================================================
   SYSTEMS / PRESTIGE — Разрыв Оков и Древо Вечной Тьмы
   Порог считается по ГЛУБИНЕ ТЕКУЩЕГО ЗАБЕГА (runMax),
   поэтому сразу после разрыва оковы не рвутся снова.
   ============================================================ */

const PGROUPS = [
  {t:'Ярость', nodes:[
    {id:'pWrath', n:'Ярость Вечности', ic:'flame', max:15, base:1, req:null,
     d:'+15% ко всему урону за уровень. Навсегда.', lore:'Гнев не остывает — он лишь меняет носителя.',
     ef:l=>'+'+(15*l)+'% ко всему урону', apply(B,l){B.allMul*=1+0.15*l}},
    {id:'pEdge', n:'Проклятое Лезвие', ic:'target', max:10, base:2, req:'pWrath',
     d:'+2.5% шанса крита и +3 к пределу крита за уровень.', lore:'Оно точится само, пока ты спишь.',
     ef:l=>'+'+(2.5*l)+'% крита · предел '+(80+3*l)+'%', apply(B,l){B.crit+=2.5*l; B.critCap+=3*l}},
    {id:'pFang', n:'Клык Погибели', ic:'blood', max:10, base:3, req:'pEdge',
     d:'+0.35 к множителю крита за уровень.', lore:'Он не ломается. Ломается всё остальное.',
     ef:l=>'+'+(0.35*l).toFixed(2)+' к множителю крита', apply(B,l){B.critMulAdd+=0.35*l}},
    {id:'pRitual', n:'Ритуал Низложения', ic:'crown', max:8, base:4, req:'pFang',
     d:'+30% урона по боссам и +8% Крови Владык за уровень.', lore:'Короны снимают вместе с головой.',
     ef:l=>'+'+(30*l)+'% боссам · +'+(8*l)+'% крови', apply(B,l){B.bossMul*=1+0.30*l; B.bloodMul+=0.08*l}}
  ]},
  {t:'Алчность', nodes:[
    {id:'pGreed', n:'Алчность Бездны', ic:'coin', max:12, base:2, req:null,
     d:'+22% золота за уровень.', lore:'Бездна считает монеты за тобой.',
     ef:l=>'+'+(22*l)+'% золота', apply(B,l){B.goldMul*=1+0.22*l}},
    {id:'pLore', n:'Тёмное Знание', ic:'book', max:12, base:2, req:'pGreed',
     d:'+22% опыта за уровень.', lore:'Мёртвые щедры на уроки.',
     ef:l=>'+'+(22*l)+'% опыта', apply(B,l){B.xpMul*=1+0.22*l}},
    {id:'pDusk', n:'Сумеречный Договор', ic:'gem', max:7, base:4, req:'pLore',
     d:'-7% к ценам лавки за уровень (предел -49%).', lore:'Торговец Теней уступает тем, кто уже умирал.',
     ef:l=>'-'+(7*l)+'% цен в лавке', apply(B,l){B.costRed+=0.07*l}},
    {id:'pHarvest', n:'Жатва Душ', ic:'skull', max:6, base:5, req:'pDusk',
     d:'+18% золота, +10% опыта и +10% Пепла Душ за уровень.',
     lore:'Ничто не пропадает. Всё возвращается в ладонь.',
     ef:l=>'+'+(18*l)+'% золота · +'+(10*l)+'% пепла',
     apply(B,l){B.goldMul*=1+0.18*l; B.xpMul*=1+0.10*l; B.ashMul+=0.10*l; B.harvest=l}}
  ]},
  {t:'Вечность', nodes:[
    {id:'pSlumber', n:'Сон Проклятых', ic:'hourglass', max:10, base:3, req:null,
     d:'+70% оффлайн-добычи, +2 ч к пределу сна и +25% Шёпота за уровень.', lore:'Ты спишь. Свита — нет.',
     ef:l=>'+'+(70*l)+'% оффлайна · предел '+(6+2*l)+' ч',
     apply(B,l){B.offMul+=0.7*l; B.offCap+=2*l; B.whisMul+=0.25*l}},
    {id:'pGate', n:'Врата Забвения', ic:'void', max:6, base:5, req:'pSlumber',
     d:'После разрыва оков вы начинаете сразу с глубины 1 + 8×уровень.',
     lore:'Врата не открываются. Их просто больше нет.',
     ef:l=>'старт с глубины '+(1+8*l), apply(B,l){B.startStage=1+8*l}},
    {id:'pCrown', n:'Венец Осколков', ic:'shard', max:10, base:4, req:'pGate',
     d:'+12% Осколков Проклятия за разрыв оков.', lore:'Корона из того, что осталось от корон.',
     ef:l=>'+'+(12*l)+'% осколков', apply(B,l){B.shardMul+=0.12*l}},
    {id:'pAscend', n:'Восхождение', ic:'star', max:4, base:8, req:'pCrown',
     d:'Сила сигнатуры подкласса увеличивается на 35% за уровень.',
     lore:'Ты поднимаешься по лестнице из собственных смертей.',
     ef:l=>'подкласс ×'+(1+0.35*l).toFixed(2), apply(B,l){B.subPow+=0.35*l}},
    {id:'pPack', n:'Стая Теней', ic:'paw', max:2, base:12, req:'pCrown',
     d:'+1 слот свиты и +1 место в экспедициях.',
     lore:'Одна тень зовёт другую, и обе зовут третью.',
     ef:l=>'слотов свиты '+(1+l)+' · экспедиций '+(2+l), apply(B,l){B.petSlots+=l; B.expSlots+=l}},
    {id:'pDrop', n:'Ржавый Магнит', ic:'bag', max:6, base:5, req:'pAscend',
     d:'+35% шанса выпадения снаряжения и +7% к шансу высокой редкости за уровень.',
     lore:'Мертвецы охотнее расстаются с вещами, когда ты уже умирал сам.',
     ef:l=>'+'+(35*l)+'% дропа · +'+(7*l)+'% редкости', apply(B,l){B.dropMul+=0.35*l; B.rarBonus+=0.07*l}},
    {id:'pOracle', n:'Слух Оракула', ic:'whisper', max:5, base:6, req:'pAscend',
     d:'Колодец Шёпотов остывает на 24 минуты быстрее, а Метка приходит чаще.',
     lore:'Ты научился слышать раньше, чем скажут.',
     ef:l=>'-'+(24*l)+' мин к Колодцу', apply(B,l){B.wellCut+=1440*l; B.markCut+=0.12*l}}
  ]}
];
const PTREE = PGROUPS.reduce((a,g)=>a.concat(g.nodes),[]);
const PN = id => PTREE.find(n=>n.id===id);
const pLv = id => S.ptree[id]||0;
const pCost = n => Math.ceil(n.base*Math.pow(1.5, pLv(n.id)));
const pAvailable = n => !n.req || pLv(n.req)>0;

let selP=null;
function renderPTree(){
  const wrap=$('#pTreeWrap');
  wrap.innerHTML=PGROUPS.map((g,gi)=>'<div class="tree-group"><div class="tree-label">'+g.t+
    '</div><div class="tree" id="pg'+gi+'"></div></div>').join('');
  PGROUPS.forEach((g,gi)=>{
    const nodes=g.nodes.map((n,i)=>Object.assign({},n,{x:i%2===0?85:215, y:44+Math.floor(i/2)*104}));
    drawTree($('#pg'+gi),nodes,44+Math.ceil(nodes.length/2)*104,true);
  });
  paintPInfo();
}
function showPInfo(id){ selP=id; renderPTree(); }
function paintPInfo(){
  const id=selP;
  if (!id||!PN(id)){ $('#pInfo').innerHTML='<div class="ds">Выберите узел древа.</div>'; return; }
  const n=PN(id), l=pLv(id), c=pCost(n);
  const can=pAvailable(n)&&l<n.max&&S.shards>=c;
  let rq='';
  if (n.req&&pLv(n.req)<1) rq='Требуется узел: «'+PN(n.req).n+'»';
  else if (l>=n.max) rq='Максимальный уровень.';
  else if (S.shards<c) rq='Не хватает осколков: нужно '+c+'.';
  $('#pInfo').innerHTML=
    '<div class="tagline" style="color:var(--shard)">Вечная Тьма · не сбрасывается</div>'+
    '<h4>'+n.n+' <span style="font-size:11px;color:var(--mut)">'+l+'/'+n.max+'</span></h4>'+
    '<div class="ds">'+n.d+'</div>'+
    (l>0?'<div class="ef">Сейчас: '+n.ef(l)+'</div>':'')+
    (l<n.max?'<div class="ef" style="color:#a9e6ff">Станет: '+n.ef(l+1)+'</div>':'')+
    (rq?'<div class="rq">'+rq+'</div>':'')+
    '<div class="lr">'+n.lore+'</div>'+
    '<button class="learn sh" data-plearn="'+id+'"'+(can?'':' disabled')+'>Вплести · '+c+' оск.</button>';
}
function learnP(id){
  const n=PN(id), l=pLv(id), c=pCost(n);
  if (!pAvailable(n)||l>=n.max||S.shards<c) return;
  S.shards-=c; S.ptree[id]=l+1;
  sfx.buy();
  log('Вечная Тьма: <b>'+n.n+'</b> ('+(l+1)+'/'+n.max+')','drop');
  selP=id;
  renderPTree(); renderGold(); renderStats(); renderShop(); renderPrestCard();
  renderPets(); renderPetLayer(); checkGoals(); save(true);
}

/* ---------------- Условия и награда разрыва ---------------- */
/* Порог растёт с каждым разрывом и считается по текущему забегу */
function prestReq(){ return PREST_REQ + S.prestige*10; }
function prestCdLeft(){ return Math.max(0, (S.prestAt||0)+PREST_COOLDOWN-now()); }
function canPrestige(){ return S.runMax>=prestReq() && prestCdLeft()<=0; }
function shardGain(){
  if (S.runMax<prestReq()) return 0;
  const B=bonuses();
  const base=Math.pow((S.runMax-25)/8,1.5)+S.bosses*0.9;
  const early=S.prestige===0?2.6:S.prestige===1?1.8:S.prestige===2?1.35:1;
  return Math.max(3,Math.floor(base*early*B.shardMul));
}
function renderPrestCard(){
  const req=prestReq(), g=shardGain(), cdL=prestCdLeft();
  const okDepth=S.runMax>=req, can=canPrestige();
  const prog=clamp(S.runMax/req,0,1)*100;
  $('#prestCard').innerHTML=
    '<h4>Разрыв Оков</h4>'+
    '<p>Уровень, золото, лавка, глубина, Путь и снаряжение (кроме реликвии) обратятся в пепел. Кровь и Пепел уцелеют на треть.<br>'+
    'Класс, подкласс, свита, реликвии, Книга Имён, Шёпот, Истина и Вечная Тьма останутся с тобой.</p>'+
    '<div class="gain">'+IC.shard+nf(g)+'</div>'+
    '<div class="reqbar"><i style="width:'+prog+'%"></i></div>'+
    '<p style="margin:6px 0 0;font-size:10.5px">'+
      (okDepth
        ? (cdL>0
            ? 'Оковы ещё горячи. Подожди <b>'+fmtTime(cdL/1000)+'</b>.'
            : (S.prestige<2?'Ранние разрывы щедрее: множитель ×'+(S.prestige===0?'2.6':'1.8')+'.':'Забег дошёл до глубины '+S.runMax+'.'))
        : 'Нужно пройти <b>глубину '+req+'</b> в этом забеге. Сейчас: '+S.runMax+'.')+
    '</p>'+
    '<p style="margin:4px 0 0;font-size:10px;color:#6d6590">Порог растёт с каждым разрывом: следующий будет '+(req+10)+'.</p>'+
    (S.prestige>=2&&!S.sub?'<p style="color:var(--gold);margin:8px 0 0;font-size:11px">Следующий разрыв откроет подкласс.</p>':'')+
    '<button class="prest-btn" id="doPrest"'+(can?'':' disabled')+'>'+
      (cdL>0&&okDepth?'Оковы остывают · '+fmtTime(cdL/1000):'Разорвать оковы')+'</button>';
}
function doPrestige(){
  const gain=shardGain();
  if (!canPrestige()||gain<=0) return;
  const relic=S.equip.relic;
  openModal('<div class="m-ic" style="color:var(--blood)">'+IC.chain+'</div><h2>Разорвать оковы?</h2>'+
    '<div class="m-list">'+
    '<div class="neg">✕ Уровень героя ('+S.lvl+') и весь опыт</div>'+
    '<div class="neg">✕ Золото ('+nf(S.gold)+') и все улучшения Лавки</div>'+
    '<div class="neg">✕ Древо «Путь Теней» и '+spentPoints()+' вложенных очк.</div>'+
    '<div class="neg">✕ Глубина забега · откат на '+Math.max(1,bonuses().startStage)+'</div>'+
    '<div class="neg">✕ Оружие, доспех, амулет, кольца и сумка</div>'+
    '<div class="neg">✕ Кровь и Пепел — уцелеет лишь треть</div>'+
    '<div class="pos">✓ '+nf(gain)+' Осколков Проклятия</div>'+
    '<div class="pos">✓ Эхо Разрывов: ×'+(1+0.12*(S.prestige+1)).toFixed(2)+' ко всему урону навсегда</div>'+
    '<div class="pos">✓ Свита, реликвия'+(relic?' («'+esc(relic.n)+'»)':'')+', Истинные Реликвии, Книга Имён</div>'+
    '<div class="pos">✓ Шёпот, Осколки Истины, скрытые глубины, Вечная Тьма</div>'+
    '<div class="pos">✓ '+Math.min(6,S.prestige+1)+' очк. навыков и стартовое золото сразу</div>'+
    '</div><div class="m-btns"><button class="btn" id="pNo">Ещё не время</button>'+
    '<button class="btn danger" id="pYes">Разорвать</button></div>');
  $('#pNo').onclick=closeModal;
  $('#pYes').onclick=()=>{ closeModal(); prestigeSequence(gain); };
}
function prestigeSequence(gain){
  sfx.prestige();
  mobDead=true; hideWeak();
  const before={pow:bonuses().allMul, gold:stats().goldMul, xp:stats().xpMul};
  const scr=$('#prestScreen');
  scr.innerHTML='<div><div class="pt">ОКОВЫ РАЗОРВАНЫ</div>'+
    '<div class="pl">Цепь падает в темноту и не достигает дна.<br>Всё, чем ты был, осыпается пеплом с твоих плеч.<br>'+
    'Остаётся только то, что смерть уже не может отнять.</div>'+
    '<div class="ps">'+IC.shard+'+'+nf(gain)+' Осколков Проклятия</div></div>';
  scr.classList.add('on');
  setTimeout(()=>applyPrestige(gain,before),3300);
}
function applyPrestige(gain,before){
  const keep={
    v:SAVE_VER, cls:S.cls, sub:S.sub, heroName:S.heroName, stance:S.stance,
    prestige:S.prestige+1, shards:S.shards+gain, totalShards:S.totalShards+gain,
    prestAt:now(),
    maxStage:S.maxStage, ach:S.ach.slice(), ptree:Object.assign({},S.ptree),
    codexFam:S.codexFam.slice(), codexBoss:S.codexBoss.slice(), lore:S.lore.slice(),
    muted:S.muted, playtime:S.playtime, hints:S.hints.slice(), goals:S.goals.slice(),
    kills:S.kills, bosses:S.bosses, elites:S.elites, clicks:S.clicks, crits:S.crits, marks:S.marks,
    totalDmg:S.totalDmg, totalGold:S.totalGold, itemSeq:S.itemSeq, skillUses:S.skillUses,
    pets:Object.assign({},S.pets), active:S.active.slice(), sacrificed:S.sacrificed.slice(),
    relics:S.relics.slice(), trueName:S.trueName, hidden:S.hidden.slice(), ritualEdge:S.ritualEdge,
    contracts:S.contracts, wellAt:S.wellAt, markAt:S.markAt, riftAt:S.riftAt, seen:Object.assign({},S.seen),
    autoOn:S.autoOn, autoBuy:Object.assign({},S.autoBuy), shopOrder:S.shopOrder.slice(), mode:S.mode,
    res:{ blood:Math.floor((S.res.blood||0)*0.3), ash:Math.floor((S.res.ash||0)*0.3),
          whisper:S.res.whisper||0, truth:S.res.truth||0 },
    equip:{weapon:null,armor:null,amulet:null,ring1:null,ring2:null,relic:S.equip.relic}
  };
  S=Object.assign(DEF(),keep);
  const B=bonuses();
  S.stage=Math.max(1,B.startStage||1);
  S.runMax=S.stage;                      /* новый забег начинается заново */
  S.sp=Math.min(6,S.prestige);
  S.gold=Math.floor(250*S.prestige*(1+pLv('pGate')));
  combo=0; cd={}; stormT=0; stepCharges=0; oathStacks=0; nameStacks=0; waveT=0;
  knightClicks=0; execCritT=0; oathBuffT=0; ultBuffT=0; lastZone=-1; fatigue=0; clickStamps=[];
  const needSub=S.prestige>=3&&!S.sub;
  spawnMob(); renderAll(); save(true);
  const after={pow:bonuses().allMul, gold:stats().goldMul, xp:stats().xpMul};
  const arrow=(a,b)=>'×'+a.toFixed(2)+' → <em>×'+b.toFixed(2)+'</em>';
  const scr=$('#prestScreen');
  scr.innerHTML='<div><div class="pt">ЧТО СТАЛО СИЛЬНЕЕ</div>'+
    '<div class="sum-grid">'+
    '<div class="sum-row">'+IC.shard+'<span class="sk">Осколков Проклятия</span><span class="sv">'+nf(S.shards)+' <em>(+'+nf(gain)+')</em></span></div>'+
    '<div class="sum-row">'+IC.chain+'<span class="sk">Эхо Разрывов · весь урон</span><span class="sv">'+arrow(before.pow,after.pow)+'</span></div>'+
    '<div class="sum-row">'+IC.coin+'<span class="sk">Множитель золота</span><span class="sv">'+arrow(before.gold,after.gold)+'</span></div>'+
    '<div class="sum-row">'+IC.book+'<span class="sk">Множитель опыта</span><span class="sv">'+arrow(before.xp,after.xp)+'</span></div>'+
    '<div class="sum-row">'+IC.flag+'<span class="sk">Стартовая глубина</span><span class="sv"><em>'+S.stage+'</em></span></div>'+
    '<div class="sum-row">'+IC.tree+'<span class="sk">Очков навыков сразу</span><span class="sv"><em>'+S.sp+'</em></span></div>'+
    '<div class="sum-row">'+IC.drop+'<span class="sk">Кровь и Пепел уцелели</span><span class="sv"><em>'+nf(S.res.blood)+' · '+nf(S.res.ash)+'</em></span></div>'+
    '<div class="sum-row">'+IC.whisper+'<span class="sk">Шёпот и Истина целы</span><span class="sv"><em>'+nf(S.res.whisper)+' · '+nf(S.res.truth)+'</em></span></div>'+
    '<div class="sum-row">'+IC.paw+'<span class="sk">Свита сохранена</span><span class="sv"><em>'+Object.keys(S.pets).length+'</em></span></div>'+
    '<div class="sum-row">'+IC.flag+'<span class="sk">Следующий порог</span><span class="sv"><em>глубина '+prestReq()+'</em></span></div>'+
    '</div><div class="m-btns" style="margin-top:22px"><button class="btn danger" id="prDone">Спуститься заново</button></div></div>';
  $('#prDone').onclick=()=>{
    scr.classList.remove('on');
    log('Оковы разорваны. Разрыв №'+S.prestige+'. Порог следующего — глубина '+prestReq()+'.','boss');
    hint('prestLoop','Новый забег','Порог разрыва считается по глубине <b>текущего</b> забега и растёт на 10 каждый раз. Спустись заново — и оковы снова поддадутся.');
    checkAch(); checkPets(); checkHidden();
    if (needSub) setTimeout(subModal,400);
  };
}
