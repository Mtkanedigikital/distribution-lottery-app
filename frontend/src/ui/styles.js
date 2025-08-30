// ============================================================================
// File: frontend/src/ui/styles.js
// Version: v0.1_004 (2025-08-30)
// ============================================================================
// Specifications:
// - Admin / Participant 共通の簡易スタイル定義
// - モバイル優先（最大幅600px、左寄せ）
// - 入力・ボタン・カード・レイアウト・エラーボックスのユーティリティ
// ============================================================================
// History (recent only):
// - 2025-08-30: buttonStyle ヘルパーを追加（無効時スタイルの統一適用）
// - 2025-08-30: CSVアップロードボタンのスタイル調整
// - 2025-08-30: DISABLED_BUTTON_STYLE を追加
// - 2025-08-30: エラーボックス用スタイルを追加
// ============================================================================

export const WRAP_STYLE = {
  maxWidth: 600, // PCでも 600px まで。左寄せで揃える
  width: "100%",
  margin: 0, // 左寄せ（中央寄せにしない）
  padding: 16,
  boxSizing: "border-box",
};

export const CARD_STYLE = {
  border: "1px solid #eee",
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
};

export const INPUT_STYLE = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "8px 10px",
  minHeight: 40,
  fontSize: 16,
  borderRadius: 6,
  boxSizing: "border-box",
};

export const BUTTON_STYLE = {
  padding: "12px 14px",
  minHeight: 44,
  fontSize: 16,
  lineHeight: "24px",
  borderRadius: 8,
  cursor: "pointer",
  background: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
  textDecoration: "none",
  display: "inline-block",
};

export const DISABLED_BUTTON_STYLE = {
  opacity: 0.5,
  cursor: "not-allowed",
  background: "#9ca3af",
  border: "1px solid #9ca3af",
};

export const LINK_BUTTON_STYLE = {
  ...BUTTON_STYLE,
  textDecoration: "none",
};

export const FIELDSET_STYLE = {
  display: "grid",
  gap: 8,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

export const ROW_WRAP_STYLE = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

export const ERROR_BOX_STYLE = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 12,
  borderRadius: 8,
  margin: "8px 0",
};

// 共通: ボタンのスタイルを disabled 状態に応じて合成
export const buttonStyle = (disabled) => ({
  ...BUTTON_STYLE,
  ...(disabled ? DISABLED_BUTTON_STYLE : {}),
});
