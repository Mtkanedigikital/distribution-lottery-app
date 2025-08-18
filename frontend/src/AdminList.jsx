import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

export default function AdminList() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        // 管理者は全件
        const r = await axios.get(`${API_BASE}/api/prizes`);
        setItems(r.data.items || []);
        if (!r.data.items?.length) setMsg("賞品が登録されていません。");
      } catch {
        setMsg("一覧の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const participantUrl = (id) => `${window.location.origin}/?prizeId=${encodeURIComponent(id)}`;
  const adminUrl = (id) => `${window.location.origin}/admin?prizeId=${encodeURIComponent(id)}`;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("コピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1>管理：賞品一覧</h1>
      <div style={{ color: "#6b7280", marginBottom: 12, fontSize: 14 }}>
        ここから各賞品の管理ページに移動できます。
      </div>
      {loading && <div>読み込み中...</div>}
      {msg && <div>{msg}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>賞品ID</th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>賞品名</th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>公開時刻(JST)</th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.prizeId}>
                <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{it.prizeId}</td>
                <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{it.prizeName}</td>
                <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{it.resultTimeJST || "未設定"}</td>
                <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link to={`/admin?prizeId=${encodeURIComponent(it.prizeId)}`} style={{ padding: "6px 10px", border: "1px solid #2563eb", color: "white", background: "#2563eb", borderRadius: 8, textDecoration: "none" }}>
                      管理
                    </Link>
                    <a href={participantUrl(it.prizeId)} target="_blank" rel="noreferrer" style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8, textDecoration: "none" }}>
                      参加ページ
                    </a>
                    <button onClick={() => copy(participantUrl(it.prizeId))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}>
                      参加URLコピー
                    </button>
                    <button onClick={() => copy(adminUrl(it.prizeId))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}>
                      管理URLコピー
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr><td colSpan="4" style={{ padding: 12, color: "#6b7280" }}>データがありません。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}