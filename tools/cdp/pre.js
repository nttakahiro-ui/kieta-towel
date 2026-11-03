const sl = ms => new Promise(r => setTimeout(r, ms));
const c = () => document.querySelector("canvas");
const ev = (t, x, y) => { const r = c().getBoundingClientRect(); c().dispatchEvent(new PointerEvent(t, { pointerId: 5, clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: true, pointerType: "touch" })); };
const tap = async (x = 187, y = 400) => { ev("pointerdown", x, y); await sl(80); ev("pointerup", x, y); await sl(400); };
for (let i=0;i<100 && !(document.getElementById("btn-start") && window.WORLDS && window.Battle && window.Sound);i++) await sl(200);
