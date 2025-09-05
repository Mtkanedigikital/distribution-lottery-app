// ============================================================================
// File: backend/routes/entries.js
// Version: v0.1_022 (2025-08-31)
// ============================================================================
// Specifications:
// - 抽選エントリーのCRUDルート
// - GET /api/entries/:prizeId でエントリー一覧取得
// - POST /api/entries で新規登録
// - PUT /api/entries/upsert で登録または更新
// ============================================================================
// History (recent only):
// - 2025-08-31 (v0.1_022): [validate] CSVバリデーションを強化（ヘッダ検証、最大2,000行、entry_number必須/CSV内重複禁止、password方針 dev>=4/ prod>=8+混在、エラー形を {errors:[{row,message}]} に統一）。/bulk 内の prize_id 補填/一致検証も整理
// - 2025-08-31 (v0.1_021): /bulk に body.prize_id を導入。CSVに prize_id 列が無い場合は補填、有る場合は一致検証。parseCsvToItems は prize_id を任意化
// - 2025-08-31 (v0.1_020): CSVパースを papaparse に置換（クォート/改行/空行/余分空白対応）、詳細エラー返却を改善
// - 2025-08-31 (v0.1_019): /api/entries/bulk を csv_text のみ受け付けるよう修正、conflictPolicy対応、詳細エラーハンドリング追加
// - 2025-08-31 (v0.1_018): CSVのダブルクォート対応／空パスワードは null／カラム不足は警告スキップ
// - 2025-08-30 (v0.1_017): POST /api/entries/bulk が csv_text と on_conflict(ignore|upsert) に対応、{inserted,updated,skipped,total} を返す
// - 2025-08-30 (v0.1_016): /api/entries/count の戻りを { count: number } に強制（型補正とawait漏れ対策）
// - 2025-08-30 (v0.1_015): Prisma失敗時のフォールバックSQLを実装（Entry/entriesテーブル自動判別）
// - 2025-08-30 (v0.1_014): エントリー取得APIの orderBy を降順（最新が先頭）に修正
// - 2025-08-30 (v0.1_013): GET /api/entries?prize_id と /api/entries/count を追加。/:prizeId の orderBy を entry_number に修正
// - 2025-08-30 (v0.1_012): 管理系APIに adminAuth を導入（POST/PUT/BULK は x-admin-secret 必須）
// - 2025-08-30 (v0.1_011): 初回実装
// ============================================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const Papa = require("papaparse");
const prisma = new PrismaClient();

// 管理者ヘッダ認証（開発・本番共通）
const adminAuth = (req, res, next) => {
  const secret = String(process.env.ADMIN_SECRET || "");
  const hdr = req.headers["x-admin-secret"];
  if (!secret || !hdr || hdr !== secret) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
};

const router = express.Router();

// --- Fallback utilities ------------------------------------------------------
// Postgres上の実テーブル名を判別（"Entry" or "entries" を想定）
async function detectEntryTable(prisma) {
  try {
    const rows = await prisma.$queryRaw`SELECT
      COALESCE(to_regclass('public."Entry"')::text, '')  AS t1,
      COALESCE(to_regclass('public.entries')::text, '')   AS t2`;
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (r && r.t1 && r.t1.includes('Entry')) return 'Entry';
    if (r && r.t2 && r.t2.includes('entries')) return 'entries';
  } catch (_) {}
  return null;
}

async function listEntriesBySQL(prisma, prizeId, orderDesc = true) {
  const tbl = await detectEntryTable(prisma);
  if (!tbl) throw new Error('entry table not found');
  const sql = prisma.$queryRawUnsafe(
    `SELECT prize_id, entry_number, password, is_winner
     FROM ${tbl === 'Entry' ? '"Entry"' : 'entries'}
     WHERE prize_id = $1
     ORDER BY entry_number ${orderDesc ? 'DESC' : 'ASC'}`,
    String(prizeId)
  );
  return sql;
}

async function countEntriesBySQL(prisma, prizeId) {
  const tbl = await detectEntryTable(prisma);
  if (!tbl) throw new Error('entry table not found');
  const sql = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count
     FROM ${tbl === 'Entry' ? '"Entry"' : 'entries'}
     WHERE prize_id = $1`,
    String(prizeId)
  );
  const row = Array.isArray(sql) ? sql[0] : sql;
  let n = row ? row.count : 0;
  if (typeof n === 'string') n = parseInt(n, 10) || 0;
  if (typeof n !== 'number' || Number.isNaN(n)) n = 0;
  return { count: n };
}

// GET /api/entries?prize_id=XXXX
router.get("/", async (req, res) => {
  const { prize_id } = req.query;
  if (!prize_id) return res.status(400).json({ error: "prize_id required" });
  try {
    // まずは Prisma の model を試す
    const rows = await prisma.entry.findMany({
      where: { prize_id: String(prize_id) },
      orderBy: { entry_number: "desc" },
    });
    return res.json(rows);
  } catch (e1) {
    console.warn('Prisma model entry failed, fallback to SQL:', e1?.code || e1?.message);
    try {
      const rows = await listEntriesBySQL(prisma, prize_id, true);
      return res.json(rows);
    } catch (e2) {
      console.error("GET /api/entries fallback error:", e2);
      return res.status(500).json({ error: "internal error" });
    }
  }
});

// GET /api/entries/count?prize_id=XXXX
router.get("/count", async (req, res) => {
  const { prize_id } = req.query;
  if (!prize_id) return res.status(400).json({ error: "prize_id required" });
  try {
    const n = await prisma.entry.count({ where: { prize_id: String(prize_id) } });
    return res.json({ count: n });
  } catch (e1) {
    console.warn('Prisma count failed, fallback to SQL:', e1?.code || e1?.message);
    try {
      const r = await countEntriesBySQL(prisma, prize_id);
      return res.json(r);
    } catch (e2) {
      console.error("GET /api/entries/count fallback error:", e2);
      return res.status(500).json({ error: "internal error" });
    }
  }
});

// GET /api/entries/:prizeId
router.get("/:prizeId", async (req, res) => {
  const { prizeId } = req.params;
  try {
    const rows = await prisma.entry.findMany({
      where: { prize_id: String(prizeId) },
      orderBy: { entry_number: "desc" },
    });
    return res.json(rows);
  } catch (e1) {
    console.warn('Prisma model entry (/:prizeId) failed, fallback to SQL:', e1?.code || e1?.message);
    try {
      const rows = await listEntriesBySQL(prisma, prizeId, true);
      return res.json(rows);
    } catch (e2) {
      console.error("GET /api/entries/:prizeId fallback error:", e2);
      return res.status(500).json({ error: "internal error" });
    }
  }
});

// POST /api/entries
router.post("/", adminAuth, async (req, res) => {
  const { prize_id, entry_number, password, is_winner } = req.body;
  if (!prize_id || !entry_number) {
    return res.status(400).json({ error: "prize_id and entry_number required" });
  }
  try {
    const newEntry = await prisma.entry.create({
      data: { prize_id, entry_number, password, is_winner },
    });
    res.status(201).json(newEntry);
  } catch (err) {
    console.error("Error creating entry:", err);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

// PUT /api/entries/upsert
router.put("/upsert", adminAuth, async (req, res) => {
  const { prize_id, entry_number, password, is_winner } = req.body;
  if (!prize_id || !entry_number) {
    return res.status(400).json({ error: "prize_id and entry_number required" });
  }
  try {
    const entry = await prisma.entry.upsert({
      where: { prize_id_entry_number: { prize_id, entry_number } },
      update: { password, is_winner },
      create: { prize_id, entry_number, password, is_winner },
    });
    res.json(entry);
  } catch (err) {
    console.error("Error upserting entry:", err);
    res.status(500).json({ error: "Failed to upsert entry" });
  }
});

// CSVテキストを items[] に変換（ヘッダ: prize_id,entry_number,password,is_winner）
// papaparse でクォート/改行/空行/余分空白を安全に処理
function parseCsvToItems(csv_text) {
  const errors = [];
  const pushErr = (row, message) => {
    errors.push({ row, message });
  };

  if (typeof csv_text !== "string" || !csv_text.trim()) {
    return { items: [], errors: [{ row: 0, message: "Empty or invalid CSV text" }] };
  }
  // Remove BOM if present
  csv_text = csv_text.replace(/^\uFEFF/, "");

  const result = Papa.parse(csv_text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => String(h || "").trim().toLowerCase(),
    dynamicTyping: false,
  });

  // papaparse parse errors
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    for (const e of result.errors) {
      const row = (e && typeof e.row === "number") ? (e.row + 1) : 0; // header=1, papaparse gives data row index
      pushErr(row, e.message || "parse error");
    }
  }

  const data = Array.isArray(result.data) ? result.data : [];
  if (data.length === 0) {
    if (errors.length === 0) pushErr(0, "CSV must have header and at least one data row");
    return { items: [], errors };
  }

  // headers
  const requiredHeaders = ["entry_number", "password", "is_winner"]; // prize_id is optional
  const cols = Object.keys(data[0] || {});
  const missing = requiredHeaders.filter((h) => !cols.includes(h));
  if (missing.length > 0) {
    pushErr(1, `Missing header(s): ${missing.join(", ")}`);
    return { items: [], errors };
  }

  // row limit
  const MAX_ROWS = 2000;
  if (data.length > MAX_ROWS) {
    pushErr(0, `Too many rows: ${data.length} (max ${MAX_ROWS})`);
    return { items: [], errors };
  }

  // password policy (env-aware)
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const passwordOK = (pw) => {
    if (pw === null) return true; // nullable
    const s = String(pw);
    if (!isProd) {
      return s.length >= 4; // dev: >=4 chars
    }
    // prod: >=8, lower/upper/digit
    return s.length >= 8 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s);
  };

  const seen = new Set();
  const items = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] || {};
    const rowNumber = i + 2; // header is line 1

    const prize_id_raw = (row.prize_id ?? "");
    const prize_id = (prize_id_raw === null || prize_id_raw === undefined) ? null : prize_id_raw.toString().trim();

    const entry_number = (row.entry_number ?? "").toString().trim();
    if (!entry_number) {
      pushErr(rowNumber, "entry_number is required");
      continue;
    }
    const key = `k:${prize_id || ''}:${entry_number}`; // local-CSV uniqueness (prize別で重複許容しない設計なら prize_id は body 補填後に再確認)
    if (seen.has(key)) {
      pushErr(rowNumber, `Duplicate entry_number within CSV: ${entry_number}`);
      continue;
    }
    seen.add(key);

    const passwordRaw = (row.password ?? "").toString();
    const password = passwordRaw === "" ? null : passwordRaw;
    if (!passwordOK(password)) {
      pushErr(rowNumber, isProd ? "password must be >=8 chars and include lower/upper/digit" : "password must be >=4 chars in dev");
      continue;
    }

    const isRaw = (row.is_winner ?? "").toString().trim();
    const is_winner = /^(true|1|yes|y)$/i.test(isRaw);

    items.push({
      prize_id: prize_id && prize_id.length > 0 ? prize_id : null, // optional; /bulk will fill
      entry_number,
      password,
      is_winner,
    });
  }

  return { items, errors };
}

// POST /api/entries/bulk
router.post("/bulk", adminAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const bodyPrizeId = typeof body.prize_id === "string" ? body.prize_id.trim() : (body.prize_id ? String(body.prize_id).trim() : null);
    if (typeof body.csv_text !== "string") {
      return res.status(400).json({ error: "csv_text (string) is required in request body" });
    }
    const conflictPolicyRaw = (body.conflictPolicy || "ignore").toString().toLowerCase();
    const conflictPolicy = ["ignore", "overwrite", "upsert"].includes(conflictPolicyRaw) ? conflictPolicyRaw : "ignore";

    const { items, errors: parseErrors } = parseCsvToItems(body.csv_text);
    if (parseErrors.length > 0) {
      // normalize to objects
      const norm = parseErrors.map((e) => (typeof e === 'string' ? { row: 0, message: e } : e));
      return res.status(400).json({ error: "CSV parse error", errors: norm, details: norm });
    }
    if (items.length === 0) {
      return res.status(400).json({ error: "No valid records found in CSV" });
    }

    // prize_id の補完／一致検証
    const csvHasAnyPrizeId = items.some(it => it.prize_id && it.prize_id.length > 0);
    if (!csvHasAnyPrizeId) {
      if (!bodyPrizeId) {
        return res.status(400).json({ error: "prize_id is required either in CSV header or request body" });
      }
      // 全行に補填
      for (const it of items) {
        it.prize_id = bodyPrizeId;
      }
    } else {
      // CSV 側に prize_id がある場合、body が指定されていれば一致検証
      if (bodyPrizeId) {
        const mismatch = items.find(it => (it.prize_id || "").toString().trim() !== bodyPrizeId);
        if (mismatch) {
          return res.status(400).json({ error: "prize_id mismatch between CSV and request body" });
        }
      }
      // body 未指定なら CSV の値をそのまま使用
    }

    // 最終重複チェック（prize_id 確定後に key 再構成）
    const seenFinal = new Set();
    const dups = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const key = `${it.prize_id}::${it.entry_number}`;
      if (seenFinal.has(key)) dups.push({ row: i + 2, message: `Duplicate entry_number for prize_id ${it.prize_id}: ${it.entry_number}` });
      seenFinal.add(key);
    }
    if (dups.length > 0) {
      return res.status(400).json({ error: 'duplicate in CSV', errors: dups, details: dups });
    }

    let inserted = 0, updated = 0, skipped = 0;
    const invalidRows = [];

    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const where = { prize_id_entry_number: { prize_id: it.prize_id, entry_number: it.entry_number } };
        try {
          if (conflictPolicy === "ignore") {
            const ex = await tx.entry.findUnique({ where });
            if (ex) { skipped++; continue; }
            await tx.entry.create({ data: { prize_id: it.prize_id, entry_number: it.entry_number, password: it.password, is_winner: it.is_winner } });
            inserted++;
          } else if (conflictPolicy === "overwrite") {
            const ex = await tx.entry.findUnique({ where });
            if (ex) {
              await tx.entry.update({ where, data: { password: it.password, is_winner: it.is_winner } });
              updated++;
            } else {
              await tx.entry.create({ data: { prize_id: it.prize_id, entry_number: it.entry_number, password: it.password, is_winner: it.is_winner } });
              inserted++;
            }
          } else {
            // upsert
            const ex = await tx.entry.findUnique({ where });
            await tx.entry.upsert({
              where,
              update: { password: it.password, is_winner: it.is_winner },
              create: { prize_id: it.prize_id, entry_number: it.entry_number, password: it.password, is_winner: it.is_winner },
            });
            if (ex) updated++; else inserted++;
          }
        } catch (e) {
          invalidRows.push({ prize_id: it.prize_id, entry_number: it.entry_number, error: e.message || String(e) });
        }
      }
    });

    if (invalidRows.length > 0) {
      return res.status(400).json({ error: "Some rows failed to process", errors: invalidRows, invalidRows, inserted, updated, skipped, total: inserted + updated + skipped + invalidRows.length });
    }

    return res.status(200).json({ inserted, updated, skipped, total: inserted + updated + skipped });
  } catch (err) {
    console.error("bulk upsert error:", err);
    return res.status(500).json({ error: "bulk failed", message: err.message || String(err) });
  }
});

module.exports = router;