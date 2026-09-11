"use strict";
/* ============================================================
   SYSTEMS / CRAFT — Горн: эликсиры, масла, чернила, кузня, слияние
   ============================================================ */

const OILS = [
  {id:'bleed', n:'Масло Кровотечения', ic:'drop', dur:300, cost:{ash:12}, gold:400,
   d:'Враг истекает: 3% максимума HP в секунду.',
   lore:'Оно не режет. Оно просто не даёт ране закрыться.', bleed:0.03},
  {id:'vamp', n:'Масло Немой Жажды', ic:'urn', dur:300, cost:{ash:18}, gold:600,
   d:'Каждое убийство даёт Пепел Душ и +12% золота.',
   lore:'Лезвие пьёт первым, ты — вторым.', apply(B){B.goldMul*=1.12; B.oilAsh=1;}},
  {id:'bane', n:'Масло Погибели', ic:'crown', dur:300, cost:{ash:20,blood:3}, gold:800,
   d:'+55% урона по Владыкам.', lore:'Варится на костях тех, кто носил корону.',
   apply(B){B.bossMul*=1.55}},
  {id:'void', n:'Масло Пустоты', ic:'void', dur:240, cost:{ash:26,whisper:2}, gold:1200,
   d:'+25% ко всему урону.', lore:'Ничто, растворённое в жире. Работает.',
   apply(B){B.allMul*=1.25}}
];
const INKS = [
  {id:'swift', n:'Чернила Скорости', ic:'ink', dur:300, cost:{whisper:4,ash:15}, gold:900,
   d:'Все умения перезаряжаются на 40% быстрее.', lore:'Руны пишутся раньше, чем поднимается рука.'},
  {id:'rage', n:'Чернила Ярости', ic:'flame', dur:240, cost:{whisper:6,ash:20}, gold:1400,
   d:'Активные умения бьют вдвое сильнее.', lore:'Знак, который жжёт того, кто его начертил.'}
];
const ELIXIRS = [
  {id:'click', n:'Эликсир Пепельной Крови', ic:'potion', dur:90, gold:500, cost:{ash:10},
   d:'+150% к урону клика на 90 секунд.', lore:'Пьётся залпом. Иначе не пьётся вовсе.'},
  {id:'dps', n:'Настой Немого Хора', ic:'ghost', dur:90, gold:700, cost:{ash:14},
   d:'+120% к автоурону на 90 секунд.', lore:'Свита слышит его глотками и начинает спешить.'},
  {id:'all', n:'Кровь Владыки', ic:'drop', dur:60, gold:1000, cost:{blood:4},
   d:'+80% ко всему урону на 60 секунд.', lore:'Она всё ещё тёплая. Это худшее в ней.'}
];
function craftElixir(id){
  const e=ELIXIRS.find(x=>x.id===id);
  if (S.gold<e.gold||!hasRes(e.cost)) return;
  S.gold-=e.gold; payRes(e.cost);
  S.buffs[id]=Math.min(600,(S.buffs[id]||0)+e.dur);
  sfx.potion(); log('Выпито: <b>'+e.n+'</b>.','buy');
  renderGold(); renderForge(); renderBuffs(); save(true);
}
function craftOil(id){
  const o=OILS.find(x=>x.id===id);
  if (S.gold<o.gold||!hasRes(o.cost)) return;
  S.gold-=o.gold; payRes(o.cost);
  S.oil=id; S.oilT=o.dur;
  sfx.forge(); log('Клинок смазан: <b>'+o.n+'</b>.','buy');
  renderGold(); renderForge(); renderBuffs(); save(true);
}
function craftInk(id){
  const k=INKS.find(x=>x.id===id);
  if (S.gold<k.gold||!hasRes(k.cost)) return;
  S.gold-=k.gold; payRes(k.cost);
  S.ink=id; S.inkT=k.dur;
  sfx.forge(); log('Начертано: <b>'+k.n+'</b>.','buy');
  renderGold(); renderForge(); renderBuffs(); save(true);
}

/* ---------------- Кузня ---------------- */
const reforgeCost = it => ({blood: 3+it.rar*3});
const curseCost = it => ({blood: 6+it.rar*4, ash: 20+it.rar*10});
function reforge(slot){
  const it=S.equip[slot]; if (!it) return;
  const c=reforgeCost(it);
  if (!payRes(c)) return;
  const depth=Math.max(it.lv, S.maxStage);
  it.st=rollStats(it.slot,depth,it.rar); it.lv=depth;
  sfx.forge(); log('Перековано: <b>'+esc(it.n)+'</b> — аффиксы перекатаны.','buy');
  renderForge(); renderGear(); renderStats(); save(true);
}
function curseItem(slot){
  const it=S.equip[slot]; if (!it||it.cursed) return;
  const c=curseCost(it);
  if (!hasRes(c)) return;
  openModal('<div class="m-ic" style="color:var(--blood)">'+IC.drop+'</div><h2>Проклясть предмет?</h2>'+
    '<p><i>«'+esc(it.n)+'»</i><br>Кровь въестся в металл и сделает его сильнее — или сожрёт вещь целиком.</p>'+
    '<div class="m-list"><div class="pos">✓ 55%: все свойства ×1.35 навсегда</div>'+
    '<div class="neg">✕ 45%: предмет обращается в пепел (вернётся часть Пепла Душ)</div>'+
    '<div class="neg">✕ Проклятая вещь всегда даёт −10% золота</div></div>'+
    '<div class="m-btns"><button class="btn" id="cNo">Отступить</button><button class="btn danger" id="cYes">Пролить кровь</button></div>');
  $('#cNo').onclick=closeModal;
  $('#cYes').onclick=()=>{
    closeModal();
    if (!payRes(c)) return;
    sfx.forge();
    if (Math.random()<0.55){
      it.cursed=true;
      log('<b>'+esc(it.n)+'</b> принял проклятие и стал сильнее.','boss');
      toast({ic:'drop',n:'Проклятие принято',d:'Все свойства предмета ×1.35'});
    } else {
      const back=Math.floor(20+it.rar*12);
      S.equip[slot]=null; addRes('ash',back,true);
      log('<b>'+esc(it.n)+'</b> рассыпался. Осталось '+back+' Пепла Душ.','info');
      sfx.fail();
    }
    renderForge(); renderGear(); renderStats(); renderResBar(); save(true);
  };
}
function salvage(id){
  const idx=S.inv.findIndex(i=>i.i===id); if (idx<0) return;
  const it=S.inv[idx];
  const ash=Math.ceil((it.rar+1)*4+it.lv*0.5);
  const blood=it.rar>=3?Math.ceil(1+it.rar*0.6):0;
  S.inv.splice(idx,1);
  addRes('ash',ash,true); if (blood) addRes('blood',blood,true);
  sfx.forge();
  log('Разобрано: '+esc(it.n)+' → '+ash+' Пепла'+(blood?' и '+blood+' Крови':'')+'.','buy');
  renderGear(); renderResBar(); renderTabBadges(); save(true);
}
function salvageJunk(){
  const junk=S.inv.filter(i=>i.rar<=1);
  if (!junk.length){ log('Хлама нет.','info'); return; }
  let ash=0;
  junk.forEach(i=>{ ash+=Math.ceil((i.rar+1)*4+i.lv*0.5); });
  S.inv=S.inv.filter(i=>i.rar>1);
  addRes('ash',ash,true); sfx.forge();
  log('Разобрано предметов: '+junk.length+' → '+ash+' Пепла Душ.','buy');
  renderGear(); renderResBar(); renderTabBadges(); save(true);
}

/* ---------------- Ритуал слияния свиты ---------------- */
let fuseA=null, fuseB=null;
const fuseCost = rar => ({blood: 5+rar*5, ash: 30+rar*20});
function doFuse(){
  if (!fuseA||!fuseB||fuseA===fuseB) return;
  const a=PET(fuseA), b=PET(fuseB);
  if (!a||!b||a.rar!==b.rar||a.rar>=4) return;
  const c=fuseCost(a.rar);
  if (!hasRes(c)) return;
  const pool=PETS.filter(p=>p.rar===a.rar+1&&!petOwned(p.id));
  if (!pool.length){ log('Нечего призывать: все фамильяры этой ступени уже с тобой.','info'); return; }
  payRes(c);
  sfx.forge();
  if (Math.random()<0.6){
    const got=pick(pool);
    /* оба исходных исчезают */
    [fuseA,fuseB].forEach(id=>{ delete S.pets[id]; const i=S.active.indexOf(id); if(i>=0)S.active.splice(i,1); });
    grantPet(got.id,'Рождён в ритуале');
    log('Слияние удалось. Из двух теней вышла одна, и она больше обеих.','drop');
  } else {
    delete S.pets[fuseB]; const i=S.active.indexOf(fuseB); if(i>=0)S.active.splice(i,1);
    log('Ритуал сорвался. <b>'+esc(b.n)+'</b> растворился без остатка.','boss');
    sfx.fail();
    toast({ic:'sacrifice',n:'Ритуал сорвался',d:b.n+' потерян навсегда'});
  }
  fuseA=fuseB=null;
  renderForge(); renderPets(); renderPetLayer(); renderStats(); renderResBar(); save(true);
}

const FORGE_TABS = [['alch','Эликсиры'],['oils','Масла'],['inks','Чернила'],['smith','Кузня'],['fuse','Слияние']];
function renderForge(){
  $('#forgePick').innerHTML = FORGE_TABS.map(t=>'<button data-ft="'+t[0]+'"'+(forgeTab===t[0]?' class="on"':'')+'>'+t[1]+'</button>').join('');
  const b=$('#forgeBody');
  let h='';
  if (forgeTab==='alch'){
    h+='<div class="shop-note" style="margin:0 0 10px">Настоящая алхимия требует Пепла Душ и Крови Владык.</div>';
    h+=ELIXIRS.map(e=>{
      const left=Math.ceil(S.buffs[e.id]||0), can=S.gold>=e.gold&&hasRes(e.cost);
      return '<div class="craft-card"><div class="cc-head"><div class="cc-ic" style="color:var(--rblood)">'+IC[e.ic]+'</div>'+
        '<div class="cc-nm">'+e.n+(left>0?' <span style="color:var(--gold);font-size:10px">'+left+' с</span>':'')+
        '<small>'+e.d+'</small></div></div><div class="cc-lore">'+e.lore+'</div>'+
        costHTML(e.cost,e.gold)+'<div class="cc-foot"><button class="buy as" data-elix="'+e.id+'"'+(can?'':' disabled')+'>сварить</button></div></div>';
    }).join('');
  } else if (forgeTab==='oils'){
    h+='<div class="shop-note" style="margin:0 0 10px">Масло держится на клинке ограниченное время. Одновременно — только одно.</div>';
    h+=OILS.map(o=>{
      const on=S.oil===o.id&&S.oilT>0, can=S.gold>=o.gold&&hasRes(o.cost);
      return '<div class="craft-card'+(on?' hot':'')+'"><div class="cc-head"><div class="cc-ic" style="color:var(--rash)">'+IC[o.ic]+'</div>'+
        '<div class="cc-nm">'+o.n+(on?' <span style="color:var(--gold);font-size:10px">'+Math.ceil(S.oilT)+' с</span>':'')+
        '<small>'+o.d+'</small></div></div><div class="cc-lore">'+o.lore+'</div>'+
        costHTML(o.cost,o.gold)+'<div class="cc-foot"><button class="buy as" data-oil="'+o.id+'"'+(can?'':' disabled')+'>нанести</button></div></div>';
    }).join('');
  } else if (forgeTab==='inks'){
    h+='<div class="shop-note" style="margin:0 0 10px">Чернила рун пишутся Шёпотом. Одновременно — только одни.</div>';
    h+=INKS.map(k=>{
      const on=S.ink===k.id&&S.inkT>0, can=S.gold>=k.gold&&hasRes(k.cost);
      return '<div class="craft-card'+(on?' hot':'')+'"><div class="cc-head"><div class="cc-ic" style="color:var(--rwhis)">'+IC[k.ic]+'</div>'+
        '<div class="cc-nm">'+k.n+(on?' <span style="color:var(--gold);font-size:10px">'+Math.ceil(S.inkT)+' с</span>':'')+
        '<small>'+k.d+'</small></div></div><div class="cc-lore">'+k.lore+'</div>'+
        costHTML(k.cost,k.gold)+'<div class="cc-foot"><button class="buy wh" data-ink="'+k.id+'"'+(can?'':' disabled')+'>начертить</button></div></div>';
    }).join('');
  } else if (forgeTab==='smith'){
    h+='<div class="shop-note" style="margin:0 0 10px">Кузня работает с надетым. Разбор ненужного — в Сумке.</div>';
    let any=false;
    for (const k in SLOTS){
      const it=S.equip[k]; if (!it) continue;
      any=true;
      const R=RAR[it.rar], rc=reforgeCost(it), cc=curseCost(it);
      h+='<div class="craft-card"><div class="cc-head"><div class="cc-ic" style="color:'+R.c+'">'+IC[SLOTS[k].ic]+'</div>'+
        '<div class="cc-nm" style="color:'+R.c+'">'+esc(it.n)+(it.cursed?' <span style="color:var(--blood);font-size:10px">ПРОКЛЯТ</span>':'')+
        '<small>'+R.n+' · '+SLOTS[k].n+' · гл.'+it.lv+'</small></div></div>'+
        '<div class="cc-body">'+Object.entries(it.st).map(([s,v])=>pct(v*(it.cursed?1.35:1))+' '+STAT_DEF[s].n).join(' · ')+'</div>'+
        '<div class="cc-body" style="color:#7a7295">Перековка перекатает свойства по вашей текущей глубине ('+S.maxStage+').</div>'+
        '<div class="cc-foot">'+costHTML(rc,0)+
        '<button class="buy bl" data-reforge="'+k+'"'+(hasRes(rc)?'':' disabled')+'>перековать</button></div>'+
        (it.cursed?'':'<div class="cc-foot">'+costHTML(cc,0)+
        '<button class="buy bl" data-curse="'+k+'"'+(hasRes(cc)?'':' disabled')+'>проклясть</button></div>')+
        '</div>';
    }
    if (!any) h+='<div class="empty">На тебе ничего нет.<br>Надень снаряжение в Сумке, и горн проснётся.</div>';
  } else {
    const owned=PETS.filter(p=>petOwned(p.id)&&p.rar<4);
    h+='<div class="shop-note" style="margin:0 0 10px">Два фамильяра одной ступени сливаются в одного следующей. Шанс успеха — 60%. При неудаче второй исчезает навсегда.</div>';
    if (owned.length<2) h+='<div class="empty">Нужны хотя бы два фамильяра одной редкости.</div>';
    else {
      const opt=(sel,attr)=>'<select data-'+attr+'="1" style="width:100%;padding:8px;border-radius:9px;background:#0b0913;color:var(--txt);border:1px solid var(--line2);font-size:11.5px;margin-top:4px">'+
        '<option value="">— выбрать —</option>'+owned.map(p=>'<option value="'+p.id+'"'+(sel===p.id?' selected':'')+'>'+
        esc(p.n)+' · '+RAR[p.rar].n+'</option>').join('')+'</select>';
      const a=fuseA?PET(fuseA):null;
      const ok=a&&fuseB&&PET(fuseB)&&PET(fuseB).rar===a.rar&&fuseA!==fuseB;
      const c=a?fuseCost(a.rar):{blood:0,ash:0};
      h+='<div class="craft-card"><div class="cc-head"><div class="cc-ic" style="color:var(--vio)">'+IC.merge+'</div>'+
        '<div class="cc-nm">Ритуал Слияния<small>Основа и жертва должны быть равной редкости</small></div></div>'+
        '<div class="cc-body" style="margin-top:8px">Основа'+opt(fuseA,'fusea')+'</div>'+
        '<div class="cc-body">Жертва'+opt(fuseB,'fuseb')+'</div>'+
        (a?costHTML(c,0):'')+
        '<div class="cc-lore">Две тени входят в круг. Выходит одна — если кругу понравится.</div>'+
        '<div class="cc-foot"><button class="buy bl" id="doFuse"'+(ok&&hasRes(c)?'':' disabled')+'>слить</button></div></div>';
    }
  }
  b.innerHTML=h;
  /* Восстанавливаем корректные селекты */
  const sa=b.querySelector('[data-fusea]'), sb=b.querySelector('[data-fuseb]');
  if (sa) sa.onchange=e=>{ fuseA=e.target.value||null; renderForge(); };
  if (sb) sb.onchange=e=>{ fuseB=e.target.value||null; renderForge(); };
}
