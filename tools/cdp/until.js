// 救出の旅を自動で進め、COND(S) が true になったところで止める
let px=187;
for (let i=0;i<3000;i++){ await sl(100); const S=Battle.peek(); if (!S) break;
  if (S.paused || S.tut || S.state==="sortie") { await tap(px,400); ev('pointerdown',px,560); continue; }
  if (COND(S)) { return 'ok'; }
  let tg = S.odai ? (S.odai.mode==="order" ? S.enemies.find(e=>e.seqNo===S.odai.step && !e.num) : (S.enemies.find(e=>e.odaiReal) || S.enemies.find(e=>e.pattern==="odai"))) : S.enemies.filter(e=>e.y>0 && e.x>0 && e.x<375).sort((a,b)=>b.y-a.y)[0];
  const tx = tg ? Math.max(30,Math.min(345,tg.x)) : 187; px += Math.max(-40,Math.min(40,tx-px)); ev('pointermove',px,560); }
return 'none';
