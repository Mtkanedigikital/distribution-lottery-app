const express = require("express");
const router = express.Router();
const pool = require("../db");

// 結果確認API
router.post("/check", async (req, res) => {
  const { prizeId, entryNumber, password } = req.body;

  try {
    // 対象の賞品
    const prizeResult = await pool.query(
      "SELECT * FROM prizes WHERE id=$1",
      [prizeId]
    );

    if (prizeResult.rowCount === 0) {
      return res.status(404).json({ result: "賞品が見つかりません。" });
    }

    const prize = prizeResult.rows[0];
    const now = new Date();

    // 公開時間前なら「まだ」
    if (now < new Date(prize.publish_time_utc)) {
      return res.json({ result: "まだ結果発表前です。公開時刻をお待ちください。" });
    }

    // エントリー照合
    const entryResult = await pool.query(
      "SELECT * FROM entries WHERE prize_id=$1 AND entry_number=$2 AND password=$3",
      [prizeId, entryNumber, password]
    );

    if (entryResult.rowCount === 0) {
      return res.json({ result: "エントリーが見つかりません。番号やパスワードを確認してください。" });
    }

    const entry = entryResult.rows[0];
    if (entry.is_winner) {
      return res.json({ result: `🎉 おめでとうございます！「${prize.name}」に当選しました！` });
    } else {
      return res.json({ result: `残念ながら「${prize.name}」には当選しませんでした。` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ result: "エラーが発生しました。" });
  }
});

// デバッグ用（賞品ごとの公開状況確認）
router.get("/debug/:prizeId", async (req, res) => {
  const { prizeId } = req.params;
  try {
    const prizeResult = await pool.query("SELECT * FROM prizes WHERE id=$1", [prizeId]);
    if (prizeResult.rowCount === 0) {
      return res.status(404).json({ error: "Prize not found" });
    }

    const prize = prizeResult.rows[0];
    const now = new Date();
    res.json({
      prizeId: prize.id,
      prizeName: prize.name,
      publishUTC: prize.publish_time_utc,
      nowUTC: now.toISOString(),
      compare: now < new Date(prize.publish_time_utc) ? "now < publish" : "now >= publish",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch debug info" });
  }
});

module.exports = router;