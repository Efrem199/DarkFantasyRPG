"use strict";
/* ============================================================
   SYSTEMS / PETS — Свита: фамильяры, прокачка, действия, жертвы
   ============================================================ */

const PET_SVG = {
  moth:'<svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 12c-3-6-12-8-16-3 2 3 1 7-2 9 5 3 12 2 15-2z" opacity=".85"/><path d="M20 12c3-6 12-8 16-3-2 3-1 7 2 9-5 3-12 2-15-2z" opacity=".85"/><ellipse cx="20" cy="20" rx="3" ry="9"/><path d="M18 10l-3-5M22 10l3-5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  slug:'<svg viewBox="0 0 40 40" fill="currentColor"><path d="M6 28c0-8 6-13 14-13s14 4 14 10c0 4-4 5-8 5H6z" opacity=".9"/><path d="M14 15l-2-7M20 14l1-8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="12" cy="7" r="2.2"/><circle cx="21" cy="5" r="2.2"/></svg>',
  glow:'<svg viewBox="0 0 40 40" fill="currentColor"><circle cx="20" cy="22" r="8"/><circle cx="20" cy="22" r="13" opacity=".22"/><path d="M13 13c-3-3-3-7 0-9M27 13c3-3 3-7 0-9" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  pup:'<svg viewBox="0 0 40 40" fill="currentColor"><path d="M8 26c0-6 4-10 10-10h8c4 0 6 3 6 7v5h-4v-4l-4 4H12l-4-2z" opacity=".92"/><path d="M26 16l3-8 4 6-2 4z"/><circle cx="29" cy="19" r="1.6" fill="#000" opacity=".6"/><path d="M12 26v6M18 26v6M26 26v6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  raven:'<svg viewBox="0 0 40 40" fill="currentColor"><path d="M6 22c6-10 16-14 26-14-2 5-1 9 2 12-6 6-14 8-22 6z" opacity=".92"/><path d="M32 8l6-2-4 6z"/><circle cx="29" cy="12" r="1.5" fill="#000" opacity=".55"/><path d="M14 26l-4 8M20 27l-2 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  whisperer:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 34c-6 0-10-4-10-9s4-8 8-8 7 2 7 6-3 5-5 5-4-1-4-3 1-3 3-3"/><path d="M10 12c3-4 8-6 14-6" opacity=".6"/></svg>',
  beetle:'<svg viewBox="0 0 40 40" fill="currentColor"><ellipse cx="20" cy="22" rx="10" ry="12"/><path d="M20 10v24" stroke="#000" stroke-width="1.4" opacity=".4"/><circle cx="20" cy="9" r="4"/><path d="M10 16 4 12M10 22H3M11 28l-6 5M30 16l6-4M30 22h7M29 28l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
  widow:'<svg viewBox="0 0 40 40" fill="currentColor"><ellipse cx="20" cy="23" rx="7" ry="8"/><circle cx="20" cy="14" r="4.5"/><path d="M13 14 4 8M13 20 3 20M13 26 5 32M27 14l9-6M27 20h10M27 26l8 6" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/></svg>',
  chorister:'<svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 4c-7 0-11 6-11 13v19h22V17c0-7-4-13-11-13z" opacity=".9"/><path d="M14 15c0-5 3-8 6-8s6 3 6 8c0 4-3 6-6 6s-6-2-6-6z" fill="#000" opacity=".55"/><path d="M20 22v14" stroke="#000" stroke-width="1.4" opacity=".35"/></svg>',
  godshard:'<svg viewBox="0 0 40 40" fill="currentColor"><path d="M20 2 8 16l12 22 12-22z" opacity=".9"/><path d="M8 16h24M20 2v36" stroke="#000" stroke-width="1.3" opacity=".4" fill="none"/></svg>',
  voidchild:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="20" cy="20" r="7" fill="currentColor"/><circle cx="20" cy="20" r="13" opacity=".55"/><circle cx="20" cy="20" r="18" opacity=".22"/></svg>',
  hound:'<svg viewBox="0 0 40 40" fill="currentColor"><path d="M4 24c0-7 5-12 12-12h10c5 0 8 4 8 9v7h-5v-5l-5 5H10z" opacity=".92"/><path d="M26 12l4-9 5 7-3 4z"/><circle cx="30" cy="16" r="1.8" fill="#000" opacity=".6"/><path d="M10 24v8M17 24v8M27 24v8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M4 24 0 30" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  eyeswarm:'<svg viewBox="0 0 40 40" fill="currentColor"><circle cx="14" cy="14" r="6"/><circle cx="27" cy="20" r="5"/><circle cx="17" cy="28" r="4.5"/><circle cx="14" cy="14" r="2.4" fill="#000" opacity=".6"/><circle cx="27" cy="20" r="2" fill="#000" opacity=".6"/><circle cx="17" cy="28" r="1.8" fill="#000" opacity=".6"/></svg>'
};
const PETS = [
  {id:'moth', n:'Пепельная моль', rar:0, cur:'gold', base:150, max:10,
   lore:'Она садится там, где кто-то сгорел заживо, и пьёт остатки чужого тепла.',
   how:'Убить 25 тварей', unlock:()=>S.kills>=25, act:'ash',
   ef:l=>'+'+(5*l)+'% золота', apply(B,l){B.goldMul*=1+0.05*l}},
  {id:'slug', n:'Кровавый слизень', rar:0, cur:'gold', base:180, max:10,
   lore:'Он ползёт по следу твоих ударов и слизывает то, что осталось на камне.',
   how:'Нанести 300 кликов', unlock:()=>S.clicks>=300, act:'strike',
   ef:l=>'+'+(6*l)+'% урона клика', apply(B,l){B.clickMul*=1+0.06*l}},
  {id:'glow', n:'Могильный светляк', rar:1, cur:'gold', base:400, max:10,
   lore:'Свет его брюшка — последнее, что видят те, кто заблудился в катакомбах.',
   how:'Достичь глубины 25', unlock:()=>S.maxStage>=25, act:'weak',
   ef:l=>'+'+(8*l)+'% опыта', apply(B,l){B.xpMul*=1+0.08*l}},
  {id:'pup', n:'Тень-щенок', rar:1, cur:'gold', base:520, max:10,
   lore:'У него нет тела — только преданность, оставшаяся после того, как тело съели.',
   how:'Убить 300 тварей', unlock:()=>S.kills>=300, act:'strike',
   ef:l=>'+'+(9*l)+'% автоурона', apply(B,l){B.dpsMul*=1+0.09*l}},
  {id:'beetle', n:'Ржавый жук-падальщик', rar:1, cur:'gold', base:600, max:10, drop:true,
   lore:'Он вскрывает доспехи мёртвых так же легко, как скорлупу ореха.',
   how:'Иногда выпадает с элиты и Владык', unlock:()=>false, act:'ash',
   ef:l=>'+'+(10*l)+'% шанса дропа · +'+(4*l)+'% золота', apply(B,l){B.dropMul+=0.10*l; B.goldMul*=1+0.04*l}},
  {id:'raven', n:'Костяной ворон', rar:2, cur:'shard', base:3, max:10,
   lore:'Он выклевал глаза семи королям и запомнил вкус каждого.',
   how:'Победить 10 Владык', unlock:()=>S.bosses>=10, act:'blood',
   ef:l=>'+'+(12*l)+'% урона боссам · +'+(6*l)+'% Крови', apply(B,l){B.bossMul*=1+0.12*l; B.bloodMul+=0.06*l}},
  {id:'whisperer', n:'Шёпот из скважины', rar:2, cur:'shard', base:3, max:10, drop:true,
   lore:'Его нельзя увидеть. Можно только услышать своё имя оттуда, где никого нет.',
   how:'Редко выпадает с элиты и Владык', unlock:()=>false, act:'whisper',
   ef:l=>'+'+(1.6*l).toFixed(1)+'% крита · +'+(6*l)+'% Шёпота', apply(B,l){B.crit+=1.6*l; B.whisMul+=0.06*l}},
  {id:'widow', n:'Вдовий паучок', rar:3, cur:'shard', base:5, max:10, shop:30,
   lore:'Он плетёт не сеть, а вдовью вуаль — и всегда на один размер больше, чем нужно.',
   how:'Купить за 30 осколков', unlock:()=>false, act:'strike',
   ef:l=>'+'+(0.14*l).toFixed(2)+' множителя крита · +'+(1.2*l).toFixed(1)+'% крита',
   apply(B,l){B.critMulAdd+=0.14*l; B.crit+=1.2*l}},
  {id:'chorister', n:'Немой хорист', rar:3, cur:'shard', base:6, max:10, shop:60,
   lore:'Он поёт без рта. Ты слышишь его, только когда закрываешь глаза надолго.',
   how:'Купить за 60 осколков', unlock:()=>false, act:'whisper',
   ef:l=>'+'+(30*l)+'% оффлайна · +'+(7*l)+'% золота', apply(B,l){B.offMul+=0.3*l; B.goldMul*=1+0.07*l}},
  {id:'hound', n:'Гончая Первой Ночи', rar:3, cur:'shard', base:7, max:10, fusion:true,
   lore:'Она бежала за первой убегающей тенью и не остановилась до сих пор.',
   how:'Только ритуал слияния', unlock:()=>false, act:'strike',
   ef:l=>'+'+(8*l)+'% ко всему урону', apply(B,l){B.allMul*=1+0.08*l}},
  {id:'eyeswarm', n:'Рой Немигающих', rar:4, cur:'shard', base:9, max:10, fusion:true,
   lore:'Сорок глаз, ни одного века. Они смотрят даже туда, где ты ещё не был.',
   how:'Только ритуал слияния', unlock:()=>false, act:'weak',
   ef:l=>'+'+(2.2*l).toFixed(1)+'% крита · +'+(9*l)+'% дропа', apply(B,l){B.crit+=2.2*l; B.dropMul+=0.09*l}},
  {id:'godshard', n:'Осколок забытого бога', rar:4, cur:'shard', base:8, max:10,
   lore:'Бог умер так давно, что даже его имя рассыпалось. Осталась только острая грань.',
   how:'Совершить 3 Разрыва Оков', unlock:()=>S.prestige>=3, act:'blood',
   ef:l=>'+'+(7*l)+'% ко всему урону', apply(B,l){B.allMul*=1+0.07*l}},
  {id:'voidchild', n:'Дитя Пустоты', rar:4, cur:'shard', base:12, max:10,
   lore:'Оно родилось между двумя твоими смертями и до сих пор не решило, чьё оно.',
   how:'Совершить 6 Разрывов Оков', unlock:()=>S.prestige>=6, act:'whisper',
   ef:l=>'+'+(6*l)+'% урона · +'+(4*l)+'% осколков', apply(B,l){B.allMul*=1+0.06*l; B.shardMul+=0.04*l}}
];
const PET = id => PETS.find(p=>p.id===id);
const petLv = id => S.pets[id]||0;
const petOwned = id => petLv(id)>0;
const petAway = id => S.exped.some(e=>e.pet===id);
function petCost(p){ const l=petLv(p.id); return p.cur==='gold'
  ? Math.ceil(p.base*Math.pow(2.15,l-1)) : Math.ceil(p.base*Math.pow(1.45,l-1)); }
function petSlots(){ return 1 + pLv('pPack'); }
function grantPet(id,how){
  if (petOwned(id)) return false;
  const p = PET(id);
  S.pets[id]=1;
  if (S.active.length<petSlots()) S.active.push(id);
  sfx.pet();
  log('Свита пополнилась: <b style="color:'+RAR[p.rar].c+'">'+esc(p.n)+'</b>','drop');
  petToast(p, how||'Фамильяр присоединился');
  renderPets(); renderPetLayer(); renderStats(); renderTabBadges();
  hint('pets','Свита','К тебе прибился фамильяр. Во вкладке <b>Свита</b> его можно прокачать и призвать — призванный идёт с тобой, усиливает тебя и время от времени действует сам.');
  save(true); return true;
}
function checkPets(){ for (const p of PETS){ if (!petOwned(p.id)&&p.unlock&&p.unlock()) grantPet(p.id,'Открыт за подвиг'); } }
function upgradePet(id){
  const p=PET(id), l=petLv(id);
  if (l<1||l>=p.max) return;
  const c=petCost(p);
  if (p.cur==='gold'){ if (S.gold<c) return; S.gold-=c; }
  else { if (S.shards<c) return; S.shards-=c; }
  S.pets[id]=l+1; sfx.buy();
  log('Фамильяр окреп: <b>'+esc(p.n)+'</b> (ур. '+(l+1)+')','buy');
  renderPets(); renderGold(); renderStats(); save(true);
}
function buyPet(id){
  const p=PET(id);
  if (petOwned(id)||!p.shop||S.shards<p.shop) return;
  S.shards-=p.shop; grantPet(id,'Выкуплен из тьмы'); renderGold();
}
function togglePet(id){
  if (!petOwned(id)||petAway(id)) return;
  const i=S.active.indexOf(id);
  if (i>=0) S.active.splice(i,1);
  else { if (S.active.length>=petSlots()) S.active.shift(); S.active.push(id); }
  renderPets(); renderPetLayer(); renderStats(); save(true);
}
function petDropRoll(boss,elite){
  const pool=PETS.filter(p=>p.drop&&!petOwned(p.id));
  if (!pool.length) return;
  const ch = boss?0.06:elite?0.022:0;
  if (Math.random()<ch) grantPet(pick(pool).id,'Вырван из добычи');
}
/* Периодическое действие призванного фамильяра */
function petAction(){
  const list=S.active.filter(id=>petOwned(id)&&!petAway(id));
  if (!list.length||!mob||mobDead) return;
  const id=pick(list), p=PET(id), st=stats();
  const orbs=$$('#petLayer .pet-orb');
  const idx=S.active.indexOf(id);
  if (orbs[idx]){ orbs[idx].classList.remove('act'); void orbs[idx].offsetWidth; orbs[idx].classList.add('act'); }
  if (p.act==='strike'){
    let d=st.dps*3+st.click*1.2;
    if (mob.boss) d*=st.bossMul;
    spawnFloat(esc(p.n.split(' ')[0])+' бьёт<br>'+nf(d),'pet');
    dealDamage(d,true);
  } else if (p.act==='ash'){
    addRes('ash',1+Math.floor(petLv(id)/4));
  } else if (p.act==='whisper'){
    if (Math.random()<0.4) addRes('whisper',1); else addRes('ash',1);
  } else if (p.act==='blood'){
    if (Math.random()<0.3) addRes('blood',1); else addRes('ash',2);
  } else if (p.act==='weak'){
    if (!weakActive) showWeak(); else addRes('ash',1);
  }
}
function sacrificePet(id){
  const p=PET(id);
  if (!p||!petOwned(id)) return;
  openModal('<div class="m-ic" style="color:var(--blood)">'+IC.sacrifice+'</div><h2>Отдать его тьме?</h2>'+
    '<p><i>«'+esc(p.n)+'»</i><br>'+esc(p.lore)+'</p>'+
    '<div class="m-list"><div class="pos">✓ Навсегда: +8% ко всему урону (не сбрасывается никогда)</div>'+
    '<div class="neg">✕ Фамильяр исчезает. Его нельзя вернуть, приручить или призвать снова.</div></div>'+
    '<div class="m-btns"><button class="btn" id="sNo">Оставить</button><button class="btn danger" id="sYes">Отдать</button></div>');
  $('#sNo').onclick=closeModal;
  $('#sYes').onclick=()=>{
    closeModal();
    delete S.pets[id];
    const i=S.active.indexOf(id); if (i>=0) S.active.splice(i,1);
    S.exped=S.exped.filter(e=>e.pet!==id);
    S.sacrificed.push(id);
    sfx.prestige();
    log('<b>'+esc(p.n)+'</b> отдан тьме. Она приняла и стала щедрее.','boss');
    addLore('Он не сопротивлялся. Это было хуже всего.');
    renderPets(); renderPetLayer(); renderStats(); save(true);
  };
}
function renderPets(){
  $('#petSlots').innerHTML='Призвано: <b>'+S.active.length+' / '+petSlots()+'</b>'+
    (petSlots()<3?' · узел «Стая Теней» в Вечной Тьме расширяет свиту':'')+
    (S.sacrificed.length?'<br><span style="color:#ff9a9d">Отдано тьме: '+S.sacrificed.length+' (+'+(S.sacrificed.length*8)+'% урона)</span>':'');
  const owned=PETS.filter(p=>petOwned(p.id));
  const locked=PETS.filter(p=>!petOwned(p.id));
  const card=p=>{
    const l=petLv(p.id), R=RAR[p.rar], own=l>0, act=S.active.includes(p.id), away=petAway(p.id);
    const cost=own?petCost(p):0, curIc=p.cur==='gold'?IC.coin:IC.shard;
    const canUp=own&&l<p.max&&(p.cur==='gold'?S.gold>=cost:S.shards>=cost);
    let btns='';
    if (own){
      if (away) btns+='<span class="mini" style="opacity:.6">В экспедиции</span>';
      else btns+='<button class="mini'+(act?' off':'')+'" data-pet-toggle="'+p.id+'">'+(act?'Отпустить':'Призвать')+'</button>';
      if (l<p.max) btns+='<button class="mini sell" data-pet-up="'+p.id+'"'+(canUp?'':' disabled style="opacity:.45"')+'>'+curIc+' '+nf(cost)+'</button>';
      else btns+='<span class="mini" style="opacity:.6">Предел</span>';
      if (!away) btns+='<button class="mini off" data-pet-sac="'+p.id+'" title="Отдать тьме навсегда">'+IC.sacrifice+'</button>';
    } else if (p.shop){
      btns+='<button class="mini sell" data-pet-buy="'+p.id+'"'+(S.shards>=p.shop?'':' disabled style="opacity:.45"')+'>'+IC.shard+' '+p.shop+'</button>';
    }
    const gone=S.sacrificed.includes(p.id);
    return '<div class="pet'+(act?' active':'')+(own?'':' lockd')+(away?' away':'')+'" style="border-color:'+R.c+'44">'+
      '<div class="p-ic" style="color:'+(own?R.c:'#4e4770')+'">'+(own?PET_SVG[p.id]:IC.lock)+'</div>'+
      '<div class="p-info"><div class="p-nm">'+esc(p.n)+(own?'<span class="lv">УР. '+l+'/'+p.max+'</span>':'')+
      (act&&!away?'<span class="lv" style="color:var(--shard)">ПРИЗВАН</span>':'')+'</div>'+
      '<div class="p-rar" style="color:'+R.c+'">'+R.n+'</div>'+
      (own?'<div class="p-ef">'+p.ef(l)+'</div>':'<div class="p-how">'+(gone?'Отдан тьме. Возврата нет.':p.how)+'</div>')+
      '<div class="p-lr">'+p.lore+'</div>'+
      '<div class="p-btns">'+btns+'</div></div></div>';
  };
  $('#petList').innerHTML=
    (owned.length?'<div class="sub" style="margin-top:2px">Приручённые</div>'+owned.map(card).join(''):'')+
    (locked.length?'<div class="sub">Ещё не с тобой</div>'+locked.map(card).join(''):'');
}
function renderPetLayer(){
  $('#petLayer').innerHTML=S.active.filter(id=>petOwned(id)&&!petAway(id)).map(id=>{
    const p=PET(id);
    return '<div class="pet-orb" style="color:'+RAR[p.rar].c+'" title="'+esc(p.n)+'">'+PET_SVG[id]+'</div>';
  }).join('');
}
