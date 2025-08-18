import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Participant from "./Participant";
import Admin from "./Admin";
import PrizeList from "./PrizeList";
import AdminList from "./AdminList";

export default function App() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" }}>
      <header style={{ padding: 12, borderBottom: "1px solid #e5e7eb", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/" style={{ textDecoration: "none", color: "#111827", fontWeight: 700 }}>抽選アプリ</Link>
          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/prizes" style={{ textDecoration: "none" }}>抽選予定一覧</Link>
            <Link to="/" style={{ textDecoration: "none" }}>参加者ページ</Link>
            <Link to="/admin/list" style={{ textDecoration: "none" }}>管理：賞品一覧</Link>
            <Link to="/admin" style={{ textDecoration: "none" }}>管理：個別編集</Link>
          </nav>
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Participant />} />
          <Route path="/prizes" element={<PrizeList />} />
          <Route path="/admin/list" element={<AdminList />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}