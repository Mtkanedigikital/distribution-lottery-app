const express = require("express");
const router = express.Router();
const pool = require("../db");

// 参加者エントリー一覧
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM entries ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// 参加者エントリー作成
router.post("/", async (req, res) => {
  const { prize_id, entry_number, password, is_winner } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO entries (prize_id, entry_number, password, is_winner)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [prize_id, entry_number, password, is_winner]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

// 参加者エントリー更新
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { prize_id, entry_number, password, is_winner } = req.body;
  try {
    const result = await pool.query(
      `UPDATE entries
       SET prize_id=$1, entry_number=$2, password=$3, is_winner=$4
       WHERE id=$5 RETURNING *`,
      [prize_id, entry_number, password, is_winner, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// 参加者エントリー削除
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM entries WHERE id=$1", [id]);
    res.json({ message: "Entry deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

module.exports = router;