"""Normalize the four ImageGen modular sheets; preserve their RGBA cutouts."""
import json
import sys
from pathlib import Path
from PIL import Image

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[2] / "public/artwork/guardian"
target.mkdir(parents=True, exist_ok=True)
parts = {
    "warden": ("exec-dddd67a3-9a49-47ea-9a56-392b0447f2ea.png", [(0, 0, 710, 640), (735, 0, 1254, 690), (185, 645, 505, 1254), (705, 690, 1230, 1254)]),
    "luna": ("exec-6734c3fa-9079-4336-949a-9ba0a5537fbc.png", [(0, 0, 675, 630), (760, 0, 1130, 625), (215, 638, 500, 1254), (700, 660, 1230, 1240)]),
    "moss": ("exec-eb90d480-7dfb-459c-82d2-d17e69eb0715.png", [(90, 0, 590, 650), (795, 0, 1140, 630), (185, 655, 535, 1254), (710, 700, 1210, 1240)]),
    "kitsu": ("exec-bc1f5117-8cb3-4bd6-88c9-02c1324f755c.png", [(60, 0, 650, 685), (740, 0, 1160, 675), (185, 695, 505, 1254), (700, 695, 1240, 1240)]),
}
report = []
for name, (filename, regions) in parts.items():
    original = Image.open(source / filename).convert("RGBA")
    atlas = Image.new("RGBA", (1024, 1024))
    for index, region in enumerate(regions):
        part = original.crop(region)
        bounds = part.getchannel("A").point(lambda value: 255 if value > 30 else 0).getbbox()
        if bounds is None:
            raise ValueError(f"Empty {name} part {index}")
        part = part.crop(bounds)
        # Standard vertical segment proportions and generous inter-cell padding.
        box = [(448, 448), (224, 448), (224, 448), (360, 360)][index]
        if index in (0, 3):
            part.thumbnail(box, Image.Resampling.LANCZOS)
        else:
            part = part.resize(box, Image.Resampling.LANCZOS)
        x, y = index % 2 * 512 + (512 - part.width) // 2, index // 2 * 512 + (512 - part.height) // 2
        atlas.alpha_composite(part, (x, y))
    path = target / f"{name}-parts-v1.webp"
    atlas.save(path, quality=90, method=6)
    report.append({"spirit": name, "bytes": path.stat().st_size, "alpha": atlas.getchannel("A").getextrema()})
print(json.dumps(report))
