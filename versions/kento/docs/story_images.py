# 11/27-6: オープニング・エンディングの絵を同じ型（640×1137、上から77%が絵、下はクリーム色）に作り直す
import sys, os, glob, json
import numpy as np
from PIL import Image

OW, OH, LINE = 640, 1137, 0.77
LY = OH * LINE  # 875.49
op_dir, ed_dir, out_dir, mode = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

def white_start(a):
    """下から上へ、行ごとに白地の色（ほぼ一色）かを見て、白地の始まりの行（割合ではなく行の番号）を返す"""
    H, W = a.shape[:2]
    y0, y1 = round(H * 0.95), round(H * 0.98)
    cr = a[y0:y1, 40:W - 40:4, :3].reshape(-1, 3).mean(0)
    y = round(H * 0.95)
    xs = slice(16, W - 16, 4)
    while y > H * 0.5:
        d = np.abs(a[y, xs, :3].astype(float) - cr).sum(1)
        if (d > 30).mean() >= 0.02: break
        y -= 1
    return y + 1, cr

op_src = sorted(glob.glob(os.path.join(op_dir, "統一版_*.png")))
ed_src = sorted(glob.glob(os.path.join(ed_dir, "[01]*.png")))
assert len(op_src) == 11 and len(ed_src) == 13, (len(op_src), len(ed_src))
items = [("op_%02d.jpg" % (i + 1), p) for i, p in enumerate(op_src)] + [("ending/e%02d.jpg" % (i + 1), p) for i, p in enumerate(ed_src)]

info = []
for name, p in items:
    im = Image.open(p).convert("RGB"); a = np.asarray(im)
    Ho, Wo = a.shape[:2]
    ws, cr = white_start(a)
    info.append((name, p, Wo, Ho, ws, cr))
cream = np.mean([i[5] for i in info], 0)
CREAM = (252, 245, 232)  # 画面の地の色 #fcf5e8 にそろえる（24枚の平均は #fcf3e4 でほぼ同じ）

if mode == "measure":
    for name, p, Wo, Ho, ws, cr in info:
        print(name, os.path.basename(p), Wo, Ho, "white", ws, round(ws / Ho, 4), "cream", [round(v) for v in cr])
    print("CREAM", CREAM, "#%02x%02x%02x" % CREAM)
    sys.exit()

os.makedirs(os.path.join(out_dir, "ending"), exist_ok=True)
for name, p, Wo, Ho, ws, cr in info:
    im = Image.open(p).convert("RGB")
    k = max(OW / Wo, LY / ws)               # 横は幅640以上、白地の始まりが77%の線に来る大きさ（小さいほう＝切る量がいちばん少ない）
    bw, bh = OW / k, LY / k                  # 元の絵で使う範囲（幅、線より上の高さ）
    x0 = (Wo - bw) / 2                       # 左右は均等に切る
    y0 = ws - bh                             # 上は、はみ出す分だけ切る（0 以上）
    rows = int(np.ceil(LY))                  # 876 行
    art = im.resize((OW, rows), Image.LANCZOS, box=(x0, y0, x0 + bw, y0 + rows / k))
    a = np.asarray(art).astype(float)
    # 絵の中のクリーム色に近いところを、そろえたクリーム色へずらす（つなぎ目が出ないよう、近さで重みをつける）
    d = np.abs(a - cr).sum(2, keepdims=True)
    w = np.clip(1 - d / 45, 0, 1)
    a = a + w * (np.array(CREAM) - cr)
    out = np.empty((OH, OW, 3), float); out[:] = CREAM
    out[:rows] = a
    out[rows:] = CREAM
    Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8)).save(os.path.join(out_dir, name), quality=86, optimize=True, progressive=True)
    print(name, "k=%.4f" % k, "crop L/R=%.1f top=%.1f (元の画素)" % (x0, y0))
print("CREAM", CREAM, "#%02x%02x%02x" % CREAM)
