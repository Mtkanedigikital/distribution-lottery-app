// ============================================================================
// File: frontend/src/components/admin/PublishedBadge.jsx
// Version: v0.1_001 (2025-08-21)
// ============================================================================
// 仕様:
// - 公開状態（公開済み/未公開）を示す小さなステータスバッジ
// ============================================================================
// 履歴（直近のみ）:
// - 初版作成（Admin.jsx から切り出し）
// ============================================================================

import React from "react";

export default function PublishedBadge({ published }) {
  const base = {
    display: "inline-block",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    marginLeft: 8,
    verticalAlign: "middle",
  };
  return published ? (
    <span
      style={{
        ...base,
        color: "#14532d",
        background: "#dcfce7",
        border: "1px solid #86efac",
      }}
    >
      公開済み
    </span>
  ) : (
    <span
      style={{
        ...base,
        color: "#7c2d12",
        background: "#ffedd5",
        border: "1px solid #fdba74",
      }}
    >
      未公開
    </span>
  );
}
