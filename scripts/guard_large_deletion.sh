#!/usr/bin/env bash
# ============================================================================
# File: scripts/guard_large_deletion.sh
# Version: v0.1_001 (2025-08-31)
# ============================================================================
# Specifications:
# - pre-commit前にステージ上の「削除行数」の合計をチェックし、閾値超過でブロック
# - 既定の閾値=30行。バイナリやlockファイル等は集計から除外
# ============================================================================
# History (recent only):
# - 2025-08-31: 初版。削除合計>30で失敗し、警告と対象ファイル一覧を表示
# ============================================================================

set -euo pipefail

THRESHOLD="${DELETION_THRESHOLD:-30}"

# 変更対象（ステージ）のみ集計。numstat: added \t deleted \t path
# 除外: lock/依存/生成物/バイナリ(-) など
MAP_EXCLUDE='(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|dist/|build/|\.png$|\.jpg$|\.jpeg$|\.gif$|\.webp$|\.pdf$|\.zip$|\.ico$)'

# numstatはバイナリで deleted が '-' になる。数値行のみ対象にする
readarray -t LINES < <(git diff --cached --numstat -- . | grep -Ev "$MAP_EXCLUDE" | awk '$2 ~ /^[0-9]+$/ {print $0}')

TOTAL_DEL=0
DETAILS=()

for line in "${LINES[@]}"; do
  # shellcheck disable=SC2206
  parts=($line)
  del="${parts[1]}"
  file="${parts[2]}"
  TOTAL_DEL=$((TOTAL_DEL + del))
  DETAILS+=("del=${del}\t${file}")
done

if (( TOTAL_DEL > THRESHOLD )); then
  echo "✖ 大量削除ガード: ステージ上の削除行合計 ${TOTAL_DEL} 行が閾値 ${THRESHOLD} 行を超過しました。"
  echo "  対象ファイル（削除行数）："
  for d in "${DETAILS[@]}"; do
    echo "   - ${d}"
  done
  echo ""
  echo "対処: 差分を細分化する / 誤削除を復元する / 閾値を一時的に上げる場合は DELETION_THRESHOLD を設定（自己責任）"
  exit 1
fi

exit 0