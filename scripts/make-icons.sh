#!/usr/bin/env bash
# Regenerates every raster icon and splash screen from public/icon.svg.
#
# The artwork is a placeholder (an open book on paper) until there is a real
# identity; replace public/icon.svg and public/icon-maskable.svg, run this, and
# every size — web, iOS, Android — follows. Needs ImageMagick (`convert`) and a
# Chromium to rasterise the SVGs (CHROMIUM=/path/to/chrome, or the Playwright
# one at /opt/pw-browsers is found).
#
#   ./scripts/make-icons.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

PAPER="#F6F1E7"
SVG="public/icon.svg"
MASK="public/icon-maskable.svg"
R="android/app/src/main/res"

CHROMIUM="${CHROMIUM:-$(ls /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)}"
[ -x "$CHROMIUM" ] || { echo "no Chromium found; set CHROMIUM=/path/to/chrome" >&2; exit 1; }
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

# Rasterise an SVG once at 1024 (Chromium, transparent where the SVG is) and
# resize from that master, so every size is the same drawing.
master() { # svg -> png path
  local out="$WORK/$(basename "$1" .svg)-$RANDOM.png"
  "$CHROMIUM" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --default-background-color=00000000 --window-size=1024,1024 --screenshot="$out" "file://$(realpath "$1")" >/dev/null 2>&1
  echo "$out"
}
M_ICON="$(master "$SVG")"; M_MASK="$(master "$MASK")"
sed '/<rect/d' "$SVG" > "$WORK/mark.svg"; M_MARK="$(master "$WORK/mark.svg")"

render() { # svg size out  — the svg picks which master
  local src="$M_ICON"; [ "$1" = "$MASK" ] && src="$M_MASK"; [ "$1" = "mark" ] && src="$M_MARK"
  convert "$src" -resize "$2x$2" "$3"
}

# Web
render "$SVG"  192 public/icon-192.png
render "$SVG"  512 public/icon-512.png
render "$MASK" 512 public/icon-maskable-512.png
render "$SVG"  180 public/apple-touch-icon.png

# iOS: the icon is full-bleed and opaque; the splash is paper with the mark centred.
render "$SVG" 1024 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
mark="$WORK/m.png"; render mark 640 "$mark"
for f in splash-2732x2732 splash-2732x2732-1 splash-2732x2732-2; do
  convert -size 2732x2732 "xc:$PAPER" "$mark" -gravity center -composite \
    "ios/App/App/Assets.xcassets/Splash.imageset/$f.png"
done

# Android launcher: legacy square and round icons, and the adaptive foreground
# (the mark inside the central 66%, on transparent; the background colour is
# values/ic_launcher_background.xml).
declare -A LEGACY=( [mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192 )
declare -A FORE=(   [mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432 )
for d in "${!LEGACY[@]}"; do
  s=${LEGACY[$d]}; fs=${FORE[$d]}
  render "$SVG" "$s" "$R/mipmap-$d/ic_launcher.png"
  convert -size "${s}x${s}" xc:black -fill white -draw "circle $(( (s-1)/2 )),$(( (s-1)/2 )) $(( (s-1)/2 )),0" "$WORK/round-mask.png"
  convert "$R/mipmap-$d/ic_launcher.png" "$WORK/round-mask.png" -alpha off -compose CopyOpacity -composite \
    "$R/mipmap-$d/ic_launcher_round.png"
  inner=$((fs * 66 / 100))
  render mark "$inner" "$mark"
  convert -size "${fs}x${fs}" xc:none "$mark" -gravity center -composite "$R/mipmap-$d/ic_launcher_foreground.png"
done

# Android splash: paper with the mark centred, portrait and landscape.
splash() { # dims out
  local w=${1%x*} h=${1#*x}; local m=$(( (w < h ? w : h) * 40 / 100 ))
  render mark "$m" "$mark"
  convert -size "$1" "xc:$PAPER" "$mark" -gravity center -composite "$2"
}
for spec in port-mdpi:320x480 port-hdpi:480x800 port-xhdpi:720x1280 port-xxhdpi:960x1600 port-xxxhdpi:1280x1920 \
            land-mdpi:480x320 land-hdpi:800x480 land-xhdpi:1280x720 land-xxhdpi:1600x960 land-xxxhdpi:1920x1280; do
  splash "${spec#*:}" "$R/drawable-${spec%%:*}/splash.png"
done
splash 480x320 "$R/drawable/splash.png"
echo "icons regenerated"
