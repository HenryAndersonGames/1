"""Вырезает героя из кадров видео-разворота и режет на части для риг-анимации с изгибом конечностей.
Запуск: python3 tools/hero/extract.py  → js/herodata.js (части в base64 + кости) и art/hero/*.png"""
import numpy as np, json, base64, io, os
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, '..', '..')
SCALE = 0.5            # пикселей части на пиксель видео (в игре 2 px = 1 ед.)
U = SCALE / 2          # игровых единиц на пиксель видео
BG = np.array([224, 224, 224])

def load(name):
    return np.array(Image.open(os.path.join(ROOT, 'src', name)).convert('RGB')).astype(np.int32)

def cutout(img):
    """Фон — заливкой от краёв; полупрозрачная кайма по краю контура."""
    h, w, _ = img.shape
    near_bg = (np.abs(img - BG).max(axis=2) < 16)
    bg = np.zeros((h, w), bool)
    q = deque([(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)])
    for y, x in q: bg[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and near_bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    rgba = np.zeros((h, w, 4), np.float64)
    rgba[..., :3] = img; rgba[..., 3] = 255
    rgba[bg, 3] = 0
    # кайма: светлые серые пиксели рядом с фоном → тёмный контур с альфой
    edge = np.zeros_like(bg)
    edge[1:-1, 1:-1] = (bg[:-2, 1:-1] | bg[2:, 1:-1] | bg[1:-1, :-2] | bg[1:-1, 2:]) & ~bg[1:-1, 1:-1]
    lum = img.mean(axis=2); sat = img.max(axis=2) - img.min(axis=2)
    soft = edge & (sat < 40) & (lum > 60)
    a = np.clip((224 - lum) / (224 - 45), 0, 1)
    rgba[soft, :3] = [42, 36, 46]; rgba[soft, 3] = a[soft] * 255
    return rgba

OUTLINE = 6  # толщина общего контура в пикселях видео — как у остальной графики игры
def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r + 0.5:
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out
def crop_part(rgba, mask, pad=2, outline=True):
    vis = rgba[..., 3] > 0
    m = mask & vis
    # убираем одиночные пиксели-соринки (иначе контур превращает их в точки рядом с фигурой)
    m = dilate(~dilate(~m, 2), 2) & m | (m & dilate(dilate(~dilate(~m, 2), 2), 3))
    part = rgba.copy()
    if outline and OUTLINE:
        # контур только снаружи силуэта всей фигуры — на стыках частей швов нет
        ring = dilate(m, OUTLINE) & ~vis
        inner = dilate(m, OUTLINE - 2) & ~vis
        part[ring, :3] = [26, 17, 11]; part[ring, 3] = 150; part[inner, 3] = 255
        m = m | ring
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad + 1, xs.min() - pad, xs.max() + pad + 1
    part[~m, 3] = 0
    return part[y0:y1, x0:x1], (int(x0), int(y0))

def poly_mask(shape, pts):
    from PIL import ImageDraw
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in pts], fill=255)
    return np.array(m) > 0

# ---------- Перекраска для второго героя: кожа тёмно-серая, пальто жёлтое ----------
def hue(rgb):
    r, g, b = rgb[..., 0] / 255, rgb[..., 1] / 255, rgb[..., 2] / 255
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = np.where(mx - mn == 0, 1e-6, mx - mn)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / np.where(mx == 0, 1e-6, mx), mx

def recolor(part, skin_to, coat_to):
    out = part.copy(); rgb = part[..., :3]
    h, s, v = hue(rgb)
    skin = (h > 12) & (h < 40) & (s > 0.3) & (v > 0.5)
    coat = (h > 175) & (h < 205) & (s > 0.25)
    ref_skin, ref_coat = np.array([244, 166, 116]), np.array([79, 135, 148])
    for m, ref, to in ((skin, ref_skin, skin_to), (coat, ref_coat, coat_to)):
        k = (v[m] * 255 / ref.max())[:, None]
        out[m, :3] = np.clip(np.array(to)[None, :] * k, 0, 255)
    return out

def to_png(arr):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
    im = im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return im, b.getvalue()

# ---------- ВИД СБОКУ (кадр 112, лицом вправо) ----------
side = cutout(load('side.png'))
H, W = side.shape[:2]
FOOT_Y, CX = 503, 268          # точка опоры (ступня) в пикселях видео
vis = side[..., 3] > 0
yy, xx = np.mgrid[0:H, 0:W]
h_, s_, v_ = hue(side[..., :3])
teal = (h_ > 175) & (h_ < 205) & (s_ > 0.25) & (v_ > 0.42)
# голова: круг + очки, без бирюзового воротника
head_m = (((xx - 270) ** 2 + (yy - 92) ** 2 < 53 ** 2) | ((xx > 292) & (xx < 330) & (yy > 48) & (yy < 98))) & ~(teal & (yy > 118)) & (yy < 142)
# рука (рукав + кисть)
ARM = [(246, 187), (248, 178), (254, 172), (263, 169), (272, 172), (277, 178), (279, 188), (279, 200), (280, 240), (281, 280), (281, 299),
       (275, 299), (276, 330), (269, 338), (255, 338), (248, 330), (248, 299), (240, 299), (240, 290), (241, 280), (242, 240), (244, 200)]
arm_m = poly_mask(side.shape, ARM)
# нога: всё ниже подола
leg_m = (yy >= 364)
# дальний ботинок срезаем по линии контура ближнего
back_shoe = (yy > 461) & (xx > 277) & ((yy - 463) < (xx - 276) * (27 / 23) - 1.5)
leg_m &= ~back_shoe
torso_m = vis & ~head_m & ~leg_m & ~back_shoe & (yy < 372) & ((yy >= 128) | teal)

torso = side.copy()
inside = arm_m & vis & ~(~teal & (yy < 186) & ((xx < 246) | (xx > 280)))
# заливка дыры от руки: по каждой строке — плавный переход между цветами пальто слева и справа
for y in range(H):
    xs = np.where(inside[y])[0]
    if not len(xs): continue
    def find(x0, step):
        for k in range(1, 18):
            x = x0 + step * k
            if 0 <= x < W and teal[y, x] and not inside[y, x]: return x
        return None
    l, r = find(xs.min(), -1), find(xs.max(), 1)
    if l is None and r is None: continue
    if l is None: l = r
    if r is None: r = l
    cl, cr = side[y, l, :3].astype(float), side[y, r, :3].astype(float)
    if r == l: r = l + 1
    for x in xs:
        t = (x - l) / (r - l)
        torso[y, x, :3] = cl * (1 - t) + cr * t
    torso[y, xs, 3] = 255
torso_m = torso_m | inside
arm_img, arm_o = crop_part(side, arm_m & vis)
torso_img, torso_o = crop_part(torso, torso_m)
head_img, head_o = crop_part(side, head_m & vis)
# нога: продлеваем штанину вверх под пальто (копия строки 372)
leg = side.copy()
for y in range(336, 372): leg[y, :, :] = side[373, :, :]
leg_m2 = (yy >= 336) & ~back_shoe
leg_img, leg_o = crop_part(leg, leg_m2 & (leg[..., 3] > 0))

def pt(p, o):  # точка из координат видео → координаты части (в игровых ед.) и мира
    return [round((p[0] - o[0]) * U, 2), round((p[1] - o[1]) * U, 2)]
def wpt(p):
    return [round((p[0] - CX) * U, 2), round((p[1] - FOOT_Y) * U, 2)]

SH, EL, WR = (263, 186), (263, 247), (262, 302)
HIP, KN, AN = (268, 346), (268, 408), (269, 462)
NECK = (270, 138)
parts = {
    'head': dict(img=head_img, o=head_o, pivot=NECK),
    'torso': dict(img=torso_img, o=torso_o, pivot=HIP),
    'arm': dict(img=arm_img, o=arm_o, bones=[SH, EL, WR]),
    'leg': dict(img=leg_img, o=leg_o, bones=[HIP, KN, AN]),
}

# ---------- ВИДЫ СПЕРЕДИ И СЗАДИ: тело + отдельные руки (рукав+кисть) и ноги — сгибаются и укорачиваются в глубину ----------
def fb_parts(name, inner, legx, legy0, cx):
    """inner: {'L': ((x0,y0),(x1,y1)), 'R': ...} — внутренняя линия рукава от подмышки до манжеты."""
    r = cutout(load(name))
    Hh, Ww = r.shape[:2]
    vis = r[..., 3] > 0
    yy, xx = np.mgrid[0:Hh, 0:Ww]
    h_, s_, v_ = hue(r[..., :3])
    teal = (h_ > 175) & (h_ < 205) & (s_ > 0.25) & (v_ > 0.3)
    foot = int(np.where(vis)[0].max())
    res = {}
    for side, ((x0, y0), (x1, y1)) in inner.items():
        sg = -1 if side == 'L' else 1
        line = {}
        for y in range(y0, y1 + 1):
            xe = x0 + (x1 - x0) * (y - y0) / max(1, y1 - y0)
            best, bx = 999, int(round(xe))
            for x in range(int(xe) - 5, int(xe) + 6):
                v = r[y, x, :3].max()
                if v < best: best, bx = v, x
            line[y] = bx
        arm = np.zeros((Hh, Ww), bool)
        strict = np.zeros((Hh, Ww), bool)
        for y in range(y0 - 22, y1 + 1):
            xl = line.get(y, line[y0])
            if sg < 0: arm[y, :xl + 2] = True
            else: arm[y, xl - 1:] = True
            if y >= y0 + 20:  # верх рукава (плечо) остаётся и на теле — без дыр при взмахе
                if sg < 0: strict[y, :xl - 1] = True
                else: strict[y, xl + 2:] = True
        # кисть под манжетой
        hx = line[y1]
        skin = (h_ > 8) & (h_ < 42) & (s_ > 0.25) & (v_ > 0.45)
        hz = (yy > y1 - 4) & (yy < y1 + 44) & ((xx < hx + 4) if sg < 0 else (xx > hx - 4))
        sk = skin & hz
        dil = sk.copy()
        for dy in (-2, -1, 0, 1, 2):
            for dx in (-2, -1, 0, 1, 2):
                dil |= np.roll(np.roll(sk, dy, 0), dx, 1)
        hand = dil & hz & ~teal
        arm = (arm | hand) & vis; strict = (strict | hand) & vis
        # только внешняя половина фигуры
        half = (xx < cx) if sg < 0 else (xx > cx)
        arm &= half; strict &= half
        res['arm' + side] = (arm, strict)
        # кости руки: плечо, локоть, запястье (по линии рукава, чуть наружу)
        sx = line[y0] + sg * 9
        res['armb' + side] = [(sx, y0 - 4), ((sx + line[y1] + sg * 10) / 2 + sg * 2, (y0 + y1) / 2 + 2), (line[y1] + sg * 12, y1 + 2)]
    legs = {}
    for side, (xa, xb) in legx.items():
        m = (yy >= legy0) & (xx >= xa) & (xx < xb) & vis & ~(teal & (yy < legy0 + 14))
        legs[side] = m
    body_m = vis & (yy < legy0 + 16)
    for side in ('L', 'R'):
        body_m &= ~res['arm' + side][1]
        body_m &= ~legs[side]
    out = {'body': dict(img=crop_part(r, body_m)[0], o=crop_part(r, body_m)[1])}
    for side in ('L', 'R'):
        img, o = crop_part(r, res['arm' + side][0])
        out['arm' + side] = dict(img=img, o=o, bones=res['armb' + side])
        # нога: продлеваем штанину вверх под пальто (копия строки legy0+8)
        lg = r.copy()
        for y in range(legy0 - 26, legy0 + 10): lg[y, :, :] = r[legy0 + 14, :, :]
        lm = (legs[side] & (yy >= legy0 + 10)) | ((yy >= legy0 - 26) & (yy < legy0 + 10) & (xx >= legx[side][0]) & (xx < legx[side][1]) & (lg[..., 3] > 0))
        img, o = crop_part(lg, lm)
        xm = (legx[side][0] + legx[side][1]) / 2
        out['leg' + side] = dict(img=img, o=o, bones=[(xm, legy0 - 14), (xm, (legy0 + foot) / 2 - 6), (xm, foot - 30)])
    return out, foot, cx

FB = {
    'f': fb_parts('front.png', {'L': ((233, 192), (216, 296)), 'R': ((309, 192), (327, 296))}, {'L': (215, 271), 'R': (271, 332)}, 366, 271),
    'b': fb_parts('back.png', {'L': ((232, 192), (215, 295)), 'R': ((301, 192), (322, 297))}, {'L': (215, 270), 'R': (270, 330)}, 364, 270),
}

out = {'U': U, 'scale': SCALE, 'rig': {'shoulder': wpt(SH), 'elbow': wpt(EL), 'wrist': wpt(WR), 'hip': wpt(HIP), 'knee': wpt(KN), 'ankle': wpt(AN), 'neck': wpt(NECK)}, 'players': []}
os.makedirs(os.path.join(OUT, 'art', 'hero'), exist_ok=True)
VARIANTS = [None, ((88, 89, 97), (226, 178, 58))]
for vi, var in enumerate(VARIANTS):
    P = {}
    items = list(parts.items())
    for v, (fp, foot, cx) in FB.items():
        for k, d in fp.items(): items.append((v + '_' + k, dict(d, foot=foot, cx=cx)))
    for name, d in items:
        img = d['img'] if var is None else recolor(d['img'], *var)
        im, png = to_png(img)
        im.save(os.path.join(OUT, 'art', 'hero', f'p{vi}_{name}.png'))
        if 'foot' in d:
            fw = lambda p: [round((p[0] - d['cx']) * U, 2), round((p[1] - d['foot']) * U, 2)]
        else:
            fw = wpt
        e = {'png': base64.b64encode(png).decode(), 'w': round(im.width / 2, 2), 'h': round(im.height / 2, 2), 'o': fw(d['o'])}
        if 'pivot' in d: e['pivot'] = fw(d['pivot'])
        if 'bones' in d: e['bones'] = [fw(b) for b in d['bones']]
        P[name] = e
    out['players'].append(P)
js = "'use strict';\n// Сгенерировано tools/hero/extract.py из видео-разворота героя\nconst HERO = " + json.dumps(out) + ';\n'
open(os.path.join(OUT, 'js', 'herodata.js'), 'w').write(js)
print('ok', len(js), {k: (v['img'].shape[1], v['img'].shape[0]) for k, v in parts.items()})
