#!/usr/bin/env python3
"""
scripts/generate-favicons.py

Generates production-grade multi-resolution favicons and touch icons
from /public/brand/vouch-logo.png for Next.js App Router and cross-browser support.

Outputs:
  - public/favicon.ico (multi-resolution: 16x16, 32x32, 48x48)
  - app/favicon.ico (for Next.js 13+ App Router automatic detection)
  - public/favicon-16x16.png (16x16 transparent PNG)
  - public/favicon-32x32.png (32x32 transparent PNG)
  - public/icon.png (512x512 high-resolution transparent PNG)
  - app/icon.png (for Next.js App Router automatic detection)
  - public/apple-touch-icon.png (180x180 solid dark void #090A0F with ambient glow)
  - app/apple-icon.png (for Next.js App Router iOS icon detection)
"""

import os
from PIL import Image, ImageEnhance

def generate_favicons():
    source_path = "public/brand/vouch-logo.png"
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Source logo not found at {source_path}")

    print(f"[favicon] Loading source image: {source_path}")
    im = Image.open(source_path)
    w, h = im.size

    # Background color in the source hero image corners
    bg_color = (27, 36, 45)
    im_rgba = im.convert("RGBA")

    # 1. Cleanly isolate V mark strokes from background haze
    clean_data = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = im_rgba.getpixel((x, y))
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            dr = r - bg_color[0]
            dg = g - bg_color[1]
            db = b - bg_color[2]
            dist = (dr * dr + dg * dg + db * db) ** 0.5

            # Mask out background haze outside the mark envelope
            is_in_envelope = True
            if x > 1420 and y < 450:
                is_in_envelope = False
            if x > 1480 or x < 150:
                is_in_envelope = False
            if y > 1850 or y < 150:
                is_in_envelope = False

            if not is_in_envelope or lum < 52 or dist < 32:
                alpha = 0
            elif lum < 78 or dist < 55:
                alpha = int(255 * (lum - 52) / 26)
            else:
                alpha = 255

            clean_data.append((r, g, b, alpha))

    cleaned = Image.new("RGBA", (w, h))
    cleaned.putdata(clean_data)

    # 2. Crop tightly to the non-zero alpha bounding box
    bbox = cleaned.split()[-1].getbbox()
    print(f"[favicon] V mark bounding box: {bbox}")
    mark = cleaned.crop(bbox)

    # 3. Boost contrast and saturation for small-scale visibility
    r, g, b, a = mark.split()
    # Lift shadows via gamma curve
    boost_curve = lambda val: int(min(255, max(0, ((val / 255.0) ** 0.65) * 255)))
    boosted = Image.merge("RGBA", (r.point(boost_curve), g.point(boost_curve), b.point(boost_curve), a))
    boosted = ImageEnhance.Color(boosted).enhance(1.25)
    boosted = ImageEnhance.Contrast(boosted).enhance(1.10)

    # 4. Master 512x512 centered transparent icon
    # Optical centering: leave balanced 10% breathing room
    mw, mh = boosted.size
    max_dim = max(mw, mh)
    target_mark_dim = int(512 * 0.82)
    scale_512 = target_mark_dim / max_dim
    scaled_w = int(round(mw * scale_512))
    scaled_h = int(round(mh * scale_512))
    scaled_mark = boosted.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)

    icon_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    offset_x = (512 - scaled_w) // 2
    offset_y = (512 - scaled_h) // 2 + 6 # slight optical vertical nudge
    icon_512.paste(scaled_mark, (offset_x, offset_y), scaled_mark)

    # 5. Generate transparent sizes
    icon_48 = icon_512.resize((48, 48), Image.Resampling.LANCZOS)
    icon_32 = icon_512.resize((32, 32), Image.Resampling.LANCZOS)
    icon_16 = icon_512.resize((16, 16), Image.Resampling.LANCZOS)

    # 6. Generate apple-touch-icon (180x180) with solid dark void (#090A0F) + ambient glow
    apple_canvas = Image.new("RGBA", (180, 180), (9, 10, 15, 255))
    glow = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
    for y in range(180):
        for x in range(180):
            dx = x - 90
            dy = y - 90
            dist = (dx * dx + dy * dy) ** 0.5
            if dist < 80:
                intensity = int(110 * (1 - dist / 80) ** 1.5)
                glow.putpixel((x, y), (139, 115, 224, intensity))
    apple_composite = Image.alpha_composite(apple_canvas, glow)
    apple_mark = icon_512.resize((140, 140), Image.Resampling.LANCZOS)
    apple_composite.paste(apple_mark, (20, 20), apple_mark)

    # 7. Write assets to public/ and app/ directories
    os.makedirs("public", exist_ok=True)
    os.makedirs("app", exist_ok=True)

    # PNG assets in public
    icon_16.save("public/favicon-16x16.png", optimize=True)
    icon_32.save("public/favicon-32x32.png", optimize=True)
    icon_512.save("public/icon.png", optimize=True)
    apple_composite.save("public/apple-touch-icon.png", optimize=True)

    # Multi-resolution favicon.ico in public and app
    icon_512.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    icon_512.save("app/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    # App router auto-detection icons
    icon_512.save("app/icon.png", optimize=True)
    apple_composite.save("app/apple-icon.png", optimize=True)

    print("[favicon] Successfully generated all favicon assets:")
    print("  - public/favicon.ico (16x16, 32x32, 48x48 multi-res)")
    print("  - app/favicon.ico")
    print("  - public/favicon-16x16.png")
    print("  - public/favicon-32x32.png")
    print("  - public/icon.png (512x512)")
    print("  - app/icon.png (512x512)")
    print("  - public/apple-touch-icon.png (180x180)")
    print("  - app/apple-icon.png (180x180)")

if __name__ == "__main__":
    generate_favicons()
