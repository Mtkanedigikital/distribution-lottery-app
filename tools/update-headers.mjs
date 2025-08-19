// NOTE:
// このスクリプトは「保険」として残しています。
// 実運用ではリコがバージョン・履歴を管理するため、通常は使用しません。
// 万一の一括更新や緊急対応用に保持しているだけです。
// ===================================================================================
// File: tools/update-headers.mjs
// Version: v0.2_001
// Last Updated: 2025-08-19
// ---
// 仕様（要点）:
// - 先頭コメントヘッダのフォーマットを //=== で囲う前提で扱う（存在しなくても動作）
// - Last Updated を YYYY-MM-DD で自動更新
// - --bump 指定時は Version の末尾シリアル _NNN を +1（なければ _001 を付与）
// - Lines は扱わない（廃止）
// - 先頭ヘッダの直後に空行を1行だけ確保
// - WATCH に列挙したファイルを対象に、変更検知または --all で一括適用
// ---
// 履歴（直近）:
// - v0.2_001: ヘッダルール変更に追随（_NNN シリアル運用・Lines 削除・空行1行確保）
// ===================================================================================

// Usage:
//   node tools/update-headers.mjs               // 変更検知して更新
//   node tools/update-headers.mjs --all         // 全ウォッチ対象を更新
//   node tools/update-headers.mjs --bump        // 変更ファイルは Version の末尾シリアル _NNN を +1（無ければ _001）

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, sep } from "node:path";

// ---- ウォッチ対象（パスはプロジェクトルート基準） ----
const WATCH = [
  "frontend/src/Admin.jsx",
  "frontend/src/AdminList.jsx",
  "frontend/src/AdminEdit.jsx",
  "frontend/src/QRPage.jsx",
  "frontend/src/Participant.jsx",
  "frontend/src/api.js",
  "frontend/src/App.jsx",
];

// ---- オプション ----
const argv = process.argv.slice(2);
const OPT_ALL = argv.includes("--all");
const OPT_BUMP = argv.includes("--bump");

// ---- 変更ファイルの決め方 ----
function getChangedPaths() {
  if (OPT_ALL) return [...WATCH];
  try {
    // ワークツリーの変更 + インデックスの変更を拾う
    const out = execSync("git status --porcelain", { encoding: "utf8" })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[MADRCU?!\s]+/, "")); // 先頭のステータスを除去
    const set = new Set(out.map(normalize));
    return WATCH.filter((p) => set.has(normalize(p)) || set.has(p));
  } catch (e) {
    // git が使えない／権限がない／初期化されていない等のケース
    const firstLine = String(e?.message || "").split("\n")[0];
    console.warn("[update-headers] git を使用できないため、--all 相当で実行します。理由:", firstLine);
    return [...WATCH];
  }
}
function normalize(p) {
  return p.split(/[\\/]/).join(sep);
}

// ---- 行数カウント（末尾改行の有無や CRLF 差を吸収）----
function countLines(buf) {
  const s = typeof buf === "string" ? buf : buf.toString("utf8");
  if (s.length === 0) return 0;
  const lf = s.replace(/\r\n/g, "\n");
  return lf.split("\n").length;
}

// ---- Version シリアル _NNN の計算 ----
function bumpSerial(ver) {
  // v<major>.<minor>[.<patch>][_NNN]
  const m = ver.match(/^v(\d+)\.(\d+)(?:\.(\d+))?(?:_(\d{1,3}))?$/i);
  if (!m) return ver; // 期待外: 触らない
  const maj = Number(m[1]);
  const min = Number(m[2]);
  const pat = m[3] !== undefined ? Number(m[3]) : undefined; // 保持のみ
  const serial = m[4] !== undefined ? Number(m[4]) + 1 : 1;
  const ser = String(Math.min(serial, 999)).padStart(3, "0");
  return `v${maj}.${min}${pat !== undefined ? "." + pat : ""}_${ser}`;
}

// ---- ヘッダ解析・更新 ----
function updateHeaderText(text, filePath) {
  const lf = text.replace(/\r\n/g, "\n");
  const lines = lf.split("\n");

  // 先頭の // 連続行をヘッダとみなす
  let end = 0;
  while (end < lines.length && /^\/\//.test(lines[end])) end++;
  const head = lines.slice(0, end);
  let body = lines.slice(end).join("\n");

  if (head.length === 0) {
    return { updated: false, out: text };
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  let changed = false;
  const newHead = [];

  for (const l of head) {
    // Lines: は削除（廃止）
    if (/^\/\/\s*Lines:\s*/i.test(l)) {
      changed = true;
      continue; // 追加しない
    }
    // Last Updated:
    if (/^\/\/\s*Last Updated:\s*/i.test(l)) {
      const fixed = `// Last Updated: ${todayStr}`;
      if (l.trim() !== fixed.trim()) changed = true;
      newHead.push(fixed);
      continue;
    }
    // Version:
    if (/^\/\/\s*Version:\s*/i.test(l)) {
      const curr = l.replace(/^\/\/\s*Version:\s*/i, "").trim();
      const bumped = OPT_BUMP ? bumpSerial(curr) : curr;
      const fixed = `// Version: ${bumped}`;
      if (l.trim() !== fixed.trim()) changed = true;
      newHead.push(fixed);
      continue;
    }
    // File: は値を維持
    if (/^\/\/\s*File:\s*/i.test(l)) {
      newHead.push(l);
      continue;
    }
    // その他のコメントはそのまま
    newHead.push(l);
  }

  if (!changed) return { updated: false, out: text };

  // ヘッダ直後の空行を1行に正規化
  body = body.replace(/^\n+/, "");
  const out = newHead.join("\n") + "\n\n" + body; // 常に空行1つ
  return { updated: true, out };
}

function run() {
  const targets = getChangedPaths();
  if (!targets.length) {
    console.log("[update-headers] 変更対象なし");
    return;
  }
  for (const rel of targets) {
    const p = resolve(process.cwd(), rel);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    const { updated, out } = updateHeaderText(src, rel);
    if (updated) {
      writeFileSync(p, out, "utf8");
      console.log(`[update-headers] updated: ${rel}`);
    }
  }
}
run();