"use strict";
/* ============================================================
   SYSTEMS / SKILLS — древо «Путь Теней», активные умения, ультиматив
   ============================================================ */

const SK_COMMON = [
  {id:'might', n:'Жажда Крови', ic:'blood', x:150,y:42, max:5, cost:1, req:null,
   d:'+8% ко всему урону за уровень.', lore:'Кровь на языке слаще воды.',
   ef:l=>'+'+(8*l)+'% ко всему урону', apply(B,l){B.allMul*=1+0.08*l}},
  {id:'fortune', n:'Алчная Длань', ic:'coin', x:45,y:152, max:5, cost:1, req:'might',
   d:'+12% золота за уровень.', lore:'Мертвецам монеты ни к чему.',
   ef:l=>'+'+(12*l)+'% золота', apply(B,l){B.goldMul*=1+0.12*l}},
  {id:'edge', n:'Острие', ic:'target', x:150,y:152, max:4, cost:1, req:'might',
   d:'+3% шанса крита и +0.1 к множителю крита за уровень.', lore:'Точка, где ломается кость.',
   ef:l=>'+'+(3*l)+'% крита · +'+(0.1*l).toFixed(1)+' множителя', apply(B,l){B.crit+=3*l; B.critMulAdd+=0.1*l}},
  {id:'insight', n:'Пепельная Память', ic:'book', x:255,y:152, max:5, cost:1, req:'might',
   d:'+12% опыта и +4% Пепла Душ за уровень.', lore:'Ты помнишь чужие смерти как свои.',
   ef:l=>'+'+(12*l)+'% опыта · +'+(4*l)+'% пепла', apply(B,l){B.xpMul*=1+0.12*l; B.ashMul+=0.04*l}}
];
const SK_CLASS = {
 knight:[
  {id:'kPlate', n:'Пепельный Доспех', ic:'shield', x:50,y:42, max:5, cost:2, req:'edge',
   d:'+18% урона клика и +8% урона по боссам за уровень.', lore:'Металл помнит форму тела, что в нём умерло.',
   ef:l=>'+'+(18*l)+'% клик · +'+(8*l)+'% боссам', apply(B,l){B.clickMul*=1+0.18*l; B.bossMul*=1+0.08*l}},
  {id:'kWill', n:'Ржавая Воля', ic:'helm', x:250,y:42, max:5, cost:2, req:'edge',
   d:'+18% урона по боссам и +7% ко всему урону за уровень.', lore:'Ржавчина — тоже броня, если её достаточно.',
   ef:l=>'+'+(18*l)+'% боссам · +'+(7*l)+'% урона', apply(B,l){B.bossMul*=1+0.18*l; B.allMul*=1+0.07*l}},
  {id:'bloodstrike', n:'Кровавый Удар', ic:'sword', x:95,y:158, max:5, cost:2, req:'kPlate', act:true,
   d:'АКТИВНО: удар на 22× урона клика (+8× за уровень). Перезарядка 14 с.',
   lore:'Один удар за каждую нарушенную клятву.', ef:l=>'урон ×'+(22+8*(l-1))+' от клика'},
  {id:'ashoath', n:'Клятва Пепла', ic:'flame', x:205,y:158, max:3, cost:3, req:'kWill', act:true,
   d:'АКТИВНО: на 10 с урон клика +150% (+50% за уровень) и комбо не спадает. Перезарядка 45 с.',
   lore:'Он произносит её вслух — и пепел на губах загорается.', ef:l=>'+'+(150+50*(l-1))+'% клика на 10 с'},
  {id:'kSub', n:'—', ic:'crown', x:150,y:262, max:3, cost:3, req:'bloodstrike', subNode:true}
 ],
 seer:[
  {id:'sRunes', n:'Руны Пепла', ic:'spark', x:50,y:42, max:5, cost:2, req:'edge',
   d:'+22% автоурона за уровень.', lore:'Знаки, что чертят сами себя на золе.',
   ef:l=>'+'+(22*l)+'% DPS', apply(B,l){B.dpsMul*=1+0.22*l}},
  {id:'sSight', n:'Дар Предвидения', ic:'eye', x:250,y:42, max:5, cost:2, req:'edge',
   d:'+16% опыта и +11% золота за уровень.', lore:'Ты знаешь, куда упадёт монета, ещё до броска.',
   ef:l=>'+'+(16*l)+'% опыта · +'+(11*l)+'% золота', apply(B,l){B.xpMul*=1+0.16*l; B.goldMul*=1+0.11*l}},
  {id:'ashstorm', n:'Пепельный Шторм', ic:'flame', x:95,y:158, max:5, cost:2, req:'sRunes', act:true,
   d:'АКТИВНО: автоурон ×3.5 на 8 с (+2 с за уровень). Перезарядка 30 с.',
   lore:'Небо становится серым, и серое становится острым.', ef:l=>'×3.5 DPS на '+(8+2*(l-1))+' с'},
  {id:'endvision', n:'Видение Конца', ic:'hourglass', x:205,y:158, max:3, cost:3, req:'sSight', act:true,
   d:'АКТИВНО: мгновенно наносит урон, равный 14 секундам вашего DPS (+7 с за уровень). Перезарядка 35 с.',
   lore:'Ты показываешь твари её собственную смерть — и она случается.', ef:l=>(14+7*(l-1))+' секунд DPS разом'},
  {id:'sSub', n:'—', ic:'crown', x:150,y:262, max:3, cost:3, req:'ashstorm', subNode:true}
 ],
 reaper:[
  {id:'rSilence', n:'Обет Тишины', ic:'moon', x:50,y:42, max:5, cost:2, req:'edge',
   d:'+0.28 к множителю крита за уровень.', lore:'Крик не успевает родиться.',
   ef:l=>'+'+(0.28*l).toFixed(2)+' к множителю крита', apply(B,l){B.critMulAdd+=0.28*l}},
  {id:'rEdge', n:'Чёрное Перо', ic:'feather', x:250,y:42, max:5, cost:2, req:'edge',
   d:'+3.5% шанса крита и +9% урона клика за уровень.', lore:'Перо падает раньше, чем тело.',
   ef:l=>'+'+(3.5*l)+'% крита · +'+(9*l)+'% клика', apply(B,l){B.crit+=3.5*l; B.clickMul*=1+0.09*l}},
  {id:'shadowstep', n:'Теневой Шаг', ic:'feather', x:95,y:158, max:5, cost:2, req:'rEdge', act:true,
   d:'АКТИВНО: следующие 7 (+3 за уровень) кликов — гарантированные криты. Перезарядка 22 с.',
   lore:'Между двумя ударами сердца — целая жизнь.', ef:l=>(7+3*(l-1))+' гарантированных критов'},
  {id:'harvest', n:'Жатва Безмолвия', ic:'scythe', x:205,y:158, max:3, cost:3, req:'rSilence', act:true,
   d:'АКТИВНО: добивает не-босса с HP ниже 25%. Иначе срывает 22% (+8% за уровень) максимума HP. Перезарядка 40 с.',
   lore:'Серп не спрашивает, готов ли ты.', ef:l=>'казнь или -'+(22+8*(l-1))+'% макс. HP'},
  {id:'rSub', n:'—', ic:'crown', x:150,y:262, max:3, cost:3, req:'shadowstep', subNode:true}
 ]
};
/* Наполнение узла подкласса зависит от выбранного подкласса */
const SUB_NODE = {
  ashthrone:{n:'Клятва Костра', ic:'flame', d:'+22% ко всему урону за уровень, а Пепельный Взрыв усиливается на 4× за уровень.',
    lore:'Престол — это костёр, на котором сидят до конца.',
    ef:l=>'+'+(22*l)+'% урона · взрыв +'+(4*l)+'×', apply(B,l){B.allMul*=1+0.22*l; B.burstMul+=4*l}},
  oathbreaker:{n:'Кровавый Долг', ic:'blood', d:'+8 к пределу стаков Клятвопреступления и +0.3 к множителю крита за уровень.',
    lore:'Долг платят не деньгами.',
    ef:l=>'предел стаков '+(25+8*l)+' · +'+(0.3*l).toFixed(1)+' крит.мн.', apply(B,l){B.oathCap+=8*l; B.critMulAdd+=0.3*l}},
  lastdawn:{n:'Луч Последнего Дня', ic:'spark', d:'Волна Рассвета бьёт на 0.9 с чаще и на 1× сильнее за уровень, +20% DPS.',
    lore:'Свет, который никто не встретит.',
    ef:l=>'волна каждые '+(5-0.9*l).toFixed(1)+' с · сила '+(3+l)+'×',
    apply(B,l){B.waveEvery=Math.max(1.6,B.waveEvery-0.9*l); B.wavePower+=l; B.dpsMul*=1+0.20*l}},
  deadnames:{n:'Сожжённое Имя', ic:'book', d:'+12 к пределу стаков Имён и +22% золота и опыта за уровень.',
    lore:'Имя горит ярче тела.',
    ef:l=>'предел имён '+(40+12*l)+' · +'+(22*l)+'% золота/опыта',
    apply(B,l){B.nameCap+=12*l; B.goldMul*=1+0.22*l; B.xpMul*=1+0.22*l}},
  silencereaper:{n:'Последняя Тишина', ic:'scythe', d:'+9% шанса казни и +4% к порогу казни за уровень.',
    lore:'Ни имени, ни крика, ни следа.',
    ef:l=>'+'+(9*l)+'% казни · порог +'+(4*l)+'%', apply(B,l){B.exec+=0.09*l; B.execThr+=0.04*l}},
  shadoweater:{n:'Пир Пустоты', ic:'void', d:'+25% ко всему урону и +25 к пределу комбо за уровень.',
    lore:'Пустота ест и не насыщается.',
    ef:l=>'+'+(25*l)+'% урона · предел комбо '+(100+25*l), apply(B,l){B.allMul*=1+0.25*l; B.comboCap+=25*l}}
};
function classSkills(){ return S.cls ? SK_CLASS[S.cls] : []; }
function allSkills(){ return SK_COMMON.concat(classSkills()); }
function SK(id){ return allSkills().find(s=>s.id===id); }
const skLv = id => S.skills[id]||0;
function nodeData(n){
  if (!n.subNode) return n;
  const s = S.sub ? SUB_NODE[S.sub] : null;
  return s ? Object.assign({},n,s) : Object.assign({},n,
    {n:'Печать Подкласса', d:'Раскроется после третьего Разрыва Оков, когда вы выберете подкласс.',
     lore:'Пустая печать ждёт своего имени.', ef:()=>'—'});
}
function skillUnlocked(n){
  if (n.subNode && !S.sub) return false;
  if (n.req && skLv(n.req)<1) return false;
  return true;
}
const ACT = {
  bloodstrike:{cd:14,key:'1'}, ashoath:{cd:45,key:'2'},
  ashstorm:{cd:30,key:'1'}, endvision:{cd:35,key:'2'},
  shadowstep:{cd:22,key:'1'}, harvest:{cd:40,key:'2'}
};
function ownedActives(){ return classSkills().filter(s=>s.act && skLv(s.id)>0); }
function cdMul(){ return S.ink==='swift' && S.inkT>0 ? 0.6 : 1; }

/* ---------------- Применение умений ---------------- */
function useSkill(id){
  if (id==='ult') return useUlt();
  const s=SK(id), l=skLv(id);
  if (!s||l<1||(cd[id]||0)>0||!mob||mobDead) return;
  const st=stats(), B=st.B, pw=B.actPow||1;
  cd[id]=ACT[id].cd*cdMul();
  S.skillUses++;
  contractTick('skill',1);
  sfx.skill(); arenaShake();
  if (id==='bloodstrike'){
    let d=st.click*(22+8*(l-1))*comboMul()*pw;
    if (mob.boss) d*=st.bossMul;
    spawnFloat('КРОВАВЫЙ УДАР<br>'+nf(d),'crit'); dealDamage(d,false);
  } else if (id==='ashoath'){
    oathBuffT=10; spawnFloat('КЛЯТВА ПЕПЛА','sig');
    log('Клятва Пепла: урон клика взлетает на 10 секунд.','lvl');
  } else if (id==='ashstorm'){
    stormT=(8+2*(l-1))*pw; spawnFloat('ПЕПЕЛЬНЫЙ ШТОРМ','crit');
    log('Пепельный Шторм: автоурон ×3.5 на '+Math.round(stormT)+' с.','lvl');
  } else if (id==='endvision'){
    let d=st.dps*(14+7*(l-1))*pw;
    if (mob.boss) d*=st.bossMul;
    spawnFloat('ВИДЕНИЕ КОНЦА<br>'+nf(d),'sig'); dealDamage(d,true);
  } else if (id==='shadowstep'){
    stepCharges=Math.round((7+3*(l-1))*pw); spawnFloat('ТЕНЕВОЙ ШАГ','exec');
    log('Теневой Шаг: '+stepCharges+' гарантированных критов.','lvl');
  } else if (id==='harvest'){
    if (!mob.boss && mob.hp/mob.maxHp<0.25){
      spawnFloat('ЖАТВА БЕЗМОЛВИЯ','exec');
      if (st.B.execCrit) execCritT=5;
      addRes('ash',2,true);
      mob.hp=0; updateHP(); killMob();
    } else {
      let d=mob.maxHp*(0.22+0.08*(l-1))*pw;
      spawnFloat('ЖАТВА БЕЗМОЛВИЯ<br>'+nf(d),'exec'); dealDamage(d,false);
    }
  }
  renderSkillBar();
}
function useUlt(){
  if (!ultReady()||(cd.ult||0)>0||!mob||mobDead) return;
  const u=ULT[S.cls], st=stats();
  cd.ult=u.cd*cdMul();
  S.skillUses++; contractTick('skill',1);
  sfx.ult(); arenaShake(); setTimeout(arenaShake,300);
  ultBuffT=8;
  if (S.cls==='knight'){
    let d=st.click*70*comboMul();
    if (mob.boss) d*=st.bossMul;
    spawnFloat('ПОСЛЕДНЯЯ КЛЯТВА<br>'+nf(d),'ult'); dealDamage(d,false);
  } else if (S.cls==='seer'){
    let d=st.dps*60;
    if (mob.boss) d*=st.bossMul;
    spawnFloat('ПЕПЕЛ ВСЕХ ИМЁН<br>'+nf(d),'ult'); dealDamage(d,true);
  } else {
    stepCharges=Math.max(stepCharges,12);
    if (!mob.boss){
      spawnFloat('ЧАС СЕРПА','ult'); addRes('ash',4,true);
      mob.hp=0; updateHP(); killMob();
    } else {
      const d=mob.maxHp*0.30;
      spawnFloat('ЧАС СЕРПА<br>'+nf(d),'ult'); dealDamage(d,false);
    }
  }
  log('<b>'+u.n+'</b> — мир вздрагивает.','boss');
  renderSkillBar();
}

/* ---------------- Древо навыков ---------------- */
let selSkill=null;
function renderTrees(){
  drawTree($('#treeCommon'),SK_COMMON,210,false);
  const cs=classSkills();
  if (cs.length) drawTree($('#treeClass'),cs,320,false);
  else $('#treeClass').innerHTML='<div class="empty">Класс ещё не выбран.</div>';
  paintSkillInfo(); renderSkillBar();
}
function showSkillInfo(id){ selSkill=id; renderTrees(); }
function paintSkillInfo(){
  const id=selSkill;
  if (!id||!SK(id)){ $('#skillInfo').innerHTML='<div class="ds">Выберите узел, чтобы прочесть его суть.</div>'; return; }
  const raw=SK(id), n=nodeData(raw), l=skLv(id);
  const unl=skillUnlocked(raw), can=unl&&l<raw.max&&S.sp>=raw.cost;
  let rq='';
  if (raw.subNode&&!S.sub) rq='Раскроется после выбора подкласса (3-й Разрыв Оков).';
  else if (raw.req&&skLv(raw.req)<1) rq='Требуется узел: «'+nodeData(SK(raw.req)).n+'»';
  else if (l>=raw.max) rq='Максимальный уровень достигнут.';
  else if (S.sp<raw.cost) rq='Не хватает очков навыков (нужно '+raw.cost+').';
  $('#skillInfo').innerHTML=
    (raw.act?'<div class="tagline">Активное умение · клавиша '+ACT[raw.id].key+'</div>':'<div class="tagline" style="color:var(--vio)">Пассивный узел</div>')+
    '<h4>'+n.n+' <span style="font-size:11px;color:var(--mut)">'+l+'/'+raw.max+'</span></h4>'+
    '<div class="ds">'+n.d+'</div>'+
    (l>0&&n.ef?'<div class="ef">Сейчас: '+n.ef(l)+'</div>':'')+
    (l<raw.max&&n.ef?'<div class="ef" style="color:#c6bbf0">Станет: '+n.ef(l+1)+'</div>':'')+
    (rq?'<div class="rq">'+rq+'</div>':'')+
    '<div class="lr">'+(n.lore||'')+'</div>'+
    '<button class="learn" data-learn="'+id+'"'+(can?'':' disabled')+'>Изучить · '+raw.cost+' очк.</button>';
}
function learnSkill(id){
  const raw=SK(id), l=skLv(id);
  if (!skillUnlocked(raw)||l>=raw.max||S.sp<raw.cost) return;
  S.sp-=raw.cost; S.skills[id]=l+1;
  sfx.buy();
  log('Изучено: <b>'+nodeData(raw).n+'</b> ('+(l+1)+'/'+raw.max+')','buy');
  selSkill=id;
  renderTrees(); renderStats(); renderXP(); checkAch(); renderTabBadges(); save(true);
}
function spentPoints(){ let s=0; for (const n of allSkills()){ s+=(S.skills[n.id]||0)*n.cost; } return s; }
function respec(){
  const pts=spentPoints();
  if (pts<=0){ log('Путь и так пуст.','info'); return; }
  openModal('<div class="m-ic">'+IC.tree+'</div><h2>Забыть Путь?</h2>'+
    '<p>Все изученные узлы древа навыков будут стёрты. Тебе вернётся <b>'+pts+'</b> очк.<br>'+
    'Вечная Тьма, свита, реликвии и снаряжение не пострадают.</p>'+
    '<div class="m-btns"><button class="btn" id="rNo">Оставить</button><button class="btn danger" id="rYes">Забыть</button></div>');
  $('#rNo').onclick=closeModal;
  $('#rYes').onclick=()=>{
    S.sp+=pts; S.skills={}; cd={}; stepCharges=0; stormT=0; oathBuffT=0;
    closeModal(); sfx.fail();
    log('Путь забыт. Возвращено '+pts+' очк.','info');
    selSkill=null; renderTrees(); renderStats(); renderXP(); renderTabBadges(); save(true);
  };
}
