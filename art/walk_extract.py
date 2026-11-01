"""Turn a walk-in-place video (magenta background) into a looping sprite animation.

    python art/walk_extract.py <video.mp4> <sprite_id> [frames=12] [anim=w]

Finds the cleanest gait loop, keys out the background, aligns the frames, and writes
assets/sprites/<sprite_id>_<anim><k>.png plus an entry in assets/anims.js.
Needs ffmpeg on PATH plus numpy, opencv and Pillow.
"""
import json, re, subprocess, sys, tempfile, pathlib
import numpy as np, cv2
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAXH = 300


def load_frames(video):
    tmp = pathlib.Path(tempfile.mkdtemp())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), str(tmp / '%04d.png')], check=True)
    return [cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2RGB).astype(np.float32) for p in sorted(tmp.glob('*.png'))]


def key(rgb):
    """Alpha from 'magenta-ness' (min(R,B) - G), then pull the magenta spill out of edge pixels."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mag = np.minimum(r, b) - g
    a = np.clip((150 - mag) / 90, 0, 1)
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # keep only the biggest blob (the hero) and anything touching it
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8))
    if n > 1:
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        keep = cv2.dilate((lab == big).astype(np.uint8), np.ones((9, 9), np.uint8))
        a = a * keep
    spill = np.clip(mag, 0, None)
    out = rgb.copy()
    out[..., 0] -= spill; out[..., 2] -= spill
    # steel that reflected the backdrop would turn blue/red after that: fade it to neutral grey
    t = np.clip(spill / 60, 0, 1)[..., None]
    # video chroma subsampling leaves green/purple halos on thin edges (blades): grey those out too
    t = np.maximum(t, np.clip((0.95 - a) / 0.5, 0, 0.8)[..., None])
    out = out * (1 - t) + out.mean(axis=2, keepdims=True) * t
    return np.clip(out, 0, 255), a


def find_loop(masks, lo=14, hi=44):
    """Lag/start whose frames best repeat (small silhouette difference a whole cycle apart)."""
    small = [cv2.resize(m, (96, 96), interpolation=cv2.INTER_AREA) for m in masks]
    n, best = len(small), None
    for lag in range(lo, min(hi, n // 2) + 1):
        for s in range(n // 6, n - lag - 3):
            d = sum(np.abs(small[s + j] - small[s + lag + j]).mean() for j in range(3))
            if best is None or d < best[0]:
                best = (d, s, lag)
    return best


def main():
    video, sid = pathlib.Path(sys.argv[1]), sys.argv[2]
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    anim = sys.argv[4] if len(sys.argv) > 4 else 'w'
    frames = load_frames(video)
    keyed = [key(f) for f in frames]
    d, start, lag = find_loop([a for _, a in keyed])
    print(f'{len(frames)} frames, loop start {start} length {lag} (diff {d:.4f})')
    picks = [start + round(i * lag / count) for i in range(count)]
    # align: hold the upper-body centroid still, and remove any drift across the loop
    boxes, cents = [], []
    for i in picks:
        a = keyed[i][1]
        ys, xs = np.nonzero(a > 0.5)
        y0, y1 = ys.min(), ys.max()
        up = ys < y0 + (y1 - y0) * 0.45
        cents.append((xs[up].mean(), ys[up].mean()))
        boxes.append((xs.min(), y0, xs.max(), y1))
    cx = np.array([c[0] for c in cents]); cx -= cx.mean()
    feet = np.array([b[3] for b in boxes], np.float32)
    dy = np.zeros(count)  # bob is natural: keep it, but pin the planted foot to one ground line
    dy = feet.max() - feet if np.ptp(feet) < 25 else dy
    shifted = []
    for k, i in enumerate(picks):
        rgb, a = keyed[i]
        M = np.float32([[1, 0, -cx[k]], [0, 1, dy[k]]])
        h, w = a.shape
        shifted.append((cv2.warpAffine(rgb, M, (w, h)), cv2.warpAffine(a, M, (w, h))))
    union = np.zeros_like(shifted[0][1])
    for _, a in shifted: union = np.maximum(union, a)
    ys, xs = np.nonzero(union > 0.05)
    x0, x1, y0, y1 = xs.min() - 4, xs.max() + 5, ys.min() - 4, ys.max() + 2
    # make the crop symmetric about the body centre so the anchor (bottom centre) is the feet
    mid = float(np.mean([c[0] for c in cents]))
    half = max(mid - x0, x1 - mid)
    x0, x1 = int(mid - half), int(mid + half)
    figh = float(np.median([b[3] - b[1] for b in boxes]))
    s = min(1.0, MAXH / (y1 - y0))
    out = ROOT / 'assets' / 'sprites'
    for k, (rgb, a) in enumerate(shifted):
        crop = np.dstack([rgb, a[..., None] * 255])[max(0, y0):y1, max(0, x0):x1]
        im = Image.fromarray(crop.astype(np.uint8), 'RGBA')
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        im.save(out / f'{sid}_{anim}{k}.png')
    # anims.js: frame count, how much taller the frame is than the standing figure, natural loop seconds
    js = ROOT / 'assets' / 'anims.js'
    data = {}
    if js.exists():
        m = re.search(r'=\s*(\{.*\});', js.read_text(), re.S)
        if m: data = json.loads(m.group(1))
    fps = cv2.VideoCapture(str(video)).get(cv2.CAP_PROP_FPS) or 24
    data[f'{sid}_{anim}'] = {'n': count, 'k': round((y1 - y0) / figh, 3), 'sec': round(lag / fps, 3)}
    js.write_text('// Generated by art/walk_extract.py: frame animations for turnaround sprites\n'
                  'const ART_ANIMS = ' + json.dumps(data, indent=1, sort_keys=True) + ';\n')
    print(f'wrote {count} frames for {sid}_{anim}, frame/figure height {data[f"{sid}_{anim}"]["k"]}')


if __name__ == '__main__':
    main()
