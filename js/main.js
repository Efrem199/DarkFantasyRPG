"use strict";
/* ============================================================
   MAIN — привязка ввода, переключение вкладок, запуск игры
   ============================================================ */

/* ---------------- Ввод: арена ---------------- */
$('#mob').addEventListener('pointerdown',e=>{ e.preventDefault(); audio(); clickAttack(false); });
$('#mob').addEventListener('contextmenu',e=>e.preventDefault());
$('#weak').addEventListener('pointerdown',e=>{
  e.preventDefault(); e.stopPropagation(); audio();
  if (!mob||mobDead){ hideWeak(); return; }
  const st=stats(), g=Math.ceil(goldFor(mob.stage)*0.5*st.goldMul);
  if (!ZR().noGold){ S.gold+=g; S.totalGold+=g; spawnFloat('+'+nf(g)+' '+IC.coin,'gold'); }
  hideWeak(); clickAttack(true); renderGold();
});
$('#skillBar').addEventListener('click',e=>{ const b=e.target.closest('[data-skill]'); if (b) useSkill(b.dataset.skill); });
$('#stanceBar').addEventListener('click',e=>{ const b=e.target.closest('[data-stance]'); if (b) setStance(+b.dataset.stance); });

/* ---------------- Ввод: шапка и ресурсы ---------------- */
$('#resBar').addEventListener('click',e=>{ if (e.target.closest('[data-reshelp]')) resourceModal(); });

/* ---------------- Ввод: лавка ---------------- */
$('.view[data-view="shop"]').addEventListener('click',e=>{
  const bulk=e.target.closest('[data-bulk]'), buyb=e.target.closest('[data-buy]'),
        pot=e.target.closest('[data-potion]'), auto=e.target.closest('#autoToggle'),
        chk=e.target.closest('[data-autochk]'), up=e.target.closest('[data-up]'), dn=e.target.closest('[data-down]');
  if (bulk) setBulk(bulk.dataset.bulk);
  else if (auto) toggleAuto();
  else if (chk) toggleAutoItem(chk.dataset.autochk);
  else if (up) movePrio(up.dataset.up,-1);
  else if (dn) movePrio(dn.dataset.down,1);
  else if (buyb) buy(buyb.dataset.buy);
  else if (pot) buyPotion(pot.dataset.potion);
});

/* ---------------- Ввод: карта ---------------- */
$('.view[data-view="map"]').addEventListener('click',e=>{
  const m=e.target.closest('[data-mode]'), j=e.target.closest('[data-jump]'),
        go=e.target.closest('#depthGo'), mx=e.target.closest('#depthMax'),
        rg=e.target.closest('[data-region]'), rift=e.target.closest('#enterRift');
  const rng=$('#depthRange');
  if (m) setMode(m.dataset.mode);
  else if (j && rng){
    rng.value=clamp(+rng.value + (+j.dataset.jump),1,S.maxStage);
    $('#depthPreview').textContent='Глубина '+rng.value;
  }
  else if (go && rng) travelTo(+rng.value);
  else if (mx) travelTo(S.maxStage);
  else if (rg) travelTo(+rg.dataset.region);
  else if (rift) enterRift();
});

/* ---------------- Ввод: остальные панели ---------------- */
$('.view[data-view="skills"]').addEventListener('click',e=>{
  const n=e.target.closest('[data-sk]'), b=e.target.closest('[data-learn]');
  if (b) learnSkill(b.dataset.learn); else if (n) showSkillInfo(n.dataset.sk);
});
$('#respecBtn').addEventListener('click',respec);
$('.view[data-view="dark"]').addEventListener('click',e=>{
  const n=e.target.closest('[data-pn]'), b=e.target.closest('[data-plearn]'),
        p=e.target.closest('#doPrest'), t=e.target.closest('#tnBtn');
  if (p) doPrestige(); else if (t) trueNameModal();
  else if (b) learnP(b.dataset.plearn); else if (n) showPInfo(n.dataset.pn);
});
$('.view[data-view="gear"]').addEventListener('click',e=>{
  const eq=e.target.closest('[data-eq]'), un=e.target.closest('[data-uneq]'), sl=e.target.closest('[data-sell]'),
        sv=e.target.closest('[data-salv]'), slot=e.target.closest('[data-slot]'),
        f=e.target.closest('[data-f]'), ty=e.target.closest('[data-t]'),
        so=e.target.closest('[data-s]'), j=e.target.closest('#salvJunk');
  if (eq) equipItem(+eq.dataset.eq);
  else if (un) unequip(un.dataset.uneq);
  else if (sv) salvage(+sv.dataset.salv);
  else if (sl) sellItem(+sl.dataset.sell);
  else if (j) salvageJunk();
  else if (ty){ invType=ty.dataset.t; renderGear(); }
  else if (f){ invFilter=+f.dataset.f; renderGear(); }
  else if (so){ invSort=so.dataset.s; renderGear(); }
  else if (slot) unequip(slot.dataset.slot);
});
$('.view[data-view="pets"]').addEventListener('click',e=>{
  const t=e.target.closest('[data-pet-toggle]'), u=e.target.closest('[data-pet-up]'),
        b=e.target.closest('[data-pet-buy]'), s=e.target.closest('[data-pet-sac]');
  if (t) togglePet(t.dataset.petToggle);
  else if (u) upgradePet(u.dataset.petUp);
  else if (b) buyPet(b.dataset.petBuy);
  else if (s) sacrificePet(s.dataset.petSac);
});
$('.view[data-view="forge"]').addEventListener('click',e=>{
  const ft=e.target.closest('[data-ft]'), el1=e.target.closest('[data-elix]'), o=e.target.closest('[data-oil]'),
        k=e.target.closest('[data-ink]'), rf=e.target.closest('[data-reforge]'), cu=e.target.closest('[data-curse]'),
        fz=e.target.closest('#doFuse');
  if (ft){ forgeTab=ft.dataset.ft; renderForge(); }
  else if (el1) craftElixir(el1.dataset.elix);
  else if (o) craftOil(o.dataset.oil);
  else if (k) craftInk(k.dataset.ink);
  else if (rf) reforge(rf.dataset.reforge);
  else if (cu) curseItem(cu.dataset.curse);
  else if (fz) doFuse();
});
$('.view[data-view="deeds"]').addEventListener('click',e=>{
  const w=e.target.closest('#wellBtn'), ex=e.target.closest('[data-exp]'), r=e.target.closest('[data-ritual]');
  if (w) drawWell();
  else if (ex){ const sel=$('#expPet'); if (sel&&sel.value) sendExp(sel.value,ex.dataset.exp); }
  else if (r) doRitual(r.dataset.ritual);
});
$('#muteBtn').addEventListener('click',()=>{
  S.muted=!S.muted; $('#muteBtn').innerHTML=S.muted?IC.volOff:IC.volOn;
  if (!S.muted){ audio(); sfx.gold(); } save(true);
});
$('#resetBtn').addEventListener('click',askReset);
$('#saveBtn').addEventListener('click',saveModal);
addEventListener('beforeunload',()=>save());

/* ---------------- Вкладки ---------------- */
function switchView(panel,v){
  const p=panel==='left'?$('#panelLeft'):$('#panelRight');
  const tabs=panel==='left'?$('#tabsLeft'):$('#tabsRight');
  tabs.querySelectorAll('button').forEach(b=>{
    const on=b.dataset.v===v;
    b.classList.toggle('on',on);
    if (on) b.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
  });
  p.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.dataset.view===v));
  if (innerWidth<=1120){
    $('#panelLeft').classList.toggle('mob-on',panel==='left');
    $('#panelRight').classList.toggle('mob-on',panel==='right');
    $$('#tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.panel===panel&&b.dataset.v===v));
  }
  if (v==='dark'){ renderPrestCard(); renderPTree(); renderTrueName(); }
  if (v==='skills') renderTrees();
  if (v==='gear') renderGear();
  if (v==='pets') renderPets();
  if (v==='forge') renderForge();
  if (v==='deeds') renderDeeds();
  if (v==='map') renderMap();
  if (v==='codex') renderCodex();
  if (v==='shop') renderShop();
}
$('#tabsLeft').addEventListener('click',e=>{const b=e.target.closest('button'); if(b) switchView('left',b.dataset.v);});
$('#tabsRight').addEventListener('click',e=>{const b=e.target.closest('button'); if(b) switchView('right',b.dataset.v);});
$('#tabbar').addEventListener('click',e=>{const b=e.target.closest('button'); if(b) switchView(b.dataset.panel,b.dataset.v);});
$$('#tabbar button').forEach(b=>{
  const m={hero:'skull',shop:'gem',map:'map',forge:'anvil',skills:'tree',pets:'paw',gear:'bag',deeds:'compass',dark:'shard',codex:'book'};
  b.innerHTML=IC[m[b.dataset.v]]+b.textContent;
});

/* ---------------- Горячие клавиши ---------------- */
addEventListener('keydown',e=>{
  if (e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
  const k=e.key.toLowerCase();
  if (e.code==='Space'){ e.preventDefault(); audio(); clickAttack(false); return; }
  if (e.key==='Escape'){ if ($('#modal').dataset.closable!=='0') closeModal(); $('#hintCard').classList.remove('on'); return; }
  if (['1','2','3'].includes(e.key)){
    if (e.key==='3'){ if (ultReady()){ audio(); useUlt(); } return; }
    const s=ownedActives().find(a=>ACT[a.id].key===e.key);
    if (s){ audio(); useSkill(s.id); } return;
  }
  if (k==='z'){ const l=stanceList(); if (l.length) setStance((S.stance+1)%l.length); }
  else if (k==='q') buyPotion('dmg');
  else if (k==='w') buyPotion('gold');
  else if (k==='e') buyPotion('haste');
  else if (k==='r') drawWell();
  else if (k==='t') setMode(S.mode==='farm'?'deeper':'farm');
  else if (k==='m') $('#muteBtn').click();
  else if (k==='x') switchView('right','map');
  else if (k==='k') switchView('right','skills');
  else if (k==='i') switchView('right','gear');
  else if (k==='b') switchView('right','shop');
  else if (k==='g') switchView('right','forge');
  else if (k==='d') switchView('right','deeds');
  else if (k==='p') switchView('right','dark');
  else if (k==='f') switchView('right','pets');
  else if (k==='c') switchView('left','codex');
  else if (k==='h') switchView('left','hero');
});

/* ---------------- Запуск ---------------- */
$('#goldIc').innerHTML=IC.coin;
$('#shardIc').innerHTML=IC.shard;
$('#muteBtn').innerHTML=IC.volOn;
$('#resetBtn').innerHTML=IC.reset;
$('#saveBtn').innerHTML=IC.save;

const hadSave=load();
if (S.muted) $('#muteBtn').innerHTML=IC.volOff;
if (S.stage<1) S.stage=1;
if (!S.markAt) S.markAt=now()+300000;
if (!S.riftAt) scheduleRift();
ensureContracts();
lastZone=zoneIndex(S.stage);

spawnMob();
renderAll();
checkHidden();

if (hadSave){
  log('Оковы вновь сомкнулись. Прогресс загружен (глубина '+S.stage+').','info');
  if (!S.cls) classModal();
  else {
    applyOffline(); checkPets();
    if (S.prestige>=3&&!S.sub) setTimeout(subModal,900);
    else if (S.prestige>=1&&Math.random()<0.22) setTimeout(nightmare,1600);
  }
} else {
  log('Ты пробуждаешься там, где кончается свет…','info');
  classModal();
}
resizeCv(); initParts(); embersLoop();

/* Главный игровой цикл — 10 тиков в секунду */
setInterval(gameTick,100);
