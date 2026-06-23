#!/usr/bin/env bash
# Build scholar-search.xpi from the plugin sources.
#
# A Zotero plugin xpi is just a zip with manifest.json at its root. There is no
# compile step — this script simply packages the runtime files.
set -euo pipefail

cd "$(dirname "$0")"

OUT="scholar-search.xpi"
FILES=(
  manifest.json
  bootstrap.js
  preferences.xhtml
  preferences.js
  icons/icon.svg
)

rm -f "$OUT"
# -X strips extra file attributes for a clean, reproducible archive.
zip -X -r "$OUT" "${FILES[@]}"

echo "Built $OUT"
unzip -l "$OUT"
