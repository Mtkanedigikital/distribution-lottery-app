// ============================================================================
// File: frontend/src/PrizeList.jsx
// Version: v0.1_003 (2025-08-23)
// ============================================================================
// 仕様:
// - /api/prizes から抽選予定の賞品一覧を取得して表示
// - 公開予定時刻（JST）を整形表示
// - 各賞品の抽選ページ（/participant?prizeId=...）へのリンクを提供
// ============================================================================
// 履歴（直近のみ）:
// - api.js の getPrizes に統一し、読み込み中の無限ループを解消
// - 2025-08-23: 参加者ページリンクを /p → /participant に修正
// ============================================================================

import React, { useEffect, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { Link } from "react-router-dom";
import { getPrizes } from "./api";
import { ERROR_BOX_STYLE } from "./ui/styles";
import t from "./locale";

// "2025-08-19 13:00" → t('prizes.publishAt', "2025/08/19 13:00")
function formatJstDate(str) {
  try {
    if (!str || typeof str !== "string") return t("prizes.publishAt", str ?? "");
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

export default function PrizeList() {
  const [prizes, setPrizes] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await getPrizes();
      setPrizes(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h2>{t("prizes.title")}</h2>
      <p>{t("prizes.note")}</p>
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <ClipLoader size={30} color="#333" />
          <p>{t("common.loading")}</p>
        </div>
      ) : err ? (
        <div style={ERROR_BOX_STYLE}>
          <div style={{ marginBottom: 8 }}>{t("common.errorPrefix")}{err}</div>
          <button
            type="button"
            onClick={load}
            style={{
              padding: "8px 12px",
              border: "1px solid #991b1b",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : prizes.length === 0 ? (
        <p>{t("prizes.empty")}</p>
      ) : (
        <ul style={{ paddingLeft: 16 }}>
          {prizes.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <strong>{p.id}</strong> {p.name}（{formatJstDate(p.result_time_jst)}）{" "}
              <Link to={`/participant?prizeId=${encodeURIComponent(p.id)}`}>
                {t("prizes.openParticipant")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
