// レシピブック（10/25-4）: 12色の宝石が時計の文字盤のようにならぶ円い台座。仮の図形（SVG）で描く
//   ステージ1がいちばん上で、時計回りに12まで。世界ごとに4個ずつのかたまり
//   ステージのカードが10枚そろうと、そのステージの宝石が光る。光った数が多いほど台座全体が明るくなる
//   宝石の色は data/stages.js の gem 欄。宝石の絵は下の GEM_ART だけを書きかえれば変わる（本番で制作担当者の絵に差しかえる）
//   使う場面: 目的の画面（空の台座）、レシピ完成の画面（宝石がはまる演出）、ステージ一覧の「レシピブック」、12個そろったときの画面

// ===== 宝石の絵（ここだけ書きかえれば、宝石の見た目が変わる） =====
// color: 宝石の色、lit: 光っているか。(0, 0) を中心に、半径およそ size の大きさで描く SVG の文字を返す
// 画像にするときの例: return `<image href="assets/gem_${stageId}.png" x="${-size}" y="${-size}" width="${size * 2}" height="${size * 2}" opacity="${lit ? 1 : 0.25}"/>`;
const GEM_ART = (color, lit, size, stageId) => {
  const s = size;
  // ひし形の宝石（上のカット面つき）
  const outer = `0,${-s} ${s * 0.86},${-s * 0.25} ${s * 0.55},${s * 0.85} ${-s * 0.55},${s * 0.85} ${-s * 0.86},${-s * 0.25}`;
  const table = `${-s * 0.42},${-s * 0.22} 0,${-s * 0.62} ${s * 0.42},${-s * 0.22} ${s * 0.25},${s * 0.3} ${-s * 0.25},${s * 0.3}`;
  if (!lit) return `<polygon points="${outer}" fill="rgba(255,255,255,0.35)" stroke="#a9a69a" stroke-width="2" stroke-dasharray="4 3"/>`;
  return `<polygon points="${outer}" fill="${color}" stroke="#ffffff" stroke-width="2"/>` +
         `<polygon points="${table}" fill="rgba(255,255,255,0.35)"/>` +
         `<polygon points="${-s * 0.55},${-s * 0.55} ${-s * 0.25},${-s * 0.62} ${-s * 0.45},${-s * 0.2}" fill="rgba(255,255,255,0.8)"/>`;
};

const RecipeBook = (() => {
  const VB = 360, C = VB / 2, R = 122;   // 台座の大きさ（SVG の中の単位）、宝石のならぶ円の半径
  const stages = () => (window.STAGES || []).slice().sort((a, b) => a.id - b.id).slice(0, 12);
  const angle = i => (-90 + i * 30) * Math.PI / 180;   // i = 0 がいちばん上（ステージ1）。時計回り

  // ステージの宝石が光っているか（そのステージのカードが10枚そろっているか）
  function litIds(cards) {
    const words = window.WORDS || [];
    return new Set(stages().filter(s => { const ws = words.filter(w => w.stage === s.id); return ws.length && ws.every(w => cards[w.id]); }).map(s => s.id));
  }

  // el に台座を描く。o: { lit: Set（光っている stage id）, drop: 宝石がはまる演出をする stage id, onTap(stageId), small: 小さい台座（目的の画面） }
  function render(el, o) {
    const lit = o.lit || new Set(), k = lit.size / 12;
    const list = stages();
    let gems = "";
    list.forEach((s, i) => {
      const x = C + Math.cos(angle(i)) * R, y = C + Math.sin(angle(i)) * R, on = lit.has(s.id) || o.drop === s.id;
      const halo = on ? `<circle r="26" fill="url(#rbHalo${i})"/>` : "";
      const art = GEM_ART(s.gem || "#cccccc", on, 19, s.id);
      gems += `<defs><radialGradient id="rbHalo${i}"><stop offset="0" stop-color="${s.gem}" stop-opacity="0.75"/><stop offset="1" stop-color="${s.gem}" stop-opacity="0"/></radialGradient></defs>`;
      gems += `<g class="rb-gem" data-stage="${s.id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><g class="${o.drop === s.id ? "rb-drop" : ""}">${halo}${art}</g></g>`;
    });
    // 世界ごとのかたまりの名前（外側に小さく）
    let labels = "";
    [1, 2, 3].forEach(w => {
      const idx = list.map((s, i) => (s.world === w ? i : -1)).filter(i => i >= 0);
      if (!idx.length) return;
      const mid = (idx[0] + idx[idx.length - 1]) / 2, a = angle(mid), lr = R + 44;
      labels += `<text x="${(C + Math.cos(a) * lr).toFixed(1)}" y="${(C + Math.sin(a) * lr).toFixed(1)}" class="rb-world">世界${w}</text>`;
    });
    // 台座: 光った数が多いほど明るく。まん中にタオルの絵（光った数に合わせて濃くなる）と「○/12」
    const base = `<defs><radialGradient id="rbBase"><stop offset="0" stop-color="rgb(${Math.round(240 + 15 * k)},${Math.round(232 + 18 * k)},${Math.round(210 + 30 * k)})"/>` +
      `<stop offset="1" stop-color="rgb(${Math.round(196 + 50 * k)},${Math.round(186 + 52 * k)},${Math.round(160 + 60 * k)})"/></radialGradient>` +
      `<radialGradient id="rbGlow"><stop offset="0.55" stop-color="#fff6c8" stop-opacity="${(0.55 * k).toFixed(2)}"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="${C}" cy="${C}" r="${C - 4}" fill="url(#rbGlow)"/>` +
      `<circle cx="${C}" cy="${C}" r="${R + 30}" fill="url(#rbBase)" stroke="#c9b98f" stroke-width="3"/>` +
      `<circle cx="${C}" cy="${C}" r="${R - 30}" fill="rgba(255,255,255,0.35)" stroke="#d8cba8" stroke-width="1.5"/>`;
    const towel = `<g opacity="${(0.15 + 0.85 * k).toFixed(2)}" transform="translate(${C},${C - 16})">` +
      `<rect x="-34" y="-24" width="68" height="44" rx="6" fill="#ffffff" stroke="#c9b98f" stroke-width="2"/>` +
      `<path d="M-34 -12 H34 M-34 10 H34" stroke="#e3d8bd" stroke-width="2"/>` +
      `${[-28, -20, -12, -4, 4, 12, 20, 28].map(x => `<line x1="${x}" y1="20" x2="${x}" y2="27" stroke="#c9b98f" stroke-width="2"/>`).join("")}</g>`;
    const count = o.small ? "" : `<text x="${C}" y="${C + 38}" class="rb-count">${lit.size + (o.drop && !lit.has(o.drop) ? 1 : 0)}/12</text>`;
    el.innerHTML = `<svg class="rb-svg${o.small ? " small" : ""}" viewBox="0 0 ${VB} ${VB}" role="img" aria-label="レシピブック">${base}${towel}${count}${labels}${gems}</svg>`;
    if (o.onTap) el.querySelectorAll(".rb-gem").forEach(g => g.addEventListener("click", () => o.onTap(Number(g.dataset.stage))));
  }

  return { render, litIds };
})();
