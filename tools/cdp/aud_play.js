document.getElementById('btn-start').click(); await sl(800);
for (let k=0;k<4;k++){ const f=document.querySelector('.stage-row').textContent.trim(); if (f.startsWith(FIRST)) break; const n=parseInt(f); (n>parseInt(FIRST)?document.getElementById('btn-world-back'):document.getElementById('btn-warp')).click(); await sl(1500); for (let j=0;j<12 && !document.querySelector('.stage-row:not(.hidden)');j++){ await tap(187,400); } }
document.querySelectorAll('.stage-row')[ROW].click(); await sl(1500); await tap();
for (let i=0;i<60;i++){ await sl(100); window.__sample(); }
await sl(1000); BATTLE.debugInvincible=true; Battle.debug.skipRecon(); await sl(1500);
for (let i=0;i<3;i++){ await tap(187,300); await sl(900); }
await tap(187,380); await sl(600); await tap(187,400); await sl(2800); ev('pointerdown',187,560);
const t0=performance.now(); let px=187;
while (performance.now()-t0 < LIMIT) { await sl(100); window.__sample(); const S=Battle.peek(); if (!S) break;
  if (S.state==="clear" || S.state==="extraAsk") break;
  if (S.paused || S.tut || S.state==="sortie") { await tap(px,400); ev('pointerdown',px,560); continue; }
  let tg = S.odai ? (S.odai.mode==="order" ? S.enemies.find(e=>e.seqNo===S.odai.step && !e.num) : (S.enemies.find(e=>e.odaiReal) || S.enemies.find(e=>e.pattern==="odai"))) : S.enemies.filter(e=>e.y>0 && e.x>0 && e.x<375).sort((a,b)=>b.y-a.y)[0];
  const tx = tg ? Math.max(30,Math.min(345,tg.x)) : 187; px += Math.max(-40,Math.min(40,tx-px)); ev('pointermove',px,560); }
const out={}; for (const [k,s] of Object.entries(__st)) out[k]={peak:+s.pk.toFixed(3), rms:+(s.rms/s.n).toFixed(4), voicesMax:s.v, n:s.n};
return {dropped: Sound.dropped, log:window.__log.map(x=>x.join(' ')), st:out, actx: window.__actx && window.__actx.state};
