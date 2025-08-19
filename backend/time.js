// JST 'YYYY-MM-DD HH:mm' <-> UTC ISO 変換ユーティリティ
// 依存なし。JSTは固定オフセット +09:00 で扱う。

const pad = (n) => String(n).padStart(2, "0");

/** JST文字列 'YYYY-MM-DD HH:mm' を UTC ISO へ */
function jstToUtcIso(jstText) {
  // 例: '2025-08-20 12:00' -> '2025-08-20T03:00:00.000Z'
  if (!jstText) return null;
  const m = jstText.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, d, h, mi] = m.map(Number);
  // JSTエポックを作ってから -9時間 でUTCへ
  const jst = new Date(Date.UTC(y, mo - 1, d, h, mi, 0)); // これで一旦UTC表現
  const utcMs = jst.getTime() - 9 * 60 * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/** Date(UTC) を JST文字列 'YYYY-MM-DD HH:mm' へ */
function utcDateToJstText(dt) {
  if (!dt) return null;
  const ms = dt instanceof Date ? dt.getTime() : new Date(dt).getTime();
  const jstMs = ms + 9 * 60 * 60 * 1000;
  const j = new Date(jstMs);
  const y = j.getUTCFullYear();
  const mo = pad(j.getUTCMonth() + 1);
  const d = pad(j.getUTCDate());
  const h = pad(j.getUTCHours());
  const mi = pad(j.getUTCMinutes());
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

module.exports = { jstToUtcIso, utcDateToJstText };