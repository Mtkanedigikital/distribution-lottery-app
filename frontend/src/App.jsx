// ============================================================================
// File: frontend/src/App.jsx
// Version: v0.1_006 (2025-08-24)
// ============================================================================
// Specifications:
// - ルーティングを Layout 配下に集約（共通ヘッダー分離）
// - Link→NavLink で現在地ハイライト
// - Admin/PrizeList/Participant を lazy + Suspense で遅延読込
// - 各画面に ErrorBoundary を適用 / 404 は NotFound へ分離
// ============================================================================
// History (recent only):
// - Layout分離・NavLink化・lazy/Suspense・ErrorBoundary・NotFound導入
// - 2025-08-23: /participant, /participant/:id を追加。/p は Participant に割当維持
// - 2025-08-24: /admin を Admin に戻し、/admin/list に AdminList を追加
// - 2025-08-24: B案採用（/admin=list統合）。/admin/list ルートを撤去し、Admin.jsx に参加者数を出す方針
// ============================================================================

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import ErrorBoundary from "./ui/ErrorBoundary";
import NotFound from "./NotFound";

const Admin = lazy(() => import("./Admin"));
const AdminList = lazy(() => import("./AdminList"));
const Participant = lazy(() => import("./Participant"));
const PrizeList = lazy(() => import("./PrizeList"));

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/prizes" replace />} />
          <Route
            path="/prizes"
            element={
              <ErrorBoundary scope="PrizeList">
                <PrizeList />
              </ErrorBoundary>
            }
          />
          <Route
            path="/admin"
            element={
              <ErrorBoundary scope="Admin">
                <Admin />
              </ErrorBoundary>
            }
          />
          <Route
            path="/p"
            element={
              <ErrorBoundary scope="Participant">
                <Participant />
              </ErrorBoundary>
            }
          />
          <Route
            path="/participant"
            element={
              <ErrorBoundary scope="Participant">
                <Participant />
              </ErrorBoundary>
            }
          />
          <Route
            path="/participant/:id"
            element={
              <ErrorBoundary scope="Participant">
                <Participant />
              </ErrorBoundary>
            }
          />
          <Route
            path="*"
            element={
              <ErrorBoundary scope="NotFound">
                <NotFound />
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
