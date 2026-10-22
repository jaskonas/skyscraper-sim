"""Builds public/textures/ from CC0 Poly Haven textures.

Each material becomes two small JPEGs:
  detail.jpg  greyscale luminance, mean 0.5 and its light/dark spread evened out between materials
              (the game multiplies the palette colour by it)
  normal.jpg  OpenGL-convention normal map

Run from the repo root, in any Python 3 with Pillow and numpy:
  python3 -m venv /tmp/tex && /tmp/tex/bin/pip install pillow numpy
  /tmp/tex/bin/python scripts/textures/build_textures.py
"""
import io
import json
import os
import urllib.request

import numpy as np
from PIL import Image

# id: (Poly Haven asset, real tile size in metres — informational; the game's copy is in src/scene/materials/library.ts)
SOURCES = {
    "brick-red": ("red_brick_03", 1.0),
    "brick-buff": ("yellow_brick", 2.0),
    "limestone": ("white_sandstone_blocks_02", 2.0),
    "granite": ("granite_tile", 2.3),
    "terracotta": ("rectangular_facade_tiles_02", 2.1),
    "concrete-board": ("wood_textured_concrete", 1.8),
    "concrete-precast": ("precast_concrete_wall", 1.59),
    "metal-panel": ("metal_plate_02", 2.0),
    "copper": ("green_metal_rust", 1.0),
    "wood": ("weathered_planks", 2.0),
    "roofing": ("tarred_gravel", 2.2),
    "paving": ("concrete_pavers", 1.92),
}
SIZE = 512
# Light/dark spread (standard deviation) every detail map is brought to, so a faint photo (smooth concrete)
# and a busy one (brick) start equal; each material's contrast in library.ts then sets how strong it reads.
TARGET_SPREAD = 0.12
MAX_GAIN = 3.0
OUT = os.path.join("public", "textures")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "skyscraper-sim texture build"})
    with urllib.request.urlopen(req) as r:
        return r.read()


def main() -> None:
    credits = []
    for tex_id, (asset, size_m) in SOURCES.items():
        files = json.loads(fetch(f"https://api.polyhaven.com/files/{asset}"))
        diff = Image.open(io.BytesIO(fetch(files["Diffuse"]["1k"]["jpg"]["url"]))).convert("RGB")
        nor = Image.open(io.BytesIO(fetch(files["nor_gl"]["1k"]["jpg"]["url"]))).convert("RGB")
        rgb = np.asarray(diff, dtype=np.float32) / 255.0
        lum = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
        lum = lum * (0.5 / max(lum.mean(), 1e-3))
        gain = min(MAX_GAIN, TARGET_SPREAD / max(lum.std(), 1e-3))
        lum = np.clip(0.5 + (lum - 0.5) * gain, 0.0, 1.0)
        detail = Image.fromarray((lum * 255.0 + 0.5).astype(np.uint8), "L").resize((SIZE, SIZE), Image.LANCZOS)
        os.makedirs(os.path.join(OUT, tex_id), exist_ok=True)
        detail.save(os.path.join(OUT, tex_id, "detail.jpg"), quality=85, optimize=True)
        nor.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(OUT, tex_id, "normal.jpg"), quality=88, optimize=True)
        credits.append(f"| {tex_id} | [{asset}](https://polyhaven.com/a/{asset}) | {size_m} m |")
        print(tex_id, "ok")
    with open(os.path.join(OUT, "LICENSES.md"), "w") as f:
        f.write("# Texture credits\n\n")
        f.write("All textures are from [Poly Haven](https://polyhaven.com) and are **CC0** (public domain). ")
        f.write("They were reduced to a greyscale detail map and a normal map by `scripts/textures/build_textures.py`.\n\n")
        f.write("| Material | Poly Haven asset | Real size |\n|---|---|---|\n")
        f.write("\n".join(credits) + "\n")


if __name__ == "__main__":
    main()
