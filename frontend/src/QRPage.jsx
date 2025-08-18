import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

// 秒を「HH:MM:SS」へ
function fmtHMS(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

export default function QRPage() {
  const { prizeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [prize, setPrize] = useState(null);
  const [error, setError] = useState("");

  // 入力
  const [entryNumber, setEntryNumber] = useState("");
  const [password, setPassword] = useState("");
  const [resultMsg, setResultMsg] = useState("");

  // カウントダウン
  const publishAt = useMemo(() => {
    if (!prize?.publishTimeParsedUTC) return null;
    const d = new Date(prize.publishTimeParsedUTC);
    return isNaN(d) ? null : d;
  }, [prize]);

  const [remainSec, setRemainSec] = useState(null);

  useEffect(() => {
    let timer;
    if (publishAt) {
      const tick = () => {
        const now = new Date();
        const diff = (publishAt.getTime() - now.getTime()) / 1000;
        setRemainSec(diff);
      };
      tick();
      timer = setInterval(tick, 1000);
    }
    return () => timer && clearInterval(timer);
  }, [publishAt]);

  const isPublished = useMemo(() => {
    if (!publishAt) return true; // 値がない場合は公開扱い
    return new Date() >= publishAt;
  }, [publishAt]);

  // 初期ロード：商品情報取得
  useEffect(() => {
    setLoading(true);
    setError("");
    setResultMsg("");

    axios
      .get(`${API_BASE}/api/product/${encodeURIComponent(prizeId)}`)
      .then((res) => setPrize(res.data))
      .catch(() => {
        setError("商品が見つかりません。QRコードが正しいかご確認ください。");
        setPrize(null);
      })
      .finally(() => setLoading(false));
  }, [prizeId]);

  // 結果確認
  const onCheck = async () => {
    setResultMsg("");
    if (!entryNumber || !password) {
      setResultMsg("エントリー番号とパスワードを入力してください。");
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/check`, {
        prizeId,
        entryNumber,
        password,
      });
      setResultMsg(res.data?.result ?? "結果を取得できませんでした。");
    } catch (e) {
      setResultMsg("通信エラーが発生しました。時間を置いてお試しください。");
    }
  };

  if (loading) return <div style={{ padding: 16 }}>読み込み中…</div>;
  if (error) return <div style={{ padding: 16, color: "crimson" }}>{error}</div>;
  if (!prize) return <div style={{ padding: 16 }}>データがありません。</div>;

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>{prize.prizeName} の抽選ページ</h2>
      <div style={{ marginBottom: 12, color: "#555" }}>
        公開予定（JST）：{prize.resultTimeJST || "未設定"}
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
          <div
            style={{
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#f9fafb",
              marginBottom: 16,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              エントリー番号とパスワードを入力して結果を確認してください。
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <input
                placeholder="エントリー番号"
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
              />
              <button
                onClick={onCheck}
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
          </div>

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