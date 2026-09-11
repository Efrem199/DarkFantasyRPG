"use strict";
/* ============================================================
   UI / MODALS — модальные окна: справочник ресурсов, сброс,
   оффлайн, класс, подкласс, сейв
   ============================================================ */

function openModal(html,closable){
  const m=$('#modal');
  m.innerHTML='<div class="modal-card">'+html+'</div>';
  m.dataset.closable=closable===false?'0':'1';
  m.classList.add('open');
}
function closeModal(){ $('#modal').classList.remove('open'); }
$('#modal').addEventListener('click',e=>{ if (e.target.id==='modal'&&$('#modal').dataset.closable!=='0') closeModal(); });

/* Короткий справочник по валютам */
function resourceModal(){
  const rows=Object.keys(RES).map(k=>{
    const r=RES[k], have=S.res[k]||0;
    return '<div class="res-row '+r.cls+'">'+
      '<div class="rr-ic">'+IC[r.ic]+'</div>'+
      '<div class="rr-main"><div class="rr-nm">'+r.n+'<span class="rr-have">'+nf(have)+'</span></div>'+
      '<div class="rr-line"><b>Откуда:</b> '+r.from+'</div>'+
      '<div class="rr-line"><b>Куда:</b> '+r.to+'</div></div></div>';
  }).join('');
  openModal('<div class="m-ic" style="color:var(--rtruth)">'+IC.help+'</div><h2>Чем платит тьма</h2>'+
    '<p>Золото и Осколки Проклятия видны в шапке. Остальное копится ниже — вот зачем оно нужно.</p>'+
    '<div class="res-list">'+
      '<div class="res-row"><div class="rr-ic" style="color:var(--gold)">'+IC.coin+'</div>'+
      '<div class="rr-main"><div class="rr-nm">Золото<span class="rr-have">'+nf(S.gold)+'</span></div>'+
      '<div class="rr-line"><b>Откуда:</b> с каждой твари, из продажи вещей и экспедиций.</div>'+
      '<div class="rr-line"><b>Куда:</b> Лавка Теней, зелья, эликсиры, прокачка младшей свиты.</div></div></div>'+
      '<div class="res-row"><div class="rr-ic" style="color:var(--shard)">'+IC.shard+'</div>'+
      '<div class="rr-main"><div class="rr-nm">Осколки Проклятия<span class="rr-have">'+nf(S.shards)+'</span></div>'+
      '<div class="rr-line"><b>Откуда:</b> Разрыв Оков, Заветы Бездны, Заказы Теней.</div>'+
      '<div class="rr-line"><b>Куда:</b> Древо Вечной Тьмы и старшая свита. Не сгорают никогда.</div></div></div>'+
      rows+
    '</div>'+
    '<div class="m-btns"><button class="btn" id="rClose">Понял</button></div>');
  $('#rClose').onclick=closeModal;
}

function askReset(){
  openModal('<div class="m-ic" style="color:var(--blood)">'+IC.reset+'</div><h2>Стереть себя из мира?</h2>'+
    '<p>Класс, уровни, осколки, оба древа, свита, реликвии, Истинное Имя и достижения исчезнут безвозвратно.</p>'+
    '<div class="m-btns"><button class="btn" id="mCancel">Остаться</button><button class="btn danger" id="mYes">Стереть всё</button></div>');
  $('#mCancel').onclick=closeModal;
  $('#mYes').onclick=()=>{ localStorage.removeItem(SAVE_KEY); OLD_KEYS.forEach(k=>localStorage.removeItem(k)); location.reload(); };
}
function offlineModal(gold,xp,secs,wh){
  openModal('<div class="m-ic">'+IC.moon+'</div><h2>Пока вас не было</h2>'+
    '<p>Ваша немая свита сражалась '+fmtTime(secs)+' без отдыха.<br>Добыто: <b>+'+nf(gold)+' золота</b>, <b>+'+nf(xp)+' опыта</b>'+
    (wh?' и <b>+'+wh+' Шёпота</b>':'')+'.</p>'+
    '<div class="m-btns"><button class="btn gold" id="mOk">Забрать добычу</button></div>');
  $('#mOk').onclick=()=>{closeModal(); sfx.gold();};
}
function classModal(){
  const cards=Object.entries(CLASSES).map(([id,c])=>
    '<div class="class-card" data-cls="'+id+'" style="border-color:'+c.col+'44">'+
    '<div class="ch"><div class="ci" style="color:'+c.col+'">'+IC[c.ic]+'</div><div class="cn" style="color:'+c.col+'">'+c.n+'</div></div>'+
    '<div class="cd">'+c.d+'</div><div class="cs">'+c.stats+'</div><div class="cx">'+c.rhythm+'</div>'+
    '<div class="cl">'+c.lore+'</div></div>').join('');
  openModal('<div class="m-ic">'+IC.chain+'</div><h2>Кем ты был до оков?</h2>'+
    '<p>Выбор нельзя отменить — до тех пор, пока ты не разорвёшь цепь.</p>'+
    '<div class="class-grid">'+cards+'</div>', false);
  $$('#modal [data-cls]').forEach(n=>n.onclick=()=>chooseClass(n.dataset.cls));
}
function chooseClass(id){
  S.cls=id; S.heroName=CLASSES[id].hero; S.stance=0;
  sfx.level(); closeModal();
  renderTitle(); renderStats(); renderTrees(); renderSkillBar(); renderStanceBar();
  log('Ты вспомнил, кем был: <b>'+CLASSES[id].n+'</b>.','lvl');
  save(true);
  setTimeout(()=>{
    openModal('<div class="m-ic" style="color:'+CLASSES[id].col+'">'+IC[CLASSES[id].ic]+'</div>'+
      '<h2>'+CLASSES[id].n+'</h2><p><i>'+CLASSES[id].lore+'</i></p><p>'+CLASSES[id].rhythm+'</p>'+
      '<div class="m-btns"><button class="btn gold" id="mGo">Войти во тьму</button></div>');
    $('#mGo').onclick=()=>{
      closeModal();
      hint('start','Первый удар','Бей тварь — кликом или пробелом. Руке хватает восьми ударов в секунду: быстрее она просто устанет.');
    };
  },350);
}
function subModal(){
  const list=subsFor(S.cls).map(([id,s])=>
    '<div class="class-card" data-sub="'+id+'"><div class="ch"><div class="ci" style="color:var(--gold)">'+IC[s.ic]+'</div>'+
    '<div class="cn" style="color:var(--gold)">'+s.n+'</div></div>'+
    '<div class="cd">'+s.d+'</div><div class="cx">'+s.sig+'</div><div class="cs">'+s.bonus+'</div></div>').join('');
  openModal('<div class="m-ic" style="color:var(--gold)">'+IC.crown+'</div><h2>Третий разрыв</h2>'+
    '<p>Три смерти научили тебя большему, чем вся жизнь. Выбери, во что ты превратишься — это изменит сам способ убивать.</p>'+
    '<div class="class-grid">'+list+'</div>', false);
  $$('#modal [data-sub]').forEach(n=>n.onclick=()=>{
    S.sub=n.dataset.sub; sfx.level(); closeModal();
    log('Ты стал: <b>'+SUBS[S.sub].n+'</b>. '+SUBS[S.sub].sig,'lvl');
    hint('sub','Сигнатура подкласса',SUBS[S.sub].sig+' Узел подкласса в древе «Путь» теперь раскрыт.');
    renderTitle(); renderStats(); renderTrees(); save(true);
  });
}
function saveModal(){
  const code=exportSave();
  openModal('<div class="m-ic">'+IC.save+'</div><h2>Печать сохранения</h2>'+
    '<p>Скопируйте строку, чтобы перенести прогресс. Вставьте чужую строку и нажмите «Впитать».</p>'+
    '<textarea class="save-box" id="saveBox" spellcheck="false">'+code+'</textarea>'+
    '<div class="m-btns"><button class="btn" id="sCopy">Скопировать</button>'+
    '<button class="btn sh" id="sLoad">Впитать</button><button class="btn" id="sClose">Закрыть</button></div>');
  $('#sClose').onclick=closeModal;
  $('#sCopy').onclick=()=>{ const b=$('#saveBox'); b.select(); try{document.execCommand('copy');}catch(e){}
    if (navigator.clipboard) navigator.clipboard.writeText(b.value).catch(()=>{});
    $('#sCopy').textContent='Скопировано'; };
  $('#sLoad').onclick=()=>{ if (importSave($('#saveBox').value.trim())) location.reload(); else $('#sLoad').textContent='Печать сломана'; };
}
