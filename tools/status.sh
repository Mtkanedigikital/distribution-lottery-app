#!/usr/bin/env bash
# tools/status.sh - 開発進捗ダッシュボード
# 使い方: リポジトリ直下で `./tools/status.sh` を実行
set -euo pipefail

#--- ユーティリティ: コマンド存在チェック（無ければ優しく案内）
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "# ヒント: '$1' が見つかりません。macOSなら 'brew install $1' を検討してください。"
    return 1
  fi
  return 0
}

echo "# リポジトリルートへ移動（このスクリプトの位置から推測）"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "# 現在のブランチとリモート"
( git branch --show-current || echo "(branch 取得不可)" )
( git remote -v 2>/dev/null | sed 's/^/  /' ) || echo "  (remote 未設定)"

echo "# 直近コミット（上位10件）"
( git log --oneline -n 10 --decorate ) || echo "  (git 履歴取得不可)"

echo "# 変更状況（git status --short）"
( git status --short ) || echo "  (status 取得不可)"

echo "# 差分統計（未コミット差分の概要）"
( git diff --stat || true )

echo "# front/back の package 名称とバージョン"
if need jq; then
  echo "  frontend: $(jq -r '.name + \"@\" + .version' frontend/package.json 2>/dev/null || echo '(package.json なし)')"
  echo "  backend : $(jq -r '.name + \"@\" + .version' backend/package.json 2>/dev/null || echo '(package.json なし)')"
else
  echo "  jq 未導入のため省略（brew install jq）"
fi

echo "# 簡易ツリー（3階層まで / node_modules・.git 除外 / 先頭200行・awk整形）"
print_tree () {
  local dir="$1"
  if [ -d "$dir" ]; then
    echo "$dir/"
    (
      cd "$dir" && \
      find . -maxdepth 3 \( -name node_modules -o -name .git \) -prune -o -print | \
      sed 's|^\./||' | sort | \
      awk 'BEGIN{FS="/"}{
        if ($0 == "") next;
        depth = NF;
        name  = $NF;
        indent = "";
        for (i = 1; i < depth; i++) indent = indent "  ";
        # シンプルなインデント＋種別記号（ファイル・ディレクトリ問わず）
        if (system("[ -d \"" $0 "\" ]") == 0) {
          printf("%s- %s/\n", indent, name);
        } else {
          printf("%s- %s\n", indent, name);
        }
      }' | head -n 200
    )
  else
    echo "$dir (存在しません)"
  fi
}
print_tree frontend
echo
print_tree backend

echo "# TODO / FIXME / NOTE の抽出（上位50件）"
if need rg; then
  ( rg -n --no-heading 'TODO|FIXME|NOTE' frontend backend 2>/dev/null | head -n 50 ) || echo "  (見つかりませんでした)"
else
  echo "  ripgrep(rg) 未導入のため省略（brew install ripgrep）"
fi

echo "# 実行中プロセス（ports 3000/3001 をチェック）"
if need lsof; then
  ( lsof -iTCP:3000 -sTCP:LISTEN -Pn 2>/dev/null || echo "  3000: LISTEN なし" )
  ( lsof -iTCP:3001 -sTCP:LISTEN -Pn 2>/dev/null || echo "  3001: LISTEN なし" )
else
  echo "  lsof 未導入のため省略"
fi

echo "# いま何をすべき？（ヒント）"
if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
  echo "  - 未コミット変更があります → 内容を確認して commit/push"
else
  echo "  - 未コミット変更なし → TODO 抽出結果から優先度高いものを選ぶ or Issue/PR を作成"
fi