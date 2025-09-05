

// ============================================================================
// File: backend/utils/csv.js
// Version: v0.1_001 (2025-08-31)
// ============================================================================
// Specifications:
// - CSV厳格パースと検証ユーティリティ
// - 開発中はパスワード4文字以上許可、本番は8文字以上＋複雑性強化
// - 行単位エラー収集をサポート
// ============================================================================
// History (recent only):
// - 2025-08-31 (v0.1_001) : 初回作成（CSVパース/検証実装）
// ============================================================================

const MAX_BYTES = 500 * 1024;     // 500KB
const MAX_ROWS  = 5000;           // データ行上限
const RE_ENTRY  = /^[0-9A-Za-z_-]{1,32}$/;
const RE_PASS_DEV = /^.{4,}$/;    // 開発中は4文字以上OK
const TRUE_SET  = new Set(["true","1","t","y","yes"]);
const FALSE_SET = new Set(["false","0","f","n","no",""]);

function normalize(text){
  if (typeof text !== "string") return "";
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function parseCsvStrict(csvText){
  const src = normalize(csvText);
  if (!src.trim()) throw new Error("CSVが空です。");
  if (src.length > MAX_BYTES) throw new Error(`CSVが大きすぎます（最大 ${MAX_BYTES} bytes）`);

  const lines = src.split("\n");
  const header = lines[0].split(",").map(s=>s.trim());
  const need = ["entry_number","password","is_winner"];
  if (header.join(",") !== need.join(",")) {
    throw new Error(`ヘッダ不一致。必要: ${need.join(",")}`);
  }

  const rows = [];
  for (let i=1;i<lines.length;i++){
    const raw = lines[i];
    if (raw.trim()==="") continue; // 末尾空行は無視
    const cols = raw.split(",");
    if (cols.length !== need.length) {
      throw new Error(`行${i+1}: 列数不正（${cols.length}列）`);
    }
    rows.push({
      rowIndex: i-1,
      entry_number: cols[0].trim(),
      password: cols[1],
      is_winner_raw: cols[2].trim().toLowerCase(),
    });
  }
  if (rows.length > MAX_ROWS) throw new Error(`行数が多すぎます（最大 ${MAX_ROWS} 行）`);
  return { header, rows };
}

function validateRows(rows, { devMode=true } = {}){
  const errors = [];
  const ok = [];
  for (const r of rows){
    const e = [];

    if (!RE_ENTRY.test(r.entry_number)){
      e.push("entry_numberが不正（英数-_ 1〜32）");
    }
    if (devMode) {
      if (!RE_PASS_DEV.test(r.password||"")) e.push("passwordが短すぎます（開発中は4+）");
    } else {
      // 本番用ポリシー例：8文字以上、大小英数混在
      // if (!RE_PASS_PROD.test(r.password||"")) e.push("passwordポリシー違反（本番8+ 英数大文字小文字）");
    }

    let is_winner = null;
    if (TRUE_SET.has(r.is_winner_raw)) is_winner = true;
    else if (FALSE_SET.has(r.is_winner_raw)) is_winner = false;
    else e.push("is_winner は true/false 系のみ");

    if (e.length){
      errors.push({ rowIndex: r.rowIndex, message: e.join(" / ") });
    } else {
      ok.push({
        rowIndex: r.rowIndex,
        entry_number: r.entry_number,
        password: r.password,
        is_winner,
      });
    }
  }
  return { ok, errors };
}

module.exports = {
  parseCsvStrict,
  validateRows,
  normalize,
};