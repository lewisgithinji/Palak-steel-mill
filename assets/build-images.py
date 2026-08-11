#!/usr/bin/env python3
"""Regenerate the site's brand + photography assets from the originals.

    python assets/build-images.py

Reads assets/source/*, writes public/. Requires only Pillow (pip install pillow).
Re-run this if better originals arrive - the crop table below is the source of
truth for every derived image, so swapping in a higher-resolution photo is a
one-line change plus a re-run.

Originals as supplied:
  psml-logo-original.jpeg  1076x1077, artwork on a near-uniform #070739 navy
                           field. Badge circle x 267-808, y 266-808; the full
                           lockup incl. ribbon is x 201-875, y 266-815 - barely
                           60% of the canvas, so everything is cropped tight.
  mill1-4.jpeg             685x1600 WhatsApp re-compressions with black
                           letterbox bars. mill2 is a screenshot of a *video*,
                           so beyond the gallery chrome it carries in-frame
                           player overlays from y~1085 down.
"""
import os
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "source")
PUB = os.path.join(ROOT, "public")
IMG = os.path.join(PUB, "images")

NAVY = (7, 7, 57)
SS = 4  # supersample factor for antialiased rounded corners

# --- logo crops ---------------------------------------------------------------
# The nav/footer mark is deliberately NON-SQUARE. At a 40px height the complete
# lockup in a 49x40 chip renders the badge ~23% larger than forcing it into a
# 40x40 square, and keeps the ribbon intact instead of clipping its ends.
CROP_WIDE = (186, 251, 890, 830)    # 704x579 - complete lockup + small pad
CROP_SQUARE = (190, 193, 886, 889)  # 696x696 - same lockup, padded to square
CROP_OG = (0, 258, 1076, 823)       # 1076x565 - 1.91:1 card, real pixels only

# --- photo crops --------------------------------------------------------------
# Picked off a coordinate grid, not centre-cropped: the subjects sit off-centre
# and a naive centre crop decapitates them. Aspect assignment is deliberate -
# mill1's glowing bar runs horizontally so it reads wide, while mill3's ladle
# needs vertical room or it degrades into a grey mass with the pour cropped to a
# sliver. mill3 sits bottom-right in the mosaic where the red "25+" badge
# overlaps; its grey vessel gives the badge contrast mill4's orange would not.
PHOTOS = [
    # output,                  src,     crop (x0,y0,x1,y1),   out w,h,   shadow, colour, contrast
    ("mill-rolling-stand.webp", "mill1", (0, 620, 685, 1134), (560, 420), 0.85, 1.10, 1.10),
    ("mill-cooling-bed.webp",   "mill2", (0, 430, 685,  944), (560, 420), 0.88, 1.08, 1.12),
    ("mill-melt-shop.webp",     "mill3", (0, 500, 685, 1185), (560, 560), 0.90, 1.10, 1.12),
    ("mill-quench.webp",        "mill4", (0, 250, 685,  935), (560, 560), 1.00, 1.05, 1.12),
    # about.html facility slot - a different window on mill2 so it does not echo
    # the mosaic tile. Ships at native width; there is no headroom to upscale.
    ("mill-floor.webp",         "mill2", (0, 260, 685,  774), (685, 514), 0.88, 1.08, 1.12),
]

MILL2_SAFE_BOTTOM = 1076  # below this, mill2's video player overlays begin

# --- product shots ------------------------------------------------------------
# tmt-palak.jpeg is 640x640 of coiled rebar carrying the "PALAK 12 B500" rolled-in
# engraving - the whole point of the shot, so the pipeline is tuned to keep that
# legible rather than to look punchy.
#
# ONE file feeds two different slots: .product-image (16:9) on the homepage card
# and .product-img (4:3) on the products page, both object-fit:cover. So it ships
# at 4:3 and the crop is chosen to sit the engraving at ~48% height, which keeps
# it inside the 16:9 centre-crop too.
#
# Measured on the source: sharp detail lives in y 240-480, the top and bottom
# ~80px are out-of-focus background, median luminance is a dark 86, and there is
# a slight cool cast (B 99.5 vs R 95.4) that reads blue rather than like steel.
PRODUCTS = [
    # output,             src,          crop,                 out w,h,   gamma, contrast, saturation, warm
    ("tmt-rebars-palak.webp", "tmt-palak",  (0, 120, 640, 600), (640, 480), 0.88, 1.10, 0.94, 4),
]


def polish_logo(im):
    im = ImageEnhance.Color(im).enhance(1.08)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    return im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=60, threshold=3))


def rounded(im, radius_frac=0.22):
    """Antialiased rounded-rect alpha mask; radius relative to the short side."""
    w, h = im.size
    m = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (0, 0, w * SS - 1, h * SS - 1),
        radius=int(min(w, h) * SS * radius_frac), fill=255)
    im = im.convert("RGBA")
    im.putalpha(m.resize((w, h), Image.LANCZOS))
    return im


def shadow_lift(im, gamma):
    """Gamma-lift the lower tones only, tapering to identity by t=0.72.

    These frames pair near-clipped hot highlights with deep shadow, so a global
    brightness lift would blow the glow out entirely.
    """
    if gamma >= 0.999:
        return im
    lut = []
    for v in range(256):
        t = v / 255.0
        w = max(0.0, min(1.0, (0.72 - t) / 0.72))
        lut.append(round(255 * (t * (1 - w) + (t ** gamma) * w)))
    return im.point(lut * 3)


def blown_pct(im):
    r, g, b = im.convert("RGB").split()
    hits = sum(1 for p in zip(r.getdata(), g.getdata(), b.getdata())
               if p[0] >= 250 and p[1] >= 250 and p[2] >= 250)
    return 100.0 * hits / (im.width * im.height)


def fit(im, w, h):
    assert w <= im.width and h <= im.height, f"upscale refused: {w}x{h} > {im.size}"
    return im.resize((w, h), Image.LANCZOS)


def report(path, note=""):
    im = Image.open(path)
    print(f"  {os.path.relpath(path, ROOT):<38} {im.size[0]:>4}x{im.size[1]:<4} "
          f"{im.mode:<5} {os.path.getsize(path) / 1024:>7.1f} KB  {note}")


def build_logo():
    src = Image.open(os.path.join(SRC, "psml-logo-original.jpeg")).convert("RGB")
    wide = polish_logo(src.crop(CROP_WIDE))
    square = polish_logo(src.crop(CROP_SQUARE))

    mark = rounded(fit(wide, 512, round(512 * wide.height / wide.width)))
    mark.save(os.path.join(IMG, "psml-mark.webp"), format="WEBP", quality=92, method=6)
    report(os.path.join(IMG, "psml-mark.webp"), "nav 4rem / footer 2.75rem badge")

    for size, name in ((32, "favicon-32.png"), (192, "favicon-192.png")):
        rounded(fit(square, size, size)).save(
            os.path.join(PUB, name), format="PNG", optimize=True)
        report(os.path.join(PUB, name))

    # Manifest icon for install prompts and splash screens. Deliberately opaque
    # and palette-quantised: it is declared 'maskable', so the OS crops it to its
    # own shape and transparent corners would only produce ragged edges. Keeping
    # alpha here also cost 243KB versus ~40KB.
    fit(square, 512, 512).convert("RGB").quantize(colors=256, method=Image.MEDIANCUT).save(
        os.path.join(PUB, "favicon-512.png"), format="PNG", optimize=True)
    report(os.path.join(PUB, "favicon-512.png"), "manifest / maskable, no alpha")

    # Browsers, crawlers and bookmark tools still probe /favicon.ico at the root
    # regardless of the <link rel="icon"> tags, and it 404s without this.
    rounded(fit(square, 64, 64)).save(
        os.path.join(PUB, "favicon.ico"), format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)])
    report(os.path.join(PUB, "favicon.ico"), "legacy /favicon.ico probe")

    # Apple ignores transparency, so flatten the rounded corners onto the navy.
    # Having no alpha, this one can also be palette-quantized (~54% smaller with
    # no visible banding). The two favicons above deliberately are NOT: palette
    # quantization of RGBA conflates colour with alpha and turns opaque pixels
    # semi-transparent, which visibly washes the icon out.
    fit(square, 180, 180).convert("RGB").quantize(colors=256, method=Image.MEDIANCUT).save(
        os.path.join(PUB, "apple-touch-icon.png"), format="PNG", optimize=True)
    report(os.path.join(PUB, "apple-touch-icon.png"), "no alpha, by design")

    # og:image. Pasting the lockup onto a flat #070739 fill leaves a visible
    # seam - the source navy carries a soft radial gradient - so the card is cut
    # from real pixels and scaled 1.11x, imperceptible on a near-flat field.
    card = polish_logo(src.crop(CROP_OG)).resize((1200, 630), Image.LANCZOS)
    card.save(os.path.join(IMG, "psml-logo.webp"), format="WEBP", quality=88, method=6)
    report(os.path.join(IMG, "psml-logo.webp"), "og:image + JSON-LD logo")


def build_photos():
    for name, stem, crop, (ow, oh), sgamma, colour, contrast in PHOTOS:
        src = Image.open(os.path.join(SRC, f"{stem}.jpeg")).convert("RGB")
        x0, y0, x1, y1 = crop
        if stem == "mill2":
            assert y1 <= MILL2_SAFE_BOTTOM, \
                f"{name}: crop reaches the video overlays ({y1} > {MILL2_SAFE_BOTTOM})"
        assert abs((x1 - x0) / (y1 - y0) - ow / oh) < 0.02, \
            f"{name}: crop aspect does not match the output box"

        im = src.crop(crop)
        im = shadow_lift(im, sgamma)
        im = ImageEnhance.Contrast(im).enhance(contrast)
        im = ImageEnhance.Color(im).enhance(colour)
        im = fit(im, ow, oh)
        # WhatsApp softened all four; this is restoring detail, not over-sharpening.
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=3))

        blown = blown_pct(im)
        assert blown < 2.0, f"{name}: {blown:.2f}% blown highlights - ease off contrast/colour"

        path = os.path.join(IMG, name)
        im.save(path, format="WEBP", quality=82, method=6)
        report(path, f"from {stem} {crop}, {blown:.2f}% blown")


# --- stock imagery ------------------------------------------------------------
# Placeholder art that came with the build, kept until real photography replaces
# it. Every one shipped as a 1024x1024 square while being object-fit:cover'd into
# a 16:9 or 4:3 box, so a quarter to a third of every file was pixels the browser
# throws away. Cropping to the aspect each slot actually uses is free weight.
#
# Originals live in assets/source/stock/ - these are re-encodes of an already
# lossy source, so quality stays at 80 to limit generation loss. hero-bg is the
# exception: it sits under an 85% black overlay where 58 is indistinguishable.
STOCK = [
    # output,                  aspect crop -> size,  quality, note
    ("merchant-bars.webp",     (1024, 768), 80),   # .product-img, 4:3
    ("construction.webp",      (1024, 576), 80),   # .product-image, 16:9
    ("quality-testing.webp",   (1024, 768), 80),   # .about-img, 4:3
    ("hero-bg.webp",           (1024, 1024), 58),  # full-bleed, under a dark overlay
]


def build_stock():
    for name, (ow, oh), q in STOCK:
        src = Image.open(os.path.join(SRC, "stock", name)).convert("RGB")
        sw, sh = src.size
        # centre-crop to the target aspect - the browser was cropping exactly
        # this away anyway via object-fit: cover
        target = ow / oh
        if abs(sw / sh - target) > 0.01:
            if sw / sh > target:
                nw = int(sh * target)
                box = ((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh)
            else:
                nh = int(sw / target)
                box = (0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh)
            src = src.crop(box)
        im = fit(src, ow, oh) if (src.width, src.height) != (ow, oh) else src
        path = os.path.join(IMG, name)
        before = os.path.getsize(path)
        im.save(path, format="WEBP", quality=q, method=6)
        after = os.path.getsize(path)
        print(f"  {name:<26} {ow}x{oh:<5} q{q:<3} "
              f"{before/1024:6.1f} -> {after/1024:6.1f} KB  ({100*after/before:.0f}%)")


def build_products():
    for name, stem, crop, (ow, oh), gamma, contrast, sat, warm in PRODUCTS:
        src = Image.open(os.path.join(SRC, f"{stem}.jpeg")).convert("RGB")
        x0, y0, x1, y1 = crop
        assert abs((x1 - x0) / (y1 - y0) - ow / oh) < 0.02, \
            f"{name}: crop aspect does not match the output box"

        im = src.crop(crop)
        # A gamma curve, not ImageEnhance.Brightness: a flat multiply scales the
        # bright steel as well and clipped 5.8% of the frame in testing. Gamma
        # opens the midtones while leaving white essentially fixed.
        im = im.point([round(255 * (v / 255) ** gamma) for v in range(256)] * 3)
        im = ImageEnhance.Contrast(im).enhance(contrast)
        im = ImageEnhance.Color(im).enhance(sat)
        if warm:
            # Counter the cool cast so the steel reads neutral, not blue.
            r, g, b = im.split()
            r = r.point(lambda v: min(255, v + warm))
            b = b.point(lambda v: max(0, v - warm))
            im = Image.merge("RGB", (r, g, b))
        im = fit(im, ow, oh)
        # Tighter radius / higher amount than the mill shots: this has to resolve
        # stamped lettering, and a wide radius would halo the rib edges instead.
        im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=85, threshold=2))

        blown = blown_pct(im)
        assert blown < 2.0, f"{name}: {blown:.2f}% blown highlights"
        path = os.path.join(IMG, name)
        im.save(path, format="WEBP", quality=86, method=6)
        report(path, f"from {stem}, {blown:.2f}% blown")


if __name__ == "__main__":
    print("logo:")
    build_logo()
    print("\nphotography:")
    build_photos()
    print("\nproducts:")
    build_products()
    print("\nstock (cropped to the aspect each slot actually renders):")
    build_stock()
