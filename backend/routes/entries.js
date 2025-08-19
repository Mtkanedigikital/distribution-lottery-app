// backend/routes/entries.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const adminAuth = require("../middleware/adminAuth");

// 一覧（特定賞品）
router.get("/:prizeId", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id,prize_id,entry_number,is_winner FROM entries WHERE prize_id = $1 ORDER BY entry_number ASC",
      [req.params.prizeId]
    );
    res.json(r.rows);
  } catch (e) {
    console.error("GET /api/entries/:prizeId error:", e);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// 作成（重複時 409）
router.post("/", adminAuth, async (req, res) => {
  const { prize_id, entry_number, password, is_winner } = req.body || {};
  if (!prize_id || !entry_number || typeof password !== "string") {
    return res.status(400).json({ error: "prize_id, entry_number, password are required" });
  }
  try {
    const r = await pool.query(
      `INSERT INTO entries (prize_id, entry_number, password, is_winner)
       VALUES ($1,$2,$3,COALESCE($4,false))
       RETURNING id,prize_id,entry_number,is_winner`,
      [prize_id, entry_number, password, is_winner]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "Entry already exists for this prize_id and entry_number" });
    }
    console.error("POST /api/entries error:", e);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

// UPSERT（(prize_id, entry_number) 一意）
router.put("/upsert", adminAuth, async (req, res) => {
  const { prize_id, entry_number, password, is_winner } = req.body || {};
  if (!prize_id || !entry_number || typeof password !== "string") {
    return res.status(400).json({ error: "prize_id, entry_number, password are required" });
  }
  try {
    const r = await pool.query(
      `INSERT INTO entries (prize_id, entry_number, password, is_winner)
         VALUES ($1,$2,$3,COALESCE($4,false))
       ON CONFLICT (prize_id, entry_number) DO UPDATE
         SET password = EXCLUDED.password,
             is_winner = EXCLUDED.is_winner
       RETURNING id,prize_id,entry_number,is_winner`,
      [prize_id, entry_number, password, is_winner]
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error("PUT /api/entries/upsert error:", e);
    res.status(500).json({ error: "Failed to upsert entry" });
  }
});

module.exports = router;