"""Safe-zone check for 9:16 videos and frames (the rules: docs/SAFE_ZONE.md; final_qa runs this on every draft and final).

Paints the no-go areas red, draws Instagram's own buttons, caption and trial-reel pill on top in white, and tiles the
sampled frames into one contact sheet you can open and look at.

  python check.py reel.mp4                    one frame every 1.5 s (at most 36), sheet -> reel_safezone.png
  python check.py reel.mp4 --every 3          one frame every 3 s
  python check.py reel.mp4 --times 0.5,12,31  only these moments (seconds)
  python check.py frames_dir/  or  still.png  frames or stills instead of a video
  python check.py --zones                     redraw zones.png (the reference picture in GUIDE.md)
"""
import argparse
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
SAFE = (120, 270, 960, 1480)          # all text and key visuals
RAIL_X, RAIL_Y = 860, 900             # from y 900 down, stay left of x 860
CAP = (220, 1180, 860, 1440)          # caption / subtitle box
PHONE_CROP = 52                       # px lost per side on a tall iPhone (measured 27 Oct 2026)
MAX_TILES = 36


def font(size):
    for f in ('C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found')


def duration(path):
    out = subprocess.run([ffmpeg(), '-i', path], capture_output=True, text=True).stderr
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0


def grab(path, t, out):
    subprocess.run([ffmpeg(), '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', out], check=True)


def overlay(img):
    """The frame with the red no-go areas, the safe frame outline and Instagram's UI drawn on top."""
    base = img.convert('RGBA').resize((W, H))
    red = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(red)
    no = (255, 30, 30, 95)
    d.rectangle([0, 0, W, SAFE[1]], no)
    d.rectangle([0, SAFE[3], W, H], no)
    d.rectangle([0, SAFE[1], SAFE[0], SAFE[3]], no)
    d.rectangle([SAFE[2], SAFE[1], W, SAFE[3]], no)
    d.rectangle([RAIL_X, RAIL_Y, SAFE[2], SAFE[3]], no)
    out = Image.alpha_composite(base, red)

    ui = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    u = ImageDraw.Draw(ui)
    white, soft = (255, 255, 255, 235), (255, 255, 255, 120)
    # safe frame (green, with the notch for the rail) and the caption box (yellow, dashed)
    u.line([(SAFE[0], SAFE[1]), (SAFE[2], SAFE[1]), (SAFE[2], RAIL_Y), (RAIL_X, RAIL_Y), (RAIL_X, SAFE[3]),
            (SAFE[0], SAFE[3]), (SAFE[0], SAFE[1])], fill=(60, 255, 120, 255), width=5)
    for x in range(CAP[0], CAP[2], 28):
        u.line([(x, CAP[1]), (min(x + 14, CAP[2]), CAP[1])], fill=(255, 220, 60, 255), width=4)
        u.line([(x, CAP[3]), (min(x + 14, CAP[2]), CAP[3])], fill=(255, 220, 60, 255), width=4)
    for y in range(CAP[1], CAP[3], 28):
        u.line([(CAP[0], y), (CAP[0], min(y + 14, CAP[3]))], fill=(255, 220, 60, 255), width=4)
        u.line([(CAP[2], y), (CAP[2], min(y + 14, CAP[3]))], fill=(255, 220, 60, 255), width=4)
    # phone crop on tall iPhones
    for x in (PHONE_CROP, W - PHONE_CROP):
        for y in range(0, H, 40):
            u.line([(x, y), (x, y + 20)], fill=soft, width=3)
    # header: back chevron, title, camera
    u.line([(105, 175), (80, 205), (105, 235)], fill=white, width=7)
    u.text((W / 2, 205), 'Reels', font=font(50), fill=white, anchor='mm')
    u.line([(975, 180), (975, 230)], fill=white, width=7)
    u.line([(950, 205), (1000, 205)], fill=white, width=7)
    # the button rail with counts
    for y in (1020, 1193, 1373, 1490, 1665, 1824):
        u.ellipse([953 - 36, y - 36, 953 + 36, y + 36], outline=white, width=7)
        if y not in (1373, 1824):
            u.text((953, y + 70), '65', font=font(36), fill=white, anchor='mm')
    # trial-reel responses pill
    u.rounded_rectangle([90, 1570, 510, 1650], radius=24, fill=(40, 40, 40, 170), outline=soft, width=3)
    u.text((130, 1610), 'View · 12 responses', font=font(38), fill=white, anchor='lm')
    # profile row and caption line
    u.ellipse([78, 1693, 182, 1797], outline=white, width=7)
    u.text((210, 1745), 'yourpage', font=font(46), fill=white, anchor='lm')
    u.text((60, 1855), 'Caption text sits here and runs on to the next…', font=font(38), fill=white, anchor='lm')
    return Image.alpha_composite(out, ui).convert('RGB')


def sheet(frames, labels, out, tile_w=300):
    tile_h = round(tile_w * H / W)
    cols = min(6, len(frames))
    rows = -(-len(frames) // cols)
    gap, lab = 10, 34
    S = Image.new('RGB', (cols * (tile_w + gap) + gap, rows * (tile_h + lab + gap) + gap), (24, 24, 24))
    d = ImageDraw.Draw(S)
    for i, (f, l) in enumerate(zip(frames, labels)):
        x = gap + (i % cols) * (tile_w + gap)
        y = gap + (i // cols) * (tile_h + lab + gap)
        S.paste(overlay(f).resize((tile_w, tile_h), Image.LANCZOS), (x, y + lab))
        d.text((x + 4, y + 4), l, font=font(24), fill=(230, 230, 230))
    S.save(out)
    return out


def zones_png(out):
    bg = Image.new('RGB', (W, H), (70, 78, 92))
    d = ImageDraw.Draw(bg)
    for y in range(0, H, 120):
        for x in range(0, W, 120):
            if (x // 120 + y // 120) % 2:
                d.rectangle([x, y, x + 119, y + 119], (78, 86, 100))
    img = overlay(bg)
    d = ImageDraw.Draw(img)
    d.text((540, 620), 'SAFE: text + key visuals', font=font(50), fill=(60, 255, 120), anchor='mm')
    d.text((540, 690), 'x 120-960 · y 270-1480', font=font(40), fill=(255, 255, 255), anchor='mm')
    d.text((540, 1000), 'from y 900: left of x 860', font=font(40), fill=(255, 255, 255), anchor='mm')
    d.text((540, 1310), 'CAPTIONS y 1180-1440, ≤ 640 wide', font=font(36), fill=(255, 220, 60), anchor='mm')
    img.resize((540, 960), Image.LANCZOS).save(out)
    return out


def main():
    ap = argparse.ArgumentParser(description='9:16 safe-zone contact sheet')
    ap.add_argument('src', nargs='?')
    ap.add_argument('--every', type=float, default=1.5, help='seconds between sampled frames (video)')
    ap.add_argument('--times', help='comma-separated seconds to sample instead of --every')
    ap.add_argument('--out', help='sheet path (default: <input>_safezone.png)')
    ap.add_argument('--zones', action='store_true', help='redraw zones.png for GUIDE.md')
    a = ap.parse_args()

    if a.zones:
        print(zones_png(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'zones.png')))
        return
    if not a.src:
        ap.error('give a video, an image or a folder of frames')
    src = os.path.abspath(a.src)
    out = a.out or (src.rstrip('\\/') + '_safezone.png' if os.path.isdir(src) else os.path.splitext(src)[0] + '_safezone.png')

    frames, labels = [], []
    if os.path.isdir(src):
        files = sorted(glob.glob(os.path.join(src, '*.png')) + glob.glob(os.path.join(src, '*.jpg')))
        if len(files) > MAX_TILES:
            print(f'{len(files)} frames: sampling {MAX_TILES} evenly')
            files = [files[round(i * (len(files) - 1) / (MAX_TILES - 1))] for i in range(MAX_TILES)]
        frames = [Image.open(f) for f in files]
        labels = [os.path.basename(f) for f in files]
    elif src.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        frames, labels = [Image.open(src)], [os.path.basename(src)]
    else:
        if a.times:
            times = [float(t) for t in a.times.split(',')]
        else:
            dur = duration(src)
            step = max(a.every, dur / MAX_TILES)
            if step > a.every:
                print(f'{dur:.1f} s video: one frame every {step:.2f} s to stay at {MAX_TILES} tiles')
            times, t = [], step / 2
            while t < dur:
                times.append(t)
                t += step
        tmp = tempfile.mkdtemp(prefix='safezone_')
        try:
            for i, t in enumerate(times):
                p = os.path.join(tmp, f'{i:03d}.png')
                grab(src, t, p)
                frames.append(Image.open(p).copy())
                labels.append(f'{t:.1f}s')
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    w, h = frames[0].size
    if abs(w / h - W / H) > 0.01:
        print(f'WARNING: {w}x{h} is not 9:16; frames are stretched to 1080x1920 for the check')
    print(sheet(frames, labels, out))


if __name__ == '__main__':
    main()
