import React, { useState } from "react";

export default function App() {
  const [total, setTotal] = useState(10); // 参加人数
  const [winners, setWinners] = useState([]); // 当選者リスト
  const [count, setCount] = useState(1); // 一度に抽選する人数

  // 抽選処理
  const drawLottery = () => {
    let availableNumbers = [];
    for (let i = 1; i <= total; i++) {
      if (!winners.includes(i)) {
        availableNumbers.push(i);
      }
    }

    if (availableNumbers.length === 0) {
      alert("もう抽選可能な番号がありません！");
      return;
    }

    const drawCount = Math.min(count, availableNumbers.length);
    const newWinners = [];

    for (let i = 0; i < drawCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      newWinners.push(availableNumbers[randomIndex]);
      availableNumbers.splice(randomIndex, 1); // 重複防止
    }

    setWinners([...winners, ...newWinners]);
  };

  // リセット
  const resetLottery = () => {
    setWinners([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">抽選アプリ 🎲</h1>

      <div className="bg-white shadow-md rounded-2xl p-6 w-80">
        <label className="block mb-4">
          参加人数:
          <input
            type="number"
            value={total}
            min="1"
            onChange={(e) => setTotal(parseInt(e.target.value))}
            className="border rounded w-full p-2 mt-1"
          />
        </label>

        <label className="block mb-4">
          一度に抽選する人数:
          <input
            type="number"
            value={count}
            min="1"
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="border rounded w-full p-2 mt-1"
          />
        </label>

        <button
          onClick={drawLottery}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full mb-2 hover:bg-blue-600"
        >
          抽選！
        </button>

        <button
          onClick={resetLottery}
          className="bg-red-400 text-white px-4 py-2 rounded-lg w-full hover:bg-red-500"
        >
          リセット
        </button>
      </div>

      <div className="mt-6 w-80">
        <h2 className="text-xl font-semibold">当選者一覧 🎉</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {winners.length > 0 ? (
            winners.map((num, idx) => (
              <span
                key={idx}
                className="bg-green-300 px-3 py-1 rounded-full shadow"
              >
                {num}
              </span>
            ))
          ) : (
            <p className="text-gray-500">まだ当選者はいません</p>
          )}
        </div>
      </div>
    </div>
  );
}