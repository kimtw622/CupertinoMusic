#!/usr/bin/env bash
# CupertinoMusic 을 macOS / Linux Spicetify 에 설치하고 적용한다.
# Windows 는 scripts/install.ps1 을 쓴다.
#
#   ./scripts/install.sh
#   ./scripts/install.sh Light
#   ./scripts/install.sh --no-restart
set -euo pipefail

SCHEME="Dark"
NO_APPLY=0
NO_RESTART=0

usage() {
  echo "usage: ./scripts/install.sh [Dark|Light] [--no-apply] [--no-restart]"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    Dark|Light) SCHEME="$1"; shift ;;
    --scheme)
      SCHEME="${2:-}"
      shift 2
      ;;
    --no-apply) NO_APPLY=1; shift ;;
    --no-restart) NO_RESTART=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "알 수 없는 인자: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ "$SCHEME" != "Dark" && "$SCHEME" != "Light" ]]; then
  echo "색상 스킴은 Dark 또는 Light 만 됩니다." >&2
  exit 1
fi

if ! command -v spicetify >/dev/null 2>&1; then
  echo "spicetify 를 찾을 수 없습니다." >&2
  echo "설치: https://spicetify.app/docs/advanced-usage/installation" >&2
  exit 1
fi

# spicetify 출력에 ANSI 색이 붙는 경우가 있어 지운 뒤 마지막 줄을 경로로 쓴다.
spicetify_last() {
  spicetify "$@" 2>/dev/null \
    | sed $'s/\x1b\\[[0-9;]*m//g' \
    | awk 'NF { line=$0 } END { print line }'
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
USERDATA="$(spicetify_last path userdata)"
if [[ -z "$USERDATA" || ! -d "$USERDATA" ]]; then
  echo "Spicetify 사용자 폴더를 찾지 못했습니다: ${USERDATA:-<empty>}" >&2
  echo "먼저 'spicetify backup apply' 를 한 번 실행하세요." >&2
  exit 1
fi

DEST="$USERDATA/Themes/CupertinoMusic"
mkdir -p "$DEST"
cp "$ROOT/color.ini" "$ROOT/user.css" "$ROOT/theme.js" "$DEST/"
echo "==> 테마 복사: $DEST"

spicetify config current_theme CupertinoMusic
spicetify config color_scheme "$SCHEME"
spicetify config inject_css 1
spicetify config replace_colors 1
spicetify config inject_theme_js 1

if [[ "$NO_APPLY" -eq 1 ]]; then
  echo "==> 파일과 설정만 바꿨습니다. 적용은 'spicetify apply' 를 직접 실행하세요."
  exit 0
fi

if [[ "$NO_RESTART" -eq 1 ]]; then
  spicetify apply -n
  echo "==> 적용했습니다. Spotify 를 다시 열면 반영됩니다."
else
  spicetify apply
  echo "==> 적용했습니다. Spotify 가 다시 시작됩니다."
fi
