// ============================================================================
// File: frontend/src/utils/datetime.js
// Version: v0.1_001 (2025-08-21)
// ============================================================================
// 仕様:
// - JST日時の整形表示ユーティリティ
// - 管理フォーム用の初期日時（JST+1時間）生成
// ============================================================================
// 履歴（直近のみ）:
// - 初版作成（Admin.jsx から切り出し）
// ============================================================================

/** "2025-08-19 13:00" → "公開日: 2025/08/19 13:00" */
export function formatJstDate(str) {
  try {
    if (!str || typeof str !== "string") return `公開日: ${str ?? ""}`;
    const [datePart, timePartRaw] = str.trim().split(/\s+/);
    const [y, m, d] = (datePart || "").split("-");
    const timePart = (timePartRaw || "").slice(0, 5);
    if (!y || !m || !d || !timePart) return `公開日: ${str}`;
    return `公開日: ${y}/${m}/${d} ${timePart}`;
  } catch {
    return `公開日: ${str}`;
  }
}

/** 管理フォーム初期値: 現在のJST + 1時間 を datetime-local 形式で返す */
export function jstLocalInputValue(offsetMinutes = 60) {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000 + offsetMinutes * 60 * 1000;
  const jst = new Date(jstMs);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}
