"use strict";
/* ============================================================
   CORE / STATE — состояние, ресурсы, сохранения, оффлайн
   ============================================================ */

const SAVE_KEY='cursebound_save_v5';
const OLD_KEYS=['cursebound_save_v4','cursebound_save_v3','cursebound_save_v2','cursebound_save_v1'];
const SAVE_VER=5, BOSS_TIME=30, INV_MAX=40, PREST_REQ=45, PREST_COOLDOWN=600000; /* 10 минут */

const RES = {
  blood:{n:'Кровь Владык', ic:'drop', cls:'r-blood',
    d:'Падает только с Владык и меченых.',
    from:'Владыки, меченые, разбор эпических вещей и выше, экспедиции.',
    to:'Перековка и проклятие вещей, масла, ритуалы, слияние свиты.'},
  ash:{n:'Пепел Душ', ic:'urn', cls:'r-ash',
    d:'Оседает после элит и казней.',
    from:'Элиты, казни, разбор снаряжения, Сад Немых Хоров, свита.',
    to:'Эликсиры, масла, чернила, ритуалы, слияние свиты.'},
  whisper:{n:'Шёпот', ic:'whisper', cls:'r-whisper',
    d:'Копится, пока тебя нет.',
    from:'Оффлайн (1 за 6 минут), фамильяры, Колодец, глубокие экспедиции.',
    to:'Чернила рун, Ритуал Тихого Часа, Колодец Шёпотов.'},
  truth:{n:'Осколки Истины', ic:'truth', cls:'r-truth',
    d:'Редчайшее. Открывает скрытое и вечное.',
    from:'Владыки глубже 100, меченые, Колодец, глубокие экспедиции, недельный заказ.',
    to:'Ритуал Истинной Грани, Открытие Пути, Истинное Имя.'}
};

const DEF = () => ({
  v:SAVE_VER, cls:null, sub:null, heroName:'Безымянный странник',
  gold:0,totalGold:0, lvl:1,xp:0, stage:1,maxStage:1,runMax:1,
  kills:0,bosses:0,elites:0,clicks:0,crits:0,marks:0,totalDmg:0,purchases:0,playtime:0,skillUses:0,
  u:{blade:0,servant:0,crit:0,greed:0,power:0,void:0},
  ach:[], muted:false, lastSeen:now(),
  prestige:0, shards:0, totalShards:0, prestAt:0,
  res:{blood:0,ash:0,whisper:0,truth:0}, seen:{},
  sp:0, skills:{}, ptree:{}, stance:0,
  equip:{weapon:null,armor:null,amulet:null,ring1:null,ring2:null,relic:null}, inv:[], itemSeq:1,
  codexFam:[], codexBoss:[], lore:[],
  buffs:{dmg:0,gold:0,haste:0,click:0,dps:0,all:0},
  oil:null, oilT:0, ink:null, inkT:0, curse:null, curseT:0,
  pets:{}, active:[], sacrificed:[],
  exped:[], contracts:null, wellAt:0, markAt:0, markPending:false,
  relics:[], trueName:null, hidden:[], ritualEdge:0,
  /* карта и режимы */
  mode:'deeper', rift:null, riftAt:0,
  /* лавка */
  autoOn:false, autoBuy:{}, shopOrder:['blade','servant','crit','greed','power','void'],
  hints:[], goals:[]
});
let S = DEF();

/* Рантайм боя (не сохраняется) */
let mob=null, mobDead=false, autoAcc=0, autoTimer=0;
let combo=0, comboT=0, cd={}, stormT=0, stepCharges=0;
let weakActive=false, weakT=4, weakLife=0;
let oathStacks=0, oathT=0, nameStacks=0, lastZone=-1, waveT=0, knightClicks=0, execCritT=0, oathBuffT=0;
let ultBuffT=0, petT=9, voiceT=180, invFilter=0, invType='all', invSort='rar', forgeTab='alch';
let poisonT=0, shopBulk=1, autoTimerShop=0;
let clickStamps=[], fatigue=0;

/* ---------------- Ресурсы ---------------- */
function addRes(k,amount,silent){
  if (amount<=0) return 0;
  const B=bonuses();
  const m = k==='blood'?B.bloodMul : k==='ash'?B.ashMul : k==='whisper'?B.whisMul : 1;
  const v = Math.max(1, Math.floor(amount*m));
  S.res[k]=(S.res[k]||0)+v; S.seen[k]=1;
  if (!silent) spawnFloat('+'+nf(v)+' '+IC[RES[k].ic],'res');
  renderResBar();
  if (k==='truth'){ sfx.truth(); truthToast(v); }
  return v;
}
function hasRes(c){ for (const k in c){ if ((S.res[k]||0)<c[k]) return false; } return true; }
function payRes(c){ if (!hasRes(c)) return false; for (const k in c) S.res[k]-=c[k]; renderResBar(); return true; }

/* ---------------- Сохранения ---------------- */
function save(silent){
  S.lastSeen=now(); S.v=SAVE_VER;
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)); }catch(e){}
  if (silent){ const d=$('#saveDot'); d.classList.add('on'); setTimeout(()=>d.classList.remove('on'),900); }
}
function migrate(data){
  const fresh=DEF();
  const out=Object.assign(fresh,data);
  out.u=Object.assign(fresh.u,data.u||{});
  out.equip=Object.assign({weapon:null,armor:null,amulet:null,ring1:null,ring2:null,relic:null},data.equip||{});
  out.buffs=Object.assign({dmg:0,gold:0,haste:0,click:0,dps:0,all:0},data.buffs||{});
  out.res=Object.assign({blood:0,ash:0,whisper:0,truth:0},data.res||{});
  out.seen=data.seen||{};
  out.ptree=data.ptree||{}; out.pets=data.pets||{}; out.skills=data.skills||{};
  out.autoBuy=data.autoBuy||{};
  ['active','inv','ach','goals','hints','codexFam','codexBoss','lore','relics','hidden','sacrificed','exped']
    .forEach(k=>{ if(!Array.isArray(out[k])) out[k]=[]; });
  if (typeof out.stance!=='number'||out.stance<0||out.stance>2) out.stance=0;
  if (typeof out.ritualEdge!=='number') out.ritualEdge=0;
  if (!out.contracts||!Array.isArray(out.contracts.d)) out.contracts=null;
  /* v1–v3 → v4 */
  if (!data.v||data.v<4){
    out.res={blood:0,ash:0,whisper:0,truth:0};
    out.wellAt=0; out.markAt=now()+300000; out.exped=[]; out.contracts=null;
    out.relics=[]; out.hidden=[]; out.sacrificed=[]; out.trueName=null; out.ritualEdge=0;
    if (data.v!==3){ out.skills={}; out.sp=Math.floor((out.lvl||1)/2); }
    const valid={}; for (const k in out.ptree){ if (PN(k)) valid[k]=out.ptree[k]; }
    out.ptree=valid;
  }
  /* v4 → v5: режимы карты, кольца, автопокупка, порог престижа по забегу */
  if (!data.v||data.v<5){
    out.runMax=out.maxStage||1;   /* старый забег засчитываем целиком */
    out.prestAt=0; out.mode='deeper'; out.rift=null; out.riftAt=0;
    out.autoOn=false; out.autoBuy={};
    out.shopOrder=['blade','servant','crit','greed','power','void'];
  }
  if (typeof out.runMax!=='number'||out.runMax<1) out.runMax=Math.max(1,out.stage||1);
  if (out.mode!=='farm'&&out.mode!=='deeper') out.mode='deeper';
  /* порядок лавки: только известные id, недостающие в конец */
  const ids=['blade','servant','crit','greed','power','void'];
  out.shopOrder=(Array.isArray(out.shopOrder)?out.shopOrder:[]).filter(x=>ids.includes(x));
  ids.forEach(x=>{ if(!out.shopOrder.includes(x)) out.shopOrder.push(x); });
  out.active=out.active.filter(id=>PET(id)&&(out.pets[id]||0)>0);
  out.exped=out.exped.filter(e=>e&&PET(e.pet)&&(out.pets[e.pet]||0)>0);
  out.relics=out.relics.filter(id=>TR(id));
  out.hidden=out.hidden.filter(id=>HIDDEN_ZONES.some(z=>z.id===id));
  /* предметы проверяем по типу (weapon/armor/amulet/ring/relic) */
  out.inv=out.inv.filter(i=>i&&ITYPE[i.slot]);
  for (const k in out.equip){ if (out.equip[k]&&!ITYPE[out.equip[k].slot]) out.equip[k]=null; }
  out.v=SAVE_VER;
  return out;
}
function load(){
  let raw=localStorage.getItem(SAVE_KEY), old=false;
  if (!raw){ for (const k of OLD_KEYS){ raw=localStorage.getItem(k); if (raw){ old=true; break; } } }
  if (!raw) return false;
  try{
    S=migrate(JSON.parse(raw));
    if (old) log('Старая печать перенесена в новую эпоху.','info');
    return true;
  }catch(e){ return false; }
}
function exportSave(){ try{ return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }catch(e){ return ''; } }
function importSave(code){
  try{
    const obj=JSON.parse(decodeURIComponent(escape(atob(code))));
    if (!obj||typeof obj!=='object') return false;
    S=migrate(obj); save(); return true;
  }catch(e){ return false; }
}

/* ---------------- Оффлайн ---------------- */
function applyOffline(){
  const st=stats(), B=st.B;
  const cap=(B.offCap||6)*3600;
  const secs=Math.min((now()-S.lastSeen)/1000,cap);
  if (secs<60) return;
  const wh=Math.floor(secs/360*B.whisMul);
  if (wh>0) addRes('whisper',wh,true);
  if (st.dps<=0){ if (wh>0) log('Тишина принесла '+wh+' Шёпота.','info'); return; }
  const kills=(st.dps*secs)/hpFor(S.stage);
  const gold=Math.floor(kills*goldFor(S.stage)*st.goldMul*0.5*B.offMul);
  const xp=Math.floor(kills*xpFor(S.stage)*st.xpMul*0.3*B.offMul);
  if (gold<=0&&wh<=0) return;
  S.gold+=gold; S.totalGold+=gold; gainXP(xp);
  setTimeout(()=>offlineModal(gold,xp,secs,wh),700);
  log('Оффлайн-добыча: +'+nf(gold)+' золота'+(wh?', +'+wh+' Шёпота':'')+'.','gold');
}
function grantOffline(secs){
  const st=stats(), B=st.B;
  if (st.dps<=0) return;
  const kills=(st.dps*secs)/hpFor(S.stage);
  const gold=Math.floor(kills*goldFor(S.stage)*st.goldMul*0.5*B.offMul);
  const xp=Math.floor(kills*xpFor(S.stage)*st.xpMul*0.3*B.offMul);
  S.gold+=gold; S.totalGold+=gold; gainXP(xp);
  log('Время сжалось: +'+nf(gold)+' золота и '+nf(xp)+' опыта.','gold');
  renderGold();
}
