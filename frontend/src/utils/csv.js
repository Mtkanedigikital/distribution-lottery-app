// ============================================================================
// File: frontend/src/utils/csv.js
// Version: v0.3_001 (2025-09-05)
// ============================================================================
// 仕様:
// - 参加者エントリーCSVのパース（entry_number,password,is_winner）
// - 厳格なバリデーション（旧API：throwする）に加え、UI向けのレポート返却APIを追加
//   - ヘッダ存在（順不同）/型・空値/重複検知/集計（errors,warns,dup）
// ============================================================================
// 履歴（直近のみ）:
// - 2025-09-05 v0.3_001: レポート返却の validateCsvText/summarize/evaluateCsv を追加（旧 parseCsv は互換維持）
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

// ----------------------------------------------------------------------------
// 追加：UI向けレポート返却API（投げずに返す）
// ----------------------------------------------------------------------------

/** 必須ヘッダ（順不同で許可） */
export const REQUIRED_HEADERS = ["entry_number", "password", "is_winner"];

/** true/false を緩く解釈（true/t/1/yes/y, false/f/0/no/n） */
function toBoolLoose(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "t", "1", "yes", "y"].includes(s)) return true;
  if (["false", "f", "0", "no", "n"].includes(s)) return false;
  return null; // 解釈不能
}

/**
 * CSVテキストを検証し、エラーレポートを返す（例外は投げない）
 * - ヘッダ：REQUIRED_HEADERS の存在チェック（順不同）＋余剰列を検出
 * - 本体：型・空値チェック（entry_number/password/is_winner）
 * - 重複：entry_number の重複（同一CSV内）を検出
 * 返却:
 * {
 *   header: { ok, missing:[], extra:[] },
 *   bodyIssues: [{line, field, type:'empty'|'type', detail?}],
 *   duplicates: [{line, entry_number, firstLine}],
 *   rowsCount: number
 * }
 */
export function validateCsvText(csvText) {
  // 正規化＆行抽出
  const lines = (csvText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return {
      header: { ok: false, missing: [...REQUIRED_HEADERS], extra: [] },
      bodyIssues: [],
      duplicates: [],
      rowsCount: 0,
    };
  }

  // 1) ヘッダ（順不同）
  const headers = lines[0].split(",").map((s) => s.trim());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  const extra = headers.filter((h) => !REQUIRED_HEADERS.includes(h));
  const header = { ok: missing.length === 0, missing, extra };

  // 2) 本体（型・空値）
  const rows = lines.slice(1).map((line, i) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? "").trim()));
    return { __line: i + 2, ...obj }; // 1-origin + ヘッダ行
  });

  const bodyIssues = [];
  const normalized = rows.map((r) => {
    const entry_number = (r.entry_number ?? "").trim();
    const password = (r.password ?? "").trim();
    const boolParsed = toBoolLoose(r.is_winner);
    if (!entry_number) bodyIssues.push({ line: r.__line, field: "entry_number", type: "empty", detail: "空" });
    if (!password) bodyIssues.push({ line: r.__line, field: "password", type: "empty", detail: "空" });
    if (boolParsed === null) bodyIssues.push({ line: r.__line, field: "is_winner", type: "type", detail: "真偽値不可" });
    return {
      __line: r.__line,
      entry_number,
      password,
      is_winner: boolParsed === null ? r.is_winner : boolParsed,
    };
  });

  // 3) 重複（entry_number）
  const seen = new Map();
  const duplicates = [];
  for (const r of normalized) {
    const key = r.entry_number;
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, r.__line);
    } else {
      duplicates.push({ line: r.__line, entry_number: key, firstLine: seen.get(key) });
    }
  }

  return { header, bodyIssues, duplicates, rowsCount: rows.length };
}

/**
 * 集計：UIトースト用のカウンタ
 * - errors: ヘッダ不足 + 本体の型/空値
 * - warns : 余剰ヘッダ + 重複
 */
export function summarize(report) {
  const errors =
    (report.header?.missing?.length || 0) +
    report.bodyIssues.filter((i) => i.type === "empty" || i.type === "type").length;
  const warns = (report.header?.extra?.length || 0) + report.duplicates.length;
  return {
    ok: errors === 0,
    counts: {
      rows: report.rowsCount,
      errors,
      warns,
      headerMissing: report.header?.missing?.length || 0,
      headerExtra: report.header?.extra?.length || 0,
      dup: report.duplicates.length,
    },
  };
}

/** 便利：ワンショット評価 */
export function evaluateCsv(csvText) {
  const report = validateCsvText(csvText);
  return { report, summary: summarize(report) };
}
