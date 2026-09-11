"use strict";
/* ============================================================
   SYSTEMS / HIDDEN — скрытое и мета-прогрессия:
   Истинные Реликвии, Книга Имён, Истинное Имя, скрытые глубины,
   достижения, Заветы Бездны, титулы, лор, Голоса Бездны, кошмары
   ============================================================ */

/* ---------------- Истинные Реликвии ---------------- */
const TRELICS = [
  {id:'t1', n:'Гвоздь Первой Клятвы', ic:'sword', d:'+18% ко всему урону.',
   lore:'Им прибили обещание к дереву. Дерево умерло, обещание — нет.', apply(B){B.allMul*=1.18}},
  {id:'t2', n:'Слеза Немого Хора', ic:'whisper', d:'+30% Шёпота и +12% опыта.',
   lore:'Хор плакал один раз. Эта слеза так и не упала.', apply(B){B.whisMul+=0.3; B.xpMul*=1.12}},
  {id:'t3', n:'Зуб Пожирателя Рассветов', ic:'flame', d:'+25% урона по Владыкам, +15% Крови.',
   lore:'Он выпал, когда небо оказалось слишком твёрдым.', apply(B){B.bossMul*=1.25; B.bloodMul+=0.15}},
  {id:'t4', n:'Монета Мёртвого Перевозчика', ic:'coin', d:'+28% золота.',
   lore:'Плата за переправу. Перевозчик не вернулся, монета вернулась.', apply(B){B.goldMul*=1.28}},
  {id:'t5', n:'Позвонок Органиста', ic:'urn', d:'+22% Пепла Душ и +10% автоурона.',
   lore:'Нижняя нота реквиема. Её до сих пор слышно в стенах.', apply(B){B.ashMul+=0.22; B.dpsMul*=1.1}},
  {id:'t6', n:'Веко Каргула', ic:'eye', d:'+6% шанса крита и +0.3 к множителю.',
   lore:'Третий глаз закрыли силой. Веко сохранило взгляд.', apply(B){B.crit+=6; B.critMulAdd+=0.3}},
  {id:'t7', n:'Пустая Корона', ic:'crown', d:'+20% ко всему урону и +15% осколков.',
   lore:'Её носили семеро. Ни у одного не осталось головы.', apply(B){B.allMul*=1.2; B.shardMul+=0.15}}
];
const TR = id => TRELICS.find(r=>r.id===id);
const RSETS = [
  {need:3, d:'Три реликвии: +15% ко всему урону.', apply(B){B.allMul*=1.15}},
  {need:5, d:'Пять реликвий: +25% золота, опыта и Пепла.', apply(B){B.goldMul*=1.25;B.xpMul*=1.25;B.ashMul+=0.25}},
  {need:7, d:'Все семь: +50% ко всему урону и +1 слот свиты.', apply(B){B.allMul*=1.5;B.petSlots+=1}}
];
function trelicRoll(){
  const left=TRELICS.filter(r=>!S.relics.includes(r.id));
  if (!left.length) return;
  if (Math.random()<0.05){
    const r=pick(left);
    S.relics.push(r.id);
    sfx.truth();
    log('Истинная Реликвия: <b style="color:var(--rtruth)">'+esc(r.n)+'</b>','truth');
    truthToast(0, r.n, r.d);
    renderCodex(); renderStats();
    hint('relics','Истинные Реликвии','Владыки иногда роняют то, что нельзя перековать. Реликвии видны в <b>Кодексе</b>, дают вечные бонусы и не исчезают при Разрыве Оков.');
    save(true);
  }
}

/* ---------------- Книга Имён и скрытые глубины ---------------- */
function bookBonus(){ return S.codexBoss.length*0.015; }
function addLore(t){ if (!S.lore.includes(t)){ S.lore.push(t); if (S.lore.length>40) S.lore.shift(); renderCodex(); } }
function addCodexFam(f){ if(!S.codexFam.includes(f)){S.codexFam.push(f); renderCodex();} }
function addCodexBoss(i){
  if(i>=0&&!S.codexBoss.includes(i)){
    S.codexBoss.push(i); renderCodex(); renderStats();
    log('Книга Имён: записано новое имя. Всего '+S.codexBoss.length+'.','ach');
    hint('book','Книга Имён','Каждое записанное имя Владыки навсегда даёт +1.5% ко всему урону. Книга не сгорает при Разрыве Оков.');
    checkHidden();
  }
}
function unlockHidden(id){
  if (S.hidden.includes(id)) return;
  const z=HIDDEN_ZONES.find(h=>h.id===id); if (!z) return;
  S.hidden.push(id);
  sfx.truth();
  log('Открыта скрытая глубина: <b style="color:var(--rtruth)">'+esc(z.z)+'</b>','truth');
  truthToast(0, z.z, z.rn+' · '+z.rd);
  addLore('«'+z.z+'» — '+z.rl);
  hint('hidden','Скрытые глубины','Открытая глубина вплетается в череду зон и будет попадаться при спуске. Её правило сильнее обычных — и в обе стороны.');
  save(true);
}
function checkHidden(){
  if (!S.hidden.includes('h1') && S.codexBoss.length>=8) unlockHidden('h1');
  if (!S.hidden.includes('h3') && S.trueName) unlockHidden('h3');
}

/* ---------------- Истинное Имя ---------------- */
const TRUE_NAMES = [
  {id:'tn1', n:'Тот, Кто Не Отпустил', ic:'chain',
   d:'+60% ко всему урону и +1 слот свиты. Оковы стали частью тела.',
   lore:'Ты не сбросил цепь — ты вплавил её в кость и назвал это волей.',
   apply(B){B.allMul*=1.6; B.petSlots+=1}},
  {id:'tn2', n:'Та, Что Считает Пепел', ic:'urn',
   d:'+80% Пепла, Крови и Шёпота, +45% золота и опыта.',
   lore:'Она не воюет. Она пересчитывает всё, что осталось, и этого хватает.',
   apply(B){B.ashMul+=0.8;B.bloodMul+=0.8;B.whisMul+=0.8;B.goldMul*=1.45;B.xpMul*=1.45}},
  {id:'tn3', n:'Имя, Которого Нет', ic:'void',
   d:'+25% шанса казни, +0.9 к множителю крита, +12% крита.',
   lore:'Когда его произносят, слушатель забывает, о ком речь. Иногда — навсегда.',
   apply(B){B.exec+=0.25;B.critMulAdd+=0.9;B.crit+=12}}
];
function renderTrueName(){
  const box=$('#trueNameBox');
  if (S.trueName){
    const t=TRUE_NAMES.find(x=>x.id===S.trueName);
    box.innerHTML='<div class="craft-card hot"><div class="cc-head"><div class="cc-ic" style="color:var(--rtruth)">'+IC[t.ic]+'</div>'+
      '<div class="cc-nm" style="color:var(--rtruth)">'+t.n+'<small>'+t.d+'</small></div></div>'+
      '<div class="cc-lore">'+t.lore+'</div></div>';
    return;
  }
  const ok = S.prestige>=5 && (S.res.truth||0)>=5;
  box.innerHTML='<div class="craft-card"><div class="cc-head"><div class="cc-ic" style="color:'+(ok?'var(--rtruth)':'#4b4468')+'">'+
    (ok?IC.truth:IC.lock)+'</div><div class="cc-nm">Истинное Имя<small>'+
    (ok?'Можно принять. Выбор навсегда.':'Нужно 5 Разрывов Оков и 5 Осколков Истины ('+S.prestige+'/5, '+(S.res.truth||0)+'/5)')+
    '</small></div></div><div class="cc-lore">У всего есть имя, которое было до тебя. Если произнести его вслух, оно станет твоим — и ты станешь его.</div>'+
    '<div class="cc-foot"><button class="buy tr" id="tnBtn"'+(ok?'':' disabled')+'>назвать себя</button></div></div>';
}
function trueNameModal(){
  if (S.trueName||S.prestige<5||(S.res.truth||0)<5) return;
  const cards=TRUE_NAMES.map(t=>'<div class="class-card" data-tn="'+t.id+'" style="border-color:rgba(255,224,102,.35)">'+
    '<div class="ch"><div class="ci" style="color:var(--rtruth)">'+IC[t.ic]+'</div>'+
    '<div class="cn" style="color:var(--rtruth)">'+t.n+'</div></div>'+
    '<div class="cs">'+t.d+'</div><div class="cl">'+t.lore+'</div></div>').join('');
  openModal('<div class="m-ic" style="color:var(--rtruth)">'+IC.truth+'</div><h2>Назови себя</h2>'+
    '<p>Пять смертей и пять осколков. Этого достаточно, чтобы произнести то, что было до тебя.<br>Выбор нельзя отменить никогда — даже Разрывом Оков.</p>'+
    '<div class="class-grid">'+cards+'</div>', true);
  $$('#modal [data-tn]').forEach(n=>n.onclick=()=>{
    S.res.truth-=5; S.trueName=n.dataset.tn;
    const t=TRUE_NAMES.find(x=>x.id===S.trueName);
    S.heroName=t.n;
    closeModal(); sfx.truth(); arenaShake();
    log('Ты назвал себя: <b style="color:var(--rtruth)">'+t.n+'</b>.','truth');
    unlockHidden('h3');
    renderTitle(); renderStats(); renderTrueName(); renderResBar(); checkAch(); save(true);
  });
}

/* ---------------- Достижения ---------------- */
const ACH = [
  {id:'k1',ic:'blood',n:'Первая кровь',d:'Убить первого врага',t:()=>S.kills>=1},
  {id:'k50',ic:'skull',n:'Мясник',d:'Убить 50 врагов',t:()=>S.kills>=50},
  {id:'k500',ic:'skull',n:'Истребитель',d:'Убить 500 врагов',t:()=>S.kills>=500},
  {id:'b1',ic:'crown',n:'Головорез',d:'Победить первого Владыку',t:()=>S.bosses>=1},
  {id:'b10',ic:'crown',n:'Погибель Владык',d:'Победить 10 Владык',t:()=>S.bosses>=10},
  {id:'e10',ic:'star',n:'Охота на элиту',d:'Убить 10 элитных врагов',t:()=>S.elites>=10},
  {id:'m5',ic:'mark',n:'Ловчий Меток',d:'Настигнуть 5 меченых',t:()=>S.marks>=5},
  {id:'c100',ic:'fist',n:'Быстрые пальцы',d:'Сделать 100 кликов',t:()=>S.clicks>=100},
  {id:'c1k',ic:'fist',n:'Тысяча ударов',d:'Сделать 1 000 кликов',t:()=>S.clicks>=1000},
  {id:'l10',ic:'spark',n:'Опытный воин',d:'Достичь 10 уровня',t:()=>S.lvl>=10},
  {id:'l25',ic:'spark',n:'Живая легенда',d:'Достичь 25 уровня',t:()=>S.lvl>=25},
  {id:'g10k',ic:'coin',n:'Кладезь',d:'Заработать 10K золота',t:()=>S.totalGold>=1e4},
  {id:'g1m',ic:'coin',n:'Драконья казна',d:'Заработать 1M золота',t:()=>S.totalGold>=1e6},
  {id:'d100',ic:'dps',n:'Армия Теней',d:'Разогнать DPS до 100',t:()=>stats().dps>=100},
  {id:'cr30',ic:'target',n:'Сердцеед',d:'Шанс крита 30%',t:()=>stats().crit>=30},
  {id:'s30',ic:'flag',n:'Во тьму',d:'Достичь 30 глубины',t:()=>S.maxStage>=30},
  {id:'s60',ic:'flag',n:'За гранью',d:'Достичь 60 глубины',t:()=>S.maxStage>=60},
  {id:'p10',ic:'gem',n:'Транжира',d:'10 покупок в лавке',t:()=>S.purchases>=10},
  {id:'sk5',ic:'tree',n:'Идущий Путём',d:'Изучить 5 узлов древа',t:()=>Object.values(S.skills).filter(v=>v>0).length>=5},
  {id:'pr1',ic:'chain',n:'Разорвавший Оковы',d:'Первый престиж',t:()=>S.prestige>=1},
  {id:'pr3',ic:'chain',n:'Трижды Мёртвый',d:'Три престижа',t:()=>S.prestige>=3},
  {id:'eq4',ic:'bag',n:'Полное облачение',d:'Надеть все 4 предмета',t:()=>Object.values(S.equip).every(v=>v)},
  {id:'lg1',ic:'trophy',n:'Проклятая находка',d:'Найти проклятый предмет',t:()=>S.inv.concat(Object.values(S.equip).filter(Boolean)).some(i=>i&&i.rar>=4)},
  {id:'cx6',ic:'book',n:'Летописец',d:'Открыть все записи о тварях',t:()=>S.codexFam.length>=6},
  {id:'sh50',ic:'shard',n:'Собиратель Осколков',d:'Накопить 50 осколков всего',t:()=>S.totalShards>=50},
  {id:'pet3',ic:'paw',n:'Не один',d:'Приручить 3 фамильяров',t:()=>Object.keys(S.pets).length>=3},
  {id:'tr1',ic:'truth',n:'Первая Истина',d:'Добыть Осколок Истины',t:()=>(S.res.truth||0)>=1||S.hidden.length>0},
  {id:'rel1',ic:'orb',n:'Хранитель',d:'Найти Истинную Реликвию',t:()=>S.relics.length>=1},
  {id:'forge1',ic:'anvil',n:'Кузнец',d:'Проклясть или перековать вещь',t:()=>Object.values(S.equip).some(i=>i&&i.cursed)},
  {id:'well1',ic:'well',n:'Услышанный',d:'Заглянуть в Колодец',t:()=>S.wellAt>0}
];
function checkAch(){
  for (const a of ACH){
    if (!S.ach.includes(a.id)){
      let ok=false; try{ ok=a.t(); }catch(e){}
      if (ok){ S.ach.push(a.id); sfx.ach(); log('Достижение: <b>'+a.n+'</b>','ach'); toast(a); renderAch(); renderTitle(); }
    }
  }
  checkGoals();
}

/* ---------------- Заветы Бездны ---------------- */
const GOALS = [
  {id:'q1',n:'Спуститься на глубину 100',t:()=>S.maxStage>=100,r:15},
  {id:'q2',n:'Собрать 6 фамильяров',t:()=>Object.keys(S.pets).length>=6,r:25},
  {id:'q3',n:'Совершить 5 Разрывов Оков',t:()=>S.prestige>=5,r:35},
  {id:'q4',n:'Открыть скрытую глубину',t:()=>S.hidden.length>=1,r:30},
  {id:'q5',n:'Записать 9 имён в Книгу',t:()=>S.codexBoss.length>=9,r:30},
  {id:'q6',n:'Собрать 3 Истинные Реликвии',t:()=>S.relics.length>=3,r:45},
  {id:'q7',n:'Спуститься на глубину 200',t:()=>S.maxStage>=200,r:50},
  {id:'q8',n:'Принять Истинное Имя',t:()=>!!S.trueName,r:70},
  {id:'q9',n:'Совершить 10 Разрывов Оков',t:()=>S.prestige>=10,r:90},
  {id:'q10',n:'Собрать все семь Реликвий',t:()=>S.relics.length>=7,r:120},
  {id:'q11',n:'Открыть все скрытые глубины',t:()=>S.hidden.length>=3,r:140},
  {id:'q12',n:'Спуститься на глубину 400',t:()=>S.maxStage>=400,r:180}
];
function checkGoals(){
  for (const g of GOALS){
    if (S.goals.includes(g.id)) continue;
    let ok=false; try{ ok=g.t(); }catch(e){}
    if (ok){
      S.goals.push(g.id); S.shards+=g.r; S.totalShards+=g.r;
      sfx.pet();
      log('Завет исполнен: <b>'+g.n+'</b> · +'+g.r+' осколков','drop');
      toast({ic:'shard',n:'Завет Бездны исполнен',d:g.n+' · +'+g.r+' осколков'});
      renderGoals(); renderGold();
    }
  }
}

/* ---------------- Титулы ---------------- */
const TITLES = [
  {n:'Безымянный',t:()=>true},
  {n:'Пришедший из Пепла',t:()=>S.kills>=10},
  {n:'Ловчий Могил',t:()=>S.kills>=200},
  {n:'Погибель Владык',t:()=>S.bosses>=5},
  {n:'Идущий Глубже',t:()=>S.maxStage>=50},
  {n:'Разорвавший Оковы',t:()=>S.prestige>=1},
  {n:'Носитель Осколков',t:()=>S.prestige>=2},
  {n:'Дитя Вечной Тьмы',t:()=>S.prestige>=3},
  {n:'Хозяин Немой Свиты',t:()=>Object.keys(S.pets).length>=6},
  {n:'Тот, Кого Помнит Бездна',t:()=>S.prestige>=5},
  {n:'Читающий Скрытое',t:()=>S.hidden.length>=1},
  {n:'Хранитель Семи',t:()=>S.relics.length>=7},
  {n:'Ходящий Между Смертями',t:()=>S.prestige>=7},
  {n:'Имя, Стёртое из Мира',t:()=>S.prestige>=10},
  {n:'Последний Из Оков',t:()=>S.prestige>=15}
];
function currentTitle(){
  if (S.trueName){ const t=TRUE_NAMES.find(x=>x.id===S.trueName); if (t) return t.n; }
  let t=TITLES[0].n; for(const x of TITLES){try{if(x.t())t=x.n;}catch(e){}} return t;
}

/* ---------------- Голоса Бездны и кошмары ---------------- */
const VOICES = [
  'Ты слышишь, как кто-то считает твои удары. Он сбился только один раз.',
  'Глубина не имеет дна. Она имеет привычку.',
  'Твоё имя ещё цело. Пока.',
  'Здесь никто не умирает окончательно. Здесь просто перестают быть нужными.',
  'Свет наверху погас, пока ты спускался. Никто не заметил.',
  'Каждый удар — это стук. Однажды тебе откроют.',
  'Ты не ищешь выход. Ты ищешь дно. Это разные вещи.',
  'Кости под ногами были такими же уверенными.',
  'Кто-то шепчет твоё настоящее имя. Не оборачивайся.',
  'Оковы не держат тебя. Они тебя ведут.',
  'То, что смотрит из темноты, уже привыкло к тебе.',
  'Всё, что ты собрал, останется здесь. Как и всё, что собрали до тебя.'
];
function voiceOfAbyss(){
  log('<i>«'+pick(VOICES)+'»</i>','voice');
  sfx.voice();
}
const NIGHTMARES = [
  {t:'Сон о лестнице', p:'Ты спускался всю ночь и ни разу не устал. Внизу стояла дверь с твоим именем, написанным чужой рукой — и почерк был лучше твоего.',
   e:()=>{ S.buffs.dmg=Math.max(S.buffs.dmg,180); }, r:'×2 урон на 3 минуты'},
  {t:'Сон о свите', p:'Твои фамильяры сидели вокруг и смотрели, как ты спишь. Один из них назвал тебя по имени, которое ты ещё не выбрал.',
   e:()=>{ addRes('whisper',6,true); }, r:'+6 Шёпота'},
  {t:'Сон о короне', p:'Ты сидел на троне из чужих позвонков и был спокоен. Проснувшись, ты понял, что спокойствие осталось там.',
   e:()=>{ addRes('blood',5,true); }, r:'+5 Крови Владык'},
  {t:'Сон о пепле', p:'Пепел падал вверх. Ты стоял в нём по колено и вспоминал лица, которых у тебя никогда не было.',
   e:()=>{ addRes('ash',30,true); }, r:'+30 Пепла Душ'},
  {t:'Сон о тишине', p:'Не было ни звука, ни темноты, ни тебя. Это было приятнее, чем должно было быть.',
   e:()=>{ S.buffs.gold=Math.max(S.buffs.gold,240); }, r:'×2 золото на 4 минуты'}
];
function nightmare(){
  const n=pick(NIGHTMARES);
  n.e();
  sfx.voice();
  openModal('<div class="m-ic" style="color:#a89ad6">'+IC.mask+'</div><h2>'+n.t+'</h2>'+
    '<p><i>'+n.p+'</i></p><p style="color:#9df0c4;font-weight:700">Осталось наяву: '+n.r+'</p>'+
    '<div class="m-btns"><button class="btn" id="nOk">Проснуться</button></div>');
  $('#nOk').onclick=()=>{ closeModal(); };
  addLore(n.p);
  renderResBar(); renderBuffs();
}
