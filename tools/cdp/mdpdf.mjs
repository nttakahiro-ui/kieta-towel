// md を A4 の PDF にする（11/3-8。説明用まとめ）。消音の headless Chrome（9333）で印刷する
// 使い方: SITE=<試しのサイトの場所> node mdpdf.mjs <入力.md> <出力.pdf>   … 試しのサイトに一時ファイル _print.html を置いて開き、印刷のあと元のページ（?debug）へもどす
// md は、このまとめで使う形だけ読む: 見出し（# ## ###）、表、箇条書き（- と 1.）、太字（**）、段落
import { readFileSync, writeFileSync, unlinkSync } from "fs";
const [src, out] = process.argv.slice(2), SITE = process.env.SITE;
if (!src || !out || !SITE) { console.log("使い方: SITE=... node mdpdf.mjs 入力.md 出力.pdf"); process.exit(1); }
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(https?:\/\/[^\s）)]+)/g, "<span class=url>$1</span>");
const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
const lines = readFileSync(src, "utf8").split("\n");
let html = "", i = 0;
while (i < lines.length) {
  const l = lines[i];
  if (/^#{1,3} /.test(l)) { const n = l.match(/^#+/)[0].length; html += `<h${n}>${inl(l.slice(n + 1))}</h${n}>`; i++; }
  else if (/^\|/.test(l)) {
    const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
    html += "<table><tr>" + cells(rows[0]).map(c => `<th>${inl(c)}</th>`).join("") + "</tr>" +
      rows.slice(2).map(r => "<tr>" + cells(r).map(c => `<td>${inl(c)}</td>`).join("") + "</tr>").join("") + "</table>";
  }
  else if (/^\s*(- |\d+\. )/.test(l)) {
    const ol = /^\s*\d+\. /.test(l), items = [];
    while (i < lines.length && /^\s*(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^\s*(- |\d+\. )/, ""));
    html += `<${ol ? "ol" : "ul"}>` + items.map(x => `<li>${inl(x)}</li>`).join("") + `</${ol ? "ol" : "ul"}>`;
  }
  else if (l.trim()) { const p = []; while (i < lines.length && lines[i].trim() && !/^(#|\||\s*- |\s*\d+\. )/.test(lines[i])) p.push(lines[i++]); html += `<p>${inl(p.join(""))}</p>`; }
  else i++;
}
const page = `<!doctype html><meta charset="utf-8"><style>
@page { size: A4; margin: 14mm 14mm 14mm 14mm; }
body { font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; font-size: 10pt; line-height: 1.6; color: #222; margin: 0; }
h1 { font-size: 16pt; margin: 0 0 6pt; border-bottom: 2px solid #6b8f4e; padding-bottom: 4pt; }
h2 { font-size: 12.5pt; margin: 12pt 0 4pt; color: #3f5f2a; break-after: avoid; }
p, li { margin: 3pt 0; } ul, ol { margin: 3pt 0; padding-left: 18pt; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 6pt; font-size: 8.8pt; line-height: 1.45; break-inside: auto; }
tr { break-inside: avoid; }
th, td { border: 1px solid #b9c4ad; padding: 2.5pt 4pt; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
th { background: #eef3e6; }
.url { overflow-wrap: anywhere; font-size: 8.5pt; }
</style><body>${html}</body>`;
writeFileSync(SITE + "/_print.html", page);
const list = await (await fetch("http://127.0.0.1:9333/json")).json();
const pg = list.find(p => p.type === "page" && p.url.startsWith("http://127.0.0.1:8765"));
const ws = new WebSocket(pg.webSocketDebuggerUrl);
let id = 0; const wait = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const k = ++id; wait[k] = r; ws.send(JSON.stringify({ id: k, method, params })); });
const sl = ms => new Promise(r => setTimeout(r, ms));
await send("Emulation.clearDeviceMetricsOverride");
await send("Page.navigate", { url: "http://127.0.0.1:8765/_print.html?" + Date.now() }); await sl(1500);
// 文字が切れていないか: 箱からはみ出した要素の数（A4 の幅で並べたとき）
await send("Emulation.setDeviceMetricsOverride", { width: 680, height: 960, deviceScaleFactor: 1, mobile: false });
const chk = await send("Runtime.evaluate", { expression: `[...document.querySelectorAll("body *")].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== "inline").length`, returnByValue: true });
await send("Emulation.clearDeviceMetricsOverride");
const r = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
writeFileSync(out, Buffer.from(r.result.data, "base64"));
await send("Page.navigate", { url: "http://127.0.0.1:8765/?debug" }); await sl(1500);
unlinkSync(SITE + "/_print.html");
ws.close();
console.log("pdf", out, "はみ出し", chk.result.result.value);
