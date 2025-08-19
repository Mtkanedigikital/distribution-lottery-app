// backend/db.js
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("[db] DATABASE_URL is not set. Routes that hit DB will fail.");
}

const useSsl =
  String(process.env.POSTGRES_SSL || "true").toLowerCase() !== "false";

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// 便利関数：そのまま query を使えるようにもエクスポート
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };