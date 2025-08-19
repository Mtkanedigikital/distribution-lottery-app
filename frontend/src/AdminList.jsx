// ============================================================================
// File: frontend/src/AdminList.jsx
// Version: v0.2
// Last Updated: 2025-08-20
// === 仕様の説明 ===
// 管理用の賞品一覧ページ。API (/api/prizes) から全賞品を取得し、未公開→公開の順に表示。
// 参加/管理ページURLの表示・コピー、公開状態バッジ、JSTの日時整形、並べ替えオプションを提供。
// === 直近の更新概要 ===
// - ヘッダフォーマットをプロジェクト標準（//=== 囲み, 空行1）に変更（機能差分なし）
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

/** "2025-08-19 13:00" → "公開日: 2025/08/19 13:00"（先頭の「公開日: 」はここでは付けない） */
function formatJstDate(str) {
  try {
    if (!str || typeof str !== "string") return str ?? "";
    const [datePart, timePartRaw] = str.trim().split(/\s+/);
    const [y, m, d] = (datePart || "").split("-");
    const timePart = (timePartRaw || "").slice(0, 5);
    if (!y || !m || !d || !timePart) return str;
    return `${y}/${m}/${d} ${timePart}`;
  } catch {
    return str;
  }
}

/** publish_time_utc が今以前なら公開済み */
function isPublishedUtc(publishUtc) {
  if (!publishUtc) return false;
  const t = Date.parse(publishUtc);
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}

function PublishedBadge({ published }) {
  const base = {
    display: "inline-block",
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    marginLeft: 8,
    verticalAlign: "middle",
  };
  return published ? (
    <span style={{ ...base, color: "#14532d", background: "#dcfce7", border: "1px solid #86efac" }}>
      公開済み
    </span>
  ) : (
    <span style={{ ...base, color: "#7c2d12", background: "#ffedd5", border: "1px solid #fdba74" }}>
      未公開
    </span>
  );
}

export default function AdminList() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [unpublishedFirst, setUnpublishedFirst] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        // 管理者は全件
        const r = await axios.get(`${API_BASE}/api/prizes`, {
          headers: { Accept: "application/json" },
        });
        // 現行APIは「配列」を返す想定
        const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
        setItems(list);
        if (!list.length) setMsg("賞品が登録されていません。");
      } catch (e) {
        setMsg("一覧の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const participantUrl = (id) => `${window.location.origin}/p?prizeId=${encodeURIComponent(id)}`;
  const adminUrl = (id) => `${window.location.origin}/admin?prizeId=${encodeURIComponent(id)}`;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("コピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  };

  // 並べ替え（未公開→公開、次に公開日時が近い順）※Admin.jsx と同ルール
  const sorted = useMemo(() => {
    const arr = [...items];
    if (!unpublishedFirst) return arr;
    const ts = (p) => {
      const t = Date.parse(p.publish_time_utc || "");
      return Number.isNaN(t) ? Infinity : t;
      };
    return arr.sort((a, b) => {
      const ap = isPublishedUtc(a.publish_time_utc);
      const bp = isPublishedUtc(b.publish_time_utc);
      if (ap !== bp) return ap ? 1 : -1; // 未公開を先に
      return ts(a) - ts(b); // 近い順
    });
  }, [items, unpublishedFirst]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1>管理：賞品一覧</h1>

      {/* 並べ替えオプション */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ userSelect: "none" }}>
          <input
            type="checkbox"
            checked={unpublishedFirst}
            onChange={(e) => setUnpublishedFirst(e.target.checked)}
          />
          &nbsp;未公開を上に並べ替える
        </label>
      </div>

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
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>状態</th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((it) => {
              const id = it.id ?? it.prizeId; // 旧フィールド名にも一応対応
              const name = it.name ?? it.prizeName;
              const jst = formatJstDate(it.result_time_jst ?? it.resultTimeJST);
              const published = isPublishedUtc(it.publish_time_utc);
              return (
                <tr key={id}>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8, fontFamily: "monospace" }}>{id}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{name}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{jst || "未設定"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <PublishedBadge published={published} />
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        to={`/admin?prizeId=${encodeURIComponent(id)}`}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #2563eb",
                          color: "white",
                          background: "#2563eb",
                          borderRadius: 8,
                          textDecoration: "none",
                        }}
                      >
                        管理
                      </Link>
                      <a
                        href={participantUrl(id)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8, textDecoration: "none" }}
                      >
                        参加ページ
                      </a>
                      <button onClick={() => copy(participantUrl(id))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}>
                        参加URLコピー
                      </button>
                      <button onClick={() => copy(adminUrl(id))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}>
                        管理URLコピー
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!sorted.length && !loading && (
              <tr>
                <td colSpan="5" style={{ padding: 12, color: "#6b7280" }}>
                  データがありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}