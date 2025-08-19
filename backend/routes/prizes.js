// backend/routes/prizes.js
// 賞品 CRUD + 「公開時刻を今にする」エンドポイント
const express = require("express");
const router = express.Router();

const pool = require("../db");
const adminAuth = require("../middleware/adminAuth");
const { jstToUtcIso, utcDateToJstText } = require("../time");

// 共通: DBレコード -> APIレスポンス成形
function shapePrize(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    result_time_jst: row.result_time_jst,         // 例: "2025-08-19 13:00"
    publish_time_utc: row.publish_time_utc,       // 例: "2025-08-19T04:00:00.000Z"
    created_at: row.created_at,
    updated_at: row.updated_at,
    // 表示用にUTC->JST文字列（YYYY-MM-DD HH:mm）
    jst_view_from_utc: utcDateToJstText(row.publish_time_utc),
  };
}

/** 一覧 */
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,name,result_time_jst,publish_time_utc,created_at,updated_at
         FROM prizes
         ORDER BY publish_time_utc NULLS LAST, id ASC`
    );
    res.json(rows.map(shapePrize));
  } catch (e) {
    console.error("GET /api/prizes error:", e);
    res.status(500).json({ error: "Failed to fetch prizes" });
  }
});

/** 1件取得 */
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,name,result_time_jst,publish_time_utc,created_at,updated_at
         FROM prizes
        WHERE id = $1
        LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(shapePrize(rows[0]));
  } catch (e) {
    console.error("GET /api/prizes/:id error:", e);
    res.status(500).json({ error: "Failed to fetch prize" });
  }
});

/** 作成（管理） */
router.post("/", adminAuth, async (req, res) => {
  try {
    const { id, name, result_time_jst } = req.body || {};
    if (!id || !name || !result_time_jst) {
      return res.status(400).json({ error: "id/name/result_time_jst are required" });
    }
    const publishIso = jstToUtcIso(result_time_jst); // JST文字列 → UTC ISO

    const q = `
      INSERT INTO prizes (id,name,result_time_jst,publish_time_utc,created_at,updated_at)
      VALUES ($1,$2,$3,$4,NOW(),NOW())
      RETURNING id,name,result_time_jst,publish_time_utc,created_at,updated_at
    `;
    const { rows } = await pool.query(q, [id.trim(), name.trim(), result_time_jst.trim(), publishIso]);
    res.status(201).json(shapePrize(rows[0]));
  } catch (e) {
    // 重複を 409 で明示
    if (e && e.code === "23505") {
      return res.status(409).json({ error: "Duplicate id" });
    }
    console.error("POST /api/prizes error:", e);
    res.status(500).json({ error: "Failed to create prize" });
  }
});

/** 更新（管理） */
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, result_time_jst } = req.body || {};

    // 動的に更新カラムを組み立て
    const sets = [];
    const vals = [];
    let idx = 1;

    if (typeof name === "string" && name.length > 0) {
      sets.push(`name = $${idx++}`);
      vals.push(name.trim());
    }
    if (typeof result_time_jst === "string" && result_time_jst.length > 0) {
      sets.push(`result_time_jst = $${idx++}`);
      vals.push(result_time_jst.trim());
      const iso = jstToUtcIso(result_time_jst.trim());
      sets.push(`publish_time_utc = $${idx++}`);
      vals.push(iso);
    }
    if (sets.length === 0) return res.status(400).json({ error: "No updatable fields" });

    sets.push("updated_at = NOW()");
    vals.push(id);

    const q = `
      UPDATE prizes
         SET ${sets.join(", ")}
       WHERE id = $${idx}
       RETURNING id,name,result_time_jst,publish_time_utc,created_at,updated_at
    `;
    const { rows } = await pool.query(q, vals);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(shapePrize(rows[0]));
  } catch (e) {
    console.error("PUT /api/prizes/:id error:", e);
    res.status(500).json({ error: "Failed to update prize" });
  }
});

/** 削除（管理） */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("BEGIN");
    await pool.query(`DELETE FROM entries WHERE prize_id = $1`, [id]);
    const del = await pool.query(`DELETE FROM prizes WHERE id = $1`, [id]);
    await pool.query("COMMIT");
    if (del.rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, deleted: del.rowCount });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("DELETE /api/prizes/:id error:", e);
    res.status(500).json({ error: "Failed to delete prize" });
  }
});

/** ★公開時刻を今にする（管理） */
router.post("/:id/publish_now", adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const q = `
      UPDATE prizes
         SET publish_time_utc = NOW(),
             updated_at = NOW()
       WHERE id = $1
       RETURNING id,name,result_time_jst,publish_time_utc,created_at,updated_at
    `;
    const { rows } = await pool.query(q, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(shapePrize(rows[0]));
  } catch (e) {
    console.error("POST /api/prizes/:id/publish_now error:", e);
    res.status(500).json({ error: "Failed to publish now" });
  }
});

module.exports = router;