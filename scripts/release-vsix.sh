#!/usr/bin/env bash
# 用法: scripts/release-vsix.sh [版本號 | -i] [--install]
#   版本號     選填，例如 0.2.16；省略則沿用 apps/vscode/package.json 目前版本
#   --install  打包後執行 code --install-extension 安裝
#   -i         自動遞增修訂號 (0.2.15 -> 0.2.16)；與版本號擇一
#   升版時會依 Conventional Commits 自動把上次 release 以來的 commit 寫入 apps/vscode/CHANGELOG.md
#   -v         顯示原始碼與已安裝的版本號後結束
set -euo pipefail

cd "$(dirname "$0")/.."
PKG=apps/vscode/package.json
CHANGELOG=apps/vscode/CHANGELOG.md
VERSION=""
INSTALL=0
INCREASE=0

for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    -i|--increase) INCREASE=1 ;;
    -v|--version)
      EXT_ID=$(node -p "const j=require('./$PKG');j.publisher+'.'+j.name")
      INSTALLED=$(code --list-extensions --show-versions 2>/dev/null | grep -i "^$EXT_ID@" | cut -d@ -f2 || true)
      echo "原始碼版本: $(node -p "require('./$PKG').version")"
      echo "已安裝版本: ${INSTALLED:-未安裝}"
      exit 0 ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) VERSION="$arg" ;;
  esac
done

if [ "$INCREASE" = 1 ]; then
  [ -z "$VERSION" ] || { echo "-i 與指定版本號不能同時使用" >&2; exit 1; }
  VERSION=$(node -p "const [a,b,c]=require('./$PKG').version.split('.');a+'.'+b+'.'+(+c+1)")
fi

if [ -n "$VERSION" ]; then
  [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "版本號格式錯誤: $VERSION" >&2; exit 1; }
  node -e "
    const fs=require('fs');const p='$PKG';
    const j=JSON.parse(fs.readFileSync(p,'utf8'));j.version='$VERSION';
    fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');"
fi

if [ -n "$VERSION" ]; then
  # commit 範圍: 最近的 v* tag -> 最近一次動到 CHANGELOG 的 commit -> 最近 20 筆
  LAST_TAG=$(git describe --tags --match 'v*' --abbrev=0 2>/dev/null || true)
  if [ -n "$LAST_TAG" ]; then
    RANGE="$LAST_TAG..HEAD"
  else
    BASE=$(git log -1 --format=%H -- "$CHANGELOG" 2>/dev/null || true)
    RANGE=${BASE:+$BASE..HEAD}
    RANGE=${RANGE:-HEAD~20..HEAD}
  fi

  section() { # $1=標題 $2=type regex
    local lines
    lines=$(git log "$RANGE" --no-merges --format='%s' | grep -E "^($2)(\(.+\))?!?: " | sed -E 's/^[a-z]+(\(.+\))?!?: /- /' || true)
    [ -n "$lines" ] && printf '\n### %s\n%s\n' "$1" "$lines"
    return 0
  }
  BODY="$(section 'Features' 'feat')"$'\n'"$(section 'Fixes' 'fix|perf')"$'\n'"$(section 'Other' 'refactor|docs|build|ci|test')"
  BODY=$(printf '%s' "$BODY" | cat -s)
  [ -n "${BODY//[$'\n']/}" ] || BODY=$'\n- (no user-facing changes)'

  [ -f "$CHANGELOG" ] || printf '# Changelog\n' > "$CHANGELOG"
  {
    head -n 1 "$CHANGELOG"
    printf '\n## v%s (%s)\n%s\n' "$VERSION" "$(date +%F)" "$BODY"
    tail -n +2 "$CHANGELOG"
  } > "$CHANGELOG.tmp" && mv "$CHANGELOG.tmp" "$CHANGELOG"
  echo "==> CHANGELOG 已更新 (範圍: $RANGE)"
fi

VERSION=$(node -p "require('./$PKG').version")
echo "==> 打包版本 $VERSION"
pnpm package:vscode

VSIX="versions/portable-kanban-$VERSION.vsix"
echo "==> 產出 $VSIX"

if [ "$INSTALL" = 1 ]; then
  code --install-extension "$VSIX" --force
  echo "==> 已安裝，請在 VS Code 執行 Reload Window"
fi
