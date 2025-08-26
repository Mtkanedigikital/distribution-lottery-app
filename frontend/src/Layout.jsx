// ============================================================================
// File: frontend/src/Layout.jsx
// Version: v0.1_001 (2025-08-21)
// ============================================================================
// 仕様:
// - 共通レイアウト（ヘッダー＋Outlet）の定義
// ============================================================================
// 履歴（直近のみ）:
// - 新規作成
// ============================================================================

import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  textDecoration: isActive ? "underline" : "none",
  fontWeight: isActive ? 700 : 400,
});

export default function Layout() {
  return (
    <>
      <header style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <strong>抽選アプリ</strong>
          <NavLink to="/prizes" style={linkStyle}>
            抽選予定一覧
          </NavLink>
          <NavLink to="/admin" style={linkStyle}>
            管理：賞品一覧
          </NavLink>
        </nav>
      </header>
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </>
  );
}
