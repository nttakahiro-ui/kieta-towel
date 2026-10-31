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

// ===== レシピ完成の演出の秒数（10/25-15。初めてそろったときだけ。合計5秒以内、タップで最後に飛ぶ） =====
const RECIPE_FX = {
  cardGap: 0.12,    // ① カードが1枚ずつ飛んでくる間隔（秒）
  cardFly: 0.45,    //    1枚が飛んでくる時間
  gather: 1.5,      //    ①が終わる時刻（ここで②へ）
  turn: 0.5,        // ② 光の玉になって宝石の色に変わる時間
  fly: 0.35,        // ③ 光の玉が台座の場所へ飛ぶ時間
  remainAt: 3.2,    // ④「あと○個で…」を出す時刻
  total: 4.5,       //    「次へ」のボタンを出す時刻
  confetti: 40,     //    紙吹雪の数
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

  // 世界ごとの扇形（10/25-13）: 台座を中心から外へ3本の仕切り線で3つに分け、扇形ごとに薄く世界の色（stages.js の WORLDS の color）を敷く
  function sectors(list) {
    const RR = R + 30, pt = a => `${(C + Math.cos(a) * RR).toFixed(1)},${(C + Math.sin(a) * RR).toFixed(1)}`;
    let fills = "", lines = "";
    (window.WORLDS || []).forEach(wd => {
      const idx = list.map((s, i) => (s.world === wd.id ? i : -1)).filter(i => i >= 0);
      if (!idx.length) return;
      const a0 = angle(idx[0] - 0.5), a1 = angle(idx[idx.length - 1] + 0.5), large = a1 - a0 > Math.PI ? 1 : 0;
      fills += `<path d="M${C},${C} L${pt(a0)} A${RR},${RR} 0 ${large} 1 ${pt(a1)} Z" fill="${wd.color || "#cccccc"}" fill-opacity="0.16"/>`;
      lines += `<line x1="${C}" y1="${C}" x2="${pt(a0).replace(",", '" y2="')}" stroke="#c9b98f" stroke-width="2"/>`;   // 扇形の始まりの仕切り線（3つで3本）
    });
    return fills + lines;
  }

  // el に台座を描く。o: { lit: Set（光っている stage id）, drop: 宝石がはまる演出をする stage id, dropClass: その演出の CSS（なければ上から降りる rb-drop）,
  //   next: 次の目標として点滅させる stage id, onTap(stageId), small: 小さい台座（目的の画面） }
  function render(el, o) {
    const lit = o.lit || new Set(), k = lit.size / 12;
    const list = stages();
    let gems = "";
    list.forEach((s, i) => {
      if (o.world && s.world !== o.world) return;   // 世界の4つだけを出すとき、ほかの世界の宝石は描かない
      const x = C + Math.cos(angle(i)) * R, y = C + Math.sin(angle(i)) * R, on = lit.has(s.id) || o.drop === s.id;
      const halo = on ? `<circle r="26" fill="url(#rbHalo${i})"/>` : "";
      const art = GEM_ART(s.gem || "#cccccc", on, 19, s.id);
      gems += `<defs><radialGradient id="rbHalo${i}"><stop offset="0" stop-color="${s.gem}" stop-opacity="0.75"/><stop offset="1" stop-color="${s.gem}" stop-opacity="0"/></radialGradient></defs>`;
      const next = o.next === s.id ? `<circle r="25" class="rb-next"/>` : "";   // 次の目標の宝石: 小さく点滅する輪（10/25-15）
      gems += `<g class="rb-gem" data-stage="${s.id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">${next}<g class="${o.drop === s.id ? (o.dropClass || "rb-drop") : ""}">${halo}${art}</g></g>`;
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
      sectors(list) +
      `<circle cx="${C}" cy="${C}" r="${R - 30}" fill="rgba(255,255,255,0.35)" stroke="#d8cba8" stroke-width="1.5"/>`;
    const towel = `<g opacity="${(0.15 + 0.85 * k).toFixed(2)}" transform="translate(${C},${C - 16})">` +
      `<rect x="-34" y="-24" width="68" height="44" rx="6" fill="#ffffff" stroke="#c9b98f" stroke-width="2"/>` +
      `<path d="M-34 -12 H34 M-34 10 H34" stroke="#e3d8bd" stroke-width="2"/>` +
      `${[-28, -20, -12, -4, 4, 12, 20, 28].map(x => `<line x1="${x}" y1="20" x2="${x}" y2="27" stroke="#c9b98f" stroke-width="2"/>`).join("")}</g>`;
    const count = o.small ? "" : `<text x="${C}" y="${C + 38}" class="rb-count">${lit.size + (o.drop && !lit.has(o.drop) ? 1 : 0)}/12</text>`;
    // o.world: その世界の4つの宝石のところだけを大きく切り取って出す（ステージ一覧のいちばん上。10/25-17）
    let vb = `0 0 ${VB} ${VB}`;
    if (o.world) {
      const pts = list.map((s, i) => (s.world === o.world ? [C + Math.cos(angle(i)) * R, C + Math.sin(angle(i)) * R] : null)).filter(Boolean);
      if (pts.length) {
        const m = 34, x0 = Math.min(...pts.map(p => p[0])) - m, x1 = Math.max(...pts.map(p => p[0])) + m, y0 = Math.min(...pts.map(p => p[1])) - m, y1 = Math.max(...pts.map(p => p[1])) + m;
        vb = `${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}`;
      }
    }
    el.innerHTML = `<svg class="rb-svg${o.small ? " small" : ""}${o.world ? " world" : ""}" viewBox="${vb}" role="img" aria-label="レシピブック">${base}${o.world ? "" : towel + count + labels}${gems}</svg>`;
    if (o.onTap) el.querySelectorAll(".rb-gem").forEach(g => g.addEventListener("click", () => o.onTap(Number(g.dataset.stage))));
  }

  // 次の目標の宝石（10/25-15）: その宝石から時計回りに見て、次のまだ光っていない宝石の stage id（全部光っていれば null）
  function nextId(fromId, lit) {
    const list = stages(), i0 = list.findIndex(s => s.id === fromId);
    for (let k = 1; k <= list.length; k++) { const s = list[(i0 + k) % list.length]; if (!lit.has(s.id)) return s.id; }
    return null;
  }

  // ===== 制作側の絵（11/1。ステージ一覧の世界の帯と、レシピブックの3世界の本） =====
  // 宝石は絵に描かれた空の枠の上に、GEM_ART（stages.js の gem の色）で描く。枠の位置は絵の幅・高さの%（元の絵から測った値）
  // 絵が読み込めないときは、前の円い台座（render）にもどる
  const ART = {
    band: {   // 世界の帯（world_gs1〜3 の上下の生成りを切った版）。[左からの%, 上からの%]
      1: { src: "assets/world_band1.jpg", aspect: 4.4735, slots: [[56.1, 67.3], [65.0, 67.3], [73.7, 67.6], [82.6, 68.3]] },
      2: { src: "assets/world_band2.jpg", aspect: 5.4573, slots: [[55.2, 59.4], [64.4, 59.4], [73.4, 59.0], [82.2, 59.8]] },
      3: { src: "assets/world_band3.jpg", aspect: 5.0878, slots: [[55.0, 55.9], [63.6, 55.9], [72.1, 56.6], [80.6, 56.2]] },
      gem: 8.4,   // 宝石の大きさ（帯の幅の%）
    },
    book: {   // 3世界の本（world_gall）。ステージ1〜12の順
      src: "assets/recipe_book.jpg", aspect: 1672 / 941,
      slots: [[55.5, 24.1], [63.2, 24.1], [70.6, 24.2], [78.1, 24.1], [55.4, 50.9], [63.2, 51.0], [70.6, 51.2], [78.1, 51.0], [55.4, 78.4], [63.2, 78.6], [70.6, 78.4], [78.1, 78.3]],
      gem: 6.4,   // 宝石の大きさ（本の幅の%）
    },
  };
  // 絵の上に宝石をならべる。cls: 外側の class、list: [[stage, [x%, y%]]]、gemW: 宝石の幅（%）
  function artHTML(cls, src, aspect, list, gemW, o) {
    const lit = o.lit || new Set();
    const gems = list.map(([s, [x, y]]) => {
      const on = lit.has(s.id) || o.drop === s.id;
      const halo = on ? `<circle r="25" fill="url(#bkHalo${s.id})"/>` : "";
      const next = o.next === s.id ? `<circle r="24" class="rb-next"/>` : "";
      return `<div class="art-slot" style="left:${x}%;top:${y}%;width:${gemW}%">` +
        `<svg viewBox="-26 -26 52 52"><defs><radialGradient id="bkHalo${s.id}"><stop offset="0" stop-color="${s.gem}" stop-opacity="0.75"/><stop offset="1" stop-color="${s.gem}" stop-opacity="0"/></radialGradient></defs>` +
        `<g class="rb-gem" data-stage="${s.id}">${next}${on ? `<g class="${o.drop === s.id ? (o.dropClass || "rb-drop") : ""}">${halo}${GEM_ART(s.gem || "#cccccc", true, 17, s.id)}</g>` : `<rect x="-20" y="-20" width="40" height="40" fill="transparent"/>`}</g></svg></div>`;
    }).join("");
    return `<div class="${cls}" style="aspect-ratio:${aspect}"><img class="art-img" src="${src}" alt="">${gems}</div>`;
  }
  function bindArt(el, o, fallback) {
    const img = el.querySelector(".art-img");
    img.addEventListener("error", () => fallback());
    if (o.onTap) el.querySelectorAll(".art-slot").forEach(d => d.addEventListener("click", e => { e.stopPropagation(); o.onTap(Number(d.querySelector(".rb-gem").dataset.stage)); }));
  }
  // ステージ一覧の上: 今いる世界の帯。そのステージの宝石が枠にはまる（未完成は空の枠のまま）
  function renderBand(el, o) {
    const cfg = ART.band[o.world];
    if (!cfg) { render(el, o); return; }
    const list = stages().filter(s => s.world === o.world).map((s, i) => [s, cfg.slots[i]]).filter(x => x[1]);
    el.innerHTML = artHTML("art-band", cfg.src, cfg.aspect, list, ART.band.gem, o);
    bindArt(el, o, () => render(el, o));
  }
  // レシピブック・宝石ができた画面: 3世界の本。12の枠に宝石がはまる
  function renderBook(el, o) {
    const list = stages().map((s, i) => [s, ART.book.slots[i]]).filter(x => x[1]);
    el.innerHTML = artHTML("art-book", ART.book.src, ART.book.aspect, list, ART.book.gem, o);
    bindArt(el, o, () => render(el, o));
  }

  return { render, renderBand, renderBook, litIds, nextId };
})();
