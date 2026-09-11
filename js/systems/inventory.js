"use strict";
/* ============================================================
   SYSTEMS / INVENTORY — редкости, генерация вещей, слоты, сумка
   Редкость жёстко задаёт и статы, и пул имён.
   ============================================================ */

/* Диапазоны множителей не пересекаются: мусор физически не может
   получить статы высокой редкости. */
const RAR = [
  {n:'Обычная',     c:'#9aa0b5', affix:1, lo:0.85, hi:1.15},
  {n:'Редкая',      c:'#5aa9ff', affix:2, lo:1.90, hi:2.35},
  {n:'Эпическая',   c:'#b06cff', affix:3, lo:3.60, hi:4.40},
  {n:'Легендарная', c:'#e8b94e', affix:4, lo:6.60, hi:7.80},
  {n:'Мифическая',  c:'#ff5c6e', affix:5, lo:11.5, hi:13.5}
];
/* Типы предметов и слоты снаряжения (кольца — два слота одного типа) */
const ITYPE = {
  weapon:{n:'Оружие', ic:'sword'}, armor:{n:'Доспех', ic:'shield'},
  amulet:{n:'Амулет', ic:'amulet'}, ring:{n:'Кольцо', ic:'ring'},
  relic:{n:'Реликвия', ic:'orb'}
};
const SLOTS = {
  weapon:{n:'Оружие', ic:'sword', t:'weapon'},
  armor:{n:'Доспех', ic:'shield', t:'armor'},
  amulet:{n:'Амулет', ic:'amulet', t:'amulet'},
  ring1:{n:'Кольцо I', ic:'ring', t:'ring'},
  ring2:{n:'Кольцо II', ic:'ring', t:'ring'},
  relic:{n:'Реликвия', ic:'orb', t:'relic'}
};
/* Пул названий строго по редкости */
const RAR_PREFIX = [
  ['Ржавый','Треснувший','Щербатый','Ветхий','Тусклый','Обшарпанный','Кривой','Латаный'],
  ['Костяной','Могильный','Смолистый','Чумной','Волчий','Тенистый','Сырой','Плакальщичий'],
  ['Пепельный','Погребальный','Вдовий','Обугленный','Кровавый','Гнилой','Скорбный','Червлёный'],
  ['Безмолвный','Проклятый','Мёрзлый','Багровый','Полуночный','Неусыпный','Обетный','Палаческий'],
  []
];
const SLOT_NOUN = {
  weapon:['клинок','серп','молот','тесак','шип','коготь','эспадон','кинжал','гвоздь','цеп','крюк'],
  armor:['панцирь','саван','нагрудник','плащ','каркас','покров','доспех','кираса','обвязка','кожух'],
  amulet:['талисман','оберег','медальон','подвес','знак','глаз','узел','символ','ладанка'],
  ring:['перстень','ободок','печатка','кольцо','обруч'],
  relic:['осколок','сердце','печать','кость','пепел','шёпот','ключ']
};
/* Мифические носят собственные имена — их нельзя перепутать с мусором */
const MYTHIC_NAMES = {
  weapon:['Гвоздь Немого Хора','Серп Последнего Часа','Тесак Первой Ночи','Клинок Пустого Трона','Молот Спящей Бездны'],
  armor:['Саван Мёртвого Солнца','Панцирь Спящей Бездны','Покров Забытого Бога','Кираса Семи Клятв'],
  amulet:['Глаз Немигающего','Узел Семи Клятв','Знак Того, Кто Ждёт','Ладанка Последнего Крика'],
  ring:['Перстень Пустых Имён','Кольцо Последнего Крика','Печатка Первого Владыки'],
  relic:['Сердце Разорванных Оков','Печать Того, Что После','Кость Первого Владыки','Ключ От Тишины']
};
const STAT_DEF = {click:{n:'урон клика'},dps:{n:'автоурон'},all:{n:'весь урон'},crit:{n:'шанс крита'},
  critMul:{n:'множитель крита'},gold:{n:'золото'},xp:{n:'опыт'},boss:{n:'урон боссам'}};
const STAT_POOL = {
  weapon:['click','all','crit','critMul','boss'],
  armor:['all','dps','boss','click'],
  amulet:['crit','critMul','gold','xp','dps'],
  ring:['crit','critMul','click','dps','gold','all'],
  relic:['all','gold','xp','dps','click','crit']
};

/* Редкость: источник задаёт коридор, случай — место внутри него */
function rollRarity(depth,boss,elite,mark,minForce){
  const B=bonuses();
  let min=0, max=2;                       /* обычная тварь: не выше эпической */
  if (boss||mark){ min=2; max=4; }        /* Владыка и меченый: не ниже эпической */
  else if (elite){ min=1; max=3; }        /* элита: от редкой до легендарной */
  if (depth<60 && max>3) max=3;           /* мифика — только с глубины 60 */
  if (depth<25 && max>2) max=2;
  let r=Math.random()+(boss?0.30:0)+(mark?0.25:0)+(elite?0.10:0)
        +Math.min(0.22,depth/560)+(B.rarBonus||0);
  let tier = r>1.38?4 : r>1.10?3 : r>0.84?2 : r>0.54?1 : 0;
  if (typeof minForce==='number') min=Math.max(min,minForce);
  return clamp(tier,min,Math.max(min,max));
}
function rollStats(type,depth,rar){
  const R=RAR[rar], pool=(STAT_POOL[type]||STAT_POOL.relic).slice(), st={};
  const n=Math.min(R.affix,pool.length);
  for (let i=0;i<n;i++){
    const k=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    let base;
    if (k==='crit') base=1.4+depth*0.055;
    else if (k==='critMul') base=5+depth*0.22;
    else base=6+depth*0.55;
    const m=R.lo+Math.random()*(R.hi-R.lo);      /* строго внутри коридора редкости */
    st[k]=Math.round(base*m*10)/10;
  }
  return st;
}
function itemName(type,rar){
  if (rar>=4) return pick(MYTHIC_NAMES[type]||MYTHIC_NAMES.relic);
  return pick(RAR_PREFIX[rar])+' '+pick(SLOT_NOUN[type]||SLOT_NOUN.relic);
}
function makeItem(type,depth,rar){
  return {i:S.itemSeq++, slot:type, rar, lv:depth, n:itemName(type,rar), st:rollStats(type,depth,rar)};
}
function applyItem(B,it){
  const m = it.cursed?1.35:1;
  for (const k in it.st){ const v=it.st[k]*m;
    if (k==='click') B.clickMul*=1+v/100; else if (k==='dps') B.dpsMul*=1+v/100;
    else if (k==='all') B.allMul*=1+v/100; else if (k==='crit') B.crit+=v;
    else if (k==='critMul') B.critMulAdd+=v/100; else if (k==='gold') B.goldMul*=1+v/100;
    else if (k==='xp') B.xpMul*=1+v/100; else if (k==='boss') B.bossMul*=1+v/100; }
  if (it.cursed) B.goldMul*=0.9;
}
const itemScore = it => Object.values(it.st).reduce((a,b)=>a+b,0)*(it.cursed?1.35:1);
const sellPrice = it => Math.ceil((40+it.lv*18)*(it.rar+1)*1.6);

/* Выпадение добычи; minRar — гарантированный минимум (разломный босс) */
function dropLoot(depth,boss,elite,mark,minRar){
  const rar=rollRarity(depth,boss,elite,mark,minRar);
  let type;
  if (boss && Math.random()<0.30) type='relic';
  else type=pick(['weapon','armor','amulet','ring','ring']);
  const it=makeItem(type,depth,rar);
  if (S.inv.length>=INV_MAX){
    const p=sellPrice(it); S.gold+=p; S.totalGold+=p;
    log('Сумка полна — «'+esc(it.n)+'» продан за '+nf(p)+' золота.','gold'); return;
  }
  S.inv.push(it); sfx.drop();
  log('Добыча: <b style="color:'+RAR[it.rar].c+'">'+esc(it.n)+'</b>','drop');
  dropToast(it); renderGear(); renderTabBadges();
  hint('gear','Снаряжение','Падает редко, но бьёт заметно. В <b>Сумке</b> предмет можно надеть, разобрать на Пепел или отдать в <b>Горн</b>.');
}

/* ---------------- Сумка ---------------- */
const INV_TYPES=[['all','Все'],['weapon','Оружие'],['armor','Доспех'],['amulet','Амулет'],['ring','Кольца'],['relic','Реликвии']];
function renderGear(){
  const sl=$('#slots'); sl.innerHTML='';
  for (const k in SLOTS){
    const it=S.equip[k], col=it?RAR[it.rar].c:'';
    const short = it ? Object.entries(it.st).slice(0,1).map(([s,v])=>pct(v*(it.cursed?1.35:1))).join('') : '';
    sl.appendChild(el('<div class="slot'+(it?' filled':'')+'" data-slot="'+k+'"'+
      (it?' style="border-color:'+col+';color:'+col+'"':'')+
      ' title="'+(it?esc(it.n)+' — '+RAR[it.rar].n:'Пустой слот: '+SLOTS[k].n)+'">'+
      IC[SLOTS[k].ic]+(short?'<span class="sv">'+short+'</span>':'')+
      '<span class="sl">'+SLOTS[k].n+'</span></div>'));
  }
  $('#invTools').innerHTML=
    '<div class="tool-row">'+INV_TYPES.map(t=>'<button data-t="'+t[0]+'"'+(invType===t[0]?' class="on"':'')+'>'+t[1]+'</button>').join('')+'</div>'+
    '<div class="tool-row">'+
      '<button data-f="0"'+(invFilter===0?' class="on"':'')+'>Любая</button>'+
      '<button data-f="1"'+(invFilter===1?' class="on"':'')+'>Редкие+</button>'+
      '<button data-f="2"'+(invFilter===2?' class="on"':'')+'>Эпик+</button>'+
      '<button data-f="3"'+(invFilter===3?' class="on"':'')+'>Легенд.+</button>'+
      '<button data-s="rar"'+(invSort==='rar'?' class="on"':'')+'>Редкость</button>'+
      '<button data-s="pow"'+(invSort==='pow'?' class="on"':'')+'>Сила</button>'+
      '<button class="junk" id="salvJunk">Разобрать хлам</button>'+
    '</div>';
  $('#invCount').textContent='('+S.inv.length+'/'+INV_MAX+')';
  const eq=Object.entries(S.equip).filter(([k,v])=>v);
  let html=eq.map(([k,it])=>itemHTML(it,k)).join('');
  let list=S.inv.filter(i=>i.rar>=invFilter && (invType==='all'||i.slot===invType));
  list.sort((a,b)=> invSort==='rar'?(b.rar-a.rar||itemScore(b)-itemScore(a)):(itemScore(b)-itemScore(a)));
  if (!list.length) html+='<div class="empty">'+(S.inv.length?'Ничего не подходит под фильтр.':'Сумка пуста.<br>Снаряжение падает с Владык, элит и меченых.')+'</div>';
  else html+=list.map(it=>itemHTML(it,null)).join('');
  $('#invList').innerHTML=html;
}
/* Сравнение с надетым: показываем, лучше вещь или хуже */
function compareMark(it){
  const keys=Object.keys(SLOTS).filter(k=>SLOTS[k].t===it.slot);
  if (!keys.length) return '';
  let best=null;
  for (const k of keys){ const cur=S.equip[k]; if (cur && (!best||itemScore(cur)<itemScore(best))) best=cur; }
  const free=keys.some(k=>!S.equip[k]);
  if (free) return '<span class="cmp up">свободный слот</span>';
  if (!best) return '';
  const d=itemScore(it)-itemScore(best);
  if (Math.abs(d)<0.5) return '';
  return d>0 ? '<span class="cmp up">▲ лучше на '+nf(d)+'</span>' : '<span class="cmp dn">▼ хуже на '+nf(-d)+'</span>';
}
function itemHTML(it,equippedSlot){
  const R=RAR[it.rar], m=it.cursed?1.35:1;
  const st=Object.entries(it.st).map(([k,v])=>'<span class="stt">'+pct(v*m)+' '+STAT_DEF[k].n+'</span>').join('');
  const T=ITYPE[it.slot]||ITYPE.relic;
  return '<div class="item r'+it.rar+(it.cursed?' cursed':'')+'" style="border-color:'+R.c+'55">'+
    '<div class="i-ic" style="color:'+R.c+'">'+IC[T.ic]+'</div>'+
    '<div class="i-info"><div class="i-nm" style="color:'+R.c+'">'+esc(it.n)+(it.cursed?' ✦':'')+'</div>'+
    '<div class="i-rar" style="color:'+R.c+'">'+(it.cursed?'Осквернённая · ':'')+R.n+' · '+T.n+' · гл.'+it.lv+'</div>'+
    '<div class="i-st">'+st+(it.cursed?'<span class="stt bad">−10% золота</span>':'')+'</div>'+
    (equippedSlot?'<div class="i-eq">Надето: '+SLOTS[equippedSlot].n+'</div>':compareMark(it))+
    '</div><div class="i-btns">'+
    (equippedSlot?'<button class="mini off" data-uneq="'+equippedSlot+'">Снять</button>'
      :'<button class="mini" data-eq="'+it.i+'">Надеть</button>'+
       '<button class="mini as" data-salv="'+it.i+'">Разбор</button>'+
       '<button class="mini sell" data-sell="'+it.i+'">'+nf(sellPrice(it))+'</button>')+
    '</div></div>';
}
function equipItem(id){
  const idx=S.inv.findIndex(i=>i.i===id); if (idx<0) return;
  const it=S.inv[idx];
  const keys=Object.keys(SLOTS).filter(k=>SLOTS[k].t===it.slot);
  if (!keys.length) return;
  /* сначала свободный слот, иначе — самый слабый из занятых */
  let target=keys.find(k=>!S.equip[k]);
  if (!target){
    target=keys[0];
    for (const k of keys) if (itemScore(S.equip[k])<itemScore(S.equip[target])) target=k;
  }
  const cur=S.equip[target];
  S.equip[target]=it; S.inv.splice(idx,1);
  if (cur) S.inv.push(cur);
  sfx.buy(); log('Надето: <b style="color:'+RAR[it.rar].c+'">'+esc(it.n)+'</b>','buy');
  renderGear(); renderStats(); checkAch(); renderTabBadges(); save(true);
}
function unequip(slot){
  const it=S.equip[slot]; if (!it) return;
  if (S.inv.length>=INV_MAX){ log('Сумка полна — снять нельзя.','info'); return; }
  S.inv.push(it); S.equip[slot]=null;
  renderGear(); renderStats(); renderTabBadges(); save(true);
}
function sellItem(id){
  const idx=S.inv.findIndex(i=>i.i===id); if (idx<0) return;
  const it=S.inv[idx], p=sellPrice(it);
  S.inv.splice(idx,1); S.gold+=p; S.totalGold+=p;
  sfx.gold(); log('Продано: '+esc(it.n)+' за '+nf(p)+' золота.','gold');
  renderGear(); renderGold(); renderTabBadges(); save(true);
}
