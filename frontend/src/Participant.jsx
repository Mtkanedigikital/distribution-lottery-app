import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

export default function Participant() {
  const location = useLocation();
  const navigate = useNavigate();

  // URLから prizeId を取得
  const searchParams = new URLSearchParams(location.search);
  const prizeId = searchParams.get("prizeId");

  const [entryNumber, setEntryNumber] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");

  // prizeId が無ければ /prizes に自動リダイレクト
  useEffect(() => {
    if (!prizeId) {
      navigate("/prizes");
    }
  }, [prizeId, navigate]);

  const handleCheck = async () => {
    try {
      const res = await axios.post("http://localhost:3001/api/check", {
        prizeId,
        entryNumber,
        password,
      });
      setResult(res.data.result);
    } catch (err) {
      console.error(err);
      setResult("エラーが発生しました。");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>抽選アプリ 🎲</h1>
      <div>
        <label>
          抽選番号:
          <input
            value={entryNumber}
            onChange={(e) => setEntryNumber(e.target.value)}
            style={{ marginLeft: "8px" }}
          />
        </label>
      </div>
      <div style={{ marginTop: "10px" }}>
        <label>
          パスワード:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginLeft: "8px" }}
          />
        </label>
      </div>
      <button
        onClick={handleCheck}
        style={{ marginTop: "15px", padding: "5px 12px" }}
      >
        結果を確認
      </button>
      {result && <div style={{ marginTop: "20px", fontWeight: "bold" }}>{result}</div>}
    </div>
  );
}