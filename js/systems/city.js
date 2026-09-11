"use strict";
/* ============================================================
   SYSTEMS / CITY — «Дела»: экспедиции, Заказы Теней,
   ритуалы, Колодец Шёпотов
   ============================================================ */

/* ---------------- Экспедиции свиты ---------------- */
const EXPS = [
  {id:'short', n:'Короткая вылазка', mins:15, d:'Пепел и золото.'},
  {id:'long', n:'Долгий обход', mins:60, d:'Пепел, Кровь, иногда снаряжение.'},
  {id:'deep', n:'Спуск в неизвестное', mins:240, d:'Шёпот, Кровь и шанс на Осколок Истины.'}
];
function expSlots(){ return 2 + pLv('pPack'); }
function sendExp(petId, expId){
  const p=PET(petId), e=EXPS.find(x=>x.id===expId);
  if (!p||!e||!petOwned(petId)||petAway(petId)) return;
  if (S.exped.length>=expSlots()) return;
  S.exped.push({pet:petId, id:expId, end:now()+e.mins*60000});
  const i=S.active.indexOf(petId); if (i>=0) S.active.splice(i,1);
  sfx.pet();
  log('<b>'+esc(p.n)+'</b> уходит в темноту: '+e.n.toLowerCase()+'.','info');
  renderDeeds(); renderPets(); renderPetLayer(); renderStats(); save(true);
}
function checkExpeditions(){
  if (!S.exped.length) return;
  let changed=false;
  for (let i=S.exped.length-1;i>=0;i--){
    const ex=S.exped[i];
    if (now()>=ex.end){ finishExp(ex); S.exped.splice(i,1); changed=true; }
  }
  if (changed){ renderDeeds(); renderPets(); renderPetLayer(); renderStats(); save(true); }
}
const EXP_LORE = [
  'Он вернулся с чужой пылью на лапах и не смотрит в глаза.',
  'Она принесла кость, которая тихо гудит, если держать её у виска.',
  'Он молчал всю дорогу обратно. Он и раньше молчал, но не так.',
  'Она нашла дверь. Дверь была заперта изнутри — и это не успокаивает.',
  'Он принёс горсть пепла, в котором различимы буквы.'
];
function finishExp(ex){
  const p=PET(ex.pet), e=EXPS.find(x=>x.id===ex.id), l=petLv(ex.pet)||1;
  const k=(p?p.rar+1:1)*l*(e.mins/15);
  const gold=Math.floor((80+S.maxStage*22)*k*0.6);
  S.gold+=gold; S.totalGold+=gold;
  const ash=Math.max(1,Math.floor(k*1.6));
  addRes('ash',ash,true);
  let extra='';
  if (e.id!=='short'){ const bl=Math.max(1,Math.floor(k*0.5)); addRes('blood',bl,true); extra+=', '+bl+' Крови'; }
  if (e.id==='deep'){
    const wh=Math.max(2,Math.floor(k*0.7)); addRes('whisper',wh,true); extra+=', '+wh+' Шёпота';
    if (Math.random()<0.14){ addRes('truth',1); extra+=', Осколок Истины'; }
  }
  if (e.id!=='short' && Math.random()<0.4) dropLoot(Math.max(1,S.maxStage-2),false,true,false);
  if (Math.random()<0.5) addLore(pick(EXP_LORE));
  if (S.active.length<petSlots() && !S.active.includes(ex.pet)) S.active.push(ex.pet);
  sfx.drop();
  log('<b>'+esc(p?p.n:'Фамильяр')+'</b> вернулся: +'+nf(gold)+' золота, '+ash+' Пепла'+extra+'.','drop');
  toast({ic:'compass',n:'Свита вернулась',d:(p?p.n:'')+' · +'+nf(gold)+' золота'});
}

/* ---------------- Заказы Теней ---------------- */
const CTASKS = [
  {t:'kill', n:'Оборвать нити', ic:'skull', d:n=>'Убить '+nf(n)+' тварей', base:60, scale:14},
  {t:'boss', n:'Снять корону', ic:'crown', d:n=>'Победить '+nf(n)+' Владык', base:2, scale:0.45},
  {t:'elite', n:'Прополоть сильных', ic:'star', d:n=>'Убить '+nf(n)+' элитных тварей', base:5, scale:0.8},
  {t:'crit', n:'Найти щель', ic:'target', d:n=>'Нанести '+nf(n)+' критических ударов', base:40, scale:9},
  {t:'skill', n:'Тратить силу', ic:'zap', d:n=>'Применить умения '+nf(n)+' раз', base:6, scale:1},
  {t:'spend', n:'Расплатиться', ic:'coin', d:n=>'Потратить '+nf(n)+' золота в лавке', base:1500, scale:900}
];
const CTASK = t => CTASKS.find(x=>x.t===t)||CTASKS[0];
function rollContract(weekly){
  const t=pick(CTASKS);
  const m=weekly?5:1;
  const need=Math.max(1,Math.round((t.base+t.scale*S.maxStage)*m*(0.85+Math.random()*0.4)));
  const rew=weekly
    ? {shards:Math.max(4,Math.floor(2+S.maxStage/22)), truth:1}
    : {shards:Math.max(1,Math.floor(1+S.maxStage/45)), ash:Math.floor(8+S.maxStage/3), blood:Math.floor(1+S.maxStage/40)};
  return {t:t.t, n:t.n, txt:t.d(need), need, prog:0, done:false, rew, weekly:!!weekly};
}
function ensureContracts(){
  if (!S.contracts) S.contracts={d:[],w:null,dReset:0,wReset:0};
  const c=S.contracts;
  if (now()>c.dReset){ c.d=[rollContract(false),rollContract(false),rollContract(false)]; c.dReset=now()+864e5; }
  if (now()>c.wReset||!c.w){ c.w=rollContract(true); c.wReset=now()+6048e5; }
}
function contractTick(type,amount){
  ensureContracts();
  const all=S.contracts.d.concat([S.contracts.w]);
  let upd=false;
  for (const c of all){
    if (!c||c.done||c.t!==type) continue;
    c.prog+=amount;
    if (c.prog>=c.need){ c.done=true; claimContract(c); }
    upd=true;
  }
  if (upd) renderDeedsSoft();
}
function claimContract(c){
  const r=c.rew;
  if (r.shards){ S.shards+=r.shards; S.totalShards+=r.shards; }
  if (r.ash) addRes('ash',r.ash,true);
  if (r.blood) addRes('blood',r.blood,true);
  if (r.truth) addRes('truth',r.truth);
  sfx.ach();
  log('Заказ исполнен: <b>'+c.n+'</b> · +'+(r.shards||0)+' осколков','ach');
  toast({ic:'scroll',n:'Заказ Теней исполнен',d:c.txt});
  renderGold(); renderResBar();
}
/* Карточка заказа */
function contractCard(x){
  if (!x) return '';
  const T=CTASK(x.t);
  const p=clamp(x.prog/x.need*100,0,100);
  const rw=[];
  if (x.rew.shards) rw.push('<span class="rw sh">'+IC.shard+x.rew.shards+'</span>');
  if (x.rew.ash) rw.push('<span class="rw as">'+IC.urn+x.rew.ash+'</span>');
  if (x.rew.blood) rw.push('<span class="rw bl">'+IC.drop+x.rew.blood+'</span>');
  if (x.rew.truth) rw.push('<span class="rw tr">'+IC.truth+x.rew.truth+'</span>');
  return '<div class="ctr'+(x.done?' done':'')+(x.weekly?' week':'')+'">'+
    '<div class="ctr-ic">'+(x.done?IC.check:IC[T.ic])+'</div>'+
    '<div class="ctr-main">'+
      '<div class="ctr-top"><b>'+esc(x.n)+'</b>'+
        '<span class="ctr-badge">'+(x.weekly?'недельный':'дневной')+'</span></div>'+
      '<div class="ctr-txt">'+esc(x.txt)+'</div>'+
      '<div class="ctr-bar"><i style="width:'+p+'%"></i></div>'+
      '<div class="ctr-num"><span>'+nf(Math.min(x.prog,x.need))+' / '+nf(x.need)+'</span>'+
        '<span class="ctr-pct">'+(x.done?'исполнено':Math.floor(p)+'%')+'</span></div>'+
    '</div>'+
    '<div class="ctr-rew">'+rw.join('')+'</div>'+
  '</div>';
}

/* ---------------- Ритуалы ---------------- */
const RITUALS = [
  {id:'r1', n:'Ритуал Пепельной Крови', ic:'candle', cost:{ash:25,blood:5},
   d:'×2.5 ко всему урону на 10 минут.', lore:'Круг чертят пеплом, замыкают кровью. Иначе он не замкнётся.',
   go(){ S.buffs.dmg=Math.max(S.buffs.dmg,600); S.buffs.all=Math.max(S.buffs.all,600); }},
  {id:'r2', n:'Ритуал Тихого Часа', ic:'hourglass', cost:{whisper:10},
   d:'Мгновенно даёт добычу двух часов сна.', lore:'Ты не спишь. Спит время вокруг тебя.',
   go(){ grantOffline(7200); }},
  {id:'r3', n:'Ритуал Забытого Имени', ic:'skull', cost:{blood:25},
   d:'Пропускает 5 глубин вперёд.', lore:'Ты называешь имя, которого нет, и лестница слушается.',
   go(){ S.stage+=5; S.maxStage=Math.max(S.maxStage,S.stage); S.runMax=Math.max(S.runMax,S.stage); spawnMob(); }},
  {id:'r4', n:'Ритуал Истинной Грани', ic:'truth', cost:{truth:2,ash:40},
   d:'НАВСЕГДА: +3% ко всему урону. Складывается.', lore:'Грань точат об истину. Истина не тупится.',
   go(){ S.ritualEdge++; }},
  {id:'r5', n:'Ритуал Открытия Пути', ic:'void', cost:{truth:3},
   d:'Открывает скрытую глубину, недоступную иначе.', lore:'Путь был всегда. Просто до него не доходили.',
   go(){ unlockHidden('h2'); }}
];
function ritualCost(r){
  if (r.id!=='r4') return r.cost;
  return {truth: 2+Math.floor(S.ritualEdge/3), ash: 40+S.ritualEdge*15};
}
function doRitual(id){
  const r=RITUALS.find(x=>x.id===id), c=ritualCost(r);
  if (!hasRes(c)) return;
  if (r.id==='r5' && S.hidden.includes('h2')){ log('Этот путь уже открыт.','info'); return; }
  payRes(c);
  r.go();
  sfx.forge(); arenaShake();
  log('Ритуал завершён: <b>'+r.n+'</b>.','boss');
  toast({ic:'candle',n:'Ритуал завершён',d:r.n});
  renderDeeds(); renderStats(); renderResBar(); renderGold(); save(true);
}

/* ---------------- Колодец Шёпотов ---------------- */
function wellCd(){ return Math.max(1800, 10800 - bonuses().wellCut); }
const WELL_LORE = [
  'На дне колодца нет воды. Там сложены вещи, которые кто-то бросал, загадывая.',
  'Ты слышишь имя. Оно почти твоё, но ударение стоит не там.',
  'Эхо возвращается раньше, чем ты успеваешь крикнуть.',
  'Кто-то на дне повторяет твои слова с опозданием в один день.',
  'В колодце отражается небо, которого над этим местом нет.'
];
const CURSES = [
  {id:'weight', n:'Груз Немоты', d:'−30% урона клика', apply(B){B.clickMul*=0.7}},
  {id:'thirst', n:'Сухая Жажда', d:'−35% золота', apply(B){B.goldMul*=0.65}},
  {id:'blind', n:'Слепота', d:'−40% шанса крита', apply(B){B.crit-=40}}
];
function drawWell(){
  if (now()<S.wellAt) return;
  S.wellAt=now()+wellCd()*1000;
  sfx.voice();
  const roll=Math.random();
  let title,text;
  if (roll<0.03){
    addRes('truth',1);
    title='Осколок Истины'; text='Колодец отдал то, что держал дольше всех.';
  } else if (roll<0.10){
    const left=TRELICS.filter(r=>!S.relics.includes(r.id));
    if (left.length){ const r=pick(left); S.relics.push(r.id);
      title='Истинная Реликвия'; text=r.n; renderCodex(); }
    else { const w=20+Math.floor(S.maxStage/2); addRes('whisper',w,true); title='Шёпот'; text='+'+w+' Шёпота'; }
  } else if (roll<0.30){
    const w=8+Math.floor(S.maxStage/3); addRes('whisper',w,true);
    title='Голоса щедры'; text='+'+w+' Шёпота';
  } else if (roll<0.48){
    const a=25+S.maxStage, b=Math.floor(3+S.maxStage/12);
    addRes('ash',a,true); addRes('blood',b,true);
    title='Дар глубины'; text='+'+a+' Пепла, +'+b+' Крови';
  } else if (roll<0.66){
    S.buffs.dmg=Math.max(S.buffs.dmg,300); S.buffs.gold=Math.max(S.buffs.gold,300);
    title='Благословение'; text='×2 урон и золото на 5 минут';
  } else if (roll<0.78){
    dropLoot(Math.max(1,S.maxStage),true,false,false);
    title='Из колодца тянут вещь'; text='Что-то поднялось наверх';
  } else if (roll<0.88){
    const cu=pick(CURSES); S.curse=cu.id; S.curseT=240;
    title='Проклятие'; text=cu.n+': '+cu.d+' на 4 минуты'; sfx.fail();
  } else {
    addLore(pick(WELL_LORE));
    title='Обрывок знания'; text='Записано в Кодекс';
  }
  log('Колодец Шёпотов: <b>'+title+'</b> — '+text,'drop');
  toast({ic:'well',n:title,d:text});
  renderDeeds(); renderResBar(); renderGold(); renderStats(); save(true);
}

/* ---------------- Рендер вкладки «Дела» ---------------- */
function renderDeedsSoft(){ if ($('.view[data-view="deeds"]').classList.contains('on')) renderDeeds(); }
function renderDeeds(){
  ensureContracts();
  let h='';
  const ready=now()>=S.wellAt;
  h+='<div class="well-card"><h4>Колодец Шёпотов</h4>'+
     '<p>Опусти руку в темноту и вытяни то, что попадётся. Иногда это дар. Иногда — плата.</p>'+
     (ready?'':'<div class="timer-bar"><i style="width:'+clamp(100-(S.wellAt-now())/(wellCd()*10),0,100)+'%"></i></div>')+
     '<button class="well-btn" id="wellBtn"'+(ready?'':' disabled')+'>'+
     (ready?'Заглянуть в колодец':'Молчит ещё '+fmtTime((S.wellAt-now())/1000))+'</button></div>';
  const markIn=Math.max(0,(S.markAt-now())/1000);
  h+='<div class="craft-card"><div class="cc-head"><div class="cc-ic" style="color:var(--gold)">'+IC.mark+'</div>'+
     '<div class="cc-nm">Охота по Метке<small>'+(S.markPending?'Меченый уже идёт к тебе':
       S.maxStage<12?'Откроется на глубине 12':'Следующая метка через '+fmtTime(markIn))+'</small></div></div>'+
     '<div class="cc-body">Меченый живучее элиты, даёт Кровь и Пепел, гарантированную вещь и шанс на Осколок Истины. На него 45 секунд.</div>'+
     '<div class="cc-body" style="color:var(--gold)">Настигнуто меченых: '+S.marks+'</div></div>';
  /* Экспедиции */
  h+='<div class="sub">Экспедиции свиты · '+S.exped.length+'/'+expSlots()+'</div>';
  for (const ex of S.exped){
    const p=PET(ex.pet), e=EXPS.find(x=>x.id===ex.id);
    const total=e.mins*60000, left=Math.max(0,ex.end-now());
    h+='<div class="exp-slot busy"><div class="cc-head"><div class="cc-ic" style="color:'+RAR[p.rar].c+'">'+PET_SVG[ex.pet]+'</div>'+
      '<div class="cc-nm">'+esc(p.n)+'<small>'+e.n+' · вернётся через '+fmtTime(left/1000)+'</small></div></div>'+
      '<div class="timer-bar"><i style="width:'+clamp((1-left/total)*100,0,100)+'%"></i></div></div>';
  }
  const free=PETS.filter(p=>petOwned(p.id)&&!petAway(p.id));
  if (S.exped.length<expSlots()){
    if (!free.length) h+='<div class="empty">Все фамильяры заняты или их у тебя нет.</div>';
    else {
      h+='<div class="exp-slot"><div class="cc-nm" style="margin-bottom:7px">Отправить в темноту<small>Ушедший фамильяр не даёт бонусов, пока не вернётся</small></div>'+
        '<select id="expPet" class="dark-select">'+
        free.map(p=>'<option value="'+p.id+'">'+esc(p.n)+' · ур.'+petLv(p.id)+'</option>').join('')+'</select>'+
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">'+
        EXPS.map(e=>'<button class="mini" data-exp="'+e.id+'" style="flex:1">'+e.n+'<br><span style="color:var(--mut);font-weight:700">'+
          (e.mins<60?e.mins+' мин':(e.mins/60)+' ч')+'</span></button>').join('')+'</div></div>';
    }
  }
  /* Заказы Теней */
  const c=S.contracts;
  const doneCnt=c.d.filter(x=>x&&x.done).length;
  h+='<div class="sub">Заказы Теней</div>'+
     '<div class="ctr-head">'+
       '<span class="ctr-chip">'+IC.scroll+'Дневные '+doneCnt+'/'+c.d.length+'</span>'+
       '<span class="ctr-chip">'+IC.clock+'Смена через '+fmtTime((c.dReset-now())/1000)+'</span>'+
       '<span class="ctr-chip week">'+IC.truth+'Недельный · '+fmtTime((c.wReset-now())/1000)+'</span>'+
     '</div>';
  h+=c.d.map(contractCard).join('')+contractCard(c.w);
  /* Ритуалы */
  h+='<div class="sub">Ритуалы</div>';
  h+=RITUALS.map(r=>{
    const cost=ritualCost(r), can=hasRes(cost);
    const extra = r.id==='r4'?' <span style="color:var(--gold);font-size:10px">×'+S.ritualEdge+'</span>':'';
    const done = r.id==='r5'&&S.hidden.includes('h2');
    return '<div class="craft-card"><div class="cc-head"><div class="cc-ic" style="color:var(--rtruth)">'+IC[r.ic]+'</div>'+
      '<div class="cc-nm">'+r.n+extra+'<small>'+r.d+'</small></div></div>'+
      '<div class="cc-lore">'+r.lore+'</div>'+costHTML(cost,0)+
      '<div class="cc-foot"><button class="buy tr" data-ritual="'+r.id+'"'+(can&&!done?'':' disabled')+'>'+
      (done?'открыто':'провести')+'</button></div></div>';
  }).join('');
  $('#deedsBody').innerHTML=h;
}
