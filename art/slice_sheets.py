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
    for kind in ('icons', 'portraits', 'monsters'):
        files = sorted(p.stem for p in (ROOT / 'assets' / kind).glob('*.png'))
        text = re.sub(kind + r': \[[^\]]*\]', kind + ': [' + ', '.join(f"'{i}'" for i in files) + ']', text)
        print(f'manifest: {len(files)} {kind} registered')
    man.write_text(text)


if __name__ == '__main__':
    main()
