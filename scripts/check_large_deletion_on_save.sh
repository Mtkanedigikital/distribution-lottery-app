#!/usr/bin/env bash
# ============================================================================
# File: scripts/check_large_deletion_on_save.sh
# Version: v0.1_001 (2025-08-31)
# ============================================================================
# Specifications:
# - VSCodeの保存時に、作業ツリー全体の「未ステージ差分」の削除行合計を確認
# - 既定の閾値=30行（環境変数 DELETION_THRESHOLD で上書き可）
# - lock/生成物/バイナリ等は集計から除外
# - 超過時は非ゼロ終了＆macOS通知を表示（osascript）
# ============================================================================
# History (recent only):
# - 2025-08-31: 初版。削除合計>30で終了コード1＆通知を出す
# ============================================================================

set -euo pipefail

THRESHOLD="${DELETION_THRESHOLD:-30}"
MAP_EXCLUDE='(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|dist/|build/|\.png$|\.jpg$|\.jpeg$|\.gif$|\.webp$|\.pdf$|\.zip$|\.ico$)'

# 作業ツリー（未ステージ）の削除数合計を算出（numstat: added \t deleted \t path）
readarray -t LINES < <(git diff --numstat -- . | grep -Ev "$MAP_EXCLUDE" | awk '$2 ~ /^[0-9]+$/ {print $0}')

TOTAL_DEL=0
DETAILS=()
for line in "${LINES[@]:-}"; do
  # shellcheck disable=SC2206
  parts=($line)
  del="${parts[1]}"
  file="${parts[2]}"
  TOTAL_DEL=$((TOTAL_DEL + del))
  DETAILS+=("del=${del}\t${file}")
done

if (( TOTAL_DEL > THRESHOLD )); then
  MSG="保存時ガード：削除行 ${TOTAL_DEL} 行が閾値 ${THRESHOLD} を超過。コミット前に見直して！"
  # ターミナル出力
  echo "✖ ${MSG}"
  echo "  対象（削除行数）："
  for d in "${DETAILS[@]}"; do echo "   - ${d}"; done
  # macOS 通知
  command -v osascript >/dev/null 2>&1 && \
    osascript -e "display notification \"${MSG}\" with title \"Rico Save Guard\""
  exit 1
fi

# 正常系は静かに終了
exit 0