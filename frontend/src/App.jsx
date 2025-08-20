// -----------------------------------------------------------------------------
// File: frontend/src/App.jsx
// Version: v0.1 (2025-08-19)
//
// 概要:
// - React Router を利用したルーティング設定
// - ヘッダーに「抽選予定一覧」「管理：賞品一覧」リンクを表示
// - "/" アクセス時は "/prizes" にリダイレクト
// - 管理ページ: /admin
// - 参加者ページ: /p （ヘッダーからは非表示）
// - 存在しないパスは 404 Not Found を表示
// -----------------------------------------------------------------------------

import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import Admin from "./Admin";
import Participant from "./Participant";
import PrizeList from "./PrizeList";

export default function App() {
  return (
    <>
      <header style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <nav style={{ display: "flex", gap: 16 }}>
          <strong>抽選アプリ</strong>
          <Link to="/prizes">抽選予定一覧</Link>
          <Link to="/admin">管理：賞品一覧</Link>
          {/* 参加者ページはヘッダーから外し、リンク経路は管理/QRに限定 */}
        </nav>
      </header>
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/prizes" replace />} />
          <Route path="/prizes" element={<PrizeList />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/p" element={<Participant />} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}
