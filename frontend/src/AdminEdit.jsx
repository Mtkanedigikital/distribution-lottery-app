// ============================================================================
// File: frontend/src/AdminEdit.jsx
// Version: v0.1_003 (2025-08-30)
// ============================================================================
// 仕様:
// - URL パラメータから prizeId を取得
// - バックエンド /api/product/:prizeId にアクセスし賞品データを取得
// - 賞品情報を表示（ID, 賞品名, 公開予定時刻）
// - 「参加者ページを開く」ボタンで /participant?prizeId=... を新規タブで開く
// ============================================================================
// 履歴（直近のみ）:
// - 2025-08-30: APIアクセスを環境変数優先＋dev既定3000に統一（3001 の直書きを撤去）
// - 初版作成
// ============================================================================

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3000";

export default function AdminEdit() {
  const [searchParams] = useSearchParams();
  const prizeId = searchParams.get("prizeId");
  const [prize, setPrize] = useState(null);

  useEffect(() => {
    if (prizeId) {
      axios
        .get(`${API_BASE}/api/product/${prizeId}`)
        .then((res) => setPrize(res.data));
    }
  }, [prizeId]);

  if (!prizeId) {
    return <p>賞品IDが指定されていません。</p>;
  }

  if (!prize) {
    return <p>読み込み中...</p>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>管理：個別編集</h2>
      <p>
        <strong>ID:</strong> {prize.prizeId}
      </p>
      <p>
        <strong>賞品名:</strong> {prize.prizeName}
      </p>
      <p>
        <strong>公開予定:</strong> {prize.resultTimeJST}
      </p>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() =>
            window.open(`/participant?prizeId=${prize.prizeId}`, "_blank")
          }
        >
          参加者ページを開く
        </button>
      </div>
    </div>
  );
}
