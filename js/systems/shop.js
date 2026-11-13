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
   ds:'+50% урона по боссам',ef:l=>'+'+(50*l)+'% боссам'},
  /* --- Мультипликативное ядро ---
     До 100-й глубины золото растёт примерно в 10^5 раз быстрее, чем урон от
     линейных улучшений (HP твари ~×1.16^depth), и забег упирался в стену,
     где золото есть, а потратить его в силу некуда. Эти три улучшения дают
     ×% к урону с ценой, растущей быстрее дохода, — классический idle-рост. */
  {id:'awaken',name:'Пробуждение Оков',base:5000,g:1.30,ic:'flame',tier:'blood',
   ds:'+12% ко всему урону за уровень (мультипликативно)',
   ef:l=>'+'+(12*l)+'% ко всему урону'},
  {id:'echo',name:'Эхо Бездны',base:40000,g:1.38,ic:'bolt',tier:'vio',
   ds:'+13% ко всему урону за уровень (мультипликативно)',
   ef:l=>'+'+(13*l)+'% ко всему урону'},
  {id:'crown',name:'Корона Глубин',base:4e5,g:1.46,ic:'shard',tier:'shard',
   ds:'+14% ко всему урону за уровень (мультипликативно)',
   ef:l=>'+'+(14*l)+'% ко всему урону'}
];
const SHOP_ITEM = id => SHOP.find(i=>i.id===id);
function orderedShop(){ return S.shopOrder.map(SHOP_ITEM).filter(Boolean); }

/* Цена одного следующего уровня.
   bonuses() — самая дорогая функция в игре, поэтому скидку считаем один раз
   за рендер (батч) и передаём сюда: `red` — уже готовый множитель.
   Раньше каждая цена внутри цикла вызывала bonuses() → до 3.4k вызовов
   на один renderShop() в режиме «Макс». */
function priceCtx(){
  return { red:clamp(bonuses().costRed,0,0.49), gold:S.gold };
}
function upgCost(it,offset,ctx){
  const red = ctx ? ctx.red : clamp(bonuses().costRed,0,0.49);
  const lv=S.u[it.id]+(offset||0);
  return Math.max(1,Math.ceil(it.base*Math.pow(it.g,lv)*(1-red)));
}
/* Цена пачки уровней.
   До 400 уровней считаем точно, уровень за уровнем (цена обязана совпадать
   с суммой реальных покупок), выше — по закрытой формуле геометрической
   прогрессии, иначе «Макс» на глубоких забегах крутил бы миллионы итераций. */
function bulkCost(it,n,ctx){
  const red = ctx ? ctx.red : clamp(bonuses().costRed,0,0.49);
  if (n<=0) return 0;
  if (n<=BULK_EXACT){ let c=0; for (let i=0;i<n;i++) c+=upgCost(it,i,ctx); return c; }
  const g=it.g, lv=S.u[it.id]||0;
  const sum = Math.abs(g-1)<1e-9 ? n : Math.pow(g,lv)*(Math.pow(g,n)-1)/(g-1);
  return Math.max(n, Math.ceil(it.base*sum*(1-red)));
}
const BULK_EXACT=400;
/* Сколько уровней потянет кошелёк — тоже закрытая формула, без цикла.
   n = floor( log(1 + gold*(g-1)/(base*red*(g^lv))) / log(g) ), затем
   уточняем на ±2 шага, чтобы совпасть с bulkCost() из-за округлений. */
function maxAfford(it,ctx){
  const red = ctx ? ctx.red : clamp(bonuses().costRed,0,0.49);
  const gold = ctx ? ctx.gold : S.gold;
  const g=it.g, lv=S.u[it.id]||0;
  const base=it.base*Math.pow(g,lv)*(1-red);
  if (gold<base) return 0;
  let n;
  if (Math.abs(g-1)<1e-9) n=Math.floor(gold/base);
  else n=Math.floor(Math.log(1+gold*(g-1)/base)/Math.log(g));
  if (!isFinite(n)||n<0) n=0;
  n=clamp(n,0,MAX_BULK);
  /* уточнение: сумма реальных цен не должна превышать золото, а n+1 — уже нет */
  while (n>0 && bulkCost(it,n,ctx)>gold) n--;
  while (n<MAX_BULK && bulkCost(it,n+1,ctx)<=gold) n++;
  return n;
}
/* Предел пачки за один клик. Раньше было 500 и «Макс» упирался в него
   молча, не давая потратить золото на высоких глубинах. */
const MAX_BULK=100000;
/* Сколько уровней покупаем при текущем режиме */
function bulkCount(it,ctx){
  if (shopBulk==='max') return Math.max(0,maxAfford(it,ctx));
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
  const ctx=priceCtx();
  arr.forEach((it,idx)=>{
    const lvl=S.u[it.id];
    const aff = shopBulk==='max' ? maxAfford(it,ctx) : shopBulk;
    const n=Math.max(1,aff);
    const cost=bulkCost(it,n,ctx);
    const canBuy=S.gold>=cost && aff>0;
    const label = '×'+aff;
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
  const ctx=priceCtx();           // один bonuses() на весь проход
  $$('#shopList .shop-item').forEach(node=>{
    const it=SHOP_ITEM(node.dataset.id); if (!it) return;
    const b=node.querySelector('.buy'); if (!b) return;
    const aff = shopBulk==='max' ? maxAfford(it,ctx) : shopBulk;
    const n=Math.max(1,aff);
    const cost=bulkCost(it,n,ctx);
    const cant=S.gold<cost || aff<1;
    b.disabled=cant; b.classList.toggle('cant',cant);
    b.innerHTML=IC.coin+nf(cost)+'<small>купить ×'+aff+'</small>';
  });
  $$('#potionList .buy').forEach(b=>{
    const p=POTIONS.find(x=>x.id===b.dataset.potion), cant=S.gold<p.cost();
    b.disabled=cant; b.classList.toggle('cant',cant);
  });
}
/* Покупка: n уровней сразу */
function buy(id,forced){
  const it=SHOP_ITEM(id); if (!it) return;
  const ctx=priceCtx();
  const n=forced||Math.max(1,bulkCount(it,ctx));
  if (n<1) return;
  const cost=bulkCost(it,n,ctx);
  if (S.gold<cost) return;
  S.gold-=cost; S.u[id]+=n; S.purchases+=n;
  if (typeof pulseBuy==='function') pulseBuy();
  sfx.buy(); log('Куплено: <b>'+it.name+'</b> ×'+n+' (ур. '+S.u[id]+')','buy');
  contractTick('spend',cost);
  renderShop(); renderGold(); renderStats(); checkAch(); save(true);
}
/* Автопокупка: одно улучшение за тик, строго по приоритету */
function autoBuyTick(){
  const ctx=priceCtx();
  for (const it of orderedShop()){
    if (!S.autoBuy[it.id]) continue;
    const c=upgCost(it,0,ctx);
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

//# sourceURL=js/systems/shop.js
