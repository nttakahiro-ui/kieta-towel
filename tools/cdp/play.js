// ステージを1回、救出の旅から最後まで自動で遊び、fps の最低値を返す（FIRST ＝ 一覧の1行目の番号、ROW ＝ 何番目）
document.getElementById('btn-start').click(); await sl(800);
for (let k=0;k<4;k++){ const f=document.querySelector('.stage-row').textContent.trim(); if (f.startsWith(FIRST)) break; const n=parseInt(f); (n>parseInt(FIRST)?document.getElementById('btn-world-back'):document.getElementById('btn-warp')).click(); await sl(1500); for (let j=0;j<12 && !document.querySelector('.stage-row:not(.hidden)');j++){ await tap(187,400); } }
const first = document.querySelector('.stage-row').textContent.trim().slice(0,3);
document.querySelectorAll('.stage-row')[ROW].click(); await sl(1500); await tap(); await sl(2500); BATTLE.debugInvincible=true; Battle.debug.skipRecon(); await sl(1500);
for (let i=0;i<3;i++){ await tap(187,300); await sl(900); }
await tap(187,380); await sl(600); await tap(187,400); await sl(2800); ev('pointerdown',187,560);
const t0=performance.now(); let px=187, samples=[];
while (performance.now()-t0 < 240000) { await sl(120); const S=Battle.peek(); if (!S) break;
  if (S.state==="clear" || S.state==="extraAsk") break;
  if (S.paused || S.tut || S.state==="sortie") { await tap(px,400); ev('pointerdown',px,560); continue; }
  let tg = S.odai ? (S.odai.mode==="order" ? S.enemies.find(e=>e.seqNo===S.odai.step && !e.num) : (S.enemies.find(e=>e.odaiReal) || S.enemies.find(e=>e.pattern==="odai"))) : S.enemies.filter(e=>e.y>0 && e.x>0 && e.x<375).sort((a,b)=>b.y-a.y)[0];
  const tx = tg ? Math.max(30,Math.min(345,tg.x)) : 187; px += Math.max(-40,Math.min(40,tx-px)); ev('pointermove',px,560);
  if (samples.length < 4000) samples.push(Math.round(Battle.fps().now)); }
const f=Battle.fps(); return {first, state:Battle.peek().state, sec:Math.round((performance.now()-t0)/1000), min:Math.round(f.min*10)/10, avg:Math.round(samples.filter(x=>x).reduce((a,b)=>a+b,0)/samples.filter(x=>x).length), dropped: Sound.dropped ? JSON.stringify(Sound.dropped) : "-"};
