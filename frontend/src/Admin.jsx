import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Admin() {
  const [prizes, setPrizes] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:3001/api/prizes").then((res) => {
      setPrizes(res.data);
    });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>管理：賞品一覧</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>ID</th>
            <th>賞品名</th>
            <th>公開予定</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {prizes.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.resultTimeJST}</td>
              <td>
                <a href={`/admin/edit?prizeId=${p.id}`}>編集</a>{" "}
                |{" "}
                <button
                  onClick={() =>
                    window.open(`/participant?prizeId=${p.id}`, "_blank")
                  }
                >
                  参加者ページを開く
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}