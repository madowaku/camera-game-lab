"""Package Imagegen alpha sprites without repainting any generated artwork."""
from pathlib import Path
from collections import deque
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'src' / 'hook' / 'assets'
im = Image.open(root / 'fish-atlas-v2.png').convert('RGBA')
w, h = im.size
alpha = im.getchannel('A').tobytes()
visited = bytearray(w * h)
components = []
for start, opacity in enumerate(alpha):
    if opacity < 20 or visited[start]:
        continue
    queue = deque([start]); visited[start] = 1
    pixels = []; x0, y0, x1, y1 = w, h, 0, 0
    while queue:
        i = queue.popleft(); x, y = i % w, i // w
        pixels.append(i); x0, y0 = min(x0, x), min(y0, y)
        x1, y1 = max(x1, x), max(y1, y)
        for j in (i-w, i+w, i-1 if x else -1, i+1 if x+1 < w else -1):
            if 0 <= j < w*h and not visited[j] and alpha[j] >= 20:
                visited[j] = 1; queue.append(j)
    if len(pixels) > 1000:
        components.append((len(pixels), (x0, y0, x1+1, y1+1), pixels))
print('Alpha components:', [(c[0], c[1]) for c in components])
selected = sorted(sorted(components, reverse=True)[:5], key=lambda c: c[1][0])
assert len(selected) == 5, 'Expected five separate generated silhouettes'
for name, (_, bbox, pixels) in zip(('aji', 'tai', 'tuna', 'boot', 'human'), selected):
    # Connected objects may have overlapping bounding boxes. Preserve only this
    # object's original pixels, including the adjacent antialiased edge.
    mask = bytearray(w*h)
    for i in pixels:
        mask[i] = 255
        for j in (i-w, i+w, i-1 if i%w else -1, i+1 if i%w+1 < w else -1):
            if 0 <= j < w*h: mask[j] = 255
    piece = im.copy()
    original = bytearray(alpha)
    for i in range(w*h):
        if not mask[i]: original[i] = 0
    piece.putalpha(Image.frombytes('L', (w,h), bytes(original)))
    piece = piece.crop((max(0,bbox[0]-2), max(0,bbox[1]-2), min(w,bbox[2]+2), min(h,bbox[3]+2)))
    piece.thumbnail((640,440), Image.Resampling.LANCZOS)
    piece.save(root / f'{name}-v1.webp', quality=92)
    print(name, bbox, piece.size)
