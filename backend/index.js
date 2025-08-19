// backend/index.js ーーー 全置き換え版

// 1) 必要モジュール
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

// 2) .env を読み込む（環境変数より優先しない = override:false）
try {
  const dotenv = require("dotenv");
  const envPath = path.join(__dirname, ".env"); // backend/.env を明示
  dotenv.config({
    path: envPath,
    override: false, // ★重要: 既に渡された環境変数を上書きしない
  });
} catch (_) {
  // dotenv 未インストールでも起動できるように
}

// 3) ルーターは .env ロード後に require
const prizesRouter = require("./routes/prizes");
const entriesRouter = require("./routes/entries");
const lotteryRouter = require("./routes/lottery");

// 管理デバッグ: サーバが見ている ADMIN_SECRET の長さを出すための簡易ルータ
const adminAuth = require("./middleware/adminAuth");
const adminDebug = require("express").Router();
adminDebug.get("/env", adminAuth, (req, res) => {
  const s = process.env.ADMIN_SECRET || "";
  res.json({
    adminSecretLength: s.length,
    pid: process.pid,
    node: process.version,
    cwd: process.cwd(),
  });
});

// 4) アプリ本体
const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "X-Requested-With",
      "Authorization",
      "x-admin-secret",
    ],
  })
);
app.use(bodyParser.json());

// 5) API ルート
app.use("/api/prizes", prizesRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/lottery", lotteryRouter);
app.use("/api/admin-debug", adminDebug);

// 6) フロントエンド（build）配信 & SPA フォールバック
const frontendBuild = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(frontendBuild));
// Express 5（path-to-regexp v6）は "*" が使えないので正規表現でフォールバック
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(frontendBuild, "index.html"), (err) => {
    if (err) res.status(500).send(err);
  });
});

// 7) 起動ログ（ADMIN_SECRET は長さのみ）
const adminLen = (process.env.ADMIN_SECRET || "").length;
console.log(
  `[boot] ADMIN_SECRET configured? ${adminLen >= 8 ? "YES" : "NO"} (length=${adminLen})`
);

// 8) 起動
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lottery backend (DB) running on port ${PORT}`);
});