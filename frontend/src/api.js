// ============================================================================
// File: frontend/src/api.js
// Version: v0.1_009 (2025-08-27)
// ============================================================================
// Specifications:
// - axiosインスタンス（baseURL, timeout=10s）
// - APIラッパ（prizes / entries / check）
// - GET系にリトライ（最大2回、指数バックオフ）
// - 管理APIラッパ（x-admin-secret 自動付与）
// - 管理API小関数（create/publish_now/bulkUpsert/upsert）
// ============================================================================
// History (recent only):
// - 2025-08-27: /api二重付与を削除し、REACT_APP_API_BASE=/api/lottery に依存するよう統一
// - 2025-08-24: getEntryCount を三段フォールバック化（/count → /entries?prize_id → /entries/:prizeId）
// - 2025-08-24: 参加者数取得API getEntryCount(prizeId) を追加
// - 2025-08-24: 参加者チェックAPIの送信ペイロードを camelCase に統一
// - 2025-08-24: 参加者チェックAPIの送信先を /api/lottery/check に統一
// - 2025-08-24: 参加者チェックAPIを /api/check に戻し互換性対応
// - 2025-08-24: 参加者チェックAPIを /api/lottery/check に変更。送信ペイロードを snake_case に変換
// - 2025-08-24: 管理APIの認証連携を修正（ADMIN_KEY_STORAGEに加えて 'ADMIN_SECRET' をフォールバック）。prize/entryの作成・更新・削除を adminFetch 経由に統一
// - 2025-08-24: GET系リトライ導入／axiosインスタンス化とタイムアウト導入
// ============================================================================

import axios from "axios";

// ベースURL: 環境変数があれば優先、なければ localhost:3001 を既定
export const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:3001";

// 共通 axios インスタンス（10秒タイムアウト）
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: false,
});

// ---- admin auth & fetch ----
export const ADMIN_KEY_STORAGE = "distribution-lottery/admin/secret";
// localStorage から管理シークレットを取得（新旧キーの両対応）
function getAdminSecret() {
  try {
    if (typeof localStorage === "undefined") return "";
    return (
      localStorage.getItem(ADMIN_KEY_STORAGE) ||
      localStorage.getItem("ADMIN_SECRET") ||
      ""
    );
  } catch (_) {
    return "";
  }
}
export async function adminFetch(
  path,
  { method = "GET", headers = {}, body } = {},
) {
  const adminKey = getAdminSecret();
  const h = {
    ...(headers || {}),
    ...(adminKey ? { "x-admin-secret": adminKey } : {}),
  };
  try {
    const res = await api.request({
      url: path,
      method,
      headers: h,
      data: body,
    });
    return res.data;
  } catch (e) {
    // 優先してサーバからのエラーメッセージを返す
    const msg = e?.response?.data?.error || e?.message || String(e);
    throw new Error(msg);
  }
}

// ---- retry utilities ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function requestWithRetry(fn, { retries = 2, backoff = 400 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      const status = e?.response?.status;
      const isNetwork = !e?.response;
      const retryable = isNetwork || (status >= 500 && status < 600);
      if (attempt >= retries || !retryable) {
        throw e;
      }
      await sleep(backoff * Math.pow(2, attempt)); // 400ms, 800ms
      attempt += 1;
    }
  }
}

// ------- prizes -------
export async function getPrizes() {
  const res = await requestWithRetry(() => api.get("/prizes"));
  return res.data;
}

export async function getPrize(id) {
  const res = await requestWithRetry(() =>
    api.get(`/prizes/${encodeURIComponent(id)}`),
  );
  return res.data;
}

export async function createPrize(data) {
  return adminFetch(`/prizes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updatePrize(id, data) {
  return adminFetch(`/prizes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deletePrize(id) {
  return adminFetch(`/prizes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ------- entries -------
export async function getEntries(prizeId) {
  const res = await requestWithRetry(() =>
    api.get(`/entries/${encodeURIComponent(prizeId)}`),
  );
  return res.data;
}

export async function createEntry(data) {
  return adminFetch(`/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateEntry(id, data) {
  return adminFetch(`/entries/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteEntry(id) {
  return adminFetch(`/entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ------- counts -------
/**
 * 参加者数を返す。優先: /entries/count?prize_id=xxx
 * フォールバック: /entries?prize_id=xxx の配列長
 */
export async function getEntryCount(prizeId) {
  // 1) 優先: /entries/count?prize_id=xxx
  try {
    const res = await api.get(`/entries/count`, {
      params: { prize_id: prizeId },
    });
    if (typeof res?.data?.count === "number") {
      return res.data.count;
    }
  } catch (_e) {
    // フォールバックへ
  }

  // 2) 第1フォールバック: /entries?prize_id=xxx の配列長
  try {
    const list = await api.get(`/entries`, {
      params: { prize_id: prizeId },
    });
    if (Array.isArray(list.data)) return list.data.length;
    if (Array.isArray(list.data?.items)) return list.data.items.length;
  } catch (_e) {
    // 次へ
  }

  // 3) 第2フォールバック: /entries/:prizeId の配列長
  try {
    const res = await api.get(`/entries/${encodeURIComponent(prizeId)}`);
    if (Array.isArray(res.data)) return res.data.length;
    if (Array.isArray(res.data?.items)) return res.data.items.length;
  } catch (_e) {
    // すべて失敗
  }

  return 0;
}

// ------- check -------
export async function checkResult({
  prizeId,
  prize_id,
  entryNumber,
  entry_number,
  password,
}) {
  // 呼び出し互換：camel/snake どちらのキーでも受け取れるようにする
  const body = {
    prizeId: prizeId ?? prize_id ?? "",
    entryNumber: entryNumber ?? entry_number ?? "",
    password,
  };
  const res = await api.post("/check", body);
  return res.data;
}

// ------- admin helpers -------
// 賞品作成
export async function adminCreatePrize({ id, name, result_time_jst }) {
  return adminFetch(`/prizes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name, result_time_jst }),
  });
}
// すぐ公開
export async function adminPublishNow(prizeId) {
  return adminFetch(`/prizes/${encodeURIComponent(prizeId)}/publish_now`, {
    method: "POST",
  });
}
// CSV一括投入
export async function adminBulkUpsertEntries({ prize_id, rows, onConflict }) {
  return adminFetch(`/entries/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prize_id, rows, onConflict }),
  });
}
// 単票UPSERT
export async function adminUpsertEntry(body) {
  return adminFetch(`/entries/upsert`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
