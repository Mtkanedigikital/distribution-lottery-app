import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

export default function PrizeList() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        // 一般向けは「これから発表（upcoming）」のみ
        const r = await axios.get(`${API_BASE}/api/prizes?upcoming=1`);
        setItems(r.data.items || []);
        if (!r.data.items?.length) setMsg("現在、公開予定の抽選はありません。");
      } catch {
        setMsg("一覧の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1>抽選予定の賞品一覧</h1>
      <div style={{ color: "#6b7280", marginBottom: 12, fontSize: 14 }}>
        ※ 公開時刻（JST）になると、各賞品のページで結果を確認できます。
      </div>
      {loading && <div>読み込み中...</div>}
      {msg && <div>{msg}</div>}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {items.map((it) => (
          <div key={it.prizeId} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{it.prizeName}</div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
              賞品ID：{it.prizeId}<br />
              公開時刻（JST）：{it.resultTimeJST || "未設定"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* 参加者用ページへ（prizeIdをクエリで付与） */}
              <Link to={`/?prizeId=${encodeURIComponent(it.prizeId)}`} style={{ padding: "8px 12px", border: "1px solid #2563eb", color: "white", background: "#2563eb", borderRadius: 8, textDecoration: "none" }}>
                参加ページを開く
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}