"use strict";
/* ============================================================
   UI / RENDER — отрисовка интерфейса, эффекты арены, фон
   ============================================================ */

function costHTML(c,gold){
  let h='<div class="cost-row">';
  if (gold) h+='<span class="cost '+(S.gold>=gold?'ok':'no')+'">'+IC.coin+nf(gold)+'</span>';
  for (const k in c) h+='<span class="cost '+((S.res[k]||0)>=c[k]?'ok':'no')+'">'+IC[RES[k].ic]+nf(c[k])+'</span>';
  return h+'</div>';
}
function renderResBar(){
  const bar=$('#resBar');
  let h='';
  for (const k in RES){
    if (!S.seen[k] && !(S.res[k]>0)) continue;
    h+='<div class="res-chip '+RES[k].cls+'" data-reshelp="1" title="'+RES[k].n+' — '+RES[k].d+' Нажми, чтобы открыть справочник.">'+
       IC[RES[k].ic]+nf(S.res[k]||0)+'</div>';
  }
  if (S.sacrificed.length) h+='<div class="res-chip" style="color:#ff9a9d" title="Жертвы свиты: +8% урона за каждую">'+IC.sacrifice+S.sacrificed.length+'</div>';
  if (S.relics.length) h+='<div class="res-chip r-truth" title="Истинные Реликвии">'+IC.orb+S.relics.length+'/7</div>';
  if (h) h+='<div class="res-chip help" data-reshelp="1" title="Справочник по валютам">'+IC.help+'что это?</div>';
  bar.innerHTML=h;
}
function renderGold(){
  $('#goldVal').textContent=nf(S.gold);
  const p=$('#goldPill'); p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
  $('#shardVal').textContent=nf(S.shards);
  $('#shardPill').style.display=(S.shards>0||S.prestige>0)?'flex':'none';
  $('#shVal2').textContent=nf(S.shards);
  renderResBar();
}
function renderXP(){
  const need=xpNeed(S.lvl);
  $('#heroLvl').textContent=S.lvl;
  $('#xpFill').style.width=Math.min(100,S.xp/need*100)+'%';
  $('#xpRing').style.strokeDashoffset=(201*(1-Math.min(1,S.xp/need))).toFixed(1);
  $('#xpNum').textContent=nf(S.xp)+' / '+nf(need)+' опыта';
  $('#spVal').textContent=S.sp;
}
function renderTitle(){
  $('#heroTitle').textContent=currentTitle();
  const c=CLASSES[S.cls];
  $('#heroName').textContent=S.heroName;
  $('#heroClass').innerHTML=c?'<span style="color:'+c.col+'">'+c.n+'</span>'+
    (S.sub?' · <span style="color:var(--gold)">'+SUBS[S.sub].n+'</span>':''):'—';
  $('#classLabel').textContent=c?'Путь класса · '+c.n:'Путь класса';
}
function renderStats(){
  const st=stats();
  const z=zoneAt(S.stage);
  const rows=[
    ['sword','Урон клика',nf(st.click*comboMul()),'hl'],
    ['dps','Автоурон (DPS)',nf(st.dps),''],
    ['target','Шанс крита',st.crit.toFixed(1)+'%',''],
    ['zap','Множитель крита','×'+st.critMul.toFixed(2),''],
    ['gem','Множитель золота','×'+st.goldMul.toFixed(2),'hl2'],
    ['book','Множитель опыта','×'+st.xpMul.toFixed(2),''],
    ['crown','Урон по Владыкам','×'+st.bossMul.toFixed(2),'']
  ];
  if (st.exec>0) rows.push(['scythe','Казнь',Math.round(st.exec*100)+'% при HP<'+Math.round(st.execThr*100)+'%','hl4']);
  if (S.prestige>0) rows.push(['chain','Эхо Разрывов','×'+(1+0.12*S.prestige).toFixed(2)+' урона','hl4']);
  if (S.codexBoss.length) rows.push(['book','Книга Имён','+'+(S.codexBoss.length*1.5).toFixed(1)+'% урона','hl2']);
  if (S.relics.length) rows.push(['orb','Реликвии',S.relics.length+' / 7','hl5']);
  if (S.sacrificed.length) rows.push(['sacrifice','Жертвы свиты','+'+(S.sacrificed.length*8)+'% урона','hl']);
  if (S.ritualEdge) rows.push(['truth','Истинная Грань','+'+(S.ritualEdge*3)+'% урона','hl5']);
  if (z&&z.rn) rows.push(['flag','Закон глубины',z.rn,'hl3']);
  rows.push(
    ['map','Режим', S.mode==='farm'?'Фарм':'Глубже','hl3'],
    ['down','Глубина забега', S.runMax+' / порог '+prestReq(),'hl4'],
    ['skull','Убийств',nf(S.kills),''],['star','Элит убито',nf(S.elites),''],
    ['crown','Владык повержено',nf(S.bosses),''],['mark','Меченых',nf(S.marks),''],
    ['blood','Всего урона',nf(S.totalDmg),''],
    ['flag','Макс. глубина',S.maxStage,'hl3'],['paw','Свита',Object.keys(S.pets).length+'/'+PETS.length,''],
    ['clock','Время в игре',fmtTime(S.playtime),'']);
  $('#statRows').innerHTML=rows.map(r=>'<div class="srow '+r[3]+'">'+IC[r[0]]+'<span class="k">'+r[1]+'</span><span class="v">'+r[2]+'</span></div>').join('');
  renderChips();
}
function renderChips(){
  const st=stats();
  $('#chipClick').textContent=nf(st.click*comboMul());
  $('#chipDps').textContent=nf(st.dps);
  $('#chipCrit').textContent=st.crit.toFixed(0)+'%';
}
function renderAch(){
  $('#achGrid').innerHTML=ACH.map(a=>'<div class="ach'+(S.ach.includes(a.id)?' on':'')+'" title="'+a.n+' — '+a.d+'">'+IC[a.ic]+'</div>').join('');
}
function renderGoals(){
  $('#goalList').innerHTML=GOALS.map(g=>{
    const done=S.goals.includes(g.id);
    return '<div class="goal'+(done?' done':'')+'">'+(done?IC.check:IC.circle)+
      '<span class="gt">'+g.n+'</span><span class="gr">'+IC.shard+g.r+'</span></div>';
  }).join('');
}
function updateHP(){
  if (!mob) return;
  const f=mob.maxHp>0?mob.hp/mob.maxHp:1;
  $('#hpFill').style.width=(f*100)+'%';
  $('#hpGhost').style.width=(f*100)+'%';
  const sh=$('#hpShield');
  if (mob.shield>0){ sh.style.display='block'; sh.style.width=(mob.shield/mob.maxHp*100)+'%'; }
  else sh.style.display='none';
  $('#hpText').textContent=nf(Math.max(0,mob.hp))+' / '+nf(mob.maxHp)+(mob.shield>0?' · щит '+nf(mob.shield):'');
}
function log(html,type){
  const box=$('#log');
  box.prepend(el('<div class="t-'+(type||'info')+'">'+html+'</div>'));
  while (box.children.length>34) box.lastChild.remove();
}
function renderBuffs(){
  const out=[];
  if (fatigue>0.05) out.push(['b-curse','tired','Рука устала · '+Math.round(fatigue*85)+'% урона снято',0]);
  if (S.buffs.dmg>0) out.push(['b-dmg','blood','×2 урон',S.buffs.dmg]);
  if (S.buffs.gold>0) out.push(['b-gold','coin','×2 золото',S.buffs.gold]);
  if (S.buffs.haste>0) out.push(['b-haste','spark','×2 DPS',S.buffs.haste]);
  if (S.buffs.click>0) out.push(['b-dmg','potion','+150% клик',S.buffs.click]);
  if (S.buffs.dps>0) out.push(['b-haste','ghost','+120% DPS',S.buffs.dps]);
  if (S.buffs.all>0) out.push(['b-dmg','drop','+80% урон',S.buffs.all]);
  if (stormT>0) out.push(['b-storm','flame','Шторм ×3.5',stormT]);
  if (ultBuffT>0) out.push(['b-storm','crown','Ультиматив ×2',ultBuffT]);
  if (oathBuffT>0) out.push(['b-oath','flame','Клятва Пепла',oathBuffT]);
  if (stepCharges>0) out.push(['b-step','feather','Крит ×'+stepCharges,0]);
  if (oathStacks>0) out.push(['b-oath','blood','Клятвопреступление ×'+oathStacks,oathT]);
  if (nameStacks>0) out.push(['b-name','book','Имена ×'+nameStacks,0]);
  if (execCritT>0) out.push(['b-step','scythe','Эхо казни',execCritT]);
  if (S.oil&&S.oilT>0){ const o=OILS.find(x=>x.id===S.oil); if(o) out.push(['b-oil',o.ic,o.n.replace('Масло ',''),S.oilT]); }
  if (S.ink&&S.inkT>0){ const k=INKS.find(x=>x.id===S.ink); if(k) out.push(['b-ink',k.ic,k.n.replace('Чернила ',''),S.inkT]); }
  if (S.curse&&S.curseT>0){ const c=CURSES.find(x=>x.id===S.curse); if(c) out.push(['b-curse','skull',c.n,S.curseT]); }
  $('#buffBar').innerHTML=out.slice(0,7).map(o=>'<div class="buff '+o[0]+'">'+IC[o[1]]+
    '<span>'+o[2]+(o[3]>0?' · '+Math.ceil(o[3])+'с':'')+'</span></div>').join('');
}
function renderSkillBar(){
  const acts=ownedActives();
  let h=acts.map(s=>{
    const c=cd[s.id]||0, tot=ACT[s.id].cd*cdMul(), ready=c<=0;
    return '<button class="sk-btn'+(ready?' ready':'')+'" data-skill="'+s.id+'" title="'+s.n+'">'+IC[s.ic]+
      '<span class="key">'+ACT[s.id].key+'</span>'+
      (ready?'':'<span class="cdmask" style="height:'+(c/tot*100)+'%">'+Math.ceil(c)+'</span>')+'</button>';
  }).join('');
  if (ultReady()){
    const u=ULT[S.cls], c=cd.ult||0, tot=u.cd*cdMul(), ready=c<=0;
    h+='<button class="sk-btn ult'+(ready?' ready':'')+'" data-skill="ult" title="'+u.n+' — '+u.d+'">'+IC[u.ic]+
      '<span class="key">3</span>'+(ready?'':'<span class="cdmask" style="height:'+(c/tot*100)+'%">'+Math.ceil(c)+'</span>')+'</button>';
  }
  $('#skillBar').innerHTML=h;
}
function renderStanceBar(){
  const list=stanceList();
  if (!list.length){ $('#stanceBar').innerHTML=''; return; }
  $('#stanceBar').innerHTML=list.map((s,i)=>'<button class="st-btn'+(S.stance===i?' on':'')+'" data-stance="'+i+'" title="'+s.d+'">'+
    IC[s.ic]+'<span>'+s.n.split(' ').slice(-1)[0]+'</span></button>').join('');
}
function setStance(i){
  if (S.stance===i) return;
  S.stance=i;
  const s=stanceList()[i];
  sfx.sig();
  log('Стойка: <b>'+s.n+'</b> — '+s.d,'lvl');
  hint('stance','Стойки','Стойка меняет твой ритм боя: клик, свита или крит. Переключай под врага. Клавиша Z.');
  renderStanceBar(); renderStats(); save(true);
}
function renderPetLayer(){
  $('#petLayer').innerHTML=S.active.filter(id=>petOwned(id)&&!petAway(id)).map(id=>{
    const p=PET(id);
    return '<div class="pet-orb" style="color:'+RAR[p.rar].c+'" title="'+esc(p.n)+'">'+PET_SVG[id]+'</div>';
  }).join('');
}
/* Универсальная отрисовка древа */
function drawTree(container,nodes,height,isP){
  let lines='';
  for (const n of nodes){
    if (!n.req) continue;
    const p=nodes.find(x=>x.id===n.req); if (!p) continue;
    const on=isP?pLv(n.id)>0:skLv(n.id)>0;
    lines+='<line x1="'+p.x+'" y1="'+p.y+'" x2="'+n.x+'" y2="'+n.y+'" class="'+(on?(isP?'pon':'on'):'')+'"/>';
  }
  let html='<svg class="links" viewBox="0 0 300 '+height+'">'+lines+'</svg>';
  for (const raw of nodes){
    const n=isP?raw:nodeData(raw);
    const l=isP?pLv(raw.id):skLv(raw.id);
    const cost=isP?pCost(raw):raw.cost;
    const cur=isP?S.shards:S.sp;
    const unl=isP?pAvailable(raw):skillUnlocked(raw);
    const avail=unl&&l<raw.max&&cur>=cost;
    const cls=l>=raw.max?'max':l>0?'owned':avail?'avail':(unl?'':'locked');
    const sel=(isP?selP:selSkill)===raw.id?' sel':'';
    html+='<div class="node'+(isP?' pnode':'')+' '+cls+(raw.act?' act':'')+sel+'" data-'+(isP?'pn':'sk')+'="'+raw.id+
      '" style="left:'+raw.x+'px;top:'+raw.y+'px" title="'+esc(n.n)+'">'+IC[n.ic]+
      '<span class="nlv">'+l+'/'+raw.max+'</span></div>';
  }
  container.style.height=height+'px';
  container.innerHTML=html;
}
function renderTabBadges(){
  const t=v=>$('#tabsRight button[data-v="'+v+'"]');
  t('skills').innerHTML='Путь'+(S.sp>0?'<span class="badge">'+S.sp+'</span>':'');
  t('gear').innerHTML='Сумка'+(S.inv.length>0?'<span class="badge">'+S.inv.length+'</span>':'');
  const petUp=PETS.some(p=>petOwned(p.id)&&petLv(p.id)<p.max&&(p.cur==='gold'?S.gold>=petCost(p):S.shards>=petCost(p)))
    ||PETS.some(p=>!petOwned(p.id)&&p.shop&&S.shards>=p.shop);
  t('pets').innerHTML='Свита'+(petUp?'<span class="badge" style="background:var(--shard);color:#04121a">↑</span>':'');
  ensureContracts();
  const deedsReady = now()>=S.wellAt || S.exped.some(e=>now()>=e.end);
  t('deeds').classList.toggle('ready',deedsReady);
  t('map').classList.toggle('ready', riftAvailable()||riftOn());
  const ready=canPrestige();
  t('dark').classList.toggle('ready',ready);
  $$('#tabbar button[data-v="dark"]').forEach(b=>b.classList.toggle('ready',ready));
  $$('#tabbar button[data-v="deeds"]').forEach(b=>b.classList.toggle('ready',deedsReady));
  $$('#tabbar button[data-v="map"]').forEach(b=>b.classList.toggle('ready',riftAvailable()||riftOn()));
}
function renderCodex(){
  const bb=(S.codexBoss.length*1.5).toFixed(1);
  $('#bookStat').innerHTML='<div class="book-stat">Записано имён: <b>'+S.codexBoss.length+' / '+BOSS_NAMES.length+
    '</b><br>Каждое имя навсегда даёт +1.5% ко всему урону. Сейчас: <b>+'+bb+'%</b>.<br>'+
    '<span style="font-size:10px">Книга переживает Разрыв Оков.</span></div>';
  $('#relicGrid').innerHTML=TRELICS.map(r=>{
    const on=S.relics.includes(r.id);
    return '<div class="relic-cell'+(on?' on':'')+'" title="'+(on?esc(r.n)+' — '+esc(r.d):'Не найдена')+'">'+(on?IC[r.ic]:IC.lock)+'</div>';
  }).join('');
  $('#relicSets').innerHTML=RSETS.map(s=>'<div class="set-row'+(S.relics.length>=s.need?' on':'')+'">'+
    (S.relics.length>=s.need?'✦ ':'')+s.d+'</div>').join('')+
    (S.relics.length?'<div style="margin-top:7px">'+S.relics.map(id=>{const r=TR(id);
      return '<div class="codex-item"><div class="cn" style="color:var(--rtruth)">'+IC[r.ic]+esc(r.n)+'</div>'+
        '<div class="cl" style="color:#79d4ab;font-style:normal">'+r.d+'</div><div class="cl">'+r.lore+'</div></div>';}).join('')+'</div>':'');
  $('#codexFam').innerHTML=FAM_NAMES.map((f,i)=>{
    const o=S.codexFam.includes(i);
    return '<div class="codex-item'+(o?'':' locked')+'"><div class="cn">'+(o?IC.skull:IC.lock)+
      (o?esc(f[0]):'Неизвестная тварь')+'</div><div class="cl">'+(o?FAM_LORE[i]:'Запись появится, когда вы убьёте такую тварь.')+'</div></div>';
  }).join('');
  $('#codexBoss').innerHTML=BOSS_NAMES.map((b,i)=>{
    const o=S.codexBoss.includes(i);
    return '<div class="codex-item'+(o?'':' locked')+'"><div class="cn">'+(o?IC.crown:IC.lock)+
      (o?esc(b):'Безымянный Владыка')+'</div><div class="cl">'+(o?BOSS_LORE[i]:'Имя откроется после победы.')+'</div></div>';
  }).join('');
  const zones=HIDDEN_ZONES.map(z=>{
    const o=S.hidden.includes(z.id);
    return '<div class="codex-item'+(o?'':' locked')+'"><div class="cn">'+(o?IC.void:IC.lock)+
      (o?esc(z.z):'Скрытая глубина')+'</div><div class="cl">'+(o?z.rl+' — '+z.rd:'Условие: '+z.how)+'</div></div>';
  }).join('');
  $('#loreList').innerHTML=zones+(S.lore.length?S.lore.map(t=>'<div class="codex-item"><div class="cl">'+esc(t)+'</div></div>').join(''):
    '<div class="empty">Обрывки знания приходят из Колодца и от вернувшейся свиты.</div>');
}

/* ---------------- Эффекты арены ---------------- */
function mobCenter(){
  const a=$('#arena').getBoundingClientRect(), m=$('#mob').getBoundingClientRect();
  return {x:m.left-a.left+m.width/2, y:m.top-a.top+m.height*0.36};
}
function spawnFloat(txt,cls){
  const c=mobCenter(), d=el('<div class="dmg '+(cls||'')+'">'+txt+'</div>');
  d.style.left=(c.x+(Math.random()*120-60))+'px';
  d.style.top=(c.y+(Math.random()*46-23))+'px';
  $('#fx').appendChild(d);
  d.addEventListener('animationend',()=>d.remove());
}
function arenaShake(){ const a=$('#arena'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
function soulBurst(color,harvest){
  const c=mobCenter(), n=14+(harvest||0)*3;
  for (let i=0;i<n;i++){
    const s=el('<div class="soul"></div>');
    const ang=Math.PI*(0.15+Math.random()*0.7), dist=60+Math.random()*130;
    s.style.left=c.x+'px'; s.style.top=c.y+'px';
    s.style.setProperty('--dx',(Math.cos(ang)*dist*(Math.random()<.5?-1:1))+'px');
    s.style.setProperty('--dy',(-Math.sin(ang)*dist)+'px');
    s.style.setProperty('--d',(0.6+Math.random()*0.7)+'s');
    s.style.setProperty('--sc',harvest?'#e8b94e':color);
    $('#fx').appendChild(s);
    s.addEventListener('animationend',()=>s.remove());
  }
}
function coinFly(){
  const m=$('#mob').getBoundingClientRect(), t=$('#goldPill').getBoundingClientRect();
  for (let i=0;i<3;i++){
    const c=el('<div class="coin-fly">'+IC.coin+'</div>');
    c.style.left=(m.left+m.width/2+(Math.random()*60-30))+'px';
    c.style.top=(m.top+m.height*0.4)+'px';
    document.body.appendChild(c);
    requestAnimationFrame(()=>{
      const r=c.getBoundingClientRect();
      c.style.transform='translate('+(t.left+t.width/2-r.left-8)+'px,'+(t.top+t.height/2-r.top-8)+'px) scale(.4)';
      c.style.opacity='.2';
    });
    setTimeout(()=>c.remove(),750);
  }
}
function toast(a){
  const t=el('<div class="toast"><div class="t-ic">'+IC[a.ic]+'</div><div><small>'+(a.small||'Достижение')+'</small><b>'+a.n+'</b><span>'+a.d+'</span></div></div>');
  $('#toasts').appendChild(t);
  setTimeout(()=>{t.classList.add('out'); setTimeout(()=>t.remove(),400);},3200);
}
function dropToast(it){
  const R=RAR[it.rar], T=ITYPE[it.slot]||ITYPE.relic;
  const t=el('<div class="toast drop"><div class="t-ic">'+IC[T.ic]+'</div><div><small>'+R.n+' · '+T.n+'</small>'+
    '<b style="color:'+R.c+'">'+esc(it.n)+'</b><span>'+Object.entries(it.st).map(([k,v])=>pct(v)+' '+STAT_DEF[k].n).join(' · ')+'</span></div></div>');
  $('#toasts').appendChild(t);
  setTimeout(()=>{t.classList.add('out'); setTimeout(()=>t.remove(),400);},3600);
}
function petToast(p,how){
  const t=el('<div class="toast pet"><div class="t-ic">'+PET_SVG[p.id]+'</div><div><small>'+how+'</small>'+
    '<b>'+esc(p.n)+'</b><span>'+RAR[p.rar].n+' · '+p.ef(1)+'</span></div></div>');
  $('#toasts').appendChild(t);
  setTimeout(()=>{t.classList.add('out'); setTimeout(()=>t.remove(),400);},4200);
}
function truthToast(v,n,d){
  const t=el('<div class="toast truth"><div class="t-ic">'+IC.truth+'</div><div><small>Из глубины</small>'+
    '<b>'+(n?esc(n):'+'+v+' Осколков Истины')+'</b><span>'+(d?esc(d):'Редчайшее из того, что здесь есть')+'</span></div></div>');
  $('#toasts').appendChild(t);
  setTimeout(()=>{t.classList.add('out'); setTimeout(()=>t.remove(),400);},4600);
}

/* ---------------- Фон: летящие угли ---------------- */
const cv=$('#embers'), ctx2=cv.getContext('2d');
let parts=[];
function resizeCv(){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=innerWidth*dpr; cv.height=innerHeight*dpr;
  cv.style.width=innerWidth+'px'; cv.style.height=innerHeight+'px';
  ctx2.setTransform(dpr,0,0,dpr,0,0);
}
function initParts(){
  parts=Array.from({length:46},()=>({x:Math.random()*innerWidth,y:innerHeight+Math.random()*innerHeight*0.4,
    r:0.6+Math.random()*2.2,sp:0.25+Math.random()*0.8,sw:Math.random()*Math.PI*2,
    hue:12+Math.random()*26,a:0.25+Math.random()*0.5}));
}
function embersLoop(){
  ctx2.clearRect(0,0,innerWidth,innerHeight);
  for (const p of parts){
    p.y-=p.sp; p.sw+=0.012; p.x+=Math.sin(p.sw)*0.35;
    if (p.y<-10){ p.y=innerHeight+10; p.x=Math.random()*innerWidth; }
    const fl=0.7+Math.sin(p.sw*3)*0.3;
    ctx2.beginPath(); ctx2.arc(p.x,p.y,p.r,0,7);
    ctx2.fillStyle='hsla('+p.hue+',90%,58%,'+(p.a*fl)+')';
    ctx2.shadowColor='hsla('+p.hue+',95%,55%,.8)'; ctx2.shadowBlur=8; ctx2.fill();
  }
  ctx2.shadowBlur=0;
  requestAnimationFrame(embersLoop);
}
addEventListener('resize',resizeCv);

/* ---------------- Полная перерисовка ---------------- */
function renderAll(){
  renderGold(); renderResBar(); renderXP(); renderTitle(); renderStats(); renderShop(); renderAch(); renderGoals();
  renderTrees(); renderPTree(); renderPrestCard(); renderTrueName(); renderGear(); renderPets(); renderPetLayer();
  renderCodex(); renderBuffs(); renderSkillBar(); renderStanceBar(); renderTabBadges(); renderForge(); renderDeeds();
  renderMap(); renderModeChip();
}
