// ===== 扉（11/7-19）: 「発見の旅へ、出発！」「救出の旅へ、出発！」「クイズに、ちょうせん！」の画面 =====
// 3つとも同じ見た目。背景にその世界の背景の絵（発見の旅・救出の旅で流している絵）をうすく敷き、
// カード図鑑の見出しと同じデコ文字（ふわふわの太い文字に白いふち）を世界の色で大きく出す。
//   動き: 背景 → 0.3秒後に文字がドンと飛び出して光の粒がはじける → アイコンが下からぽん → 「タップで出発！」
//   押したら光がぱっと広がって場面に入る。10秒押さなければ自動で進む
// Door.draw(ctx, W, H, t, o) … 扉を1こま描く（t ＝ 扉が出てからの秒。o.go ＝ 押してからの秒、押す前は null）
// Door.mount(canvas, o, onGo) … DOM の画面（クイズの扉）で、描く・押す・10秒・効果音までまとめて動かす
//   o: { kind: "explore" | "rescue" | "quiz", world: 1〜3, stageId, stageName, sub: [説明の行], goX, goY }
const DOOR = {
  bgIn: 0.25,        // 背景が出るまで（秒）
  pop: 0.3,          // 文字が飛び出す時刻（秒）
  popDur: 0.35,      // 文字が飛び出す動きの長さ（秒）
  icon: 0.62,        // アイコンが出る時刻（文字のあと。秒）
  iconDur: 0.35,     // アイコンが下からぽんと出る動きの長さ（秒）
  tapShow: 1.0,      // 「タップで出発！」が出る時刻（秒）
  tapOk: 0.6,        // これより前のタップは受けつけない（前の画面のタップが続けて入らないように）
  auto: 10,          // 押さなければ自動で進む（秒）
  flash: 0.45,       // 押してから光が画面いっぱいに広がるまで（秒）。そのあと場面に入る
  bgAlpha: 0.42,     // 背景の絵の濃さ（うすく）
  textSize: 46,      // デコ文字の大きさ（px）。画面の幅に入らないときは小さくする
};
const Door = (() => {
  const COLORS = {   // 世界の色（11/7-9）: 文字の上の色・下の色・ふちの濃い色・うすい色
    1: { top: "#86b35e", main: "#6f9a4a", dark: "#3f5f2e", light: "#dcebc6" },
    2: { top: "#5e8bb8", main: "#4a729a", dark: "#2f4760", light: "#c6d8eb" },
    3: { top: "#9563b8", main: "#794a9a", dark: "#4c3360", light: "#dcc6eb" },
  };
  const TEXT = { explore: ["発見の旅へ、", "出発！"], rescue: ["救出の旅へ、", "出発！"], quiz: ["クイズに、", "ちょうせん！"] };
  const SE = { explore: "doorExplore", rescue: "doorRescue", quiz: "doorQuiz" };   // 発見はキラッ、救出はドン、クイズはジャーン（js/audio.js）
  const fam = () => (typeof FONT_FAMILY !== "undefined" ? FONT_FAMILY : '"Hiragino Maru Gothic ProN","Zen Maru Gothic",sans-serif');
  const font = s => `bold ${s}px ${fam()}`;
  const imgs = {};
  function bgImg(world) {
    const wd = (window.WORLDS || []).find(w => w.id === world), src = wd && wd.exploreBg;
    if (!src || typeof Image === "undefined") return null;
    const im = imgs[src] || (imgs[src] = Object.assign(new Image(), { src }));
    return im.complete && im.naturalWidth ? im : null;
  }
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const easeBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const clamp01 = k => Math.max(0, Math.min(1, k));
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // デコ文字（カード図鑑の見出しと同じ作り）: 世界の色のグラデーションに、ふわふわの毛羽の点。白い太いふち、外に濃いふちと影
  //   一度作った絵はとっておく（毎こま作り直さない）
  const decoCache = {};
  function deco(lines, size, world) {
    const key = lines.join("|") + size + "|" + world;
    if (decoCache[key]) return decoCache[key];
    if (typeof document === "undefined" || !document.createElement) return null;
    const col = COLORS[world] || COLORS[1], dpr = Math.min(3, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const lh = size * 1.18, pad = Math.ceil(size * 0.35);
    const m = document.createElement("canvas").getContext("2d"); m.font = font(size);
    const w = Math.ceil(Math.max(...lines.map(l => m.measureText(l).width)) + pad * 2), h = Math.ceil(lh * lines.length + pad * 2);
    const make = () => { const c = document.createElement("canvas"); c.width = w * dpr; c.height = h * dpr; const x = c.getContext("2d"); x.scale(dpr, dpr); x.font = font(size); x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round"; return [c, x]; };
    const ys = lines.map((_, i) => pad + lh * (i + 0.5));
    // 中の色（毛羽の点つき）
    const [fc, f] = make();
    const g = f.createLinearGradient(0, pad, 0, h - pad); g.addColorStop(0, col.top); g.addColorStop(0.5, col.main); g.addColorStop(1, col.dark);
    f.fillStyle = g; lines.forEach((l, i) => f.fillText(l, w / 2, ys[i]));
    f.globalCompositeOperation = "source-atop";
    let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < w * h / 26; i++) {   // ふわふわの毛羽（明るい点と暗い点。少なめ）
      f.fillStyle = rnd() < 0.4 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)";
      f.beginPath(); f.arc(rnd() * w, rnd() * h, 0.5 + rnd() * 0.9, 0, Math.PI * 2); f.fill();
    }
    const hl = f.createLinearGradient(0, 0, 0, h); hl.addColorStop(0, "rgba(255,255,255,0.14)"); hl.addColorStop(0.4, "rgba(255,255,255,0)");
    f.fillStyle = hl; f.fillRect(0, 0, w, h);   // 上のほうを少し明るく（つや）
    // ふちと影
    const [c, x] = make();
    x.shadowColor = "rgba(40,30,10,0.32)"; x.shadowBlur = size * 0.16; x.shadowOffsetY = size * 0.07;
    x.strokeStyle = col.dark; x.lineWidth = size * 0.36; lines.forEach((l, i) => x.strokeText(l, w / 2, ys[i]));
    x.shadowColor = "transparent";
    x.strokeStyle = "#ffffff"; x.lineWidth = size * 0.25; lines.forEach((l, i) => x.strokeText(l, w / 2, ys[i]));
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(fc, 0, 0);
    return (decoCache[key] = { c, w, h });
  }

  // アイコン: 発見の旅は双眼鏡、救出の旅は光の弾（世界2は爆弾、世界3は回る玉）、クイズはカードと「？」
  function drawIcon(ctx, kind, world, x, y, s, t) {
    ctx.save(); ctx.translate(x, y);
    if (kind === "explore") {   // 双眼鏡
      const r = s * 0.27;
      ctx.fillStyle = "#4a3a2a"; rr(ctx, -s * 0.12, -s * 0.2, s * 0.24, s * 0.26, s * 0.06); ctx.fill();   // まん中のつなぎ
      for (const sx of [-1, 1]) {
        const cx = sx * s * 0.29;
        ctx.fillStyle = "#5a4632"; rr(ctx, cx - r * 0.75, -s * 0.36, r * 1.5, s * 0.34, r * 0.3); ctx.fill();   // つつ
        ctx.fillStyle = "#3a2c1e"; ctx.beginPath(); ctx.arc(cx, s * 0.06, r + 4, 0, Math.PI * 2); ctx.fill();   // レンズの枠
        const lg = ctx.createRadialGradient(cx - r * 0.3, s * 0.06 - r * 0.3, 1, cx, s * 0.06, r);
        lg.addColorStop(0, "#e8f6ff"); lg.addColorStop(0.5, "#7fb8e0"); lg.addColorStop(1, "#2f5f8a");
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, s * 0.06, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.ellipse(cx - r * 0.35, s * 0.06 - r * 0.35, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === "rescue" && world === 2) {   // 爆弾（ゲームの中と同じ黄緑の丸い爆弾）
      const r = s * 0.3;
      ctx.fillStyle = "rgba(190,240,120,0.45)"; ctx.beginPath(); ctx.arc(0, s * 0.08, r + 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8fd63a"; ctx.strokeStyle = "#35501a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, s * 0.08, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#35501a"; ctx.fillRect(-r * 0.32, s * 0.08 - r - 5, r * 0.64, 7);
      ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, s * 0.08 - r - 5); ctx.quadraticCurveTo(r * 0.5, s * 0.08 - r - 16, r * 0.25, s * 0.08 - r - 24); ctx.stroke();
      const fx = r * 0.25, fy = s * 0.08 - r - 24, fl = 5 + Math.sin(t * 30) * 2;
      ctx.fillStyle = "#ffd23a"; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 6, q = i % 2 ? fl : fl * 2.2; ctx.lineTo(fx + Math.cos(a) * q, fy + Math.sin(a) * q); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.ellipse(-r * 0.35, s * 0.08 - r * 0.3, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
    } else if (kind === "rescue" && world === 3) {   // 回る玉（ゲームの中と同じ青い玉が2つ、まわりを回る）
      ctx.strokeStyle = "rgba(63,140,240,0.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,253,245,0.9)"; ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 2; i++) {
        const a = t * Math.PI + i * Math.PI, ox = Math.cos(a) * s * 0.34, oy = Math.sin(a) * s * 0.34, R = s * 0.2;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(63,140,240,0.95)"); g.addColorStop(1, "rgba(63,140,240,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3f8cf0"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ox, oy, s * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (kind === "rescue") {   // 光の弾（ゲームの中の味方の光: 青に白いふち、やわらかい光の輪）。3つ、上へ
      [[0, -s * 0.3, 0.12], [-s * 0.2, 0.02 * s, 0.1], [s * 0.2, 0.02 * s, 0.1], [0, s * 0.3, 0.12]].slice(0, 3).forEach(([bx, by, br], i) => {
        const yy = by + Math.sin(t * 5 + i) * 3, R = s * br;
        ctx.fillStyle = "rgba(170,210,255,0.5)"; ctx.beginPath(); ctx.ellipse(bx, yy, R * 1.8, R * 2.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3f8cf0"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(bx, yy, R, R * 1.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    } else {   // クイズ: カードと「？」
      ctx.rotate(-0.12);
      ctx.fillStyle = "rgba(0,0,0,0.15)"; rr(ctx, -s * 0.3 + 4, -s * 0.4 + 5, s * 0.6, s * 0.8, 10); ctx.fill();
      ctx.fillStyle = "#fffdf7"; ctx.strokeStyle = "#e0b03a"; ctx.lineWidth = 3; rr(ctx, -s * 0.3, -s * 0.4, s * 0.6, s * 0.8, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(224,176,58,0.4)"; ctx.lineWidth = 1.5; rr(ctx, -s * 0.24, -s * 0.34, s * 0.48, s * 0.68, 7); ctx.stroke();
      ctx.font = font(Math.round(s * 0.5)); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 6; ctx.strokeStyle = "#ffffff"; ctx.strokeText("？", 0, s * 0.02);
      ctx.fillStyle = (COLORS[world] || COLORS[1]).main; ctx.fillText("？", 0, s * 0.02);
      ctx.rotate(0.12);
      ctx.fillStyle = "#ffd23a";   // 小さなきらり
      for (const [sx, sy, q] of [[s * 0.38, -s * 0.36, 7], [-s * 0.4, s * 0.28, 5]]) {
        const p = q * (1 + Math.sin(t * 6) * 0.2);
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, d = i % 2 ? p * 0.35 : p; ctx.lineTo(sx + Math.cos(a) * d, sy + Math.sin(a) * d); } ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  function draw(ctx, W, H, t, o) {
    const col = COLORS[o.world] || COLORS[1];
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // 背景: 紙の地の色に、世界の背景の絵をうすく
    ctx.fillStyle = "#fbf6e9"; ctx.fillRect(0, 0, W, H);
    const img = bgImg(o.world), a0 = clamp01(t / DOOR.bgIn);
    if (img) {
      ctx.globalAlpha = a0 * DOOR.bgAlpha;
      const ih = img.naturalHeight * W / img.naturalWidth;
      for (let y = (H - ih) / 2 - Math.ceil((H - ih) / 2 / ih + 1) * ih; y < H; y += ih) ctx.drawImage(img, 0, y, W, ih + 1);
      ctx.globalAlpha = 1;
    }
    const vg = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, Math.max(W, H) * 0.7);   // まん中を明るく（文字が読みやすいように）
    vg.addColorStop(0, `rgba(255,253,245,${0.75 * a0})`); vg.addColorStop(1, "rgba(255,253,245,0)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const cy = H * 0.36;
    const kp = clamp01((t - DOOR.pop) / DOOR.popDur);
    if (t >= DOOR.pop) {
      // 光の粒がはじける（文字のまわり）
      const pt = t - DOOR.pop;
      if (pt < 1.1) {
        for (let i = 0; i < 28; i++) {
          const a = i / 28 * Math.PI * 2 + (i % 3) * 0.3, sp = 120 + (i * 37 % 90), d = easeOut(clamp01(pt / 0.9)) * sp + 40;
          const px = W / 2 + Math.cos(a) * d * 1.25, py = cy + Math.sin(a) * d * 0.8, al = 1 - clamp01(pt / 1.1), q = 3 + (i % 4);
          ctx.globalAlpha = al;
          ctx.fillStyle = i % 3 === 0 ? "#ffd23a" : i % 3 === 1 ? "#ffffff" : col.light;
          ctx.beginPath(); for (let j = 0; j < 8; j++) { const b = j / 8 * Math.PI * 2, r = j % 2 ? q * 0.4 : q; ctx.lineTo(px + Math.cos(b) * r, py + Math.sin(b) * r); } ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // ステージの番号と名前（見出しの上に小さく）
      ctx.globalAlpha = clamp01(kp * 2);
      ctx.font = font(15); ctx.fillStyle = col.dark;
      const lines = TEXT[o.kind] || TEXT.explore;
      let size = DOOR.textSize; const mc = ctx; mc.font = font(size);
      while (size > 26 && Math.max(...lines.map(l => mc.measureText(l).width)) + size * 0.7 > W - 24) { size -= 2; mc.font = font(size); }
      const th = size * 1.18 * lines.length;
      ctx.font = font(15);
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,253,245,0.9)"; ctx.lineJoin = "round";
      const lab = `ステージ${o.stageId}　${o.stageName || ""}`.trim();
      ctx.strokeText(lab, W / 2, cy - th / 2 - 26); ctx.fillText(lab, W / 2, cy - th / 2 - 26);
      // デコ文字: ドンと大きく飛び出す（大きく → 少しもどる）
      const sc = kp < 0.6 ? 0.25 + (1.22 - 0.25) * easeOut(kp / 0.6) : 1.22 - 0.22 * easeOut((kp - 0.6) / 0.4);
      ctx.globalAlpha = clamp01(kp * 3);
      const d = deco(lines, size, o.world);
      ctx.translate(W / 2, cy); ctx.scale(sc, sc);
      if (d) ctx.drawImage(d.c, -d.w / 2, -d.h / 2, d.w, d.h);
      else { ctx.font = font(size); ctx.fillStyle = col.main; lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.18)); }
      ctx.restore(); ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";   // 拡大をもどす（最初の save にもどして、もう一度 save）
    }
    // アイコン: 文字のあとに下からぽん
    const ki = clamp01((t - DOOR.icon) / DOOR.iconDur);
    if (ki > 0) {
      ctx.globalAlpha = clamp01(ki * 2.5);
      drawIcon(ctx, o.kind, o.world, W / 2, H * 0.6 + (1 - easeBack(ki)) * 70, Math.min(110, W * 0.28), t);
      ctx.globalAlpha = 1;
    }
    // 説明の行（旅の表紙にあった一言）
    if (o.sub && o.sub.length && t > DOOR.icon + 0.2) {
      ctx.globalAlpha = clamp01((t - DOOR.icon - 0.2) / 0.3);
      ctx.font = font(15); ctx.fillStyle = col.dark; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,253,245,0.92)"; ctx.lineJoin = "round";
      o.sub.forEach((l, i) => { const yy = H * 0.73 + i * 21; ctx.strokeText(l, W / 2, yy); ctx.fillText(l, W / 2, yy); });
      ctx.globalAlpha = 1;
    }
    // 「タップで出発！」（点めつ）
    if (t >= DOOR.tapShow && o.go == null) {
      ctx.globalAlpha = clamp01((t - DOOR.tapShow) / 0.3) * (0.6 + Math.sin(t * 4) * 0.4);
      ctx.font = font(24); ctx.lineWidth = 6; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
      const ty = H * 0.73 + (o.sub && o.sub.length ? o.sub.length * 21 + 30 : 20);
      ctx.strokeText(o.tap || "タップで出発！", W / 2, ty); ctx.fillStyle = col.main; ctx.fillText(o.tap || "タップで出発！", W / 2, ty);
      ctx.globalAlpha = 1;
    }
    // 押したら光がぱっと広がる
    if (o.go != null) {
      const k = clamp01(o.go / DOOR.flash), fx = o.goX == null ? W / 2 : o.goX, fy = o.goY == null ? H / 2 : o.goY;
      const R = easeOut(k) * Math.hypot(W, H) * 1.05;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(1, R));
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.7, `rgba(255,253,235,${0.85 + k * 0.15})`); g.addColorStop(1, `rgba(255,250,220,${k})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  // 扉の時間の進み（ゲームと DOM の画面で同じ決まり）: 文字が飛び出す瞬間に効果音、10秒で自動、押してから DOOR.flash 秒で出発
  //   st: { t, go, popped }。返り値 true ＝ 場面に入る
  function step(st, dt, kind, W, H) {
    st.t += dt;
    if (!st.popped && st.t >= DOOR.pop) { st.popped = true; if (typeof Sound !== "undefined") Sound.se(SE[kind]); }
    if (st.go == null && st.t >= DOOR.auto) { st.go = 0; st.goX = W / 2; st.goY = H / 2; }   // 10秒で自動
    else if (st.go != null) st.go += dt;
    return st.go != null && st.go >= DOOR.flash;
  }
  function tap(st, x, y) {
    if (st.go != null || st.t < DOOR.tapOk) return false;
    st.go = 0; st.goX = x; st.goY = y;
    if (typeof Sound !== "undefined") Sound.se("doorGo");
    return true;
  }

  // DOM の画面（クイズの扉）で動かす
  function mount(canvas, o, onGo) {
    const st = { t: 0, go: null, popped: false };
    let raf = 0, last = performance.now(), done = false;
    const fit = () => { const r = canvas.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1); canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); return { W: r.width, H: r.height, dpr }; };
    let sz = fit();
    const ctx = canvas.getContext("2d");
    const down = e => { const r = canvas.getBoundingClientRect(); tap(st, e.clientX - r.left, e.clientY - r.top); };
    canvas.addEventListener("pointerdown", down);
    const loop = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (canvas.width !== Math.round(canvas.getBoundingClientRect().width * sz.dpr)) sz = fit();
      const end = step(st, dt, o.kind, sz.W, sz.H);
      ctx.setTransform(sz.dpr, 0, 0, sz.dpr, 0, 0);
      draw(ctx, sz.W, sz.H, st.t, Object.assign({}, o, { go: st.go, goX: st.goX, goY: st.goY }));
      if (end) { stop(); onGo(); return; }
      raf = requestAnimationFrame(loop);
    };
    function stop() { if (done) return; done = true; cancelAnimationFrame(raf); canvas.removeEventListener("pointerdown", down); }
    raf = requestAnimationFrame(loop);
    return { stop, state: st };
  }
  return { draw, step, tap, mount, COLORS };
})();
