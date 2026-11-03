// 測定・撮影の道具（README.md）。使い方: node run.mjs '<式>' [撮影先.jpg]  … 動いている headless Chrome（9333）のページで式を評価し、必要なら撮影する
const [expr, shot] = process.argv.slice(2);
const list = await (await fetch("http://127.0.0.1:9333/json")).json();
const pg = list.find(p => p.type === "page" && p.url.startsWith("http://127.0.0.1:8765"));
const ws = new WebSocket(pg.webSocketDebuggerUrl);
let id = 0; const wait = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
if (process.env.CPU) await send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.CPU) });
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
if (expr === "RELOAD") { await send("Page.reload", { ignoreCache: true }); await new Promise(r => setTimeout(r, 3000)); console.log("reloaded"); } else if (expr) { const r = await send("Runtime.evaluate", { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); if (!r.result) { console.log(JSON.stringify(r.error)); } else { console.log(JSON.stringify(r.result.result ? r.result.result.value : r.result)); } if (r.result && r.result.exceptionDetails) console.log(JSON.stringify(r.result.exceptionDetails).slice(0, 500)); }
if (shot) { const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 85 }); (await import("fs")).writeFileSync(shot, Buffer.from(r.result.data, "base64")); console.log("shot", shot); }
ws.close();
