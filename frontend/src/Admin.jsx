// ============================================================================
// File: frontend/src/Admin.jsx
// ============================================================================
// Specifications:
// - 管理画面（賞品一覧、作成、公開操作、参加者エントリー管理）
// - CSV一括投入や手動UPSERTによるエントリー管理
// - QRコード生成とPNG保存
// ============================================================================
// History (recent only):
// - 2025-08-30: ボタンの無効時スタイルを buttonStyle で統一適用
// - 2025-08-30: ヘッダを公式フォーマットに統一（Specifications/History 見出し、履歴整形）
// - 2025-08-30: CSV取込ボタンのクリック確認ログ/トーストと状態表示を追加（無反応見えの解消）
// - 2025-08-30: CSV取込ボタンの未選択ガードを追加、CSV読込時にBOM/改行の正規化を実装
// - 2025-08-30: CSV一括投入に「CSVを取り込む」ボタンを追加（選択後に明示実行方式へ変更）
// - 2025-08-30: CSVアップロードを csv_text 送信に統一、CSVフォーマット表示を折りたたみに変更
// - 2025-08-30: CSVの「サンプルCSVを保存」を折りたたみ（details/summary）で非強調化
// - 2025-08-24: 公開判定/表示の整合性（publish_time_utc をJST換算、未来は未公開）を修正
// - 2025-08-24: 賞品カードのタイトル横に参加者数バッジを追加
// - 2025-08-24: 共通スタイル(ui/styles)を適用し、ローカル定義を削除（ボタン/入力/セクション幅の統一）
// - 2025-08-23: 参加者ページリンクを /p → /participant に修正
// - 2025-08-23: CSVの「ファイルを選択」ボタンを他ボタンと同サイズに統一（label + hidden input化）
// - 2025-08-23: iOS Safariで日時入力が枠からはみ出す問題を修正（幅を100%・最小幅0・外観調整）
// - 2025-08-22: 管理API小関数（api.js）を利用し、adminFetch 直呼びを整理
// - 2025-08-22: 日付/CSVユーティリティを utils/ 配下へ分離し、import に切替
// - 2025-08-22: PublishedBadge コンポーネントを components/admin/ に分離
// - 2025-08-22: QrCard コンポーネントを components/admin/ に分離
// - 2025-08-22: Adminのトースト/エラーメッセージを locale 辞書に統一
// - 2025-08-22: Adminの固定文言（見出し/ラベル/ボタン）を locale 辞書に統一
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QrCard from "./components/admin/QrCard";

import {
  WRAP_STYLE,
  CARD_STYLE,
  INPUT_STYLE,
  BUTTON_STYLE,
  ERROR_BOX_STYLE,
  buttonStyle,
} from "./ui/styles";

import {
  getPrizes,
  ADMIN_KEY_STORAGE,
  adminCreatePrize,
  adminPublishNow,
  adminBulkUpsertEntries,
  adminUpsertEntry,
} from "./api";
import { formatJstDate, jstLocalInputValue } from "./utils/datetime";
import PublishedBadge from "./components/admin/PublishedBadge";
import { getEntryCount } from "./api";

import t from "./locale";

// 未公開優先の保存キー
const UNPUBLISHED_FIRST_KEY = "distribution-lottery/admin/unpublishedFirst";

// --- 公開判定（publish_time_utc を優先、無ければ JST表記をフォールバック） ---
function isPublishedJST(publishUtc, publishJst) {
  if (publishUtc) {
    const t = Date.parse(publishUtc); // ISO想定
    if (!Number.isNaN(t)) return t <= Date.now();
  }
  if (publishJst) {
    // "YYYY/MM/DD HH:mm" or "YYYY-MM-DD HH:mm" を JST(+09:00) として比較
    const s = publishJst.replace(/\//g, "-").replace(" ", "T") + "+09:00";
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t <= Date.now();
  }
  return false;
}

// --- ISO(UTC) → JST 表示 "YYYY/MM/DD HH:mm"（ラベルは付けない）
function formatJstFromUtc(utcStr) {
  try {
    if (!utcStr) return "";
    const d = new Date(utcStr);
    if (Number.isNaN(d.getTime())) return "";
    return d
      .toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\u200E/g, "");
  } catch {
    return "";
  }
}

// 参加者数バッジ（各カードのタイトル横に表示）
function CountBadge({ prizeId }) {
  const [n, setN] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getEntryCount(prizeId);
        if (alive) setN(Number.isFinite(c) ? c : 0);
      } catch {
        if (alive) setN(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [prizeId]);
  return (
    <span style={{ fontSize: 12, color: "#374151", marginLeft: 8 }}>
      参加者数: {n == null ? "…" : `${n}件`}
    </span>
  );
}

export default function Admin() {
  const [prizes, setPrizes] = useState(null);
  const [err, setErr] = useState("");

  // 並べ替えオプション: 未公開を上に
  const [unpublishedFirst, setUnpublishedFirst] = useState(() => {
    const saved = localStorage.getItem(UNPUBLISHED_FIRST_KEY);
    return saved === null ? true : saved === "true";
  });

  // 管理シークレット
  const [adminSecret, setAdminSecret] = useState(
    () => localStorage.getItem(ADMIN_KEY_STORAGE) || "",
  );
  useEffect(() => {
    localStorage.setItem(ADMIN_KEY_STORAGE, adminSecret || "");
  }, [adminSecret]);
  // unpublishedFirstの保存
  useEffect(() => {
    localStorage.setItem(UNPUBLISHED_FIRST_KEY, String(unpublishedFirst));
  }, [unpublishedFirst]);

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
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");

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
      const data = await getPrizes();
      setPrizes(Array.isArray(data) ? data : []);
      setErr("");
    } catch (e) {
      setErr(String(e?.message || e));
      setPrizes([]);
    }
  };
  useEffect(() => {
    loadPrizes();
  }, []);

  // 軽量トースト通知（固定下部）
  const [toast, setToast] = useState(null); // { text, kind }
  const showToast = (text, kind = "info") => {
    setToast({ text, kind });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  // 賞品作成（管理API）
  const createPrize = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      if (!newId || !newName || !newJst)
        throw new Error("ID/名前/公開日時は必須です。");
      const jstStr = newJst.replace("T", " ");
      await adminCreatePrize({
        id: newId.trim(),
        name: newName.trim(),
        result_time_jst: jstStr,
      });
      setCreateMsg(t("admin.toast.createSuccess"));
      setNewId("");
      setNewName("");
      setNewJst(jstLocalInputValue(60));
      await loadPrizes();
    } catch (e2) {
      setCreateMsg(`${t("common.errorPrefix")}${e2.message}`);
    } finally {
      setCreating(false);
    }
  };

  // すぐ公開ボタン
  const publishNow = async (id) => {
    if (!id) return;
    try {
      const j = await adminPublishNow(id);
      showToast(
        t(
          "admin.toast.publishUpdated",
          formatJstDate(j.jst_view_from_utc).replace("公開日: ", ""),
        ),
        "success",
      );
      await loadPrizes();
    } catch (e) {
      showToast(t("admin.toast.publishFail"), "error");
    }
  };

  // CSV一括投入
  const onCsvSelected = async (file) => {
    setCsvResult(null);
    if (!csvPrizeId) {
      alert("先に対象の賞品IDを選択してください。");
      return;
    }
    if (!file) {
      setCsvFileName("");
      setCsvText("");
      return;
    }
    setCsvFileName(file.name);
    try {
      const raw = await file.text();
      // 正規化: 先頭BOM除去 + 改行CRLF→LF
      const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
      if (!text || !text.trim()) {
        throw new Error("CSVの内容が空です。ヘッダ行とデータ行が必要です。");
      }
      setCsvText(text);
      // ここでは実行しない。ユーザーが「CSVを取り込む」ボタンで実行する。
    } catch (e) {
      setCsvText("");
      setCsvResult({ error: e.message });
    }
  };

  const runCsvImport = async () => {
    console.log("runCsvImport:start", {
      prizeId: csvPrizeId,
      csvTextLen: (csvText || "").length,
      conflictPolicy,
    });
    showToast("CSV取り込みを開始します…", "info");
    if (!csvPrizeId) {
      alert("先に対象の賞品IDを選択してください。");
      return;
    }
    if (!csvText || !csvText.trim()) {
      alert("CSVファイルを選んでください。");
      return;
    }
    setCsvBusy(true);
    try {
      const data = await adminBulkUpsertEntries({
        prizeId: csvPrizeId,
        csvText,
        onConflict: conflictPolicy,
      });
      setCsvResult(data);
      const summary = `追加:${data.inserted ?? 0} 更新:${data.updated ?? 0} スキップ:${data.skipped ?? 0}`;
      showToast(t("admin.toast.csvResult", summary), "success");
    } catch (e) {
      setCsvResult({ error: e.message });
      showToast(t("admin.toast.csvFail"), "error");
    } finally {
      setCsvBusy(false);
    }
  };

  const prizeOptions = useMemo(
    () => (Array.isArray(prizes) ? prizes : []),
    [prizes],
  );

  const downloadSampleCsv = () => {
    const sample =
      "entry_number,password,is_winner\n001,1111,true\n002,2222,false\n";
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
      if (!uPrizeId || !uEntryNumber || !uPassword)
        throw new Error("賞品ID / 抽選番号 / パスワード を入力してください");
      const body = {
        prize_id: uPrizeId.trim(),
        entry_number: uEntryNumber.trim(),
        password: uPassword,
        is_winner: !!uIsWinner,
      };
      const j = await adminUpsertEntry(body);
      setUMsg(
        `${t("admin.toast.upsertSuccess")} id=${j.id} / ${j.entry_number} → ${j.is_winner ? "当選" : "落選"}`,
      );
      showToast(t("admin.toast.upsertSuccess"), "success");
    } catch (e) {
      setUMsg(`${t("common.errorPrefix")}${e.message}`);
      showToast(t("admin.toast.upsertFail"), "error");
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
      const ap = isPublishedJST(
        a.publish_time_utc,
        a.result_time_jst || a.publish_time_jst,
      );
      const bp = isPublishedJST(
        b.publish_time_utc,
        b.result_time_jst || b.publish_time_jst,
      );
      // 未公開を先に
      if (ap !== bp) return ap ? 1 : -1;
      // 同じ公開状態なら公開予定(または実際の)時刻が近い順
      return ts(a) - ts(b);
    });
  }, [prizes, unpublishedFirst]);

  return (
    <>
      <style>{`
        input, select, button {
          outline: none;
        }
        input:focus, select:focus, button:focus {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
        }
        /* iOS Safari の日時入力が親枠をはみ出す対策 */
        input[type="datetime-local"] {
          max-width: 100%;
          width: 100%;
          min-width: 0;
          -webkit-appearance: none;
          appearance: none;
        }
      `}</style>
      <div style={WRAP_STYLE}>
        <h2>{t("admin.title.prizeList")}</h2>

        {/* 並べ替えオプション */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ userSelect: "none" }}>
            <input
              type="checkbox"
              checked={unpublishedFirst}
              onChange={(e) => setUnpublishedFirst(e.target.checked)}
            />
            &nbsp;{t("admin.label.unpublishedFirst")}
          </label>
        </div>

        {/* 管理シークレット入力 */}
        <section style={CARD_STYLE}>
          <label style={{ display: "block" }}>
            {t("admin.label.secret")}
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder={t("admin.placeholder.secret")}
              style={{ ...INPUT_STYLE, marginTop: 8, maxWidth: 360 }}
            />
          </label>
          <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
            {t("admin.help.secret")}
          </div>
        </section>

        {err && <div style={ERROR_BOX_STYLE}>エラー: {err}</div>}

        {/* 賞品作成 */}
        <section style={CARD_STYLE}>
          <h3>{t("admin.title.createPrize")}</h3>
          <form onSubmit={createPrize} style={{ display: "grid", gap: 8 }}>
            <label>
              {t("admin.label.prizeId")}
              <input
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder={t("admin.placeholder.prizeId")}
                required
                style={INPUT_STYLE}
              />
            </label>
            <label>
              {t("admin.label.prizeName")}
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("admin.placeholder.prizeName")}
                required
                style={INPUT_STYLE}
              />
            </label>
            <label>
              {t("admin.label.publishAt")}
              <input
                type="datetime-local"
                value={newJst}
                onChange={(e) => setNewJst(e.target.value)}
                required
                style={INPUT_STYLE}
              />
            </label>
            <small style={{ color: "#555" }}>
              {t("admin.hint.defaultTime")}
            </small>
            <div>
              <button
                type="submit"
                disabled={creating}
                style={buttonStyle(creating)}
              >
                {creating
                  ? t("admin.button.creating")
                  : t("admin.button.create")}
              </button>
              {createMsg && (
                <span style={{ marginLeft: 8, fontSize: 12 }}>{createMsg}</span>
              )}
            </div>
          </form>
        </section>

        {/* CSV一括投入 */}
        <section style={CARD_STYLE}>
          <h3>{t("admin.title.csvUpload")}</h3>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <label>
              {t("admin.label.targetPrizeId")}
              <select
                value={csvPrizeId}
                onChange={(e) => setCsvPrizeId(e.target.value)}
                style={{ ...INPUT_STYLE, marginLeft: 8 }}
              >
                <option value="">{t("admin.option.selectPrize")}</option>
                {prizeOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} / {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("admin.label.conflictPolicy")}
              <select
                value={conflictPolicy}
                onChange={(e) => setConflictPolicy(e.target.value)}
                style={{ ...INPUT_STYLE, marginLeft: 8 }}
              >
                <option value="ignore">{t("admin.option.ignore")}</option>
                <option value="upsert">{t("admin.option.upsert")}</option>
              </select>
            </label>
            {/* ファイル選択（ブラウザデフォルトに戻す） */}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={csvBusy}
              onChange={(e) => onCsvSelected(e.target.files?.[0])}
            />
            {csvFileName && (
              <span style={{ fontSize: 12, color: "#555" }}>{csvFileName}</span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={runCsvImport}
                disabled={csvBusy || !csvPrizeId || !csvFileName}
                style={{
                  ...buttonStyle(csvBusy || !csvPrizeId || !csvFileName),
                  pointerEvents: csvBusy ? "none" : "auto",
                  zIndex: 1,
                }}
                title="選択したCSVを取り込む"
              >
                {csvBusy ? t("admin.button.sending") : "CSVを取り込む"}
              </button>
              <small style={{ color: "#6B7280" }}>
                状態: prizeId={csvPrizeId ? "✓" : "×"} / CSV=
                {csvText ? `${csvText.length}B` : "×"} / busy=
                {csvBusy ? "✓" : "×"}
              </small>
            </div>
            <details style={{ marginLeft: 4 }}>
              <summary
                style={{ cursor: "pointer", fontSize: 12, color: "#9CA3AF" }}
              >
                その他オプション
              </summary>
              <div style={{ marginTop: 6, marginLeft: 8 }}>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    textDecoration: "underline",
                    color: "#6B7280",
                    cursor: "pointer",
                  }}
                  title="CSVの雛形を保存"
                >
                  {t("admin.button.downloadSampleCsv")}
                </button>
                <details
                  style={{
                    fontSize: 12,
                    color: "#555",
                    lineHeight: 1.6,
                    marginTop: 8,
                  }}
                >
                  <summary style={{ cursor: "pointer", color: "#9CA3AF" }}>
                    CSVフォーマット（1行目は必ずヘッダ）
                  </summary>
                  <div style={{ marginTop: 6 }}>
                    <pre
                      style={{
                        background: "#f7f7f7",
                        padding: 8,
                        overflowX: "auto",
                      }}
                    >
                      {`entry_number,password,is_winner
001,1111,true
002,2222,false`}
                    </pre>
                  </div>
                </details>
              </div>
            </details>
          </div>
          {csvBusy && (
            <div style={{ fontSize: 12, color: "#555" }}>
              {t("admin.state.uploading")}
            </div>
          )}
          {csvResult && !csvResult.error && (
            <div style={{ fontSize: 13 }}>
              追加: {csvResult.inserted ?? 0} / 更新: {csvResult.updated ?? 0} /
              スキップ: {csvResult.skipped ?? 0}
              {csvResult.errors?.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary>詳細エラー（{csvResult.errors.length}件）</summary>
                  <ul>
                    {csvResult.errors.map((e, i) => (
                      <li key={i}>
                        行 {e.rowIndex + 2}: {e.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {csvResult && csvResult.error && (
            <div style={{ color: "red" }}>
              {t("common.errorPrefix")}
              {csvResult.error}
            </div>
          )}
        </section>

        {/* 単票 UPSERT（CSVなしで手動） */}
        <section style={CARD_STYLE}>
          <h3>{t("admin.title.upsertManual")}</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              {t("admin.label.prizeIdShort")}
              <input
                value={uPrizeId}
                onChange={(e) => setUPrizeId(e.target.value)}
                placeholder="B001"
                style={INPUT_STYLE}
              />
            </label>
            <label>
              {t("admin.label.entryNumber")}
              <input
                value={uEntryNumber}
                onChange={(e) => setUEntryNumber(e.target.value)}
                placeholder="001"
                style={INPUT_STYLE}
              />
            </label>
            <label>
              {t("admin.label.password")}
              <input
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
                style={INPUT_STYLE}
              />
            </label>
            <label style={{ userSelect: "none" }}>
              <input
                type="checkbox"
                checked={uIsWinner}
                onChange={(e) => setUIsWinner(e.target.checked)}
              />
              &nbsp;{t("admin.label.isWinner")}
            </label>
            <div>
              <button
                type="button"
                disabled={uBusy}
                onClick={upsertEntryManual}
                style={buttonStyle(uBusy)}
              >
                {uBusy ? t("admin.button.sending") : t("admin.button.upsert")}
              </button>
              {uMsg && (
                <span style={{ marginLeft: 8, fontSize: 12 }}>{uMsg}</span>
              )}
            </div>
          </div>
        </section>

        {/* 賞品リスト */}
        <section style={CARD_STYLE}>
          {prizes === null && <p>{t("common.loading")}</p>}
          {Array.isArray(prizes) && prizes.length === 0 && (
            <p>{t("admin.state.noPrizes")}</p>
          )}
          {Array.isArray(prizes) && prizes.length > 0 && (
            <ul style={{ paddingLeft: 16 }}>
              {sortedPrizes.map((p) => {
                const publishAtText = p.publish_time_utc
                  ? `公開日: ${formatJstFromUtc(p.publish_time_utc)}`
                  : formatJstDate(p.result_time_jst);
                const published = isPublishedJST(
                  p.publish_time_utc,
                  p.result_time_jst || p.publish_time_jst,
                );
                return (
                  <li
                    key={p.id}
                    style={{
                      marginBottom: 16,
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
                          <span style={{ fontFamily: "monospace" }}>
                            {p.id}
                          </span>{" "}
                          {p.name}
                          <PublishedBadge published={published} />
                          <CountBadge prizeId={p.id} />
                        </div>
                        <div>{publishAtText}</div>
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            to={`/participant?prizeId=${encodeURIComponent(p.id)}`}
                          >
                            {t("admin.link.participantPage")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => publishNow(p.id)}
                            style={BUTTON_STYLE}
                          >
                            {t("admin.button.publishNow")}
                          </button>
                        </div>
                      </div>
                      <QrCard prize={p} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {/* トースト通知 */}
        {toast && (
          <div
            style={{
              position: "fixed",
              left: 0,
              bottom: 0,
              width: "100vw",
              zIndex: 1100,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                background:
                  toast.kind === "error"
                    ? "#fee2e2"
                    : toast.kind === "success"
                      ? "#dcfce7"
                      : "#f1f5f9",
                color:
                  toast.kind === "error"
                    ? "#b91c1c"
                    : toast.kind === "success"
                      ? "#065f46"
                      : "#334155",
                border:
                  toast.kind === "error"
                    ? "1px solid #fca5a5"
                    : toast.kind === "success"
                      ? "1px solid #86efac"
                      : "1px solid #cbd5e1",
                borderRadius: 8,
                margin: 16,
                padding: "16px 24px",
                fontSize: 15,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                pointerEvents: "auto",
              }}
            >
              {toast.text}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
