// ============================================================================
// File: frontend/src/utils/csv.js
// Version: v0.2_001 (2025-06-14)
// ============================================================================
// 仕様:
// - 参加者エントリーCSVのパース（entry_number,password,is_winner）
// - 厳格なバリデーション: ヘッダ・各列・値を検証
// ============================================================================
// 履歴（直近のみ）:
// - 2025-06-14 v0.2_001: 厳格なCSVバリデーションを追加
// - 初版作成（Admin.jsx から切り出し）
// ============================================================================

/** CSVを配列に（ヘッダ: entry_number,password,is_winner）+バリデーション */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  // 空行を除く（ただし空行もエラーとして検知するため、filter(Boolean)は使わない）
  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === "")) return [];
  // ヘッダ検証
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((s) => s.trim());
  const expectedHeaders = ["entry_number", "password", "is_winner"];
  if (
    headers.length !== expectedHeaders.length ||
    !headers.every((h, i) => h === expectedHeaders[i])
  ) {
    throw new Error(
      `CSVのヘッダが正しくありません。必須: entry_number,password,is_winner（順序・綴りも厳密）`
    );
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-origin (header is line 1)
    const line = lines[i];
    // 空行判定
    if (line.trim() === "") {
      throw new Error(`CSVの${rowNum}行目が空行です。`);
    }
    const cols = line.split(",");
    if (cols.length !== 3) {
      throw new Error(`CSVの${rowNum}行目: 列数が不正です（3列必要）`);
    }
    const en = (cols[0] ?? "").trim();
    const pw = (cols[1] ?? "").trim();
    const winRaw = (cols[2] ?? "").trim();
    // entry_number: 必須、1～64文字、空白含まない
    if (!en) {
      throw new Error(`CSVの${rowNum}行目: entry_numberが空です`);
    }
    if (en.length < 1 || en.length > 64) {
      throw new Error(`CSVの${rowNum}行目: entry_numberは1～64文字で入力してください`);
    }
    if (/\s/.test(en)) {
      throw new Error(`CSVの${rowNum}行目: entry_numberに空白文字は使えません`);
    }
    // password: 必須, 4文字以上（devでは4, backend本番では8に注意）
    if (!pw) {
      throw new Error(`CSVの${rowNum}行目: passwordが空です`);
    }
    if (pw.length < 4) {
      throw new Error(`CSVの${rowNum}行目: passwordは4文字以上で入力してください`);
    }
    // is_winner: true/false (case-insensitive, 厳密)
    const winLower = winRaw.toLowerCase();
    if (!(winLower === "true" || winLower === "false")) {
      throw new Error(
        `CSVの${rowNum}行目: is_winnerはtrueまたはfalse（小文字）で入力してください`
      );
    }
    const win = winLower === "true";
    rows.push({ entry_number: en, password: pw, is_winner: win });
  }
  return rows;
}
