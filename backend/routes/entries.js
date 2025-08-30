// ============================================================================
// File: routes/entries.js
// Version: v0.1_017 (2025-08-30)
// ============================================================================
// Specifications:
// - 抽選エントリーのCRUDルート
// - GET /api/entries/:prizeId でエントリー一覧取得
// - POST /api/entries で新規登録
// - PUT /api/entries/upsert で登録または更新
// ============================================================================
// History (recent only):
// - 2025-08-30: POST /api/entries/bulk が csv_text と on_conflict(ignore|upsert) に対応、{inserted,updated,skipped,total} を返す
// - 2025-08-30: /api/entries/count の戻りを { count: number } に強制（型補正とawait漏れ対策）
// - 2025-08-30: Prisma失敗時のフォールバックSQLを実装（Entry/entriesテーブル自動判別）
// - 2025-08-30: エントリー取得APIの orderBy を降順（最新が先頭）に修正
// - 2025-08-30: GET /api/entries?prize_id と /api/entries/count を追加。/:prizeId の orderBy を entry_number に修正
// - 2025-08-30: 管理系APIに adminAuth を導入（POST/PUT/BULK は x-admin-secret 必須）
// - 2025-08-30: 初回実装
// ============================================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");
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

// CSVテキストを items[] に変換（ヘッダ: entry_number,password,is_winner）
function parseCsvToItems(csv_text) {
  if (typeof csv_text !== "string" || !csv_text.trim()) return [];
  const lines = csv_text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (lines.length <= 1) return [];
  const header = lines[0].split(",").map((s) => s.trim());
  const idxEntry = header.indexOf("entry_number");
  const idxPass = header.indexOf("password");
  const idxWin  = header.indexOf("is_winner");
  if (idxEntry < 0 || idxPass < 0 || idxWin < 0) return [];
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((s) => s.trim());
    if (!cols.length) continue;
    const entry_number = cols[idxEntry] ?? "";
    const password = cols[idxPass] ?? "";
    const is_winner = /^true$/i.test(String(cols[idxWin] ?? ""));
    items.push({ entry_number: String(entry_number).trim(), password: String(password), is_winner });
  }
  return items;
}

// POST /api/entries/bulk
router.post("/bulk", adminAuth, async (req, res) => {
  try {
    const body = req.body || {};
    let prize_id = body.prize_id ? String(body.prize_id) : "";
    const on_conflict = (body.on_conflict || "ignore").toString().toLowerCase(); // "ignore" | "upsert"

    // 1) 入力正規化: rows[] / items[] / csv_text いずれかを items[] にする
    let items = [];
    if (Array.isArray(body)) {
      items = body;
      if (!prize_id && items[0]?.prize_id) prize_id = String(items[0].prize_id);
    } else if (Array.isArray(body.rows)) {
      items = body.rows;
    } else if (Array.isArray(body.items)) {
      items = body.items;
    } else if (typeof body.csv_text === "string") {
      items = parseCsvToItems(body.csv_text);
    } else {
      return res.status(400).json({ error: "invalid payload: provide rows[], items[] or csv_text" });
    }

    // prize_id の決定（items 内に prize_id が無ければ必須）
    if (!prize_id) {
      const allHave = items.every((r) => r?.prize_id);
      if (!allHave) {
        return res.status(400).json({ error: "prize_id required (either top-level or per-row)" });
      }
    }

    // 正規化・フィルタ
    const toBool = (v) => (typeof v === "boolean" ? v : String(v ?? "").toLowerCase() === "true");
    items = items
      .map((r) => ({
        prize_id: prize_id || String(r.prize_id || ""),
        entry_number: String(r.entry_number ?? "").trim(),
        password: r.password != null ? String(r.password) : null,
        is_winner: toBool(r.is_winner),
      }))
      .filter((x) => x.prize_id && x.entry_number);

    if (items.length === 0) {
      return res.status(400).json({ error: "no valid records" });
    }

    // 2) 取り込みロジック（トランザクション）
    let inserted = 0, updated = 0, skipped = 0;
    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const where = { prize_id_entry_number: { prize_id: it.prize_id, entry_number: it.entry_number } };
        if (on_conflict === "ignore") {
          const ex = await tx.entry.findUnique({ where });
          if (ex) { skipped++; continue; }
          await tx.entry.create({ data: { prize_id: it.prize_id, entry_number: it.entry_number, password: it.password, is_winner: it.is_winner } });
          inserted++;
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
      }
    });

    return res.status(200).json({ inserted, updated, skipped, total: inserted + updated + skipped });
  } catch (err) {
    console.error("bulk upsert error:", err);
    return res.status(500).json({ error: "bulk failed" });
  }
});

module.exports = router;