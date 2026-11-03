// FIRST（一覧の1行目の番号）の世界へ行き、ROW 番目のステージを救出の旅から始める（無敵）
document.getElementById('btn-start').click(); await sl(800);
for (let k=0;k<4;k++){ const f=document.querySelector('.stage-row').textContent.trim(); if (f.startsWith(FIRST)) break; const n=parseInt(f); const b=document.getElementById(n>parseInt(FIRST)?'btn-world-back':'btn-warp'); if(!b) return 'nobtn '+f; b.click(); await sl(1500); for (let j=0;j<12 && !document.querySelector('.stage-row:not(.hidden)');j++){ await tap(187,400); } }
document.querySelectorAll('.stage-row')[ROW].click(); await sl(1500); await tap(); await sl(2500); BATTLE.debugInvincible=true; Battle.debug.skipRecon(); await sl(1500);
for (let i=0;i<3;i++){ await tap(187,300); await sl(900); }
await tap(187,380); await sl(600); await tap(187,400); await sl(2800); ev('pointerdown',187,560);
