// ============================================================================
// File: backend/routes/entriesBulk.js
// Version: v0.1_004 (2025-08-31)
// ============================================================================
// Specifications:
// - POST /api/entries/bulk: CSV一括投入の受け口（検証+DB反映）
// - Body(JSON): { prize_id | prizeId, csv_text, conflict_policy | conflictPolicy }
// - conflict_policy: 'ignore' or 'upsert'（'overwrite'/'merge' も 'upsert' として受理）
// - 認可: 環境変数 ADMIN_KEY が定義されている場合のみ `x-admin-key` と一致必須
// - パスワード方針: dev=4文字以上、prod=8+かつ英小/英大/数字を全て含む
// - CSVヘッダは厳格: entry_number,password,is_winner（true/false のみ許可）
// ============================================================================
// History (recent only) [desc]:
// - 2025-08-31 (v0.1_004) : [compat] フロント差異を吸収（prizeId/conflictPolicy、'overwrite'等を許容）。[policy] ブールは true/false のみ。パスワード検証(dev/ prod)。重複行検出と詳細エラーレポート。
// - 2025-08-31 (v0.1_003) : [feat] DB反映（UPSERT/ignore切替）を実装。トランザクション集計・JSONサマリを返却。
// - 2025-08-31 (v0.1_002) : [feat] CSVパース＆検証（BOM/改行正規化、ヘッダ厳格一致、型/値チェック）。
// - 2025-08-31 (v0.1_001) : [init] 初版（スケルトン）。
// ============================================================================

const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// パスワード検証（開発:4+ / 本番:8+かつ英大小数字を含む）
function isProdStrict() {
  const env = (process.env.NODE_ENV || "development").toLowerCase();
  return env === "production";
}
function validatePassword(pw) {
  if (typeof pw !== "string") return false;
  if (!isProdStrict()) {
    return pw.length >= 4; // dev は長さのみ
  }
  if (pw.length < 8) return false;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  return hasLower && hasUpper && hasDigit;
}

// リクエストボディ互換層（snake/camel 対応 & 値の正規化）
function readBulkPayload(body) {
  const rawPrizeId = body.prize_id ?? body.prizeId ?? "";
  const rawPolicy = body.conflict_policy ?? body.conflictPolicy ?? "ignore";
  const prizeId = String(rawPrizeId).trim();
  const csvText = String(body.csv_text ?? "");
  let policy = String(rawPolicy).trim().toLowerCase();
  // フロント差異吸収
  if (policy === "overwrite" || policy === "merge") policy = "upsert";
  if (!["ignore", "upsert"].includes(policy)) policy = "ignore";
  return { prizeId, csvText, policy };
}

// 値の正規化ヘルパ
function normalizeBool(v) {
  const s = String(v).trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return null; // 厳格: true/false のみ
}

// 認可（ADMIN_KEY が設定されているときのみ強制）
function requireAdminIfConfigured(req, res, next) {
  const need = process.env.ADMIN_KEY;
  if (!need || need.length === 0) return next();
  const got = req.header("x-admin-key") || "";
  if (got !== need) {
    return res.status(401).json({ ok: false, error: "Unauthorized (admin key mismatch)" });
  }
  next();
}

router.post("/bulk", requireAdminIfConfigured, async (req, res) => {
  try {
    const { prizeId, csvText, policy } = readBulkPayload(req.body || {});

    if (!prizeId) {
      return res.status(400).json({ ok: false, error: "prize_id is required" });
    }
    if (!csvText) {
      return res.status(400).json({ ok: false, error: "csv_text is required" });
    }
    if (!["ignore", "upsert"].includes(policy)) {
      return res.status(400).json({ ok: false, error: "conflict_policy must be 'ignore' or 'upsert'" });
    }

    // --- CSV 正規化＆パース ---
    const normalized = csvText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    const lines = normalized.length ? normalized.split("\n") : [];
    if (lines.length === 0) {
      return res.status(400).json({ ok: false, error: "CSV is empty" });
    }

    const header = lines[0].trim();
    const expectedHeader = "entry_number,password,is_winner";
    if (header !== expectedHeader) {
      return res.status(400).json({ ok: false, error: `CSV header must be exactly '${expectedHeader}'` });
    }

    const errors = [];
    const rows = [];
    const seen = new Set();
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw || /^\s*$/.test(raw)) continue; // 空行スキップ
      const parts = raw.split(",");
      if (parts.length !== 3) {
        errors.push({ line: i + 1, error: "column count must be 3" });
        continue;
      }
      const entry_number = String(parts[0]).trim();
      const password = String(parts[1]).trim();
      const boolNorm = normalizeBool(parts[2]);

      if (!entry_number) errors.push({ line: i + 1, field: "entry_number", error: "required" });
      if (!password) {
        errors.push({ line: i + 1, field: "password", error: "required" });
      } else if (!validatePassword(password)) {
        errors.push({ line: i + 1, field: "password", error: isProdStrict() ? "must be >=8 and include lower/UPPER/digit" : "must be >=4 chars" });
      }
      if (boolNorm === null) errors.push({ line: i + 1, field: "is_winner", error: "must be 'true' or 'false'" });

      if (seen.has(entry_number)) {
        errors.push({ line: i + 1, field: "entry_number", error: "duplicated in CSV" });
      } else {
        seen.add(entry_number);
        rows.push({ entry_number, password, is_winner: boolNorm === null ? false : boolNorm });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: "CSV validation failed",
        errors,
        summary: { prize_id: prizeId, policy, rows: rows.length, invalid_rows: errors.length },
      });
    }

    // --- DB 反映（UPSERT or ignore）---
    let inserted = 0, updated = 0, ignored = 0;
    await prisma.$transaction(async (tx) => {
      if (policy === "ignore") {
        const result = await tx.entry.createMany({
          data: rows.map(r => ({
            prize_id: prizeId,
            entry_number: r.entry_number,
            password: r.password,
            is_winner: !!r.is_winner,
          })),
          skipDuplicates: true, // 複合ユニーク (prize_id, entry_number) 前提
        });
        inserted = result.count;
        ignored = rows.length - inserted;
      } else {
        // upsert では事前に既存を取り出して件数を推定
        const existing = await tx.entry.findMany({
          where: { prize_id: prizeId, entry_number: { in: rows.map(r => r.entry_number) } },
          select: { entry_number: true },
        });
        const existSet = new Set(existing.map(e => e.entry_number));
        inserted = rows.filter(r => !existSet.has(r.entry_number)).length;
        updated = rows.length - inserted;

        await Promise.all(rows.map(r =>
          tx.entry.upsert({
            where: { prize_id_entry_number: { prize_id: prizeId, entry_number: r.entry_number } },
            create: {
              prize_id: prizeId,
              entry_number: r.entry_number,
              password: r.password,
              is_winner: !!r.is_winner,
            },
            update: {
              password: r.password,
              is_winner: !!r.is_winner,
            },
          })
        ));
      }
    });

    return res.status(200).json({
      ok: true,
      summary: {
        prize_id: prizeId,
        policy,
        rows: rows.length,
        inserted,
        updated,
        ignored,
      },
    });
  } catch (e) {
    console.error("/api/entries/bulk error", e);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

module.exports = router;