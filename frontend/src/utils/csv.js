// ============================================================================
// File: frontend/src/utils/csv.js
// Version: v0.1_001 (2025-08-21)
// ============================================================================
// 仕様:
// - 参加者エントリーCSVのパース（entry_number,password,is_winner）
// ============================================================================
// 履歴（直近のみ）:
// - 初版作成（Admin.jsx から切り出し）
// ============================================================================

/** CSVを配列に（ヘッダ: entry_number,password,is_winner） */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((s) => s.trim());
  const idx_en = headers.indexOf("entry_number");
  const idx_pw = headers.indexOf("password");
  const idx_win = headers.indexOf("is_winner");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const en = (cols[idx_en] ?? "").trim();
    const pw = (cols[idx_pw] ?? "").trim();
    const winRaw = (cols[idx_win] ?? "").trim().toLowerCase();
    const win = ["true", "1", "yes", "y", "t"].includes(winRaw);
    if (en || pw) rows.push({ entry_number: en, password: pw, is_winner: win });
  }
  return rows;
}
