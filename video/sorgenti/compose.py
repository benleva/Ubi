# Monta il video tutorial dalla timeline: telefono con le schermate, dito che tocca, scritte dei passi.
import json, subprocess, sys, os, math, functools
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
NAVY, NAVY2, ORANGE, CREAM = (31, 58, 95), (20, 38, 64), (232, 116, 59), (246, 239, 228)
FD = '/usr/share/fonts/opentype/inter/'
def font(w, s): return ImageFont.truetype(FD + {'b': 'Inter-Bold.otf', 'x': 'Inter-ExtraBold.otf', 'k': 'Inter-Black.otf', 's': 'Inter-SemiBold.otf'}[w], s)
EMO = '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf'

@functools.lru_cache(None)
def emoji(ch, size):
    f = ImageFont.truetype(EMO, 109)
    im = Image.new('RGBA', (140, 140), (0, 0, 0, 0)); ImageDraw.Draw(im).text((6, 6), ch, font=f, embedded_color=True)
    im = im.crop(im.getbbox()); r = size / max(im.size)
    return im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)

def qr_img(text, size, fg=(0, 0, 0)):
    m = json.loads(subprocess.check_output(['node', '/home/claude/video/qrm.mjs', text]))
    n = len(m) + 4; cell = size // n
    im = Image.new('RGB', (cell * n, cell * n), 'white'); d = ImageDraw.Draw(im)
    for y, row in enumerate(m):
        for x, v in enumerate(row):
            if v: d.rectangle([(x + 2) * cell, (y + 2) * cell, (x + 3) * cell - 1, (y + 3) * cell - 1], fill=fg)
    return im

@functools.lru_cache(None)
def background():
    bg = Image.new('RGB', (W, H), NAVY); d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=tuple(int(NAVY[i] * (1 - t) + NAVY2[i] * t) for i in range(3)))
    glow = Image.new('L', (W, H), 0); ImageDraw.Draw(glow).ellipse([600, -300, 1400, 500], fill=60)
    bg.paste(Image.new('RGB', (W, H), (60, 100, 150)), (0, 0), glow.filter(ImageFilter.GaussianBlur(120)))
    return bg

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) > maxw and cur: lines.append(cur); cur = w
        else: cur = t
    if cur: lines.append(cur)
    return lines

def caption_layer(cap):
    im = Image.new('RGBA', (W, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if not cap: return im
    num, text = cap
    f = font('x', 62); lines = wrap(d, text, f, 900)
    total = 110 + len(lines) * 76
    y = (380 - total) // 2 + 20
    d.ellipse([W // 2 - 44, y, W // 2 + 44, y + 88], fill=ORANGE)
    s = str(num); fn = font('k', 52); d.text((W // 2 - d.textlength(s, font=fn) / 2, y + 12), s, font=fn, fill='white')
    y += 108
    for l in lines:
        d.text((W // 2 - d.textlength(l, font=f) / 2, y), l, font=f, fill='white'); y += 76
    return im

# telefono: schermata 780x1688 ridotta
SH = 1420; SW = int(780 * SH / 1688); PX = (W - SW) // 2; PY = 440; BZ = 18
@functools.lru_cache(None)
def phone_mask():
    m = Image.new('L', (SW, SH), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, SW - 1, SH - 1], 48, fill=255); return m

@functools.lru_cache(maxsize=8)
def frame_with(img_path, cap_key):
    cap = json.loads(cap_key)
    base = background().copy()
    sh = Image.new('RGBA', (SW + 2 * BZ + 40, SH + 2 * BZ + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([20, 30, SW + 2 * BZ + 20, SH + 2 * BZ + 30], 66, fill=(0, 0, 0, 110))
    base.paste(sh.filter(ImageFilter.GaussianBlur(16)), (PX - BZ - 20, PY - BZ - 20), sh.filter(ImageFilter.GaussianBlur(16)))
    ImageDraw.Draw(base).rounded_rectangle([PX - BZ, PY - BZ, PX + SW + BZ, PY + SH + BZ], 66, fill=(12, 12, 14))
    scr = Image.open(img_path).convert('RGB').resize((SW, SH), Image.LANCZOS)
    base.paste(scr, (PX, PY), phone_mask())
    cl = caption_layer(cap); base.paste(cl, (0, 30), cl)
    return base

def to_screen(x, y):  # coordinate CSS (390x844) -> video
    return PX + x * SW / 390, PY + y * SH / 844

FINGER = None
def finger():
    global FINGER
    if FINGER is None: FINGER = emoji('👆', 170)
    return FINGER

def draw_touch(im, x, y, t, double=False):
    """t in secondi dall'inizio del tocco"""
    f = finger(); ease = lambda u: 1 - (1 - u) ** 3
    mv = min(1, t / 0.45); e = ease(mv)
    fx = x + (1 - e) * 220; fy = y + (1 - e) * 300
    presses = [0.5] + ([0.85] if double else [])
    scale = 1.0
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for p in presses:
        if p <= t < p + 0.12: scale = 0.88
        if t >= p:
            k = min(1, (t - p) / 0.45); r = 26 + k * 70; a = int(170 * (1 - k))
            if a > 0: d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255, a), width=8)
            if t < p + 0.25: d.ellipse([x - 30, y - 30, x + 30, y + 30], fill=(255, 255, 255, 120))
    im.paste(ov, (0, 0), ov)
    fs = f.resize((int(f.width * scale), int(f.height * scale)))
    # punta del dito ~ (45% larghezza, 4% altezza) dell'emoji
    im.paste(fs, (int(fx - fs.width * 0.45), int(fy - fs.height * 0.04)), fs)

def text_center(d, y, s, f, fill):
    d.text((W / 2 - d.textlength(s, font=f) / 2, y), s, font=f, fill=fill)

def card_title(e):
    im = background().copy(); d = ImageDraw.Draw(im)
    tr = emoji('🎄' if e.get('icon') is None else e['icon'], 300); im.paste(tr, (W // 2 - tr.width // 2, 470), tr)
    text_center(d, 360, 'UBI · COME FUNZIONA', font('x', 40), (240, 162, 122))
    y = 840
    for l in wrap(d, e['title'], font('k', 104), 960): text_center(d, y, l, font('k', 104), 'white'); y += 120
    for l in wrap(d, e['sub'], font('s', 52), 900): text_center(d, y + 20, l, font('s', 52), (219, 228, 240)); y += 66
    pin_logo(d, 1700)
    return im

def pin_logo(d, y):
    f = font('k', 64); w = d.textlength('Ubi', font=f) + 70; x = W / 2 - w / 2
    d.ellipse([x, y + 8, x + 50, y + 58], fill=ORANGE); d.polygon([(x + 6, y + 44), (x + 44, y + 44), (x + 25, y + 78)], fill=ORANGE)
    d.ellipse([x + 16, y + 22, x + 34, y + 40], fill=NAVY)
    d.text((x + 70, y), 'Ubi', font=f, fill='white')
    text_center(d, y + 92, 'ubipin.it', font('b', 40), (240, 162, 122))

def card_ticket(e):
    im = frame_bg_with_caption(e['cap']); d = ImageDraw.Draw(im)
    cw, ch = 760, 1120; x0, y0 = (W - cw) // 2, 560
    card = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([0, 0, cw - 1, ch - 1], 50, fill='white')
    for i in range(0, cw - 100, 40): cd.line([(50 + i, 14), (70 + i, 14)], fill=(30, 125, 69), width=6); cd.line([(50 + i, ch - 15), (70 + i, ch - 15)], fill=(30, 125, 69), width=6)
    for i in range(0, ch - 100, 40): cd.line([(14, 50 + i), (14, 70 + i)], fill=(30, 125, 69), width=6); cd.line([(cw - 15, 50 + i), (cw - 15, 70 + i)], fill=(30, 125, 69), width=6)
    tr = emoji('🎄', 130); card.paste(tr, (90, 70), tr)
    cd.text((250, 85), 'Un regalo per te', font=font('x', 50), fill=(31, 45, 61)); cd.text((250, 150), e.get('shop', ''), font=font('s', 44), fill=(61, 86, 116))
    q = qr_img('https://ubipin.it/#/business', 470); card.paste(q, ((cw - q.width) // 2, 250))
    code = e.get('code', ''); f = font('k', 64); cd.text(((cw - cd.textlength(code, font=f)) / 2, 750), code, font=f, fill=(31, 45, 61))
    for k, l in enumerate(['Inquadra il QR con la fotocamera', 'Aprilo dal 1/12 all\'8/1', '🎁 Puoi anche regalarlo a chi vuoi']):
        ff = font('s', 38); cd.text(((cw - cd.textlength(l, font=ff)) / 2, 860 + k * 60), l.replace('🎁 ', ''), font=ff, fill=(80, 80, 80))
    return im, card, (x0, y0)

def frame_bg_with_caption(cap):
    im = background().copy(); cl = caption_layer(cap); im.paste(cl, (0, 30), cl); return im

def card_outro(e):
    im = background().copy(); d = ImageDraw.Draw(im)
    pin_logo(d, 260)
    y = 520
    for l in wrap(d, e.get('title', 'Vuoi la tua campagna?'), font('k', 92), 960): text_center(d, y, l, font('k', 92), 'white'); y += 108
    for l in wrap(d, e.get('sub', 'Prepariamo tutto noi: premi, biglietti, cassa.'), font('s', 44), 940): text_center(d, y + 20, l, font('s', 44), (219, 228, 240)); y += 56
    y -= 56
    if e.get('consumer'):
        q = qr_img('https://ubipin.it', 420)
        bx = Image.new('RGB', (q.width + 40, q.height + 100), 'white'); bx.paste(q, (20, 20))
        bd = ImageDraw.Draw(bx); s2 = 'Apri Ubi'; bd.text(((bx.width - bd.textlength(s2, font=font('x', 40))) / 2, q.height + 30), s2, font=font('x', 40), fill=ORANGE)
        im.paste(bx, ((W - bx.width) // 2, y + 120)); yy = y + 120 + bx.height + 60
        text_center(d, yy, 'ubipin.it', font('k', 80), 'white'); text_center(d, yy + 110, 'Gratis, dal browser del telefono', font('s', 44), (219, 228, 240))
        return im
    q = qr_img('https://wa.me/393516661495', 420)
    bx = Image.new('RGB', (q.width + 40, q.height + 100), 'white'); bx.paste(q, (20, 20))
    bd = ImageDraw.Draw(bx); s = 'WhatsApp'; bd.text(((bx.width - bd.textlength(s, font=font('x', 40))) / 2, q.height + 30), s, font=font('x', 40), fill=(37, 211, 102))
    im.paste(bx, ((W - bx.width) // 2, y + 120))
    yy = y + 120 + bx.height + 60
    text_center(d, yy, '💬 351 666 1495'.replace('💬 ', ''), font('k', 72), 'white')
    text_center(d, yy + 100, 'info@ubipin.it', font('x', 56), (240, 162, 122))
    text_center(d, yy + 180, 'ubipin.it/#/business', font('s', 40), (219, 228, 240))
    return im


import re
def card_wachat(e):
    im = frame_bg_with_caption(e['cap']); d = ImageDraw.Draw(im)
    # telefono con WhatsApp disegnato
    ImageDraw.Draw(im).rounded_rectangle([PX - BZ, PY - BZ, PX + SW + BZ, PY + SH + BZ], 66, fill=(12, 12, 14))
    scr = Image.new('RGB', (SW, SH), (236, 229, 221)); sd = ImageDraw.Draw(scr)
    sd.rectangle([0, 0, SW, 150], fill=(7, 94, 84))
    sd.ellipse([30, 50, 110, 130], fill=(200, 210, 210)); sd.text((130, 62), e.get('who', 'Mamma'), font=font('b', 40), fill='white'); sd.text((130, 108), 'online', font=font('s', 26), fill=(200, 230, 225))
    txt = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27bf]', '', e['text']).replace('  ', ' ').strip()
    f = font('s', 30); bw = SW - 120
    lines = wrap(sd, txt, f, bw - 40)
    og = Image.open('/home/claude/ubi/og-ubi.jpg').convert('RGB'); og = og.resize((bw - 24, int((bw - 24) * og.height / og.width)))
    bh = 12 + og.height + 90 + len(lines) * 40 + 50
    x0, y0 = SW - bw - 30, 260
    sd.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], 24, fill=(220, 248, 198))
    scr.paste(og, (x0 + 12, y0 + 12))
    sd.rectangle([x0 + 12, y0 + 12 + og.height, x0 + bw - 12, y0 + 12 + og.height + 80], fill=(205, 235, 185))
    sd.text((x0 + 26, y0 + 22 + og.height), 'Ubi · ricordi nascosti nei luoghi', font=font('b', 24), fill=(40, 40, 40))
    sd.text((x0 + 26, y0 + 54 + og.height), 'ubipin.it', font=font('s', 22), fill=(100, 100, 100))
    yy = y0 + 12 + og.height + 95
    for l in lines:
        sd.text((x0 + 22, yy), l, font=f, fill=(53, 151, 240) if 'https://' in l else (30, 30, 30)); yy += 40
    sd.text((x0 + bw - 120, yy + 6), '21:05 ✓✓', font=font('s', 22), fill=(80, 150, 200))
    sd.rectangle([0, SH - 120, SW, SH], fill=(240, 240, 240)); sd.rounded_rectangle([20, SH - 100, SW - 110, SH - 30], 34, fill='white')
    sd.ellipse([SW - 95, SH - 105, SW - 20, SH - 30], fill=(0, 168, 132))
    im.paste(scr, (PX, PY), phone_mask())
    return im

# ---------- scene ----------
def scenes(tl):
    out, cur = [], None
    for e in tl:
        key = json.dumps(e.get('cap')) if e['t'] in ('still', 'tap', 'seq') else None
        if e['t'] in ('title', 'ticket', 'outro', 'wachat') or cur is None or key != cur['key']:
            cur = {'key': key, 'ev': []}; out.append(cur)
        cur['ev'].append(e)
    return out

def render_scene(sc, path):
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', str(FPS), path + '.tmp.mp4'], stdin=subprocess.PIPE)
    prev = None; first = True
    def emit(im):
        nonlocal prev
        p.stdin.write(im.tobytes()); prev = im
    def fade_in(im, n=8):
        nonlocal first
        if prev is not None and n:
            for k in range(1, n + 1): emit(Image.blend(prev, im, k / (n + 1)))
        first = False
    for e in sc['ev']:
        ck = json.dumps(e.get('cap'))
        if e['t'] == 'title':
            im = card_title(e)
            for k in range(int(e['dur'] * FPS)): emit(im)
        elif e['t'] == 'outro':
            im = card_title({'title': e['title'], 'sub': e.get('sub', ''), 'icon': e.get('icon', '✅')}) if e.get('plain') else card_outro(e)
            for k in range(int(e['dur'] * FPS)): emit(im)
        elif e['t'] == 'wachat':
            im = card_wachat(e); fade_in(im, 6 if prev is not None else 0)
            for k in range(int(e['dur'] * FPS)): emit(im)
        elif e['t'] == 'ticket':
            bg, card, (x0, y0) = card_ticket(e); n = int(e['dur'] * FPS)
            for k in range(n):
                t = k / FPS; s = 0.86 + 0.14 * min(1, t / 0.6) + 0.02 * t / e['dur']
                c = card.resize((int(card.width * s), int(card.height * s)), Image.BICUBIC).rotate(-3 + 3 * min(1, t / 0.6), expand=True, resample=Image.BICUBIC)
                im = bg.copy(); im.paste(c, (W // 2 - c.width // 2, y0 + 560 - c.height // 2), c); emit(im)
        elif e['t'] == 'still':
            im = frame_with(e['img'], ck); fade_in(im, 5 if prev is not None else 0)
            for k in range(int(e['dur'] * FPS)): emit(im)
        elif e['t'] == 'seq':
            fr = e['frames']
            for i, (f, ts) in enumerate(fr):
                nxt = fr[i + 1][1] if i + 1 < len(fr) else ts + e['hold']
                im = frame_with(f, ck)
                for k in range(max(1, round((nxt - ts) * FPS))): emit(im)
        elif e['t'] == 'tap':
            im = frame_with(e['img'], ck); fade_in(im, 5 if prev is not None else 0)
            x, y = to_screen(e['x'], e['y']); n = int(e['dur'] * FPS)
            for k in range(n):
                fr = im.copy(); draw_touch(fr, x, y, k / FPS, e.get('double')); emit(fr)
    p.stdin.close(); p.wait()
    if p.returncode == 0: os.replace(path + '.tmp.mp4', path)
    else: raise SystemExit('ffmpeg error ' + path)

def build(dirn, out, outro=None):
    dirn = os.path.abspath(dirn); tl = json.load(open(f'{dirn}/timeline.json'))
    for e in tl:
        if e['t'] == 'outro' and outro: e.update(outro)
    scs = scenes(tl); files = []
    for i, sc in enumerate(scs):
        f = f'{dirn}/scene{i:02d}.mp4'; render_scene(sc, f); files.append(f); print('scene', i, flush=True)
    with open(f'{dirn}/list.txt', 'w') as fh:
        for f in files: fh.write(f"file '{f}'\n")
    subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{dirn}/list.txt', '-c', 'copy', '-movflags', '+faststart', out])
    print('ok', out)

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else None)
