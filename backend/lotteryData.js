// JSTで公開時刻を記入（"YYYY-MM-DD HH:mm" or "YYYY/MM/DD HH:mm[:ss]"）。
// サーバー側(index.js)が +09:00 として解釈します。

const lotteryData = [
  {
    prizeId: "A001",
    prizeName: "サンプル賞品A",
    resultTimeJST: "2025-08-10 00:00", // ← JST
    winners: [
      { entryNumber: "001", password: "1234" }, // 当選者
      // 他に当選者を足すならここへ
    ],
  },
  {
    prizeId: "B002",
    prizeName: "サンプル賞品B",
    resultTimeJST: "2025-08-20 15:30:00", // JST（秒ありも可）
    winners: [
      { entryNumber: "004", password: "efgh" },
    ],
  },
];

module.exports = lotteryData;