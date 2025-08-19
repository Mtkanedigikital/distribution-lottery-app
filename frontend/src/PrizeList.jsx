// ============================================================================
// File: frontend/src/PrizeList.jsx
// Version: v0.1
// Last Updated: 2025-08-19 17:49 JST
// Lines: 65
// Summary:
//   - /api/prizes から抽選予定の賞品一覧を取得
//   - 公開予定時刻を JST 表記に整形して表示
//   - 各賞品の抽選ページ（/p?prizeId=...）へのリンクを提供
// ============================================================================

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

// "2025-08-19 13:00" → "公開日: 2025/08/19 13:00"
function formatJstDate(str) {
  try {
    if (!str || typeof str !== "string") return `公開日: ${str ?? ""}`;
    const [datePart, timePartRaw] = str.trim().split(/\s+/);
    const [y, m, d] = datePart.split("-");
    const timePart = (timePartRaw || "").slice(0, 5);
    if (!y || !m || !d || !timePart) return `公開日: ${str}`;
    return `公開日: ${y}/${m}/${d} ${timePart}`;
  } catch {
    return `公開日: ${str}`;
  }
}

export default function PrizeList() {
  const [prizes, setPrizes] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/prizes`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPrizes(data);
      } catch (e) {
        setErr(String(e?.message || e));
      }
    })();
  }, []);

  return (
    <div>
      <h2>抽選予定の賞品一覧</h2>
      <p>※ 公開時刻（JST）になると、各賞品のページで結果を確認できます。</p>
      {err && <p style={{ color: "red" }}>エラー: {err}</p>}
      {prizes.length === 0 && <p>現在、公開予定の抽選はありません。</p>}
      <ul style={{ paddingLeft: 16 }}>
        {prizes.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <strong>{p.id}</strong> {p.name}（{formatJstDate(p.result_time_jst)}）
            {" "}
            <Link to={`/p?prizeId=${encodeURIComponent(p.id)}`}>抽選ページを開く</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}