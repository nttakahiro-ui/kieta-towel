// ===== ふりがな（ルビ）（11/7-18） =====
// 小学4年生までに習わない漢字をふくむ語に、漢字の上に小さく読みをつける。読みの表は data/ruby.js（tools/ruby_build.mjs で作る）
//   Ruby.spans(文) … [[位置, 文字数, 読み], ...]。表にある文はその読み。表にない文（ことばの名前を入れて組み立てた文など）は、語の表から探す
//   Ruby.html(文, [始め, 終わり], glue) … 文字をエスケープして <ruby> をつけた HTML（始め〜終わりの部分だけも作れる）
//     glue: ルビの語と、すぐあとの送りがな・閉じかっこ（4字まで）を、折り返さない1つのかたまり（span.rbw）にする
//   Ruby.kana(語) … お題のはずれの語（120語にない語）の読み。ルビをつけない語は ""
//   Ruby.inline(文) … 「洗（あら）った」のかっこ書きを消した文を返し、その文にルビをつける（11/7-30）
const Ruby = (() => {
  const R = window.RUBY || { text: {}, dict: {}, kana: {} };
  const keys = Object.keys(R.dict).sort((a, b) => b.length - a.length);
  const cache = new Map();
  function spans(text) {
    text = text == null ? "" : String(text);
    if (R.text[text]) return R.text[text];
    if (cache.has(text)) return cache.get(text);
    const out = [];
    if (/[㐀-鿿]/.test(text)) {
      for (let i = 0; i < text.length;) {
        const k = keys.find(k => text.startsWith(k, i));
        if (k) { R.dict[k].forEach(([p, l, r]) => out.push([i + p, l, r])); i += k.length; } else i++;
      }
    }
    cache.set(text, out);
    return out;
  }
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function html(text, a, b, glue) {
    text = text == null ? "" : String(text);
    a = a || 0; b = b == null ? text.length : b;
    let out = "", i = a;
    for (const [p, l, r] of spans(text)) {
      if (p < a || p + l > b) continue;
      let rb = `<ruby>${esc(text.slice(p, p + l))}<rt>${esc(r)}</rt></ruby>`, e = p + l;
      if (glue) { const m = text.slice(e, b).match(/^[ぁ-ゖー」』）、。！？]{1,4}/); if (m) e += m[0].length; rb = `<span class="rbw">${rb}${esc(text.slice(p + l, e))}</span>`; }
      out += esc(text.slice(i, p)) + rb;
      i = e;
    }
    return out + esc(text.slice(i, b));
  }
  const kana = w => (R.kana && R.kana[w]) || "";
  // 文の中の「漢字（よみ）」のかっこ書きを、ルビにする（11/7-30。オープニングの文）: かっこを消した文を返し、その文のルビを表に入れる
  function inline(text) {
    text = text == null ? "" : String(text);
    if (!/（[ぁ-ゖー]+）/.test(text)) return text;
    let plain = "", last = 0; const sp = [];
    text.replace(/([㐀-鿿々]+)（([ぁ-ゖー]+)）/g, (m, kj, rd, at) => { plain += text.slice(last, at); sp.push([plain.length, kj.length, rd]); plain += kj; last = at + m.length; return m; });
    plain += text.slice(last);
    R.text[plain] = sp; cache.delete(plain);
    return plain;
  }
  return { spans, html, kana, inline };
})();
