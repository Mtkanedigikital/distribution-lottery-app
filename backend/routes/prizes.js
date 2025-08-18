const express = require("express");
const router = express.Router();
const pool = require("../db");

// 賞品一覧取得
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM prizes ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prizes" });
  }
});

// 賞品1件取得
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM prizes WHERE id=$1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Prize not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prize" });
  }
});

// 賞品作成
router.post("/", async (req, res) => {
  const { id, name, result_time_jst, publish_time_utc } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO prizes (id, name, result_time_jst, publish_time_utc)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, name, result_time_jst, publish_time_utc]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create prize" });
  }
});

// 賞品更新
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, result_time_jst, publish_time_utc } = req.body;
  try {
    const result = await pool.query(
      `UPDATE prizes
       SET name=$1, result_time_jst=$2, publish_time_utc=$3, updated_at=NOW()
       WHERE id=$4
       RETURNING *`,
      [name, result_time_jst, publish_time_utc, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Prize not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update prize" });
  }
});

// 賞品削除
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM prizes WHERE id=$1", [id]);
    res.json({ message: "Prize deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete prize" });
  }
});

module.exports = router;