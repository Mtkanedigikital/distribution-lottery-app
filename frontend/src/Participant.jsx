// ============================================================================
// File: frontend/src/Participant.jsx
// Version: v0.1_004 (2025-08-24)
// ============================================================================
// Specifications:
// - URLクエリから prizeId を取得し対象賞品を特定
// - /api/prizes から対象賞品情報を取得して表示
// - publish_time_* をJSTで表示（formatPublishJst）
// - 抽選番号とパスワードを送信し当落を確認
// ============================================================================
// History (recent only):
// - 2025-08-24: ヘッダを公式フォーマットに統一
// - 2025-08-24: 公開時刻表示を publish_time_* に統一／エラー文言を詳細化
// - 2025-08-23: 表示文言を participant.* に統一（qr.* から置換）
// ============================================================================

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPrizes, checkResult } from "./api";
import { ERROR_BOX_STYLE } from "./ui/styles";
import t from "./locale";

const BUTTON_STYLE = {
  padding: "12px 14px",
  minHeight: 44,
  fontSize: 16,
  lineHeight: "24px",
  borderRadius: 8,
  cursor: "pointer",
  background: "#2563eb",
  color: "#ffffff",
  border: "1px solid #2563eb",
  textDecoration: "none",
  display: "inline-block",
};

const INPUT_STYLE = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "8px 10px",
  minHeight: 40,
  fontSize: 16,
  borderRadius: 6,
  boxSizing: "border-box",
};

const WRAP_STYLE = {
  maxWidth: 600,
  width: "100%",
  margin: 0, // 左寄せ（中央寄せを解除）
  padding: 16,
  boxSizing: "border-box",
};

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// "2025-08-19 13:00" → t('prizes.publishAt', "2025/08/19 13:00")
function formatJstDate(str) {
  try {
    if (!str || typeof str !== "string")
      return t("prizes.publishAt", str ?? "");
    const [datePart, timePartRaw] = str.trim().split(/\s+/);
    const [y, m, d] = datePart.split("-");
    const timePart = (timePartRaw || "").slice(0, 5);
    if (!y || !m || !d || !timePart) return t("prizes.publishAt", str);
    const jst = `${y}/${m}/${d} ${timePart}`;
    return t("prizes.publishAt", jst);
  } catch {
    return t("prizes.publishAt", str);
  }
}

// UTC ISO → "YYYY-MM-DD HH:mm"（JST）へ変換
function utcIsoToJstYmdHm(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const ms = d.getTime() + 9 * 60 * 60 * 1000; // +09:00
    const z = new Date(ms).toISOString(); // 例: 2025-08-24T03:00:00.000Z
    return z.slice(0, 16).replace("T", " "); // "YYYY-MM-DD HH:mm"
  } catch {
    return "";
  }
}

// 賞品の公開時刻をJST表記で取得（publish_time_jst 優先）
function formatPublishJst(prize) {
  if (!prize) return "";
  if (prize.publish_time_jst) {
    // ハイフン/スラッシュ揺れを吸収して既存フォーマッタに渡す
    return formatJstDate(String(prize.publish_time_jst).replace(/\//g, "-"));
  }
  if (prize.publish_time_utc) {
    const jst = utcIsoToJstYmdHm(prize.publish_time_utc);
    return t("prizes.publishAt", jst || "");
  }
  return "";
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
  const [loading, setLoading] = useState(false);

  // prizeId が無ければ /prizes へ誘導
  useEffect(() => {
    if (!prizeId) navigate("/prizes", { replace: true });
  }, [prizeId, navigate]);

  // 賞品情報の取得（名前・公開時刻）
  useEffect(() => {
    if (!prizeId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await getPrizes();
        const found = Array.isArray(list)
          ? list.find((x) => x.id === prizeId)
          : null;
        if (found) setPrize(found);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [prizeId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setErr("");
    try {
      const data = await checkResult({ prizeId, entryNumber, password });
      setMessage(data?.result || "OK");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || String(e));
    }
  };

  if (loading) {
    return <div style={WRAP_STYLE}>{t("common.loading")}</div>;
  }

  if (err) {
    return (
      <div style={WRAP_STYLE}>
        <div style={ERROR_BOX_STYLE}>
          {t("common.errorPrefix")}
          {err}
        </div>
      </div>
    );
  }

  return (
    <div style={WRAP_STYLE}>
      {!prize && <div style={{ padding: 16 }}>{t("participant.noData")}</div>}
      <h2>{t("participant.title", prize?.name || "")}</h2>
      {prize && (
        <div style={{ marginBottom: 12 }}>
          <div>
            <strong>{t("participant.prizeIdPrefix")}</strong> {prize.id}
          </div>
          <div>
            <strong>{t("participant.prizeNamePrefix")}</strong> {prize.name}
          </div>
          <div>
            <strong>{formatPublishJst(prize)}</strong>
          </div>
        </div>
      )}

      {err && (
        <div style={ERROR_BOX_STYLE}>
          {t("common.errorPrefix")}
          {err}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 8, maxWidth: "100%" }}
      >
        <label>
          抽選番号
          <input
            value={entryNumber}
            onChange={(e) => setEntryNumber(e.target.value)}
            placeholder={t("participant.entryPlaceholder")}
            required
            style={INPUT_STYLE}
          />
        </label>

        <label>
          パスワード
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("participant.passwordPlaceholder")}
            required
            style={INPUT_STYLE}
          />
        </label>

        <button type="submit" style={BUTTON_STYLE}>
          {t("participant.submit")}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 12, fontWeight: 600 }}>
          {t("participant.resultPrefix")}
          {message}
        </p>
      )}
    </div>
  );
}
