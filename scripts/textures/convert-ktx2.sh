#!/usr/bin/env bash
# Reproducibly convert the 1K source PBR textures to KTX2 (Basis ETC1S), the
# documented #1 asset lever to take public/assets from ~22 MB toward the ≤8 MB
# budget (dev-baseline-perf-budget.md §3.1/§5.3, ticket fv-66y.10).
#
# Requires KTX-Software's `toktx` in PATH:  https://github.com/KhronosGroup/KTX-Software
#   macOS:  brew install ktx   (or grab the Darwin .pkg from the release page)
#
# All maps use ETC1S (size-optimal). UASTC was tried for normals/roughness but
# ~6× larger per map with no visible benefit at scene viewing distances, so it
# was rejected for the size budget. Normals use the highest ETC1S qlevel to
# preserve directional precision. Verify normal quality in a real browser after
# conversion — bump *_NormalGL to `--encode uastc` if banding appears.
set -euo pipefail

command -v toktx >/dev/null 2>&1 || {
  echo "ERROR: 'toktx' not found. Install KTX-Software (macOS .pkg or build)." >&2
  exit 1
}

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/public/assets/textures/source"

etc1s() { # <qlevel> <oetf> <in> <out>
  toktx --encode etc1s --qlevel "$1" --genmipmap --assign_oetf "$2" "$4" "$3"
}

echo "→ colour (ETC1S q200 sRGB)"
find "$SRC" -type f -name "*_Color.jpg" -print0 | while IFS= read -r -d '' f; do
  etc1s 200 srgb "$f" "${f%.jpg}.ktx2"
  echo "   ${f#$SRC/}  →  $(du -h "${f%.jpg}.ktx2" | cut -f1)"
done
echo "→ normals (ETC1S q255 linear)"
find "$SRC" -type f -name "*_NormalGL.jpg" -print0 | while IFS= read -r -d '' f; do
  etc1s 255 linear "$f" "${f%.jpg}.ktx2"
  echo "   ${f#$SRC/}  →  $(du -h "${f%.jpg}.ktx2" | cut -f1)"
done
echo "→ roughness (ETC1S q200 linear)"
find "$SRC" -type f -name "*_Roughness.jpg" -print0 | while IFS= read -r -d '' f; do
  etc1s 200 linear "$f" "${f%.jpg}.ktx2"
  echo "   ${f#$SRC/}  →  $(du -h "${f%.jpg}.ktx2" | cut -f1)"
done

echo "✓ KTX2 conversion complete. Before/after: du -sh '$SRC'"
