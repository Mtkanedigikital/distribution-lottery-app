// ============================================================================
// File: frontend/src/AdminList.jsx
// Version: v0.2_005 (2025-08-24)
// ============================================================================
// Specifications:
// - 管理用の賞品一覧ページ。API (/api/prizes) から全賞品を取得し、未公開→公開の順に表示
// - 参加/管理ページURLの表示・コピー、公開状態バッジ、JST整形、並べ替えオプションを提供
// ============================================================================
// History (recent only):
// - API取得と並べ替えロジックの実装
// - 2025-08-24: 公開時刻の表示を publish_time_utc 基準のJST表示に修正（result_time_jst 参照の誤りを修正）
// - 2025-08-24: 公開判定を isPublishedJST に変更（publish_time_utc 優先、無い場合は publish_time_jst をJSTとして比較）。バッジ/並べ替えで使用
// - 2025-08-24: カードに参加者数表示を追加
// - 2025-08-24: 参加ページURLを /participant に修正（/p から）
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { getEntryCount } from "./api";

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

/** ISO UTC → JST "YYYY/MM/DD HH:mm" */
function formatJstFromUtc(utcStr) {
  try {
    if (!utcStr) return "";
    const d = new Date(utcStr);
    if (Number.isNaN(d.getTime())) return "";
    const s = d.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    // ja-JP は "2025/08/24 09:30" 形式
    return s.replace(/\u200E/g, "");
  } catch {
    return "";
  }
}

/** publish_time_utc を優先し、なければ publish_time_jst を JST(+09:00) として比較 */
function isPublishedJST(publishUtc, publishJst) {
  if (publishUtc) {
    const t = Date.parse(publishUtc); // ISO UTC想定
    if (!Number.isNaN(t)) return t <= Date.now();
  }
  if (publishJst) {
    const s = publishJst.replace(/\//g, "-").replace(" ", "T") + "+09:00";
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t <= Date.now();
  }
  return false;
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

export default function AdminList() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [unpublishedFirst, setUnpublishedFirst] = useState(true);
  const [counts, setCounts] = useState({}); // { [prizeId]: number }
  const [loadingCounts, setLoadingCounts] = useState({}); // { [prizeId]: boolean }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        // 管理者は全件
        const r = await axios.get(`${API_BASE}/prizes`, {
          headers: { Accept: "application/json" },
        });
        // 現行APIは「配列」を返す想定
        const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
        setItems(list);
        // 参加者数の取得（各賞品IDごとに並列）
        setCounts({});
        setLoadingCounts({});
        (list || []).forEach(async (p) => {
          const pid = p.id ?? p.prizeId;
          if (!pid) return;
          setLoadingCounts((m) => ({ ...m, [pid]: true }));
          try {
            const c = await getEntryCount(pid);
            setCounts((m) => ({ ...m, [pid]: typeof c === "number" ? c : 0 }));
          } catch {
            setCounts((m) => ({ ...m, [pid]: 0 }));
          } finally {
            setLoadingCounts((m) => ({ ...m, [pid]: false }));
          }
        });
        if (!list.length) setMsg("賞品が登録されていません。");
      } catch (e) {
        setMsg("一覧の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const participantUrl = (id) =>
    `${window.location.origin}/participant?prizeId=${encodeURIComponent(id)}`;
  const adminUrl = (id) =>
    `${window.location.origin}/admin?prizeId=${encodeURIComponent(id)}`;

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
      const ap = isPublishedJST(a.publish_time_utc, a.publish_time_jst);
      const bp = isPublishedJST(b.publish_time_utc, b.publish_time_jst);
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
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                賞品ID
              </th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                賞品名
              </th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                公開日時（JST）
              </th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                参加者数
              </th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>状態</th>
              <th style={{ border: "1px solid #e5e7eb", padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((it) => {
              const id = it.id ?? it.prizeId; // 旧フィールド名にも一応対応
              const name = it.name ?? it.prizeName;
              const jst = it.publish_time_utc
                ? formatJstFromUtc(it.publish_time_utc)
                : formatJstDate(it.result_time_jst ?? it.resultTimeJST);
              const published = isPublishedJST(
                it.publish_time_utc,
                it.publish_time_jst,
              );
              return (
                <tr key={id}>
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: 8,
                      fontFamily: "monospace",
                    }}
                  >
                    {id}
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    {name}
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    {jst || "未設定"}
                  </td>
                  <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>
                    {loadingCounts[id] ? "…" : `${counts[id] ?? 0}件`}
                  </td>
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
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          textDecoration: "none",
                        }}
                      >
                        参加ページ
                      </a>
                      <button
                        onClick={() => copy(participantUrl(id))}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                        }}
                      >
                        参加URLコピー
                      </button>
                      <button
                        onClick={() => copy(adminUrl(id))}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                        }}
                      >
                        管理URLコピー
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!sorted.length && !loading && (
              <tr>
                <td colSpan="6" style={{ padding: 12, color: "#6b7280" }}>
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
