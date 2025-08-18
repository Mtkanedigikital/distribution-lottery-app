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