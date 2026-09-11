"use strict";
/* ============================================================
   CORE / AUDIO — синтез звука через Web Audio API
   ============================================================ */

let AC=null;
function audio(){ if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}
  if (AC&&AC.state==='suspended') AC.resume(); return AC; }
function tone(o){
  if (S.muted) return; const ctx=audio(); if(!ctx) return;
  const t0=ctx.currentTime+(o.delay||0), osc=ctx.createOscillator(), g=ctx.createGain();
  osc.type=o.type||'sine'; osc.frequency.setValueAtTime(o.f,t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1,o.f2),t0+o.t);
  g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(o.v||0.12,t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+o.t);
  osc.connect(g).connect(ctx.destination); osc.start(t0); osc.stop(t0+o.t+0.05);
}
const sfx = {
  hit:()=>tone({f:170,f2:70,t:.07,type:'square',v:.1}),
  crit:()=>{tone({f:540,f2:150,t:.14,type:'sawtooth',v:.14});tone({f:880,f2:300,t:.1,type:'triangle',v:.1});},
  auto:()=>tone({f:120,f2:90,t:.05,type:'square',v:.03}),
  death:()=>{tone({f:220,f2:35,t:.4,type:'sawtooth',v:.12});tone({f:110,f2:28,t:.5,type:'triangle',v:.08,delay:.05});},
  gold:()=>{tone({f:660,t:.06,type:'sine',v:.09});tone({f:990,t:.09,type:'sine',v:.09,delay:.06});},
  buy:()=>{tone({f:520,t:.07,type:'triangle',v:.11});tone({f:780,t:.1,type:'triangle',v:.1,delay:.07});},
  level:()=>[440,554,659,880].forEach((f,i)=>tone({f,t:.16,type:'sine',v:.11,delay:i*.08})),
  boss:()=>{tone({f:95,f2:42,t:.7,type:'sawtooth',v:.2});tone({f:63,f2:30,t:.9,type:'square',v:.12,delay:.1});},
  elite:()=>tone({f:300,f2:520,t:.3,type:'triangle',v:.12}),
  mark:()=>{tone({f:880,t:.12,type:'square',v:.1});tone({f:660,t:.14,type:'square',v:.1,delay:.13});tone({f:1100,t:.2,type:'sawtooth',v:.09,delay:.27});},
  ach:()=>{tone({f:990,t:.14,type:'sine',v:.1});tone({f:1320,t:.22,type:'sine',v:.1,delay:.1});},
  fail:()=>{tone({f:240,f2:110,t:.4,type:'sawtooth',v:.13});tone({f:180,f2:80,t:.5,type:'sawtooth',v:.1,delay:.08});},
  skill:()=>{tone({f:180,f2:700,t:.22,type:'sawtooth',v:.13});tone({f:1100,f2:400,t:.18,type:'triangle',v:.08,delay:.06});},
  ult:()=>{[70,90,120,180].forEach((f,i)=>tone({f,f2:f*3,t:.5,type:'sawtooth',v:.15,delay:i*.09}));
    tone({f:1500,f2:300,t:.9,type:'triangle',v:.1,delay:.3});},
  potion:()=>tone({f:400,f2:900,t:.25,type:'sine',v:.1}),
  forge:()=>{tone({f:150,f2:60,t:.16,type:'square',v:.15});tone({f:900,f2:400,t:.12,type:'triangle',v:.07,delay:.05});},
  drop:()=>{tone({f:700,t:.09,type:'triangle',v:.1});tone({f:1050,t:.12,type:'triangle',v:.09,delay:.08});tone({f:1400,t:.16,type:'sine',v:.08,delay:.16});},
  truth:()=>{[1320,1760,2200].forEach((f,i)=>tone({f,t:.35,type:'sine',v:.09,delay:i*.13}));},
  pet:()=>{tone({f:520,t:.12,type:'sine',v:.1});tone({f:780,t:.14,type:'sine',v:.09,delay:.1});tone({f:1170,t:.2,type:'triangle',v:.08,delay:.2});},
  weak:()=>tone({f:1200,f2:400,t:.16,type:'square',v:.11}),
  sig:()=>{tone({f:320,f2:90,t:.35,type:'sawtooth',v:.16});tone({f:640,f2:200,t:.25,type:'square',v:.08,delay:.04});},
  voice:()=>{tone({f:58,f2:44,t:1.6,type:'sine',v:.07});tone({f:87,f2:60,t:1.2,type:'triangle',v:.04,delay:.2});},
  prestige:()=>{[110,82,65,49].forEach((f,i)=>tone({f,f2:f/2,t:1.1,type:'sawtooth',v:.16,delay:i*.25}));
    tone({f:1200,f2:180,t:1.6,type:'triangle',v:.1,delay:.6});}
};
