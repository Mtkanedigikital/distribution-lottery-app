// -----------------------------------------------------------------------------
// File: frontend/src/api.js
// Version: v0.1 (2025-08-19)
//
// 概要:
// - フロントエンドから利用する API 呼び出し関数群を定義
// - axios を利用してバックエンドと通信
// - 賞品 (prizes)、参加者エントリ (entries)、抽選結果チェックの API を提供
// -----------------------------------------------------------------------------

import axios from "axios";

// 環境変数から API ベースURLを取得
// 例: 開発環境 → http://localhost:3001
//     Render 本番 → https://distribution-lottery-backend.onrender.com
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

export async function getPrizes() {
  const res = await axios.get(`${API_BASE}/api/prizes`);
  return res.data;
}

export async function getPrize(id) {
  const res = await axios.get(`${API_BASE}/api/prizes/${encodeURIComponent(id)}`);
  return res.data;
}

export async function createPrize(data) {
  const res = await axios.post(`${API_BASE}/api/prizes`, data);
  return res.data;
}

export async function updatePrize(id, data) {
  const res = await axios.put(`${API_BASE}/api/prizes/${encodeURIComponent(id)}`, data);
  return res.data;
}

export async function deletePrize(id) {
  const res = await axios.delete(`${API_BASE}/api/prizes/${encodeURIComponent(id)}`);
  return res.data;
}

export async function getEntries(prizeId) {
  const res = await axios.get(`${API_BASE}/api/entries/${encodeURIComponent(prizeId)}`);
  return res.data;
}

export async function createEntry(data) {
  const res = await axios.post(`${API_BASE}/api/entries`, data);
  return res.data;
}

export async function updateEntry(id, data) {
  const res = await axios.put(`${API_BASE}/api/entries/${encodeURIComponent(id)}`, data);
  return res.data;
}

export async function deleteEntry(id) {
  const res = await axios.delete(`${API_BASE}/api/entries/${encodeURIComponent(id)}`);
  return res.data;
}

export async function checkResult({ prizeId, entryNumber, password }) {
  const res = await axios.post(`${API_BASE}/api/check`, {
    prizeId,
    entryNumber,
    password,
  });
  return res.data;
}