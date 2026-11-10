#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo 'Usage: apply-phase-prompts.sh "/absolute/path/to/project" --dry-run|--apply' >&2
  exit 2
}
[[ $# -eq 2 ]] || usage
repo="$1"
mode="$2"
[[ "$mode" == "--dry-run" || "$mode" == "--apply" ]] || usage
[[ -d "$repo/codex" && -f "$repo/AGENTS.md" ]] || { echo "Not a recognized Tech Explainer Studio repo: $repo" >&2; exit 1; }
package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$package_dir/overrides/codex"
[[ -d "$src" ]] || { echo "Missing package phase prompts: $src" >&2; exit 1; }

count=0
backup=""
if [[ "$mode" == "--apply" ]]; then
  stamp="$(date '+%Y%m%d-%H%M%S')"
  backup="$repo/.phase-prompt-backup-v4-$stamp"
  if [[ -e "$backup" ]]; then echo "Backup directory exists, aborting: $backup" >&2; exit 1; fi
  mkdir "$backup"
  echo "Backups will be saved to: $backup"
fi
for from in "$src"/*.md; do
  name="$(basename "$from")"
  case "$name" in
    06-*|07-*|08-*|09-*|10-*|11-*|12-*|13-*|14-*) ;;
    *) echo "Unexpected prompt $name" >&2; exit 1 ;;
  esac
  dest="$repo/codex/$name"
  if [[ -f "$dest" ]] && cmp -s "$from" "$dest"; then
    echo "UNCHANGED $dest"
    continue
  fi
  if [[ -f "$dest" ]]; then
    echo "REPLACE   $dest"
  else
    echo "CREATE    $dest"
  fi
  if [[ "$mode" == "--apply" ]]; then
    if [[ -f "$dest" ]]; then cp -p "$dest" "$backup/$name"; fi
    cp "$from" "$dest"
  fi
  count=$((count + 1))
done
printf '%s changes %s\n' "$count" "$( [[ "$mode" == "--apply" ]] && echo applied || echo proposed )"
if [[ "$mode" == "--apply" ]]; then
  echo "NOTE: roadmap/docs amendments NOT applied. Merge docs-amendments separately."
  echo "Review: (cd \"$repo\" && git diff -- codex/)"
fi
