#!/usr/bin/env bash
#
# Image pipeline for the portfolio.
#
# The pixel art is generated wide (about 1400x768, with an 8px grid baked in),
# cut down to a real pixel grid with a box filter, then forced onto one 35-colour
# palette shared by every image on the page, so four separate generations still
# look like one artist made them. No dithering: dither noise is not pixel art.
#
#   tools/build-images.sh path/to/meadowlight_raw.png meadowlight 352
#
# Writes assets/img/<name>.png at the width you pass (352 for covers, 176 for
# the portrait) with 8-bit palette output.

set -euo pipefail
cd "$(dirname "$0")/.."

src="${1:?usage: build-images.sh <raw.png> <name> [width]}"
name="${2:?usage: build-images.sh <raw.png> <name> [width]}"
width="${3:-352}"

mkdir -p assets/img

convert "$src" \
  -filter box -resize "${width}x" \
  +dither -remap tools/palette.png \
  -strip "PNG8:assets/img/${name}.png"

printf '%s\n' "assets/img/${name}.png"
identify "assets/img/${name}.png"

# The sprite mark and the display font come from the same 5x7 face:
#
#   node tools/pixelfont.mjs --sprite tools/avatar.sprite.json \
#     --out assets/svg/mark.svg --scale 2
#   node tools/pixelfont.mjs --dump-glyphs > /tmp/glyphs.json
#   python3 tools/build-font.py /tmp/glyphs.json assets/fonts
#
# Preview either without a browser:
#
#   python3 tools/preview.py assets/svg/mark.svg /tmp/mark.png 8
