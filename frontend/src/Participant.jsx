// -----------------------------------------------------------------------------
// File: frontend/src/Participant.jsx
// Version: v0.1 (2025-08-19)
//
// 概要:
// - URL クエリから prizeId を取得
// - /api/prizes から対象賞品情報を抽出
// - formatJstDate で公開日を整形表示
// - 抽選番号とパスワードを送信し当落を確認
// -----------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

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

export default function Participant() {
  const query = useQuery();
  const navigate = useNavigate();
  const prizeId = query.get("prizeId");

  const [prize, setPrize] = useState(null);
  const [entryNumber, setEntryNumber] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");

  // prizeId が無ければ /prizes へ誘導
  useEffect(() => {
    if (!prizeId) navigate("/prizes", { replace: true });
  }, [prizeId, navigate]);

  // 賞品情報の取得（名前・公開時刻）
  useEffect(() => {
    if (!prizeId) return;
    (async () => {
      try {
        // /api/prizes 全体から対象だけ抜く（個別エンドポイントが無ければこの方法でOK）
        const res = await fetch(`${API_BASE}/api/prizes`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        const found = list.find((x) => x.id === prizeId);
        if (found) setPrize(found);
      } catch (e) {
        setErr(String(e?.message || e));
      }
    })();
  }, [prizeId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/lottery/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId, entryNumber, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMessage(data?.result || "OK");
    } catch (e) {
      setErr(String(e?.message || e));
    }
  };

  return (
    <div>
      <h2>参加者ページ</h2>
      {prize && (
        <div style={{ marginBottom: 12 }}>
          <div><strong>賞品ID:</strong> {prize.id}</div>
          <div><strong>賞品名:</strong> {prize.name}</div>
          <div><strong>{formatJstDate(prize.result_time_jst)}</strong></div>
        </div>
      )}

      {err && <p style={{ color: "red" }}>エラー: {err}</p>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <label>
          抽選番号
          <input
            value={entryNumber}
            onChange={(e) => setEntryNumber(e.target.value)}
            placeholder="例: 001"
            required
          />
        </label>

        <label>
          パスワード
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="例: 1111"
            required
          />
        </label>

        <button type="submit">結果を確認</button>
      </form>

      {message && (
        <p style={{ marginTop: 12, fontWeight: 600 }}>
          {message}
        </p>
      )}
    </div>
  );
}
