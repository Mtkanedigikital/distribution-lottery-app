// ============================================================================
// File: frontend/src/AdminEdit.jsx
// Version: v0.1_001
//
// 仕様:
// - URL パラメータから prizeId を取得
// - バックエンド /api/product/:prizeId にアクセスし賞品データを取得
// - 賞品情報を表示（ID, 賞品名, 公開予定時刻）
// - 「参加者ページを開く」ボタンで /participant?prizeId=... を新規タブで開く
//
// 履歴:
// - 2025-08-19: 初版作成
// ============================================================================

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

export default function AdminEdit() {
  const [searchParams] = useSearchParams();
  const prizeId = searchParams.get("prizeId");
  const [prize, setPrize] = useState(null);

  useEffect(() => {
    if (prizeId) {
      axios
        .get(`http://localhost:3001/api/product/${prizeId}`)
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
