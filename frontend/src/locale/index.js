// ============================================================================
// File: frontend/src/locale/index.js
// Version: v0.1_001 (2025-08-21)
// ============================================================================
// 仕様:
// - 日本語ロケール用の t 関数を提供
// - 与えられたパス文字列を ja オブジェクトから辿って翻訳を取得
// - 関数の場合は引数を渡して評価
// ============================================================================
// 履歴（直近のみ）:
// - 新規作成
// ============================================================================
// frontend/src/locale/index.js
import ja from "./ja";

// 単純な t 関数（今回は日本語固定）
export const t = (path, ...args) => {
  const segs = path.split(".");
  let cur = ja;
  for (const s of segs) {
    if (cur == null) return path;
    cur = cur[s];
  }
  if (typeof cur === "function") return cur(...args);
  return cur ?? path;
};

// --- compatibility export (named + default) ---
export default t;
