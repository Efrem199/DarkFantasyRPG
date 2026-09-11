"use strict";
/* ============================================================
   SYSTEMS / SHOP — Лавка Теней: ×1/×5/×10/Макс, автопокупка,
   приоритеты и крупные карточки улучшений
   ============================================================ */

const SHOP = [
  {id:'blade',name:'Клинок Проклятого',base:25,g:1.16,ic:'sword',tier:'blood',
   ds:'+3 к урону клика',ef:l=>'+'+nf(3*l)+' базового клика'},
  {id:'servant',name:'Слуги Тьмы',base:60,g:1.17,ic:'ghost',tier:'vio',
   ds:'+4 автоурона в секунду',ef:l=>nf(4*l)+' базового DPS'},
  {id:'crit',name:'Глаз Ворона',base:150,g:1.34,ic:'eye',tier:'vio',
   ds:'+3% к шансу крита',ef:l=>'+'+(3*l)+'% шанса крита'},
  {id:'greed',name:'Реликвия Жадности',base:120,g:1.28,ic:'gem',tier:'gold',
   ds:'+25% к добыче золота',ef:l=>'×'+(1+0.25*l).toFixed(2)+' золота'},
  {id:'power',name:'Нечестивая Мощь',base:800,g:1.45,ic:'blood',tier:'blood',
   ds:'+10% к базовому урону',ef:l=>'×'+(1+0.1*l).toFixed(1)+' базы'},
  {id:'void',name:'Печать Пустоты',base:1500,g:1.5,ic:'void',tier:'shard',
   ds:'+50% урона по боссам',ef:l=>'+'+(50*l)+'% боссам'}
];
const SHOP_ITEM = id => SHOP.find(i=>i.id===id);
function orderedShop(){ return S.shopOrder.map(SHOP_ITEM).filter(Boolean); }

/* Цена одного следующего уровня */
function upgCost(it,offset){
  const red=clamp(bonuses().costRed,0,0.49);
  const lv=S.u[it.id]+(offset||0);
  return Math.max(1,Math.ceil(it.base*Math.pow(it.g,lv)*(1-red)));
}
/* Цена пачки уровней */
function bulkCost(it,n){ let c=0; for (let i=0;i<n;i++) c+=upgCost(it,i); return c; }
/* Сколько уровней потянет кошелёк */
function maxAfford(it){
  let n=0,c=0;
  while (n<500){ const step=upgCost(it,n); if (c+step>S.gold) break; c+=step; n++; }
  return n;
}
/* Сколько уровней покупаем при текущем режиме */
function bulkCount(it){
  if (shopBulk==='max') return Math.max(0,maxAfford(it));
  return shopBulk;
}

function renderShopHead(){
  const opts=[1,5,10,'max'];
  $('#shopHead').innerHTML=
    '<div class="bulk-row">'+
      '<span class="bulk-label">Покупать</span>'+
      opts.map(x=>'<button class="bulk-btn'+(shopBulk===x?' on':'')+'" data-bulk="'+x+'">'+
        (x==='max'?'Макс':'×'+x)+'</button>').join('')+
      '<button class="bulk-btn auto'+(S.autoOn?' on':'')+'" id="autoToggle" title="Автопокупка по приоритету">'+
        IC.bolt+'Авто</button>'+
    '</div>'+
    (S.autoOn
      ? '<div class="auto-note">Раз в секунду покупается первое <b>отмеченное</b> улучшение сверху вниз, если хватает золота. Стрелками задай приоритет.</div>'
      : '<div class="auto-note dim">Автопокупка выключена. Отметь нужные улучшения и включи «Авто».</div>');
}
function renderShop(){
  renderShopHead();
  const list=$('#shopList'); list.innerHTML='';
  const arr=orderedShop();
  arr.forEach((it,idx)=>{
    const lvl=S.u[it.id];
    const n=Math.max(1,bulkCount(it));
    const cost=bulkCost(it,n);
    const canBuy=S.gold>=cost && (shopBulk!=='max'||maxAfford(it)>0);
    const label = shopBulk==='max' ? (maxAfford(it)>0?'×'+maxAfford(it):'×0') : '×'+shopBulk;
    list.appendChild(el(
      '<div class="shop-item t-'+it.tier+'" data-id="'+it.id+'">'+
        '<div class="si-top">'+
          '<div class="shop-ic">'+IC[it.ic]+'</div>'+
          '<div class="shop-info">'+
            '<div class="nm">'+it.name+'<span class="lv">УР. '+lvl+'</span></div>'+
            '<div class="ds">'+it.ds+'</div>'+
            '<div class="ef">'+it.ef(lvl)+'</div>'+
          '</div>'+
          '<div class="si-prio">'+
            '<button class="prio-btn" data-up="'+it.id+'"'+(idx===0?' disabled':'')+' title="Выше в приоритете">▲</button>'+
            '<button class="prio-btn" data-down="'+it.id+'"'+(idx===arr.length-1?' disabled':'')+' title="Ниже в приоритете">▼</button>'+
          '</div>'+
        '</div>'+
        '<div class="si-bot">'+
          '<label class="auto-chk'+(S.autoBuy[it.id]?' on':'')+'" data-autochk="'+it.id+'">'+
            '<span class="box">'+(S.autoBuy[it.id]?IC.check:'')+'</span>авто</label>'+
          '<button class="buy wide" data-buy="'+it.id+'"'+(canBuy?'':' disabled')+'>'+
            IC.coin+nf(cost)+'<small>купить '+label+'</small></button>'+
        '</div>'+
      '</div>'));
  });
  const pl=$('#potionList'); pl.innerHTML='';
  for (const p of POTIONS){
    const left=Math.ceil(S.buffs[p.id]||0);
    pl.appendChild(el('<div class="shop-item"><div class="si-top"><div class="shop-ic">'+IC[p.ic]+'</div>'+
      '<div class="shop-info"><div class="nm">'+p.n+(left>0?'<span class="lv">'+left+' с</span>':'')+'</div>'+
      '<div class="ds">'+p.d+'</div></div>'+
      '<button class="buy" data-potion="'+p.id+'">'+IC.coin+nf(p.cost())+'<small>выпить</small></button></div></div>'));
  }
  renderShopAfford();
}
function renderShopAfford(){
  $$('#shopList .shop-item').forEach(node=>{
    const it=SHOP_ITEM(node.dataset.id); if (!it) return;
    const b=node.querySelector('.buy'); if (!b) return;
    const n=Math.max(1,bulkCount(it));
    const cost=bulkCost(it,n);
    const cant=S.gold<cost || (shopBulk==='max'&&maxAfford(it)<1);
    b.disabled=cant; b.classList.toggle('cant',cant);
    b.innerHTML=IC.coin+nf(cost)+'<small>купить '+
      (shopBulk==='max'?('×'+maxAfford(it)):'×'+shopBulk)+'</small>';
  });
  $$('#potionList .buy').forEach(b=>{
    const p=POTIONS.find(x=>x.id===b.dataset.potion), cant=S.gold<p.cost();
    b.disabled=cant; b.classList.toggle('cant',cant);
  });
}
/* Покупка: n уровней сразу */
function buy(id,forced){
  const it=SHOP_ITEM(id); if (!it) return;
  const n=forced||Math.max(1,bulkCount(it));
  if (n<1) return;
  const cost=bulkCost(it,n);
  if (S.gold<cost) return;
  S.gold-=cost; S.u[id]+=n; S.purchases+=n;
  sfx.buy(); log('Куплено: <b>'+it.name+'</b> ×'+n+' (ур. '+S.u[id]+')','buy');
  contractTick('spend',cost);
  renderShop(); renderGold(); renderStats(); checkAch(); save(true);
}
/* Автопокупка: одно улучшение за тик, строго по приоритету */
function autoBuyTick(){
  for (const it of orderedShop()){
    if (!S.autoBuy[it.id]) continue;
    const c=upgCost(it,0);
    if (S.gold>=c){
      S.gold-=c; S.u[it.id]++; S.purchases++;
      contractTick('spend',c);
      renderShop(); renderGold(); renderStats();
      return;
    }
  }
}
function setBulk(v){ shopBulk=(v==='max'?'max':+v); renderShop(); }
function toggleAuto(){
  S.autoOn=!S.autoOn;
  log(S.autoOn?'Автопокупка включена.':'Автопокупка выключена.','info');
  hint('autobuy','Автопокупка','Отмеченные улучшения будут покупаться сами, сверху вниз по списку. Порядок меняется стрелками справа от карточки.');
  renderShop(); save(true);
}
function toggleAutoItem(id){ S.autoBuy[id]=!S.autoBuy[id]; renderShop(); save(true); }
function movePrio(id,dir){
  const i=S.shopOrder.indexOf(id); if (i<0) return;
  const j=i+dir;
  if (j<0||j>=S.shopOrder.length) return;
  const t=S.shopOrder[i]; S.shopOrder[i]=S.shopOrder[j]; S.shopOrder[j]=t;
  renderShop(); save(true);
}

const POTIONS = [
  {id:'dmg',n:'Кровавое Зелье',ic:'blood',d:'×2 ко всему урону на 60 секунд.',dur:60,cost:()=>Math.ceil(160*Math.pow(1.085,S.maxStage))},
  {id:'gold',n:'Золотой Настой',ic:'coin',d:'×2 к золоту на 60 секунд.',dur:60,cost:()=>Math.ceil(200*Math.pow(1.085,S.maxStage))},
  {id:'haste',n:'Пепельная Пыль',ic:'spark',d:'×2 к автоурону на 60 секунд.',dur:60,cost:()=>Math.ceil(180*Math.pow(1.085,S.maxStage))}
];
function buyPotion(id){
  const p=POTIONS.find(x=>x.id===id), c=p.cost();
  if (S.gold<c) return;
  S.gold-=c; S.buffs[id]=Math.min(600,(S.buffs[id]||0)+p.dur);
  sfx.potion(); log('Выпито: <b>'+p.n+'</b>.','buy');
  renderGold(); renderShop(); renderBuffs(); save(true);
}
