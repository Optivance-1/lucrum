#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUT="project_singlefile/PROJECT_SINGLEFILE.md"
FILES=(
  "README.md"
  "package.json"
  "next.config.js"
  "tailwind.config.js"
  "postcss.config.js"
  "tsconfig.json"
  "src/app/layout.tsx"
  "src/app/globals.css"
  "src/app/page.tsx"
  "src/app/connect/page.tsx"
  "src/app/dashboard/layout.tsx"
  "src/app/dashboard/page.tsx"
  "src/app/api/stripe/connect/route.ts"
  "src/app/api/stripe/data/route.ts"
  "src/app/api/stripe/disconnect/route.ts"
  "src/app/api/stripe/webhook/route.ts"
  "src/app/api/ai/cfo/route.ts"
  "src/app/api/ai/insights/route.ts"
  "src/hooks/useStripeData.ts"
  "src/lib/stripe.ts"
  "src/lib/utils.ts"
  "src/types/index.ts"
)

{
  echo "# Lucrum Project Singlefile"
  echo
  echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo
  echo "This file stitches together the core files (the 'heart') of the Lucrum codebase for AI review."
  echo
  echo "## Included Files"
  for f in "${FILES[@]}"; do
    printf -- "- %s\n" "$f"
  done

  for f in "${FILES[@]}"; do
    ext="txt"
    case "$f" in
      *.ts) ext="ts" ;;
      *.tsx) ext="tsx" ;;
      *.js) ext="js" ;;
      *.json) ext="json" ;;
      *.css) ext="css" ;;
      *.md) ext="md" ;;
    esac

    echo
    echo "---"
    echo
    echo "## FILE: $f"
    echo
    printf '```%s\n' "$ext"
    cat "$f"
    echo
    echo '```'
  done
} > "$OUT"

echo "Wrote $OUT"
