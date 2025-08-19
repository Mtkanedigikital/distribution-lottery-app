// ============================================================================
// File: frontend/src/Admin.jsx
// Version: v0.1_007
// ============================================================================
// 仕様:
// - 管理画面（賞品一覧、作成、公開操作、参加者エントリー管理）
// - CSV一括投入や手動UPSERTによるエントリー管理
// - QRコード生成とPNG保存
// ============================================================================
// 履歴（直近のみ）:
// - （プログラム内容の変更なし）
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import * as QR from "qrcode";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";
const ADMIN_KEY_STORAGE = "distribution-lottery/admin/secret";

/** "2025-08-19 13:00" → "公開日: 2025/08/19 13:00" */
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

/** 管理フォーム初期値: 現在のJST + 1時間 を datetime-local 形式で返す */
function jstLocalInputValue(offsetMinutes = 60) {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000 + offsetMinutes * 60 * 1000;
  const jst = new Date(jstMs);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/** publish_time_utc が今以前なら公開済み */
function isPublishedUtc(publishUtc) {
  if (!publishUtc) return false;
  const t = Date.parse(publishUtc);
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}

/** 小さなステータスバッジ */
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

/** CSVを配列に（ヘッダ: entry_number,password,is_winner） */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((s) => s.trim());
  const idx_en = headers.indexOf("entry_number");
  const idx_pw = headers.indexOf("password");
  const idx_win = headers.indexOf("is_winner");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const en = (cols[idx_en] ?? "").trim();
    const pw = (cols[idx_pw] ?? "").trim();
    const winRaw = (cols[idx_win] ?? "").trim().toLowerCase();
    const win = ["true", "1", "yes", "y", "t"].includes(winRaw);
    if (en || pw) rows.push({ entry_number: en, password: pw, is_winner: win });
  }
  return rows;
}

// 管理API用の fetch（x-admin-secret を自動付与）
async function adminFetch(path, options = {}) {
  const secret = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
  const headers = Object.assign({}, options.headers || {}, { "x-admin-secret": secret });
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let body = null;
  try {
    body = await res.json();
  } catch (_e) {}
  if (!res.ok) {
    const msg = body?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export default function Admin() {
  const [prizes, setPrizes] = useState(null);
  const [err, setErr] = useState("");

  // 並べ替えオプション: 未公開を上に
  const [unpublishedFirst, setUnpublishedFirst] = useState(true);

  // 管理シークレット
  const [adminSecret, setAdminSecret] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) || "");
  useEffect(() => {
    localStorage.setItem(ADMIN_KEY_STORAGE, adminSecret || "");
  }, [adminSecret]);

  // 新規作成フォーム
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newJst, setNewJst] = useState(() => jstLocalInputValue(60));
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // CSV一括投入
  const [csvPrizeId, setCsvPrizeId] = useState("");
  const [csvResult, setCsvResult] = useState(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [conflictPolicy, setConflictPolicy] = useState("ignore"); // ignore|upsert

  // 単票 UPSERT（手動）
  const [uPrizeId, setUPrizeId] = useState("");
  const [uEntryNumber, setUEntryNumber] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uIsWinner, setUIsWinner] = useState(false);
  const [uBusy, setUBusy] = useState(false);
  const [uMsg, setUMsg] = useState("");

  // 読み込み
  const loadPrizes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/prizes`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrizes(data);
      setErr("");
    } catch (e) {
      setErr(String(e?.message || e));
      setPrizes([]);
    }
  };
  useEffect(() => {
    loadPrizes();
  }, []);

  const participantUrl = (prizeId) => `${window.location.origin}/p?prizeId=${encodeURIComponent(prizeId)}`;

  // QR PNG ダウンロード（日本語ラベル付き）
  const downloadQR = async (p) => {
    try {
      const url = participantUrl(p.id);
      const qrPngDataUrl = await QR.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, scale: 8 });
      const img = new Image();
      img.onload = () => {
        const qrTarget = 256;
        const padding = 24;
        const textLineHeight = 18;
        const extraTextLines = 2;
        const extraHeight = extraTextLines * textLineHeight + padding;

        const canvas = document.createElement("canvas");
        canvas.width = qrTarget + padding * 2;
        canvas.height = qrTarget + padding * 2 + extraHeight;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const x = (canvas.width - qrTarget) / 2;
        const y = (canvas.height - extraHeight - qrTarget) / 2;
        ctx.drawImage(img, x, y, qrTarget, qrTarget);

        ctx.fillStyle = "#000";
        ctx.font =
          "14px 'Hiragino Sans','Noto Sans JP',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
        const textYStart = qrTarget + padding * 2 + textLineHeight / 2;
        ctx.fillText(`賞品ID: ${p.id}`, padding, textYStart);
        ctx.fillText(formatJstDate(p.result_time_jst), padding, textYStart + textLineHeight);

        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `qr_${p.id}.png`;
        a.click();
      };
      img.onerror = () => alert("QRのPNG変換に失敗しました（画像読み込みエラー）");
      img.src = qrPngDataUrl;
    } catch (e) {
      console.error("downloadQR error:", e);
      alert("QRのPNG変換に失敗しました（例外）。コンソールを確認してください。");
    }
  };

  // 賞品作成（管理API）
  const createPrize = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      if (!newId || !newName || !newJst) throw new Error("ID/名前/公開日時は必須です。");
      const jstStr = newJst.replace("T", " ");
      await adminFetch(`/api/prizes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId.trim(), name: newName.trim(), result_time_jst: jstStr }),
      });
      setCreateMsg("作成しました。");
      setNewId("");
      setNewName("");
      setNewJst(jstLocalInputValue(60));
      await loadPrizes();
    } catch (e2) {
      setCreateMsg(`エラー: ${e2.message}`);
    } finally {
      setCreating(false);
    }
  };

  // すぐ公開ボタン
  const publishNow = async (id) => {
    if (!id) return;
    try {
      const j = await adminFetch(`/api/prizes/${encodeURIComponent(id)}/publish_now`, {
        method: "POST",
      });
      alert(`公開時刻を現在に更新しました（${formatJstDate(j.jst_view_from_utc).replace("公開日: ", "")}）`);
      await loadPrizes();
    } catch (e) {
      alert(`公開に失敗: ${e.message}`);
    }
  };

  // CSV一括投入（JSONボディ版）
  const onCsvSelected = async (file) => {
    setCsvResult(null);
    if (!csvPrizeId) {
      alert("先に対象の賞品IDを選択してください。");
      return;
    }
    if (!file) return;
    setCsvBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) throw new Error("CSVの内容が空です。ヘッダ行とデータ行が必要です。");
      const data = await adminFetch(`/api/entries/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prize_id: csvPrizeId, rows, onConflict: conflictPolicy }),
      });
      setCsvResult(data);
    } catch (e) {
      setCsvResult({ error: e.message });
    } finally {
      setCsvBusy(false);
    }
  };

  const prizeOptions = useMemo(() => (Array.isArray(prizes) ? prizes : []), [prizes]);

  const downloadSampleCsv = () => {
    const sample = "entry_number,password,is_winner\n001,1111,true\n002,2222,false\n";
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entries_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 単票 UPSERT（手動）
  const upsertEntryManual = async () => {
    setUBusy(true);
    setUMsg("");
    try {
      if (!uPrizeId || !uEntryNumber || !uPassword) throw new Error("賞品ID / 抽選番号 / パスワード を入力してください");
      const body = {
        prize_id: uPrizeId.trim(),
        entry_number: uEntryNumber.trim(),
        password: uPassword,
        is_winner: !!uIsWinner,
      };
      const j = await adminFetch(`/api/entries/upsert`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setUMsg(`UPSERT成功: id=${j.id} / ${j.entry_number} → ${j.is_winner ? "当選" : "落選"}`);
    } catch (e) {
      setUMsg(`エラー: ${e.message}`);
    } finally {
      setUBusy(false);
    }
  };

  /** 並べ替え済みの賞品配列を計算（未公開→公開、次に公開日時が近い順） */
  const sortedPrizes = useMemo(() => {
    if (!Array.isArray(prizes)) return [];
    const arr = [...prizes];
    if (!unpublishedFirst) return arr;
    const ts = (p) => {
      const t = Date.parse(p.publish_time_utc || "");
      return Number.isNaN(t) ? Infinity : t;
    };
    return arr.sort((a, b) => {
      const ap = isPublishedUtc(a.publish_time_utc);
      const bp = isPublishedUtc(b.publish_time_utc);
      // 未公開を先に
      if (ap !== bp) return ap ? 1 : -1;
      // 同じ公開状態なら公開予定(または実際の)時刻が近い順
      return ts(a) - ts(b);
    });
  }, [prizes, unpublishedFirst]);

  return (
    <div style={{ padding: 16 }}>
      <h2>管理：賞品一覧</h2>

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

      {/* 管理シークレット入力 */}
      <div style={{ border: "1px dashed #bbb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <label>
          管理シークレット（ADMIN_SECRET）
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="ここに管理シークレットを入力（ローカル保存）"
            style={{ marginLeft: 8, width: 360 }}
          />
        </label>
        <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
          ブラウザの <code>localStorage</code> に保存され、管理API呼び出し時に <code>x-admin-secret</code> ヘッダで送信されます。
        </div>
      </div>

      {err && <p style={{ color: "red" }}>エラー: {err}</p>}

      {/* 賞品作成 */}
      <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 16, maxWidth: 520 }}>
        <h3>賞品の新規作成</h3>
        <form onSubmit={createPrize} style={{ display: "grid", gap: 8 }}>
          <label>
            賞品ID（例: B002）
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="B002" required />
          </label>
          <label>
            賞品名
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="○○賞" required />
          </label>
          <label>
            公開日時（JST）
            <input type="datetime-local" value={newJst} onChange={(e) => setNewJst(e.target.value)} required />
          </label>
          <small style={{ color: "#555" }}>
            ヒント：初期値は<strong>現時間＋1時間（JST）</strong>の表記です。
          </small>
          <div>
            <button type="submit" disabled={creating}>{creating ? "作成中…" : "作成する"}</button>
            {createMsg && <span style={{ marginLeft: 8, fontSize: 12 }}>{createMsg}</span>}
          </div>
        </form>
      </section>

      {/* CSV一括投入 */}
      <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3>参加者エントリーの一括投入（CSV）</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <label>
            対象の賞品ID
            <select value={csvPrizeId} onChange={(e) => setCsvPrizeId(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="">-- 選択してください --</option>
              {prizeOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} / {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            重複時の動作
            <select value={conflictPolicy} onChange={(e) => setConflictPolicy(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="ignore">既存を維持（新規のみ追加）</option>
              <option value="upsert">上書き（パスワード/当落を更新）</option>
            </select>
          </label>
          <input type="file" accept=".csv,text/csv" disabled={csvBusy} onChange={(e) => onCsvSelected(e.target.files?.[0])} />
          <button type="button" onClick={downloadSampleCsv}>サンプルCSVを保存</button>
        </div>
        <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
          CSVフォーマット（1行目はヘッダ必須）：
          <pre style={{ background: "#f7f7f7", padding: 8, overflowX: "auto" }}>
entry_number,password,is_winner
001,1111,true
002,2222,false
          </pre>
        </div>
        {csvBusy && <div>アップロード中…</div>}
        {csvResult && !csvResult.error && (
          <div style={{ fontSize: 13 }}>
            追加: {csvResult.inserted ?? 0} / 更新: {csvResult.updated ?? 0} / スキップ: {csvResult.skipped ?? 0}
            {csvResult.errors?.length > 0 && (
              <details style={{ marginTop: 6 }}>
                <summary>詳細エラー（{csvResult.errors.length}件）</summary>
                <ul>
                  {csvResult.errors.map((e, i) => (
                    <li key={i}>行 {e.rowIndex + 2}: {e.message}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {csvResult && csvResult.error && <div style={{ color: "red" }}>エラー: {csvResult.error}</div>}
      </section>

      {/* 単票 UPSERT（CSVなしで手動） */}
      <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 16, maxWidth: 520 }}>
        <h3>単票 UPSERT（手動）</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            賞品ID
            <input value={uPrizeId} onChange={(e) => setUPrizeId(e.target.value)} placeholder="B001" />
          </label>
          <label>
            抽選番号
            <input value={uEntryNumber} onChange={(e) => setUEntryNumber(e.target.value)} placeholder="001" />
          </label>
          <label>
            パスワード
            <input value={uPassword} onChange={(e) => setUPassword(e.target.value)} />
          </label>
          <label style={{ userSelect: "none" }}>
            <input type="checkbox" checked={uIsWinner} onChange={(e) => setUIsWinner(e.target.checked)} />
            &nbsp;当選
          </label>
          <div>
            <button type="button" disabled={uBusy} onClick={upsertEntryManual}>
              {uBusy ? "送信中…" : "UPSERT 実行"}
            </button>
            {uMsg && <span style={{ marginLeft: 8, fontSize: 12 }}>{uMsg}</span>}
          </div>
        </div>
      </section>

      {/* 賞品リスト */}
      {prizes === null && <p>読み込み中…</p>}
      {Array.isArray(prizes) && prizes.length === 0 && <p>賞品がありません。</p>}
      {Array.isArray(prizes) && prizes.length > 0 && (
        <ul style={{ paddingLeft: 16 }}>
          {sortedPrizes.map((p) => (
            <li
              key={p.id}
              style={{
                marginBottom: 24,
                listStyle: "none",
                padding: 16,
                border: "1px solid #eee",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    <span style={{ fontFamily: "monospace" }}>{p.id}</span> {p.name}
                    <PublishedBadge published={isPublishedUtc(p.publish_time_utc)} />
                  </div>
                  <div>{formatJstDate(p.result_time_jst)}</div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Link to={`/p?prizeId=${encodeURIComponent(p.id)}`}>参加者ページを開く</Link>
                    <button type="button" onClick={() => publishNow(p.id)}>公開時刻を今にする</button>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <QRCode value={`${window.location.origin}/p?prizeId=${encodeURIComponent(p.id)}`} size={128} />
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => downloadQR(p)}>QRをPNG保存</button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}