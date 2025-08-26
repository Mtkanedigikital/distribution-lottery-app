// ============================================================================
// File: frontend/src/QRPage.jsx
// Version: v0.2_001 (2025-08-21)
// ============================================================================
// 仕様:
// - URLクエリ ?prizeId を受け取り対象賞品を特定
// - /api/prizes から賞品を取得し公開時刻（UTC）で公開判定、未公開時はカウントダウン表示
// - 公開後は抽選番号/パスワードを送信して当落を確認
// ============================================================================
// 履歴（直近のみ）:
// - ヘッダ整備、useSearchParams採用、公開ガード/カウントダウン実装、通信処理を api.js 経由に統一
// - 固定文言を locale 辞書に統一
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPrizes, checkResult } from "./api";
import { ERROR_BOX_STYLE } from "./ui/styles";
import t from "./locale";

// 秒を「HH:MM:SS」へ
function fmtHMS(sec) {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(s / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

// "2025-08-19 13:00" → t('prizes.publishAt', "2025/08/19 13:00")
function formatJstDate(str) {
  try {
    if (!str || typeof str !== "string") return t("prizes.publishAt", str ?? "");
    const [datePart, timePartRaw] = str.trim().split(/\s+/);
    const [y, m, d] = (datePart || "").split("-");
    const timePart = (timePartRaw || "").slice(0, 5);
    if (!y || !m || !d || !timePart) return t("prizes.publishAt", str);
    const jst = `${y}/${m}/${d} ${timePart}`;
    return t("prizes.publishAt", jst);
  } catch {
    return t("prizes.publishAt", str);
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
        const list = await getPrizes();
        const found = Array.isArray(list)
          ? list.find((x) => x.id === prizeId)
          : null;
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
          setError(t("qr.errorGeneric"));
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
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
      const data = await checkResult({ prizeId, entryNumber, password });
      setResultMsg(data?.result ?? "結果を取得できませんでした。");
    } catch (e) {
      setResultMsg(t("qr.errorNetwork"));
    }
  };

  if (loading) return <div style={{ padding: 16 }}>{t("common.loading")}</div>;
  if (error) return <div style={ERROR_BOX_STYLE}>{t("common.errorPrefix")}{error}</div>;
  if (!prize) return <div style={{ padding: 16 }}>{t("qr.noData")}</div>;

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>{t("qr.title", prize.name)}</h2>
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
            {t("qr.notPublished")}
          </div>
          <div>{t("qr.until")}{remainSec != null ? fmtHMS(remainSec) : "—"}</div>
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
              {t("qr.formIntro")}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <input
                placeholder={t("qr.entryPlaceholder")}
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
                required
              />
              <input
                type="password"
                placeholder={t("qr.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
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
                {t("qr.submit")}
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
              {t("qr.resultPrefix")}{resultMsg}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: "#6b7280" }}>
        {t("qr.prizeIdPrefix")}{prizeId}
      </div>
    </div>
  );
}
