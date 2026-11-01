"""Slice ChatGPT icon sheets (4x4 grids on magenta) into transparent 128x128 icons.

Standard library only. Usage:
    python -I art/slice_sheets.py            # slices every art/sheets/sheetNN.png listed in layout.json
Writes assets/icons/<id>.png and rewrites the icons list in assets/manifest.js.
"""
import json, re, struct, sys, zlib, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEETS = ROOT / 'art' / 'sheets'
OUT = ROOT / 'assets' / 'icons'
SIZE = 128


def read_png(path):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'{path.name} is not a PNG')
    pos, idat, w = 8, [], None
    while pos < len(data):
        ln, typ = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + ln]
        pos += 12 + ln
        if typ == b'IHDR':
            w, h, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', body)
            if depth != 8 or ctype not in (2, 6) or interlace:
                raise ValueError(f'{path.name}: unsupported PNG (depth {depth}, type {ctype}, interlace {interlace})')
            bpp = 4 if ctype == 6 else 3
        elif typ == b'IDAT':
            idat.append(body)
        elif typ == b'IEND':
            break
    raw = zlib.decompress(b''.join(idat))
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; line = bytearray(raw[p + 1:p + 1 + stride]); p += 1 + stride
        if f == 1:
            for i in range(bpp, stride): line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride): line[i] = (line[i] + (((line[i - bpp] if i >= bpp else 0) + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0; b = prev[i]; c = prev[i - bpp] if i >= bpp else 0
                pa = abs(b - c); pb = abs(a - c); pc = abs(a + b - 2 * c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    if bpp == 3:  # expand to RGBA
        rgba = bytearray(w * h * 4)
        rgba[0::4] = out[0::3]; rgba[1::4] = out[1::3]; rgba[2::4] = out[2::3]; rgba[3::4] = b'\xff' * (w * h)
        out = rgba
    return w, h, out


def write_png(path, w, h, rgba):
    rows = b''.join(b'\x00' + bytes(rgba[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                     + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))


def key_background(w, h, px):
    """Turn the magenta background transparent and remove magenta fringing from edges."""
    samples = []
    for (x, y) in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3), (w // 2, 2), (2, h // 2)]:
        i = (y * w + x) * 4; samples.append(px[i:i + 3])
    bg = [sorted(s[c] for s in samples)[len(samples) // 2] for c in range(3)]
    for i in range(0, len(px), 4):
        r, g, b = px[i], px[i + 1], px[i + 2]
        # magenta-ness: red and blue high relative to green
        m = min(r, b) - g
        d = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
        if d < 60 or m > 150:
            px[i + 3] = 0
            continue
        if m > 40:  # fringe pixel: partially background
            a = max(0.0, min(1.0, 1 - (m - 40) / 110))
            px[i + 3] = int(a * 255)
            # strip the magenta contribution from the color
            k = 1 - a
            px[i] = max(0, min(255, int((r - k * bg[0]) / max(a, 0.05))))
            px[i + 2] = max(0, min(255, int((b - k * bg[2]) / max(a, 0.05))))
    return px


def crop_icon(w, px, x0, y0, x1, y1):
    """Bounding box of opaque pixels inside a cell, squared and padded."""
    bx0, by0, bx1, by1 = x1, y1, x0, y0
    for y in range(y0, y1):
        row = (y * w) * 4
        for x in range(x0, x1):
            if px[row + x * 4 + 3] > 40:
                if x < bx0: bx0 = x
                if x > bx1: bx1 = x
                if y < by0: by0 = y
                if y > by1: by1 = y
    if bx1 < bx0:
        return None
    side = max(bx1 - bx0, by1 - by0) + 1
    side = int(side * 1.08) + 2
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    return int(cx - side / 2), int(cy - side / 2), side


def resample(w, h, px, sx, sy, side, size=SIZE):
    """Area-average (premultiplied) a square region to size x size."""
    out = bytearray(size * size * 4)
    scale = side / size
    for oy in range(size):
        ya, yb = int(sy + oy * scale), max(int(sy + (oy + 1) * scale), int(sy + oy * scale) + 1)
        for ox in range(size):
            xa, xb = int(sx + ox * scale), max(int(sx + (ox + 1) * scale), int(sx + ox * scale) + 1)
            r = g = b = a = n = 0
            for y in range(ya, yb):
                if y < 0 or y >= h: n += xb - xa; continue
                base = y * w
                for x in range(xa, xb):
                    n += 1
                    if x < 0 or x >= w: continue
                    i = (base + x) * 4; al = px[i + 3]
                    if al:
                        r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al
            o = (oy * size + ox) * 4
            if a:
                out[o] = r // a; out[o + 1] = g // a; out[o + 2] = b // a; out[o + 3] = a // n
    return out


def resample_rect(w, h, px, sx, sy, sw, sh, ow, oh):
    """Area-average (premultiplied) a rectangle to ow x oh."""
    out = bytearray(ow * oh * 4)
    fx, fy = sw / ow, sh / oh
    for oy in range(oh):
        ya = int(sy + oy * fy); yb = max(int(sy + (oy + 1) * fy), ya + 1)
        for ox in range(ow):
            xa = int(sx + ox * fx); xb = max(int(sx + (ox + 1) * fx), xa + 1)
            r = g = b = a = n = 0
            for y in range(ya, yb):
                if y < 0 or y >= h: n += xb - xa; continue
                base = y * w
                for x in range(xa, xb):
                    n += 1
                    if x < 0 or x >= w: continue
                    i = (base + x) * 4; al = px[i + 3]
                    if al:
                        r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al
            o = (oy * ow + ox) * 4
            if a:
                out[o] = r // a; out[o + 1] = g // a; out[o + 2] = b // a; out[o + 3] = a // n
    return out


def key_generic(w, h, px):
    """Key out any flat background colour (sampled from the borders) and suppress its colour spill."""
    samples = []
    for t in range(1, 20):
        for (x, y) in [(t * w // 20, 3), (t * w // 20, h - 4), (3, t * h // 20), (w - 4, t * h // 20)]:
            i = (y * w + x) * 4; samples.append(px[i:i + 3])
    bg = [sorted(s[c] for s in samples)[len(samples) // 2] for c in range(3)]
    d0, d1 = 55, 150
    for i in range(0, len(px), 4):
        r, g, b = px[i], px[i + 1], px[i + 2]
        d = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
        if d <= d0:
            px[i + 3] = 0; continue
        a = 1.0 if d >= d1 else (d - d0) / (d1 - d0)
        if a < 1:
            k = 1 - a
            r = (r - k * bg[0]) / a; g = (g - k * bg[1]) / a; b = (b - k * bg[2]) / a
        # pink/magenta spill: red and blue both above green
        m = min(r, b)
        if m > g + 6:
            r -= (m - g) * 0.85; b -= (m - g) * 0.85
        if a < 0.98:  # edge pixels: pull leftover background red/pink toward neutral
            r = min(r, (g + b) / 2 + 22)
        px[i] = max(0, min(255, int(r))); px[i + 1] = max(0, min(255, int(g))); px[i + 2] = max(0, min(255, int(b)))
        px[i + 3] = int(a * 255)
    return bg


def drop_specks(w, px, x0, y0, x1, y1, keep=0.02):
    """Remove small disconnected blobs inside a cell (keeps components >= keep * largest)."""
    cw, ch = x1 - x0, y1 - y0
    lab = [0] * (cw * ch); sizes = [0]; cur = 0
    for sy in range(ch):
        for sx in range(cw):
            if lab[sy * cw + sx] or px[((y0 + sy) * w + x0 + sx) * 4 + 3] <= 40:
                continue
            cur += 1; sizes.append(0); stack = [(sx, sy)]; lab[sy * cw + sx] = cur
            while stack:
                cx, cy = stack.pop(); sizes[cur] += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < cw and 0 <= ny < ch and not lab[ny * cw + nx] and px[((y0 + ny) * w + x0 + nx) * 4 + 3] > 40:
                        lab[ny * cw + nx] = cur; stack.append((nx, ny))
    if cur == 0:
        return
    big = max(sizes)
    for sy in range(ch):
        for sx in range(cw):
            l = lab[sy * cw + sx]
            i = ((y0 + sy) * w + x0 + sx) * 4
            if (l and sizes[l] < big * keep) or (not l and px[i + 3] <= 40):
                px[i + 3] = 0


def slice_sprites(w, h, px, spec):
    """World sprites: key the background, crop each cell tight (keeping aspect), fit within max px."""
    key_generic(w, h, px)
    cols, rows = spec['grid']
    dest = ROOT / 'assets' / spec['out']; dest.mkdir(parents=True, exist_ok=True)
    cw, ch = w / cols, h / rows
    mx = spec.get('max', 320)
    for k, iid in enumerate(spec['ids']):
        if not iid:
            continue
        cx, cy = k % cols, k // cols
        x0, y0, x1, y1 = int(cx * cw) + 3, int(cy * ch) + 3, int((cx + 1) * cw) - 3, int((cy + 1) * ch) - 3
        drop_specks(w, px, x0, y0, x1, y1)
        bx0, by0, bx1, by1 = x1, y1, x0, y0
        for y in range(y0, y1):
            row = y * w * 4
            for x in range(x0, x1):
                if px[row + x * 4 + 3] > 60:
                    bx0 = min(bx0, x); bx1 = max(bx1, x); by0 = min(by0, y); by1 = max(by1, y)
        if bx1 < bx0:
            print(f'  {iid}: empty'); continue
        sw, sh = bx1 - bx0 + 1, by1 - by0 + 1
        s = min(1.0, mx / max(sw, sh))
        ow, oh = max(1, round(sw * s)), max(1, round(sh * s))
        write_png(dest / f'{iid}.png', ow, oh, resample_rect(w, h, px, bx0, by0, sw, sh, ow, oh))
    print(f'sprites -> {spec["out"]}: {len([i for i in spec["ids"] if i])}')


def main():
    layout = json.loads((SHEETS / 'layout.json').read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for sheet, spec in layout.items():
        if only and sheet not in only:
            continue
        src = SHEETS / f'{sheet}.png'
        if not src.exists():
            print(f'skip {sheet}: no {src.name}')
            continue
        w, h, px = read_png(src)
        if isinstance(spec, dict) and spec.get('sprite'):
            slice_sprites(w, h, px, spec)
            continue
        if isinstance(spec, dict):  # opaque portrait grid: cut cells as-is
            cols, rows = spec['grid']
            dest = ROOT / 'assets' / spec['out']; dest.mkdir(parents=True, exist_ok=True)
            cw, ch = w // cols, h // rows
            # generated grids are not perfectly even: trim each cell so neighbors never bleed in
            ix, iy = round(cw * 0.03), round(ch * 0.045)
            ow, oh = cw - 2 * ix, ch - 2 * iy
            for k, iid in enumerate(spec['ids']):
                cx, cy = (k % cols) * cw + ix, (k // cols) * ch + iy
                cell = bytearray()
                for y in range(cy, cy + oh):
                    cell += px[(y * w + cx) * 4:(y * w + cx + ow) * 4]
                write_png(dest / f'{iid}.png', ow, oh, cell)
            print(f'{sheet}: {len(spec["ids"])} images')
            continue
        ids = spec
        key_background(w, h, px)
        grid = 1 if len(ids) == 1 else 4
        cw, ch = w / grid, h / grid
        for k, iid in enumerate(ids):
            cx, cy = k % grid, k // grid
            box = crop_icon(w, px, int(cx * cw) + 3, int(cy * ch) + 3, int((cx + 1) * cw) - 3, int((cy + 1) * ch) - 3)
            if not box:
                print(f'  {iid}: empty cell'); continue
            sx, sy, side = box
            write_png(OUT / f'{iid}.png', SIZE, SIZE, resample(w, h, px, sx, sy, side))
        print(f'{sheet}: {len(ids)} icons')
    man = ROOT / 'assets' / 'manifest.js'
    text = man.read_text()
    for kind in ('icons', 'portraits', 'monsters', 'terrain', 'props'):
        files = sorted(p.stem for p in (ROOT / 'assets' / kind).glob('*.png'))
        text = re.sub(kind + r': \[[^\]]*\]', kind + ': [' + ', '.join(f"'{i}'" for i in files) + ']', text)
        print(f'manifest: {len(files)} {kind} registered')
    man.write_text(text)


if __name__ == '__main__':
    main()
