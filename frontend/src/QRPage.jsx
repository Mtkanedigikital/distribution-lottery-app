// ============================================================================
// File: frontend/src/QRPage.jsx
// Version: v0.2
// Last Updated: 2025-08-20
// 仕様の説明: ?prizeId を受け取り、/api/prizes から対象を検索。publish_time_utc で公開判定し、非公開時はカウントダウン、公開後は /api/lottery/check を呼び結果表示。
// 機能: 入力欄(抽選番号/パス)と結果表示
// UI: 軽いスタイル、最大幅520px
// API: /api/prizes, /api/lottery/check
// 注意: publish_time_utc が無い場合は公開扱い
// 履歴の説明(直近): ヘッダ整備、useSearchParams 方式、公開ガード/カウントダウン統一、fetch化とエラー整理。
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

// 秒を「HH:MM:SS」へ
function fmtHMS(sec) {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

// "2025-08-19 13:00" → "公開日: 2025/08/19 13:00"
function formatJstDate(str) {
  try {
    if (!str || typeof str !== "string") return `公開日: ${str ?? ""}`;
    const [datePart, timePartRaw] = str.trim().split(/\s+/);
    const [y, m, d] = (datePart || "").split("-");
    const timePart = (timePartRaw || "").slice(0, 5);
    if (!y || !m || !d || !timePart) return `公開日: ${str}`;
    return `公開日: ${y}/${m}/${d} ${timePart}`;
  } catch {
    return `公開日: ${str}`;
  }
}

export default function QRPage() {
  const [searchParams] = useSearchParams();
  const prizeId = searchParams.get("prizeId") || "";

  const [loading, setLoading] = useState(true);
  const [prize, setPrize] = useState(null);
  const [error, setError] = useState("");

  // 入力
  const [entryNumber, setEntryNumber] = useState("");
  const [password, setPassword] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  // 公開時刻（UTC）→ Date
  const publishAt = useMemo(() => {
    if (!prize?.publish_time_utc) return null;
    const d = new Date(prize.publish_time_utc);
    return isNaN(d) ? null : d;
  }, [prize]);

  // カウントダウン
  const [remainSec, setRemainSec] = useState(null);
  useEffect(() => {
    let timer;
    if (publishAt) {
      const tick = () => {
        const now = Date.now();
        const diff = (publishAt.getTime() - now) / 1000;
        setRemainSec(diff);
      };
      tick();
      timer = setInterval(tick, 1000);
    } else {
      setRemainSec(null);
    }
    return () => timer && clearInterval(timer);
  }, [publishAt]);

  const isPublished = useMemo(() => {
    if (!publishAt) return true; // 値がない場合は公開扱い
    return Date.now() >= publishAt.getTime();
  }, [publishAt]);

  // 初期ロード：賞品情報取得（/api/prizes から対象を抽出）
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!prizeId) {
        setError("賞品IDが指定されていません。URLをご確認ください。");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      setResultMsg("");
      try {
        const res = await fetch(`${API_BASE}/api/prizes`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        const found = Array.isArray(list) ? list.find((x) => x.id === prizeId) : null;
        if (!aborted) {
          if (found) setPrize(found);
          else {
            setPrize(null);
            setError("賞品が見つかりません。QRのIDが正しいかご確認ください。");
          }
        }
      } catch (e) {
        if (!aborted) {
          setPrize(null);
          setError("読み込みに失敗しました。時間を置いてお試しください。");
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [prizeId]);

  // 結果確認
  const onCheck = async (e) => {
    e?.preventDefault?.();
    setResultMsg("");
    if (!entryNumber || !password) {
      setResultMsg("抽選番号とパスワードを入力してください。");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/lottery/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId, entryNumber, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResultMsg(data?.result ?? "結果を取得できませんでした。");
    } catch (_e) {
      setResultMsg("通信エラーが発生しました。時間を置いてお試しください。");
    }
  };

  if (loading) return <div style={{ padding: 16 }}>読み込み中…</div>;
  if (error) return <div style={{ padding: 16, color: "crimson" }}>{error}</div>;
  if (!prize) return <div style={{ padding: 16 }}>データがありません。</div>;

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>{prize.name} の抽選ページ</h2>
      <div style={{ marginBottom: 12, color: "#555" }}>
        {formatJstDate(prize.result_time_jst || "")}
      </div>

      {!isPublished ? (
        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "#fffef5",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            まだ抽選結果は公開されていません⏳
          </div>
          <div>
            公開まで：{remainSec != null ? fmtHMS(remainSec) : "—"}
          </div>
        </div>
      ) : (
        <>
          <form
            onSubmit={onCheck}
            style={{
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#f9fafb",
              marginBottom: 16,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              抽選番号とパスワードを入力して結果を確認してください。
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <input
                placeholder="抽選番号（例: 001）"
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                required
              />
              <input
                type="password"
                placeholder="パスワード（例: 1111）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
                required
              />
              <button
                type="submit"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                抽選結果を確認する
              </button>
            </div>
          </form>

          {resultMsg && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              結果：{resultMsg}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
        賞品ID：{prizeId}
      </div>
    </div>
  );
}