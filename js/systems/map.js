"use strict";
/* ============================================================
   SYSTEMS / MAP — регионы, законы глубин, выбор глубины,
   режимы «фарм» / «глубже», временные разломы
   ============================================================ */

const BASE_ZONES = [
  {z:'Проклятый лес', c:['#40513b','#9fe86a','#1c2416'],
   rn:'Молодая гниль', rd:'+30% опыта, −15% золота.', rl:'Здесь ещё помнят, как было зелено.',
   r:{xp:1.30, gold:0.85}},
  {z:'Гниющие катакомбы', c:['#565b48','#e8e6b0','#26271c'],
   rn:'Костяные щиты', rd:'Враги под щитом: автоурон −45%, пока цел щит. Клик пробивает.', rl:'Кость держит удар лучше, чем держала жизнь.',
   r:{shield:0.3, dpsVsShield:0.55, click:1.15}},
  {z:'Чумные болота', c:['#31554c','#4ce8c8','#14241f'],
   rn:'Миазмы', rd:'После первого удара враг гниёт: 4% макс. HP в секунду. Золото −10%.', rl:'Воздух здесь гуще воды и злее её.',
   r:{poison:0.04, gold:0.9}},
  {z:'Пепельные пустоши', c:['#57392c','#ff9a4c','#281510'],
   rn:'Жар', rd:'+45% к множителю крита, но комбо спадает вдвое быстрее.', rl:'Пепел не остыл с той войны, о которой некому рассказать.',
   r:{critMul:0.45, comboFast:2}},
  {z:'Мёрзлые глубины', c:['#33475c','#8cd8ff','#17222e'],
   rn:'Оцепенение', rd:'+14 секунд на Владыку, но автоурон −20%.', rl:'Холод замедляет даже то, что уже не дышит.',
   r:{dps:0.8, bossTime:14}},
  {z:'Цитадель Пустоты', c:['#453058','#c88cff','#1e1428'],
   rn:'Пустотный сбор', rd:'+60% шанса дропа снаряжения, −20% опыта.', rl:'Вещи здесь падают охотнее, чем люди.',
   r:{drop:1.6, xp:0.8}},
  {z:'Сад Немых Хоров', c:['#4a2a3f','#ff8ac4','#22111b'],
   rn:'Немой хор', rd:'Каждое убийство даёт Пепел Душ. Урон клика −12%.', rl:'Цветы поют вместо тех, кого закопали под ними.',
   r:{ashKill:1, click:0.88}},
  {z:'Пасть Мёртвого Солнца', c:['#5c4a20','#ffe66a','#251d0c'],
   rn:'Слепящий свет', rd:'+55% золота, но слабые места не видны.', rl:'Свет мёртвого солнца показывает всё, кроме нужного.',
   r:{gold:1.55, noWeak:true}}
];
const HIDDEN_ZONES = [
  {id:'h1', z:'Библиотека Немых Имён', c:['#3b3350','#d7c9ff','#1a1626'],
   rn:'Каталог мёртвых', rd:'+80% опыта и Шёпот за каждое десятое убийство.',
   rl:'Полки уходят вниз. Ни одна книга не о живых.',
   how:'Записать 8 имён в Книгу Имён', r:{xp:1.8, whisper10:1}},
  {id:'h2', z:'Утроба Первой Ночи', c:['#4d1f2a','#ff7a8a','#1d0a10'],
   rn:'Первая кровь', rd:'+120% Крови Владык, но Владыки вдвое живучее.',
   rl:'Здесь родилась первая тень — и до сих пор не остыла.',
   how:'Ритуал Открытия Пути (3 Осколка Истины)', r:{bloodMul:1.2, bossHp:2}},
  {id:'h3', z:'Тишина После', c:['#2a2a33','#e8e8f0','#131318'],
   rn:'Ничего больше', rd:'+150% ко всему урону, но золото здесь не падает вовсе.',
   rl:'Это место наступает после всего. Оно уже наступило.',
   how:'Принять Истинное Имя', r:{all:2.5, noGold:true}}
];
function activeZones(){ return BASE_ZONES.concat(HIDDEN_ZONES.filter(h=>S.hidden.includes(h.id))); }
const zoneIndex = s => Math.floor((s-1)/10) % activeZones().length;
function zoneAt(s){ return activeZones()[zoneIndex(s)]; }
function zoneName(s){
  const Z=activeZones(), curse=Math.floor((s-1)/(Z.length*10));
  return zoneAt(s).z + (curse>0?' · Проклятие '+roman(curse+1):'');
}
function ZR(){
  if (riftOn() && S.rift.rule) return S.rift.rule;
  const z=zoneAt(S.stage); return (z&&z.r)||{};
}
function zoneBanner(){
  const z=zoneAt(S.stage);
  if (!z || !z.rn) return;
  const b=$('#zoneBanner');
  b.innerHTML='<div class="zn">'+esc(z.z)+'</div><div class="zr">'+esc(z.rn)+' · '+esc(z.rd)+'</div><div class="zl">'+esc(z.rl)+'</div>';
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  log('<b>'+esc(z.z)+'</b> · '+esc(z.rn)+': '+esc(z.rd),'info');
  hint('zones','Правила глубин','У каждой зоны свой закон: где-то щедрее опыт, где-то враги под щитом, где-то не видно слабых мест. Читай баннер при переходе — он не врёт.');
}

/* ---------------- Перемещение по глубине ---------------- */
function travelTo(depth){
  const d=clamp(Math.floor(depth),1,S.maxStage);
  if (riftOn()){ log('Из разлома нельзя уйти — только закрыть его.','info'); return; }
  S.stage=d;
  lastZone=-1;
  log('Спуск к глубине <b>'+d+'</b>.','info');
  spawnMob(); renderMap(); renderStats(); save(true);
}
function setMode(m){
  S.mode=m;
  log(m==='farm'?'Режим: <b>фарм</b> — глубина держится на месте.':'Режим: <b>глубже</b> — каждый убитый ведёт вниз.','info');
  hint('mode','Фарм и Глубже','В режиме «фарм» глубина не растёт: удобно копить золото и ресурсы. «Глубже» ведёт вниз после каждого убийства.');
  renderMap(); renderModeChip(); save(true);
}
/* Первая глубина региона, ближайшая к достигнутой */
function regionEntry(idx){
  const Z=activeZones().length;
  let best=idx*10+1;
  for (let cycle=0; ; cycle++){
    const d=cycle*Z*10 + idx*10 + 1;
    if (d>S.maxStage) break;
    best=d;
  }
  return best;
}

/* ---------------- Временные разломы ---------------- */
const RIFT_NAMES=['Червоточина в Пепле','Трещина Немого Часа','Прореха Первой Ночи','Разрыв Пустого Трона'];
const RIFT_BOSSES=['Хозяин Червоточины','Тот, Что Вышел Первым','Смотритель Прорехи','Голос Изнутри'];
const RIFT_LIFE=900000; /* 15 минут */
const riftOn = () => !!(S.rift && S.rift.until>now());
function riftAvailable(){ return !riftOn() && S.riftAt>0 && now()>=S.riftAt && S.maxStage>=15; }
function scheduleRift(){ S.riftAt=now()+ (1500+Math.random()*1500)*1000; } /* 25–50 минут */
function enterRift(){
  if (!riftAvailable()) return;
  S.rift={ name:pick(RIFT_NAMES), boss:pick(RIFT_BOSSES), kills:0, need:6,
           until:now()+RIFT_LIFE, rule:{gold:1.0, drop:1.0} };
  S.riftAt=0;
  sfx.mark(); arenaShake();
  log('<b>Разлом раскрылся.</b> Шесть тварей — и выйдет хозяин.','boss');
  hint('rift','Разломы','Разлом живёт 15 минут: внутри вдвое больше золота, много Пепла и щедрая добыча. Убей шестерых — и явится хозяин с гарантированной эпикой и шансом на Осколок Истины.');
  spawnMob(); renderMap(); renderModeChip(); save(true);
}
function closeRift(won){
  S.rift=null;
  scheduleRift();
  if (won){ toast({ic:'rift',n:'Разлом закрыт',d:'Хозяин повержен, добыча ваша'}); }
  else log('Разлом затянулся. Тишина вернулась.','info');
  renderMap(); renderModeChip(); save(true);
}

/* ---------------- Рендер карты ---------------- */
function renderMap(){
  const Z=activeZones();
  const cur=zoneIndex(S.stage);
  let h='';
  /* Текущее положение и режим */
  h+='<div class="map-now"><div class="mn-top">'+
     '<div><div class="mn-lbl">Текущая глубина</div><div class="mn-val">'+S.stage+'</div></div>'+
     '<div style="text-align:right"><div class="mn-lbl">Максимум</div><div class="mn-val" style="color:var(--vio)">'+S.maxStage+'</div></div>'+
     '</div>'+
     '<div class="mode-row">'+
       '<button class="mode-btn'+(S.mode==='farm'?' on':'')+'" data-mode="farm">'+IC.anchor+'Фарм<small>глубина стоит</small></button>'+
       '<button class="mode-btn'+(S.mode==='deeper'?' on':'')+'" data-mode="deeper">'+IC.down+'Глубже<small>идём вниз</small></button>'+
     '</div>'+
     '<div class="depth-pick">'+
       '<button class="dp-btn" data-jump="-10">−10</button>'+
       '<button class="dp-btn" data-jump="-1">−1</button>'+
       '<input type="range" id="depthRange" min="1" max="'+Math.max(1,S.maxStage)+'" value="'+clamp(S.stage,1,S.maxStage)+'">'+
       '<button class="dp-btn" data-jump="1">+1</button>'+
       '<button class="dp-btn" data-jump="10">+10</button>'+
     '</div>'+
     '<div class="depth-go"><span id="depthPreview">Глубина '+clamp(S.stage,1,S.maxStage)+'</span>'+
       '<button class="mini" id="depthGo">Отправиться</button>'+
       '<button class="mini sell" id="depthMax">На максимум</button></div>'+
     '</div>';
  /* Разлом */
  if (riftOn()){
    const left=Math.max(0,S.rift.until-now());
    h+='<div class="rift-card on"><div class="cc-head"><div class="cc-ic" style="color:#c88cff">'+IC.rift+'</div>'+
      '<div class="cc-nm">'+esc(S.rift.name)+'<small>Закроется через '+fmtTime(left/1000)+'</small></div></div>'+
      '<div class="cc-body">×2.2 золота · вдвое больше Пепла · +80% шанса добычи</div>'+
      '<div class="cc-body">Тварей до хозяина: <b style="color:#c88cff">'+Math.max(0,S.rift.need-S.rift.kills)+'</b></div>'+
      '<div class="timer-bar"><i style="width:'+clamp(S.rift.kills/S.rift.need*100,0,100)+'%"></i></div></div>';
  } else if (riftAvailable()){
    h+='<div class="rift-card ready"><div class="cc-head"><div class="cc-ic" style="color:#c88cff">'+IC.rift+'</div>'+
      '<div class="cc-nm">Разлом раскрылся<small>Живёт 15 минут</small></div></div>'+
      '<div class="cc-body">Богатая добыча и хозяин с гарантированной эпической вещью.</div>'+
      '<div class="cc-foot"><button class="buy tr" id="enterRift">войти</button></div></div>';
  } else {
    const left=Math.max(0,(S.riftAt||0)-now());
    h+='<div class="rift-card"><div class="cc-head"><div class="cc-ic" style="color:#4b4468">'+IC.rift+'</div>'+
      '<div class="cc-nm">Разломов нет<small>'+(S.maxStage<15?'Откроются на глубине 15':'Следующий через '+fmtTime(left/1000))+'</small></div></div></div>';
  }
  /* Регионы */
  h+='<div class="sub">Регионы</div>';
  h+=Z.map((z,i)=>{
    const entry=regionEntry(i);
    const open=entry<=S.maxStage;
    const here=i===cur;
    const hid=HIDDEN_ZONES.some(x=>x.z===z.z);
    return '<div class="region'+(here?' here':'')+(open?'':' locked')+'" style="--rc:'+z.c[1]+'">'+
      '<div class="rg-bar"></div>'+
      '<div class="rg-body">'+
        '<div class="rg-nm">'+esc(z.z)+(hid?'<span class="rg-tag">скрытая</span>':'')+
          (here?'<span class="rg-tag now">здесь</span>':'')+'</div>'+
        '<div class="rg-rule"><b>'+esc(z.rn)+'</b> · '+esc(z.rd)+'</div>'+
        '<div class="rg-lore">'+esc(z.rl)+'</div>'+
        '<div class="rg-foot">'+
          '<span class="rg-depth">Глубины '+(i*10+1)+'–'+(i*10+10)+' и глубже</span>'+
          (open?'<button class="mini" data-region="'+entry+'">К глубине '+entry+'</button>'
               :'<span class="mini" style="opacity:.5">Ещё не открыт</span>')+
        '</div>'+
      '</div></div>';
  }).join('');
  $('#mapBody').innerHTML=h;
  const rng=$('#depthRange');
  if (rng) rng.oninput=e=>{ $('#depthPreview').textContent='Глубина '+e.target.value; };
}
function renderModeChip(){
  const c=$('#modeChip');
  if (!c) return;
  c.innerHTML = riftOn()
    ? '<i class="mc rift">разлом</i>'
    : (S.mode==='farm' ? '<i class="mc farm">фарм</i>' : '');
}
