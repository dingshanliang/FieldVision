#!/usr/bin/env bash
# Reproducibly convert the 1K source PBR textures to KTX2 (Basis), the documented
# #1 asset lever to take public/assets from ~22 MB toward the ≤8 MB budget
# (dev-baseline-perf-budget.md §3.1/§5.3, ticket fv-66y.10).
#
# Requires KTX-Software's `toktx` in PATH:  https://github.com/KhronosGroup/KTX-Software
#   macOS:  brew install ktx
#
# Per-texture-type settings (correctness, not just size):
#   *_Color.jpg        → ETC1S, sRGB OETF, mipmaps  (small; colour-tolerant)
#   *_NormalGL.jpg     → UASTC,  linear OETF, mipmaps (precision; normals must not band)
#   *_Roughness.jpg    → UASTC,  linear OETF, mipmaps (data map; keep linear)
# NOTE: toktx flag names vary across KTX-Software versions; verify with `toktx --help`
# on your install (e.g. older builds use --qlevel, newer use --encode/--qlevel).
set -euo pipefail

command -v toktx >/dev/null 2>&1 || {
  echo "ERROR: 'toktx' not found. Install KTX-Software (macOS: 'brew install kkg' → 'brew install ktx')." >&2
  exit 1
}

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/public/assets/textures/source"

etc1s_srgb() { # <in> <out>
  toktx --bcmp --genmipmap --assign_oetf srgb --encode etc1s --qlevel 200 "$2" "$1"
}
uastc_linear() { # <in> <out>
  toktx --uastc 1 --uastc_rdo --genmipmap --assign_oetf linear "$2" "$1"
}

echo "→ ETC1S (sRGB): colour maps"
find "$SRC" -type f -name "*_Color.jpg" -print0 | while IFS= read -r -d '' f; do
  etc1s_srgb "$f" "${f%.jpg}.ktx2"
  echo "   ${f#$SRC/}  →  $(du -h "${f%.jpg}.ktx2" | cut -f1)"
done

echo "→ UASTC (linear): normal + roughness maps"
find "$SRC" -type f \( -name "*_NormalGL.jpg" -o -name "*_Roughness.jpg" \) -print0 | while IFS= read -r -d '' f; do
  uastc_linear "$f" "${f%.jpg}.ktx2"
  echo "   ${f#$SRC/}  →  $(du -h "${f%.jpg}.ktx2" | cut -f1)"
done

echo "✓ KTX2 conversion complete. Before/after: du -sh '$SRC'"
