const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// ルート分割（routes/ フォルダを利用）
app.use("/api/prizes", require("./routes/prizes"));
app.use("/api/entries", require("./routes/entries"));
app.use("/api/lottery", require("./routes/lottery"));

// サーバー起動
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lottery backend (DB) running on port ${PORT}`);
});