"use strict";
/* ============================================================
   SYSTEMS / COMBAT — классы, стойки, ультиматив, формулы,
   враги, урон, убийство, усталость руки, игровой тик
   ============================================================ */

/* ---------------- Классы ---------------- */
const CLASSES = {
  knight:{ n:'Проклятый Рыцарь', ic:'sword', col:'#e5484d', hero:'Сир Морн, Давший Клятву',
    d:'Ржавый доспех, вросший в плоть. Каждый удар — эхо клятвы, которую он не сдержал.',
    stats:'Тяжёлый клик · средний DPS · низкий крит · +15% урона по боссам',
    rhythm:'Ритм: редкие, но сокрушительные удары рукой.',
    lore:'«Я поклялся защищать. Я не защитил. Теперь я бью, пока не сотрутся костяшки.»',
    cm:1.55, dm:0.85, critBase:3, critMul:2.2, apply(B){ B.bossMul*=1.15; } },
  seer:{ n:'Пепельный Провидец', ic:'eye', col:'#8b6cf0', hero:'Вейн, Читающий Пепел',
    d:'Глаза выжжены видениями. Пепел мёртвых шепчет ему имена ещё живых.',
    stats:'Высокий DPS · средний крит · слабый клик · +20% опыта, +10% золота',
    rhythm:'Ритм: свита убивает сама, ты лишь направляешь.',
    lore:'«Я видел последний рассвет. Он был серым, и он уже позади.»',
    cm:0.78, dm:1.75, critBase:6, critMul:2.5, apply(B){ B.xpMul*=1.2; B.goldMul*=1.1; } },
  reaper:{ n:'Теневой Жнец', ic:'scythe', col:'#6ad9ff', hero:'Безмолвная Кора',
    d:'Ни звука шагов, ни дыхания. Только чёрные перья там, где кто-то стоял.',
    stats:'Высокий крит ×3.2 · средний клик · слабый DPS · казнь раненых',
    rhythm:'Ритм: серии критов и мгновенные казни.',
    lore:'«Смерть не приходит с грохотом. Она просто оказывается рядом.»',
    cm:1.05, dm:0.7, critBase:16, critMul:3.2, apply(B){ B.exec+=0.10; } }
};
const SUBS = {
  ashthrone:{cls:'knight', n:'Рыцарь Пепельного Престола', ic:'flame',
    d:'Трон сгорел, но клятва престолу — нет.',
    sig:'СИГНАТУРА: каждый 7-й клик высвобождает Пепельный Взрыв на 8× урона клика.',
    bonus:'+30% урона клика',
    apply(B,k){ B.clickMul*=1+0.30*k; B.burst=true; B.burstMul=8*k; B.burstEvery=7; } },
  oathbreaker:{cls:'knight', n:'Клятвопреступник', ic:'blood',
    d:'Он разорвал слово — и обрёл свободу бить без правил.',
    sig:'СИГНАТУРА: каждый крит даёт стак Клятвопреступления (+4% урона, до 25, спадает за 8 с).',
    bonus:'+0.5 к множителю крита',
    apply(B,k){ B.oath=true; B.oathCap=25; B.oathPer=0.04*k; B.critMulAdd+=0.5*k; } },
  lastdawn:{cls:'seer', n:'Вестник Последнего Рассвета', ic:'spark',
    d:'Он несёт свет, который сжигает вестника первым.',
    sig:'СИГНАТУРА: каждые 5 секунд бьёт Волна Рассвета силой в 3 секунды вашего DPS.',
    bonus:'+40% автоурона',
    apply(B,k){ B.dpsMul*=1+0.40*k; B.wave=true; B.waveEvery=5; B.wavePower=3*k; } },
  deadnames:{cls:'seer', n:'Хранитель Мёртвых Имён', ic:'book',
    d:'Каждое имя, названное вслух, платит золотом.',
    sig:'СИГНАТУРА: каждое убийство даёт стак Имени (+2% золота и опыта, до 40). Сбрасывается при смене зоны.',
    bonus:'+25% золота',
    apply(B,k){ B.names=true; B.nameCap=40; B.namePer=0.02*k; B.goldMul*=1+0.25*k; } },
  silencereaper:{cls:'reaper', n:'Жнец Безмолвия', ic:'moon',
    d:'Тишина — его лезвие.',
    sig:'СИГНАТУРА: порог казни поднят до 25% HP, а каждая казнь даёт +20% крита на 5 секунд.',
    bonus:'+12% шанса казни, +10% крита',
    apply(B,k){ B.exec+=0.12*k; B.execThr+=0.13; B.execCrit=true; B.crit+=10*k; } },
  shadoweater:{cls:'reaper', n:'Пожиратель Теней', ic:'void',
    d:'Он ест тьму, что оставляют убитые.',
    sig:'СИГНАТУРА: окно комбо +1.8 с, предел комбо 100, и каждый стак вдвое ценнее.',
    bonus:'+30% ко всему урону',
    apply(B,k){ B.allMul*=1+0.30*k; B.comboCap=100; B.comboPow+=0.6*k; B.comboWindow+=1.8; } }
};
const subsFor = c => Object.entries(SUBS).filter(([id,s])=>s.cls===c);

/* ---------------- Стойки ---------------- */
const STANCES = {
  knight:[
    {n:'Стойка Клятвы', ic:'sword', d:'+40% урона клика, −30% автоурона.', apply(B){B.clickMul*=1.4;B.dpsMul*=0.7;}},
    {n:'Стойка Осады', ic:'shield', d:'+35% автоурона, −25% урона клика.', apply(B){B.dpsMul*=1.35;B.clickMul*=0.75;}},
    {n:'Стойка Вдовы', ic:'target', d:'+14% крита и +0.35 множителя, −18% всего урона.', apply(B){B.crit+=14;B.critMulAdd+=0.35;B.allMul*=0.82;}}
  ],
  seer:[
    {n:'Видение Крови', ic:'blood', d:'+40% урона клика, −30% автоурона.', apply(B){B.clickMul*=1.4;B.dpsMul*=0.7;}},
    {n:'Видение Пепла', ic:'flame', d:'+35% автоурона, −25% урона клика.', apply(B){B.dpsMul*=1.35;B.clickMul*=0.75;}},
    {n:'Видение Конца', ic:'eye', d:'+14% крита и +0.35 множителя, −18% всего урона.', apply(B){B.crit+=14;B.critMulAdd+=0.35;B.allMul*=0.82;}}
  ],
  reaper:[
    {n:'Хват Серпа', ic:'scythe', d:'+40% урона клика, −30% автоурона.', apply(B){B.clickMul*=1.4;B.dpsMul*=0.7;}},
    {n:'Полёт Перьев', ic:'feather', d:'+35% автоурона, −25% урона клика.', apply(B){B.dpsMul*=1.35;B.clickMul*=0.75;}},
    {n:'Немой Шаг', ic:'moon', d:'+14% крита и +0.35 множителя, −18% всего урона.', apply(B){B.crit+=14;B.critMulAdd+=0.35;B.allMul*=0.82;}}
  ]
};
const stanceList = () => S.cls ? STANCES[S.cls] : [];

/* ---------------- Ультиматив ---------------- */
const ULT = {
  knight:{id:'ult', n:'Последняя Клятва', ic:'crown', cd:180, key:'3',
    d:'Удар на 70× урона клика. Следующие 8 секунд весь урон удвоен.',
    lore:'Он произносит имя того, кого не спас. Мир на мгновение замолкает.'},
  seer:{id:'ult', n:'Пепел Всех Имён', ic:'crown', cd:180, key:'3',
    d:'Мгновенно наносит 60 секунд вашего автоурона и удваивает урон на 8 секунд.',
    lore:'Он выговаривает все имена сразу — и пепел падает разом со всех небес.'},
  reaper:{id:'ult', n:'Час Серпа', ic:'crown', cd:180, key:'3',
    d:'Казнит любого не-Владыку. Владыке срезает 30% максимума HP. 8 секунд гарантированных критов.',
    lore:'Стрелка доходит до верха, и всё, что живо, становится необязательным.'}
};
const ultReady = () => S.prestige>=1 && S.cls;

/* ---------------- Агрегатор бонусов ---------------- */
function bonuses(){
  const B = {clickMul:1,dpsMul:1,allMul:1,crit:0,critMulAdd:0,goldMul:1,xpMul:1,bossMul:1,
    costRed:0,offMul:1,offCap:6,exec:0,execThr:0.12,dropMul:1,rarBonus:0,shardMul:1,
    comboPow:1,comboCap:60,comboWindow:1.2,critCap:80,startStage:1,subPow:0,harvest:0,
    petSlots:0,expSlots:0,bloodMul:1,ashMul:1,whisMul:1,wellCut:0,markCut:0,
    burst:false,burstMul:0,burstEvery:7,oath:false,oathCap:0,oathPer:0,
    wave:false,waveEvery:5,wavePower:0,names:false,nameCap:0,namePer:0,execCrit:false};
  const c = CLASSES[S.cls];
  if (c) c.apply(B);
  if (S.cls==='reaper' && S.stage<=20) B.crit += 25;
  if (S.prestige>0){ B.allMul*=1+0.12*S.prestige; B.goldMul*=1+0.10*S.prestige; B.xpMul*=1+0.10*S.prestige; }
  for (const n of PTREE){ const l=pLv(n.id); if (l>0&&n.apply) n.apply(B,l); }
  const sc = SUBS[S.sub];
  if (sc) sc.apply(B, 1+B.subPow);
  for (const raw of allSkills()){ const l=skLv(raw.id); if (l<1) continue;
    const n=nodeData(raw); if (n.apply) n.apply(B,l); }
  const st = stanceList()[S.stance];
  if (st) st.apply(B);
  for (const k in S.equip){ const it=S.equip[k]; if (it) applyItem(B,it); }
  for (const id of S.active){ const p=PET(id), l=petLv(id); if (p&&l>0&&!petAway(id)) p.apply(B,l); }
  for (const id of S.relics){ const r=TR(id); if (r) r.apply(B); }
  for (const s of RSETS){ if (S.relics.length>=s.need) s.apply(B); }
  B.allMul *= 1 + bookBonus();
  B.allMul *= 1 + 0.08*S.sacrificed.length;
  B.allMul *= 1 + 0.03*S.ritualEdge;
  const tn = TRUE_NAMES.find(t=>t.id===S.trueName);
  if (tn) tn.apply(B);
  /* Правило зоны */
  const r = ZR();
  if (r.all) B.allMul*=r.all;
  if (r.click) B.clickMul*=r.click;
  if (r.dps) B.dpsMul*=r.dps;
  if (r.gold) B.goldMul*=r.gold;
  if (r.xp) B.xpMul*=r.xp;
  if (r.critMul) B.critMulAdd+=r.critMul;
  if (r.drop) B.dropMul*=r.drop;
  if (r.bloodMul) B.bloodMul*=r.bloodMul;
  if (r.comboFast) B.comboWindow/=r.comboFast;
  /* Разлом */
  if (riftOn()){ B.goldMul*=2.2; B.ashMul+=1; B.dropMul*=1.8; }
  if (S.buffs.dmg>0) B.allMul*=2;
  if (S.buffs.gold>0) B.goldMul*=2;
  if (S.buffs.haste>0) B.dpsMul*=2;
  if (S.buffs.click>0) B.clickMul*=2.5;
  if (S.buffs.dps>0) B.dpsMul*=2.2;
  if (S.buffs.all>0) B.allMul*=1.8;
  if (stormT>0) B.dpsMul*=3.5;
  if (ultBuffT>0) B.allMul*=2;
  const oil = OILS.find(o=>o.id===S.oil);
  if (oil && S.oilT>0 && oil.apply) oil.apply(B);
  if (S.ink==='rage' && S.inkT>0) B.actPow=2;
  const cu = CURSES.find(x=>x.id===S.curse);
  if (cu && S.curseT>0) cu.apply(B);
  if (B.oath && oathStacks>0) B.allMul *= 1+B.oathPer*oathStacks;
  if (B.names && nameStacks>0){ const m=1+B.namePer*nameStacks; B.goldMul*=m; B.xpMul*=m; }
  if (execCritT>0) B.crit += 20;
  if (oathBuffT>0) B.clickMul *= 2.5;
  return B;
}
function comboMul(){
  if (combo<=1) return 1;
  const B=bonuses();
  return 1 + Math.min(combo,B.comboCap)*0.012*B.comboPow;
}
function stats(){
  const B=bonuses(), u=S.u;
  const c=CLASSES[S.cls]||{cm:1,dm:1,critBase:5,critMul:2.5};
  const pm=1+0.10*u.power;
  return {
    B,
    click:(3+(S.lvl-1)*2+u.blade*3)*pm*c.cm*B.clickMul*B.allMul,
    dps:(S.lvl+u.servant*4)*pm*c.dm*B.dpsMul*B.allMul,
    crit:clamp(c.critBase+3*u.crit+B.crit,0,B.critCap),
    critMul:c.critMul+B.critMulAdd,
    goldMul:(1+0.25*u.greed)*B.goldMul,
    xpMul:B.xpMul, bossMul:(1+0.5*u.void)*B.bossMul,
    exec:B.exec, execThr:B.execThr
  };
}

/* ---------------- Кривая глубины ----------------
   Ступенчатое замедление: ранняя игра ощутимее, но на 120+
   рост смягчается, чтобы глубина 200+ оставалась проходимой. */
function depthCurve(s){
  if (s<=40) return Math.pow(1.16,s-1);
  const a=Math.pow(1.16,39);
  if (s<=120) return a*Math.pow(1.135,s-40);
  const b=a*Math.pow(1.135,80);
  return b*Math.pow(1.105,s-120);
}
const xpNeed = l => Math.floor(14*Math.pow(l,1.62))+10;
const hpFor = s => Math.ceil(14*depthCurve(s)+s*4);
const goldFor = s => Math.ceil((6+s*2.3)*depthCurve(s)*0.78);
const xpFor = s => Math.ceil(3+s*1.55);

/* ---------------- Враги ---------------- */
const FAM_NAMES = [
  ['Упырь','Могильный пожиратель','Гнилой скверн','Плотояд тьмы'],
  ['Костяной воин','Скелет-дозорный','Безгласный страж','Костяной пёс'],
  ['Кровопийца','Дитя ночи','Крылатый ужас','Нетопырь склепа'],
  ['Склепный ткач','Костяной паук','Вдова Тьмы','Гнездовой жнец'],
  ['Плачущая тень','Призрак утраты','Шёпот могилы','Дух проклятия'],
  ['Могильный голем','Каменный слуга','Страж обелиска','Глыбоход']
];
const FAM_LORE = [
  'Упыри не помнят, кем были. Они помнят только вкус. Их находят там, где кладбища подступают к дороге слишком близко, и где могильщики перестали считать.',
  'Кости не гниют — они ждут. Достаточно одного нашёптанного имени, чтобы скелет снова взял копьё и встал у ворот, которых больше нет уже триста лет.',
  'Они пьют не ради голода, а ради тишины: чужая кровь на мгновение заглушает то, что кричит у них внутри. Тишина держится недолго.',
  'Ткачи склепов плетут не паутину, а карту скорби: каждая нить — чей-то последний путь по коридорам катакомб. В центре сети всегда лежит то, что не смогло дойти.',
  'Тень плачет чужими слезами. Если подойти слишком близко, услышишь собственный голос, зовущий по имени — и поймёшь, что зовут не тебя, а того, кем ты был.',
  'Големы сложены из надгробий. Каждый удар о них — это удар по чьей-то могиле, и камень помнит всех, кто под ним лежал, и всех, кто приходил плакать.'
];
const BOSS_NAMES = ['Морвен, Страж Гробницы','Владыка Сплин','Костяная Иерархиня','Пожиратель Рассветов',
  'Каргул Трёх Глаз','Шах-Намет Гнилой','Ведьма Пепельного Круга','Барон Мертвечина','Хор Теней',
  'Архилич Валдримир','Князь Кровавой Мглы','Органист Бездны','Гнилая Матрона'];
const BOSS_LORE = [
  'Он сторожит гробницу, из которой давно всё вынесли. Ему не сказали. Он всё ещё считает шаги у входа и точит меч о собственный наплечник.',
  'Его тело — договор, подписанный семью домами. Все семь вымерли, а подпись держится: чернила были не из чернил.',
  'Она отпевает мёртвых на языке, который убивает живых. Хор её паствы состоит из тех, кто однажды дослушал до конца.',
  'Он ел рассветы, пока небо не разучилось светлеть. С тех пор в этих землях бывает только два времени: сумерки и то, что после.',
  'Третий глаз видит то, что будет. Первые два плачут от этого без остановки, и слёзы прожгли ему щёки до кости.',
  'Гниль — его облачение, и он носит её с достоинством короля. Придворные разложились раньше, но кланяться не перестали.',
  'Круг из пепла, круг из костей, круг из тех, кто пришёл раньше тебя. Она чертит четвёртый и оставляет в нём место.',
  'При жизни он был щедр. После смерти он раздаёт только болезни — но с той же широкой, гостеприимной улыбкой.',
  'Множество голосов, ни одного рта. Хор поёт, и стены сдаются первыми. Люди — вторыми.',
  'Он записал своё имя в тысяче книг, чтобы смерть не нашла оригинал. Она читает медленно, но уже дошла до девятисотой.',
  'Мгла идёт за ним, как плащ, и в этой мгле тонут армии. Ему не нужно оборачиваться, чтобы знать, сколько осталось.',
  'Он играет реквием на органе из позвоночников. Публика не расходится — публика вмонтирована в скамьи.',
  'Она родила катакомбы. Всё, что там ползает, — её дети, и она помнит каждого по хрусту.'
];
const MARK_NAMES = ['Меченый Голодом','Тот, За Кем Пришли','Носитель Чужого Лица','Беглец из Первой Ночи',
  'Отмеченный Пеплом','Последний Свидетель','Должник Бездны'];

function bodySVG(fam,c1,c2,dark){
  const eye='fill="'+c2+'"';
  switch(fam){
    case 0: return '<path d="M100 34 C 64 36 50 74 54 112 C 57 146 46 168 40 198 L 160 198 C 154 168 143 146 146 112 C 150 74 136 36 100 34 Z" fill="'+c1+'"/><path d="M56 118 C 40 130 30 150 26 178 M52 106 C 36 104 24 112 16 128 M144 118 C 160 130 170 150 174 178 M148 106 C 164 104 176 112 184 128" stroke="'+c1+'" stroke-width="13" fill="none" stroke-linecap="round"/><circle cx="82" cy="88" r="8" '+eye+'/><circle cx="118" cy="88" r="8" '+eye+'/><path d="M84 122 L 92 132 L 100 122 L 108 132 L 116 122" stroke="'+dark+'" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 62 L 60 42 M130 62 L 140 42" stroke="'+c1+'" stroke-width="9" stroke-linecap="round"/>';
    case 1: return '<circle cx="100" cy="72" r="34" fill="'+c1+'"/><circle cx="86" cy="68" r="9" fill="'+dark+'"/><circle cx="114" cy="68" r="9" fill="'+dark+'"/><circle cx="86" cy="68" r="4" '+eye+'/><circle cx="114" cy="68" r="4" '+eye+'/><path d="M92 92 L 108 92 L 104 100 L 96 100 Z" fill="'+dark+'"/><rect x="88" y="108" width="24" height="12" rx="5" fill="'+c1+'"/><path d="M62 128 C 80 120 120 120 138 128 M66 146 C 82 138 118 138 134 146 M72 164 C 86 156 114 156 128 164" stroke="'+c1+'" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M58 122 L 34 96 M142 122 L 166 96" stroke="'+c1+'" stroke-width="10" stroke-linecap="round"/><path d="M34 96 L 24 84 M34 96 L 26 106 M166 96 L 176 84 M166 96 L 174 106" stroke="'+c1+'" stroke-width="6" stroke-linecap="round"/>';
    case 2: return '<path d="M100 96 C 72 44 32 38 14 74 C 32 78 36 100 24 122 C 48 116 64 126 74 146 Z" fill="'+c1+'"/><path d="M100 96 C 128 44 168 38 186 74 C 168 78 164 100 176 122 C 152 116 136 126 126 146 Z" fill="'+c1+'"/><ellipse cx="100" cy="118" rx="19" ry="28" fill="'+c1+'"/><circle cx="100" cy="86" r="14" fill="'+c1+'"/><path d="M88 74 L 84 58 L 96 68 Z M112 74 L 116 58 L 104 68 Z" fill="'+c1+'"/><circle cx="94" cy="84" r="4.5" '+eye+'/><circle cx="106" cy="84" r="4.5" '+eye+'/><path d="M94 96 L 97 103 L 100 96 L 103 103 L 106 96" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    case 3: return '<path d="M82 110 C 66 98 56 84 50 58 M78 122 C 58 118 46 108 36 90 M78 134 C 58 138 44 150 34 168 M86 142 C 72 158 66 172 62 190 M118 110 C 134 98 144 84 150 58 M122 122 C 142 118 154 108 164 90 M122 134 C 142 138 156 150 166 168 M114 142 C 128 158 134 172 138 190" stroke="'+c1+'" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="100" cy="126" rx="30" ry="24" fill="'+c1+'"/><ellipse cx="100" cy="96" rx="16" ry="14" fill="'+c1+'"/><circle cx="92" cy="92" r="4" '+eye+'/><circle cx="108" cy="92" r="4" '+eye+'/><circle cx="97" cy="99" r="3" '+eye+'/><circle cx="103" cy="99" r="3" '+eye+'/><path d="M92 106 L 88 116 M108 106 L 112 116" stroke="'+c1+'" stroke-width="5" stroke-linecap="round"/>';
    case 4: return '<path d="M100 26 C 68 26 54 58 56 92 C 58 124 50 152 42 178 C 58 170 64 192 78 182 C 84 200 100 200 108 184 C 120 194 128 174 158 182 C 148 152 142 124 144 92 C 146 58 132 26 100 26 Z" fill="'+c1+'" opacity=".92"/><ellipse cx="84" cy="80" rx="7" ry="12" fill="'+dark+'"/><ellipse cx="116" cy="80" rx="7" ry="12" fill="'+dark+'"/><ellipse cx="84" cy="82" rx="3" ry="6" '+eye+'/><ellipse cx="116" cy="82" rx="3" ry="6" '+eye+'/><ellipse cx="100" cy="112" rx="8" ry="13" fill="'+dark+'"/>';
    default: return '<path d="M58 196 L 52 112 L 72 80 L 88 62 L 112 62 L 128 80 L 148 112 L 142 196 Z" fill="'+c1+'"/><path d="M52 112 L 30 96 L 26 130 L 50 140 Z M148 112 L 170 96 L 174 130 L 150 140 Z" fill="'+c1+'"/><path d="M84 52 L 116 52 L 112 66 L 88 66 Z" fill="'+c1+'"/><path d="M70 100 L 96 122 L 84 156 M130 96 L 110 128 L 126 170" stroke="'+dark+'" stroke-width="4" fill="none" opacity=".65"/><circle cx="100" cy="96" r="12" fill="'+dark+'"/><circle cx="100" cy="96" r="7" '+eye+'/><rect x="90" y="56" width="20" height="4" '+eye+'/>';
  }
}
function enemySVG(fam,colors,boss,elite,mark){
  let [c1,c2,dark]=colors;
  if (mark){c1='#4a3a12';c2='#ffd76a';dark='#1c1405';}
  else if (boss){c1='#4a1622';c2='#ff4d5e';dark='#1d060c';}
  else if (elite){c1='#3b2a52';c2='#c88cff';dark='#170f24';}
  let extra='';
  if (mark) extra='<circle cx="100" cy="118" r="86" fill="'+c2+'" opacity=".08"/><circle cx="100" cy="118" r="78" fill="none" stroke="'+c2+'" stroke-width="2" opacity=".5" stroke-dasharray="14 8"/><path d="M100 20v-16M100 216v16M14 118H-2M202 118h16" stroke="'+c2+'" stroke-width="3" stroke-linecap="round"/>';
  else if (boss) extra='<ellipse cx="100" cy="118" rx="88" ry="94" fill="'+c2+'" opacity=".10"/><ellipse cx="100" cy="118" rx="72" ry="78" fill="none" stroke="'+c2+'" stroke-width="1.5" opacity=".4" stroke-dasharray="3 7"/><path d="M74 34 L 82 12 L 94 30 L 100 8 L 106 30 L 118 12 L 126 34 L 118 42 L 82 42 Z" fill="#3d2f16" stroke="'+c2+'" stroke-width="2"/>';
  else if (elite) extra='<ellipse cx="100" cy="118" rx="78" ry="84" fill="'+c2+'" opacity=".08"/><circle cx="100" cy="118" r="70" fill="none" stroke="'+c2+'" stroke-width="1" opacity=".45" stroke-dasharray="2 9"/>';
  return '<svg viewBox="0 0 200 220" style="filter:drop-shadow(0 0 22px '+c2+'66) drop-shadow(0 14px 18px rgba(0,0,0,.6))">'+extra+bodySVG(fam,c1,c2,dark)+'</svg>';
}
function makeMob(stage){
  const riftBoss = riftOn() && S.rift.kills>=S.rift.need;
  const boss = !riftBoss && stage%10===0;
  const wantMark = !boss && !riftBoss && S.markPending;
  const elite = !boss && !wantMark && !riftBoss && stage>3 && Math.random()<0.10;
  const zi = zoneIndex(stage), Z = activeZones()[zi], r = Z.r||{};
  let name, fam;
  if (riftBoss){ name=S.rift.boss; fam=Math.floor(Math.random()*6); }
  else if (boss){
    const idx=Math.floor(stage/10)-1;
    name=BOSS_NAMES[idx%BOSS_NAMES.length];
    const tier=Math.floor(idx/BOSS_NAMES.length);
    if (tier>0) name+=' · '+roman(tier+1);
    fam=Math.floor(Math.random()*6);
  } else if (wantMark){
    name=pick(MARK_NAMES); fam=Math.floor(Math.random()*6);
  } else { fam=(stage*7+zi*3)%6; name=FAM_NAMES[fam][(stage+zi)%FAM_NAMES[fam].length]; }
  let mult = riftBoss?14:boss?10:elite?3.4:wantMark?7:1;
  if (boss && r.bossHp) mult *= r.bossHp;
  const hp = Math.ceil(hpFor(stage)*mult);
  return {stage, boss, elite, mark:wantMark, riftBoss, fam, name, hp, maxHp:hp,
    time: riftBoss?60:wantMark?45:(BOSS_TIME+(r.bossTime||0)),
    svg:enemySVG(fam,Z.c,boss||riftBoss,elite,wantMark),
    eye: riftBoss?'#c88cff':wantMark?'#ffd76a':boss?'#ff4d5e':elite?'#c88cff':Z.c[1],
    bossIdx: boss?(Math.floor(stage/10)-1)%BOSS_NAMES.length:-1,
    shield: r.shield?hp*r.shield:0, maxShield: r.shield?hp*r.shield:0, poisoned:false};
}

/* ---------------- Усталость руки (защита от автокликера) ----------------
   Человек бьёт 5–9 раз в секунду — предел не мешает.
   Выше 11 кликов/сек копится усталость и режет урон, выше 22 удары гаснут. */
const CPS_SOFT=11, CPS_HARD=22;
function clickGate(){
  const t=performance.now();
  clickStamps.push(t);
  while (clickStamps.length && t-clickStamps[0]>1000) clickStamps.shift();
  const cps=clickStamps.length;
  if (cps>CPS_HARD) return 0;                       /* явный автокликер — удар не проходит */
  if (cps>CPS_SOFT){
    fatigue=Math.min(1,fatigue+0.10);
    if (fatigue>0.25 && Math.random()<0.12) spawnFloat('РУКА УСТАЛА','poison');
  }
  return 1-0.85*fatigue;                            /* мягкий спад урона */
}

/* ---------------- Урон ---------------- */
function dealDamage(amount,isAuto){
  if (!mob||mobDead||amount<=0) return;
  const r=ZR();
  if (mob.shield>0){
    if (isAuto && r.dpsVsShield) amount*=r.dpsVsShield;
    const absorbed=Math.min(mob.shield,amount*0.5);
    mob.shield-=absorbed;
    amount-=absorbed;
    if (mob.shield<=0){ mob.shield=0; spawnFloat('ЩИТ РАЗБИТ','exec'); }
  }
  mob.hp-=amount; S.totalDmg+=amount;
  if (mob.hp<=0){ mob.hp=0; updateHP(); killMob(); return; }
  updateHP(); tryExecute();
}
function tryExecute(){
  if (!mob||mobDead) return;
  const st=stats();
  if (st.exec<=0) return;
  if (mob.hp/mob.maxHp<st.execThr && Math.random()<st.exec){
    spawnFloat('КАЗНЬ','exec'); sfx.crit(); arenaShake();
    if (st.B.execCrit) execCritT=5;
    addRes('ash',1,true);
    mob.hp=0; updateHP(); killMob();
  }
}
function bumpCombo(){
  const B=bonuses();
  combo++; comboT=B.comboWindow;
  $('#comboWrap').classList.add('on');
  $('#comboTxt').textContent='×'+comboMul().toFixed(2)+' · '+combo;
  $('#comboBar').style.transform='scaleX(1)';
  if (combo>=10) hint('combo','Комбо','Быстрые удары складываются в комбо — множитель растёт, пока ты не остановишься. Пауза обрывает цепь.');
}
function clickAttack(weak){
  if (!mob||mobDead) return;
  const gate=clickGate();
  if (gate<=0) return;
  const st=stats(), B=st.B;
  bumpCombo();
  let crit=Math.random()*100<st.crit;
  if (stepCharges>0){ crit=true; stepCharges--; }
  if (weak) crit=true;
  let dmg=st.click*comboMul()*(crit?st.critMul:1)*gate;
  if (weak) dmg*=3;
  if (mob.boss) dmg*=st.bossMul;
  S.clicks++;
  if (crit){ S.crits++; contractTick('crit',1); if (B.oath){ oathStacks=Math.min(B.oathCap,oathStacks+1); oathT=8; } }
  if (!mob.poisoned && ZR().poison) mob.poisoned=true;
  const btn=$('#mob');
  btn.classList.remove('hit','flash'); void btn.offsetWidth; btn.classList.add('hit','flash');
  setTimeout(()=>btn.classList.remove('flash'),90);
  spawnFloat((weak?'СЛАБОЕ МЕСТО ':(crit?'КРИТ ':''))+nf(dmg), crit?'crit':'');
  if (crit) arenaShake();
  sfx[crit?'crit':'hit']();
  dealDamage(dmg,false);
  if (B.burst && mob && !mobDead){
    knightClicks++;
    if (knightClicks>=B.burstEvery){
      knightClicks=0;
      let bd=st.click*B.burstMul*comboMul()*gate;
      if (mob.boss) bd*=st.bossMul;
      spawnFloat('ПЕПЕЛЬНЫЙ ВЗРЫВ<br>'+nf(bd),'sig'); sfx.sig(); arenaShake();
      dealDamage(bd,false);
    }
  }
}
function killMob(){
  mobDead=true; hideWeak();
  const st=stats(), B=st.B, r=ZR();
  const mult = mob.riftBoss?14:mob.boss?8:mob.elite?4:mob.mark?9:1;
  let g = Math.ceil(goldFor(mob.stage)*mult*st.goldMul);
  if (r.noGold) g=0;
  const x = Math.ceil(xpFor(mob.stage)*mult*st.xpMul);
  if (g>0){ S.gold+=g; S.totalGold+=g; }
  S.kills++;
  if (mob.boss) S.bosses++;
  if (mob.elite) S.elites++;
  if (mob.mark){ S.marks++; S.markPending=false; }
  S.maxStage=Math.max(S.maxStage,mob.stage);
  S.runMax=Math.max(S.runMax,mob.stage);
  if (B.names) nameStacks=Math.min(B.nameCap,nameStacks+1);
  /* Ресурсы */
  if (mob.boss) addRes('blood', 2+Math.floor(mob.stage/12), true);
  if (mob.elite) addRes('ash', 3+Math.floor(mob.stage/25), true);
  if (mob.mark){ addRes('blood',4+Math.floor(mob.stage/15),true); addRes('ash',10,true); }
  if (r.ashKill) addRes('ash', r.ashKill, true);
  if (r.whisper10 && S.kills%10===0) addRes('whisper',1,true);
  const oil=OILS.find(o=>o.id===S.oil);
  if (oil && S.oilT>0 && oil.id==='vamp') addRes('ash',1,true);
  if (mob.boss && mob.stage>=100 && Math.random()<0.06) addRes('truth',1);
  if (mob.mark && Math.random()<0.12) addRes('truth',1);
  $('#mob').classList.add('dying');
  soulBurst(mob.eye,B.harvest);
  if (g>0) spawnFloat('+'+nf(g)+' '+IC.coin,'gold');
  spawnFloat('+'+nf(x)+' опыта','xpg');
  coinFly(); sfx.death(); setTimeout(sfx.gold,220);
  log((mob.riftBoss?'<b>'+esc(mob.name)+'</b> сражён — разлом схлопывается! ':
    mob.boss?'<b>'+esc(mob.name)+'</b> повержен! ':mob.mark?'Меченый «'+esc(mob.name)+'» настигнут! ':
    mob.elite?'Элита «'+esc(mob.name)+'» пала. ':esc(mob.name)+' убит. ')+(g>0?'+'+nf(g)+' золота':'Золота здесь нет.'),
    mob.boss||mob.mark||mob.riftBoss?'boss':'kill');
  if (mob.boss){ addCodexBoss(mob.bossIdx); trelicRoll(); }
  else if (!mob.riftBoss) addCodexFam(mob.fam);
  /* Добыча */
  if (mob.riftBoss){
    dropLoot(mob.stage,true,false,true,3);
    addRes('blood',8+Math.floor(mob.stage/10),true);
    addRes('ash',40,true);
    if (Math.random()<0.25) addRes('truth',1);
    closeRift(true);
  } else {
    const chance=(mob.boss?0.75:mob.elite?0.22:mob.mark?1:0.012)*B.dropMul;
    if (Math.random()<chance) dropLoot(mob.stage,mob.boss,mob.elite,mob.mark);
    if (mob.boss && Math.random()<0.3) dropLoot(mob.stage,true,false,false);
    if (riftOn()) S.rift.kills++;
  }
  petDropRoll(mob.boss,mob.elite);
  contractTick('kill',1);
  if (mob.boss) contractTick('boss',1);
  if (mob.elite) contractTick('elite',1);
  if (S.kills===1) hint('firstBlood','Первая кровь','Золото падает с каждой твари. В <b>Лавке</b> оно превращается в силу.');
  if (mob.elite) hint('elite','Элита','Элитные твари носят фиолетовую ауру: втрое живучее, вчетверо щедрее и оставляют <b>Пепел Душ</b>.');
  if (mob.boss) hint('blood','Кровь Владык','С Владык капает <b>Кровь Владык</b> — она нужна горну: перековка, проклятие вещей и тяжёлые ритуалы.');
  gainXP(x);
  /* Режим глубины: «фарм» держит текущую, «глубже» ведёт вниз */
  S.stage = (S.mode==='farm') ? mob.stage : mob.stage+1;
  checkAch(); checkPets(); renderGold(); renderShopAfford(); renderPrestCard(); renderTabBadges();
  setTimeout(spawnMob,620);
  save(true);
}
function gainXP(n){
  S.xp+=n;
  let need=xpNeed(S.lvl);
  while (S.xp>=need){
    S.xp-=need; S.lvl++;
    if (S.lvl%2===0) S.sp++;
    need=xpNeed(S.lvl);
    onLevelUp();
  }
  renderXP();
}
function onLevelUp(){
  sfx.level();
  const got=S.lvl%2===0;
  log('Герой достиг <b>'+S.lvl+'</b> уровня.'+(got?' Получено очко навыка.':''),'lvl');
  $('#lvlBannerSub').textContent=got?'Уровень '+S.lvl+' · +1 очко навыка':'Уровень '+S.lvl+' · сила растёт';
  const b=$('#lvlBanner'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  if (got) hint('skills','Путь Теней','За каждые два уровня — очко. Во вкладке <b>Путь</b> круглые узлы дают активные умения прямо на арене.');
  renderStats(); renderShopAfford(); renderTrees(); renderTabBadges(); renderTitle(); checkPets();
}
function spawnMob(){
  const prevZone=lastZone;
  mob=makeMob(S.stage);
  mobDead=false;
  lastZone=zoneIndex(S.stage);
  if (lastZone!==prevZone){
    if (nameStacks>0) nameStacks=0;
    if (prevZone>=0) zoneBanner();
  }
  const btn=$('#mob'); btn.classList.remove('dying');
  $('#mobInner').innerHTML=mob.svg;
  const tag = mob.riftBoss?'<span class="tag mark-tag">РАЗЛОМ</span>':
    mob.boss?'<span class="tag boss-tag">ВЛАДЫКА</span>':
    mob.mark?'<span class="tag mark-tag">МЕТКА</span>':
    mob.elite?'<span class="tag elite-tag">ЭЛИТА</span>':'';
  $('#mobName').innerHTML=esc(mob.name)+tag;
  $('#zoneName').textContent=riftOn()?('Разлом · '+S.rift.name):zoneName(mob.stage);
  $('#depthVal').textContent=mob.stage;
  const veil=$('#bossVeil');
  veil.classList.toggle('on',mob.boss||mob.riftBoss);
  veil.classList.toggle('elite',mob.elite);
  veil.classList.toggle('marked',mob.mark);
  $('#bossTimerWrap').style.display=(mob.boss||mob.mark||mob.riftBoss)?'block':'none';
  if (mob.riftBoss){ sfx.boss(); arenaShake(); log('Из разлома выходит <b>'+esc(mob.name)+'</b>. 60 секунд.','boss'); }
  else if (mob.boss){
    sfx.boss(); arenaShake();
    log('Из глубин явился <b>'+esc(mob.name)+'</b>. У вас '+Math.round(mob.time)+' секунд.','boss');
    hint('boss','Владыка','Каждая десятая глубина — Владыка. Не успеешь за отведённое время — тебя отбросит назад.');
  } else if (mob.mark){
    sfx.mark(); arenaShake();
    log('<b>'+esc(mob.name)+'</b> отзывается на Метку. 45 секунд.','boss');
  } else if (mob.elite) sfx.elite();
  $('#hpGhost').classList.add('snap'); updateHP();
  requestAnimationFrame(()=>$('#hpGhost').classList.remove('snap'));
  weakT=3+Math.random()*4; hideWeak();
  renderChips(); renderModeChip();
}
function bossFail(){
  if (mob.mark){
    log('Меченый ускользнул в темноту. Метка погасла.','boss');
    S.markPending=false; sfx.fail(); spawnMob(); return;
  }
  if (mob.riftBoss){
    log('Разлом закрылся сам. Хозяин остался внутри.','boss');
    sfx.fail(); closeRift(false); spawnMob(); return;
  }
  log('<b>'+esc(mob.name)+'</b> отбил натиск. Тьма отбрасывает вас назад.','boss');
  sfx.fail(); arenaShake();
  if (S.mode!=='farm') S.stage=Math.max(1,mob.stage-1);
  spawnMob();
}
function showWeak(){
  if (!mob||mobDead||ZR().noWeak) return;
  const m=$('#mob').getBoundingClientRect(), a=$('#arena').getBoundingClientRect(), w=$('#weak');
  w.style.left=(m.left-a.left+m.width*(0.28+Math.random()*0.44))+'px';
  w.style.top=(m.top-a.top+m.height*(0.28+Math.random()*0.4))+'px';
  w.innerHTML=IC.target; w.classList.add('on'); weakActive=true; weakLife=2.6; sfx.weak();
  hint('weak','Слабое место','Красная метка держится пару секунд. Удар по ней — гарантированный крит тройной силы и горсть золота.');
}
function hideWeak(){ weakActive=false; $('#weak').classList.remove('on'); }

/* ---------------- Игровой тик ---------------- */
let lastTick=performance.now(), saveTimer=0, statTimer=0;
function gameTick(){
  const t=performance.now();
  let dt=(t-lastTick)/1000; lastTick=t;
  if (dt>5) dt=5;
  S.playtime+=dt;
  if (fatigue>0) fatigue=Math.max(0,fatigue-dt*0.4);
  if (comboT>0){
    comboT-=(oathBuffT>0?0:dt);
    const B=bonuses();
    $('#comboBar').style.transform='scaleX('+clamp(comboT/B.comboWindow,0,1)+')';
    if (comboT<=0){ combo=0; $('#comboWrap').classList.remove('on'); }
  }
  let ch=false;
  for (const k in S.buffs){ if (S.buffs[k]>0){ S.buffs[k]=Math.max(0,S.buffs[k]-dt); ch=true; } }
  if (S.oilT>0){ S.oilT=Math.max(0,S.oilT-dt); if(S.oilT<=0)S.oil=null; ch=true; }
  if (S.inkT>0){ S.inkT=Math.max(0,S.inkT-dt); if(S.inkT<=0)S.ink=null; ch=true; }
  if (S.curseT>0){ S.curseT=Math.max(0,S.curseT-dt); if(S.curseT<=0)S.curse=null; ch=true; }
  if (stormT>0){ stormT=Math.max(0,stormT-dt); ch=true; }
  if (ultBuffT>0){ ultBuffT=Math.max(0,ultBuffT-dt); ch=true; }
  if (oathT>0){ oathT=Math.max(0,oathT-dt); if (oathT<=0) oathStacks=0; ch=true; }
  if (execCritT>0){ execCritT=Math.max(0,execCritT-dt); ch=true; }
  if (oathBuffT>0){ oathBuffT=Math.max(0,oathBuffT-dt); ch=true; }
  for (const k in cd){ if (cd[k]>0) cd[k]=Math.max(0,cd[k]-dt); }
  const st=stats(), B=st.B, r=ZR();
  if (st.dps>0 && mob && !mobDead){
    let d=st.dps*dt;
    if (mob.boss) d*=st.bossMul;
    autoAcc+=d; dealDamage(d,true); autoTimer+=dt;
    if (autoTimer>0.9 && autoAcc>0.5){
      spawnFloat(nf(autoAcc),'auto'); autoAcc=0; autoTimer=0;
      if (Math.random()<.22) sfx.auto();
    }
  }
  if (mob && !mobDead){
    let dot=0;
    if (r.poison && mob.poisoned) dot+=mob.maxHp*r.poison*dt;
    const oil=OILS.find(o=>o.id===S.oil);
    if (oil && S.oilT>0 && oil.bleed) dot+=mob.maxHp*oil.bleed*dt;
    if (dot>0){
      poisonT+=dt;
      dealDamage(dot,true);
      if (poisonT>1.2){ poisonT=0; spawnFloat(nf(dot/dt)+'/с','poison'); }
    }
  }
  if (B.wave && mob && !mobDead && st.dps>0){
    waveT+=dt;
    if (waveT>=B.waveEvery){
      waveT=0;
      let wd=st.dps*B.wavePower;
      if (mob.boss) wd*=st.bossMul;
      spawnFloat('ВОЛНА РАССВЕТА<br>'+nf(wd),'sig'); sfx.sig();
      dealDamage(wd,true);
    }
  }
  if (S.active.length){
    petT-=dt;
    if (petT<=0){ petT=9+Math.random()*6; petAction(); }
  }
  if (mob && !mobDead){
    if (weakActive){ weakLife-=dt; if (weakLife<=0) hideWeak(); }
    else { weakT-=dt; if (weakT<=0){ weakT=7+Math.random()*9; if (Math.random()<0.55) showWeak(); } }
  }
  if (mob && (mob.boss||mob.mark||mob.riftBoss) && !mobDead){
    const tot = mob.riftBoss?60:mob.mark?45:(BOSS_TIME+(r.bossTime||0));
    mob.time-=dt;
    $('#bossTimer').style.width=clamp(mob.time/tot,0,1)*100+'%';
    $('#bossTime').textContent=Math.max(0,Math.ceil(mob.time))+'с';
    if (mob.time<=0) bossFail();
  }
  if (!S.markPending && now()>S.markAt && S.maxStage>=12){
    S.markPending=true;
    S.markAt=now()+ Math.round((360+Math.random()*420)*1000*(1-clamp(B.markCut,0,0.6)));
    log('Метка легла на кого-то в глубине. Он придёт следующим.','boss');
    hint('mark','Охота по Метке','Время от времени тьма помечает добычу. Меченый живучее элиты, даёт Кровь, Пепел, гарантированную вещь и шанс на Осколок Истины. У тебя 45 секунд.');
  }
  /* Разлом закрывается по истечении срока */
  if (riftOn() && S.rift.until<now()){ closeRift(false); }
  voiceT-=dt;
  if (voiceT<=0){ voiceT=200+Math.random()*280; if (Math.random()<0.55) voiceOfAbyss(); }
  checkExpeditions();
  /* Автопокупка — раз в секунду, одно улучшение */
  autoTimerShop+=dt;
  if (S.autoOn && autoTimerShop>1){ autoTimerShop=0; autoBuyTick(); }
  statTimer+=dt; saveTimer+=dt;
  if (statTimer>0.4){ statTimer=0; renderStats(); renderGold(); renderShopAfford(); renderSkillBar(); renderBuffs(); }
  else if (ch){ renderBuffs(); renderSkillBar(); }
  if (saveTimer>5){ saveTimer=0; save(true); }
}
