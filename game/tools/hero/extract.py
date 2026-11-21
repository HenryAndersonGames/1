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

def crop_part(rgba, mask, pad=2):
    ys, xs = np.where(mask & (rgba[..., 3] > 0))
    y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad + 1, xs.min() - pad, xs.max() + pad + 1
    part = rgba.copy(); part[~mask, 3] = 0
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

# ---------- ВИДЫ СПЕРЕДИ И СЗАДИ: целиком (ноги и руки двигаем мешем по вертикальным костям) ----------
def full(name, foot=None):
    r = cutout(load(name))
    m = r[..., 3] > 0
    img, o = crop_part(r, m)
    ys = np.where(m)[0]
    return dict(img=img, o=o, foot=int(ys.max()))
front = full('front.png'); back = full('back.png')

out = {'U': U, 'scale': SCALE, 'rig': {'shoulder': wpt(SH), 'elbow': wpt(EL), 'wrist': wpt(WR), 'hip': wpt(HIP), 'knee': wpt(KN), 'ankle': wpt(AN), 'neck': wpt(NECK)}, 'players': []}
os.makedirs(os.path.join(OUT, 'art', 'hero'), exist_ok=True)
VARIANTS = [None, ((88, 89, 97), (226, 178, 58))]
for vi, var in enumerate(VARIANTS):
    P = {}
    for name, d in list(parts.items()) + [('front', front), ('back', back)]:
        img = d['img'] if var is None else recolor(d['img'], *var)
        im, png = to_png(img)
        im.save(os.path.join(OUT, 'art', 'hero', f'p{vi}_{name}.png'))
        e = {'png': base64.b64encode(png).decode(), 'w': round(im.width / 2, 2), 'h': round(im.height / 2, 2), 'o': wpt(d['o'])}
        if 'pivot' in d: e['pivot'] = wpt(d['pivot'])
        if 'bones' in d: e['bones'] = [wpt(b) for b in d['bones']]
        if 'foot' in d: e['o'] = [round((d['o'][0] - (d['o'][0] + d['img'].shape[1] / 2)) * U, 2), round((d['o'][1] - d['foot']) * U, 2)]
        P[name] = e
    out['players'].append(P)
js = "'use strict';\n// Сгенерировано tools/hero/extract.py из видео-разворота героя\nconst HERO = " + json.dumps(out) + ';\n'
open(os.path.join(OUT, 'js', 'herodata.js'), 'w').write(js)
print('ok', len(js), {k: (v['img'].shape[1], v['img'].shape[0]) for k, v in parts.items()})
