require('dotenv').config();

// ============================================================================
// File: backend/index.js
// Version: v0.1_007(2025-08-27)
// ============================================================================
// Specifications:
// - ExpressベースのAPIサーバ（/api/prizes, /api/entries, /api/lottery, /api/admin-debug）
// - dotenv を最優先で初期化（環境変数を全ミドルウェアで確実に参照）
// - CORS（FRONTEND_ORIGIN対応, allowedHeadersにx-admin-secret）と JSON ボディ処理
// - ヘルスチェック: /health, /api/health
// - backend/public を静的配信ルートに変更 + SPAフォールバック（/api/を除外）
// ============================================================================
// History (recent only):
// - 2025-08-27: 静的配信ルートを backend/public に統一、SPAフォールバックを強化（/api 除外）
// - 2025-08-24: 正式API /api/lottery/check を lotteryRouter('/check') に直委譲するルートを追加
// - 2025-08-24: 互換ルートを撤去し、正式API（/api/lottery/check）に一本化
// - 2025-08-24: 互換ルート /api/check → /api/lottery/check を追加
// - 2025-08-24: dotenv 初期化をファイル先頭に移動
// - 2025-08-24: CORS allowedHeaders に x-admin-secret を追加（管理UIの作成API許可）
// - 2025-08-23: CORSを複数オリジン（localhost / LAN）に対応
// - 2025-08-23: 開発時に Prisma/Knex を app.locals に自動アタッチ（存在する場合のみ）
// - 2025-08-23: 開発限定 /dev ルートの二重登録を解消
// - 2025-08-22: 静的配信を存在チェック付きに変更、SPAフォールバックをミドルウェア化（Express v5対応）
// - 2025-08-22: CORSをプリフライト許容に変更、/health を追加
// ============================================================================

// 1) 必要モジュール
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");

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
// Allow localhost and LAN origins in dev (and FRONTEND_ORIGIN override)
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.40.143:3000',
  'http://192.168.40.75:3000'
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/no-origin in dev
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-admin-secret'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Express v5: '*'や'/(.*)'ではなく、名前付き+*修飾子を使う
// Use RegExp to avoid path-to-regexp named-parameter parsing errors on Express v5
app.options(/^\/api(?:\/.*)?$/, cors(corsOptions));
// [dev] Optionally expose datastore to app.locals so /dev tools can update records
if (process.env.NODE_ENV !== 'production') {
  try {
    // Prefer Prisma if available
    const { PrismaClient } = require('@prisma/client');
    try {
      app.locals.prisma = new PrismaClient();
      console.log('[dev] prisma attached to app.locals');
    } catch (_) {}
  } catch (_) {}
  try {
    // Or attach Knex if project uses it (./db should export a knex instance or config)
    const maybeKnex = require('./db');
    let knexInstance = null;
    if (typeof maybeKnex === 'function') {
      knexInstance = maybeKnex; // exported as instance function
    } else if (maybeKnex && typeof maybeKnex.knex === 'function') {
      knexInstance = maybeKnex.knex; // exported as { knex }
    } else if (maybeKnex && typeof maybeKnex.default === 'function') {
      knexInstance = maybeKnex.default; // ESM default export
    }
    if (knexInstance) {
      app.locals.knex = knexInstance;
      console.log('[dev] knex attached to app.locals');
    }
  } catch (_) {}
}
if (process.env.NODE_ENV !== 'production') {
  app.use("/dev", require("./dev/publishNow"));
  console.log("[dev] Temporary publish API enabled: POST /dev/publish/:id");
}
app.use(bodyParser.json());
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.get('/api/health', (_req, res) => res.status(200).json({ ok: true }));

// 正式: /api/lottery/check → lotteryRouter('/check') に直接委譲（全メソッド対応）
app.use("/api/lottery/check", (req, res, next) => {
  req.url = "/check";            // lotteryRouter 内のルートに合わせる
  return lotteryRouter(req, res, next);
});

// 5) API ルート
app.use("/api/prizes", prizesRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/lottery", lotteryRouter);
app.use("/api/admin-debug", adminDebug);


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
// 6) フロントエンド（public）配信 & SPA フォールバック（public/index.html がある時のみ有効）
const publicDir = path.join(__dirname, "public");
const publicIndex = path.join(publicDir, "index.html");
if (fs.existsSync(publicIndex)) {
  // 静的ファイルを配信
  app.use(express.static(publicDir));

  // SPA フォールバック：/api を除く GET はすべて index.html を返す
  app.get(/^\/(?!api)(.*)/, (req, res) => {
    res.sendFile(publicIndex, (err) => {
      if (err) res.status(500).send(err);
    });
  });
} else {
  console.warn(`[boot] frontend public index not found at ${publicIndex}; skipping static serving.`);
}
