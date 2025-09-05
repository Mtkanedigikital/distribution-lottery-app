#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const fail = (msg) => { console.error(`\n✖ ${msg}\n`); process.exit(1); };
const run = (cmd) => execSync(cmd, { stdio: ['pipe','pipe','ignore'] }).toString().trim();

// 対象ファイル（追加/変更/改名。バイナリ除外）
const files = run("git diff --cached --name-only --diff-filter=AMR")
  .split('\n').filter(f => f && !f.match(/\.(png|jpg|jpeg|gif|pdf|ico|svg|zip|pptx)$/i));

if (files.length === 0) process.exit(0);

// 1) 大量削除ブロック（閾値=30）
const numstat = run("git diff --cached --numstat");
let overDel = [];
numstat.split('\n').forEach(line => {
  const m = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/); // added deleted path
  if (!m) return;
  const deleted = m[2] === '-' ? 0 : parseInt(m[2],10);
  const path = m[3];
  // ドキュメント/コード問わず適用
  if (deleted >= 30) overDel.push(`${path} (-${deleted})`);
});
if (overDel.length) {
  fail(`大量削除を検出（30行以上）：\n  - ${overDel.join('\n  - ')}\n最小差分で直して再コミットしてください。`);
}

// 2) ヘッダと履歴ルール検査
const headerErrs = [];
const verRe = /^\/\/\s*Version:\s*v[\d.]+_\d+\s\(\d{4}-\d{2}-\d{2}\)\s*$/;
const fileRe = /^\/\/\s*File:\s*.+$/;
const historyStartRe = /^\/\/\s*History\s*\(recent only\):\s*$/;
const histLineRe = /^\/\/\s*-\s*\d{4}-\d{2}-\d{2}\s*\(v[\d.]+_\d+\)\s*:\s*\[[a-z]+\]\s+.+$/i;

for (const path of files) {
  // .env等は対象外
  if (path.match(/(^|\/)\.env(\.|$)/)) continue;

  let content = "";
  try {
    content = fs.readFileSync(path, 'utf8');
  } catch { continue; }

  // 先頭〜200行をヘッダ判定範囲に
  const head = content.split('\n').slice(0,200);

  const hasFile = head.some(l => fileRe.test(l));
  const hasVer  = head.some(l => verRe.test(l));
  const histIdx = head.findIndex(l => historyStartRe.test(l));

  if (!hasFile || !hasVer || histIdx === -1) {
    headerErrs.push(`${path} : ヘッダ不足（File/Version/Historyのいずれかが欠落）`);
    continue;
  }

  // 履歴行を抽出（次の区切り線「====」まで or 先頭200行の範囲）
  const tail = head.slice(histIdx + 1);
  const histLines = [];
  for (const l of tail) {
    if (/^\/\/\s*=+/.test(l)) break;
    if (l.trim().startsWith('// -')) histLines.push(l);
  }

  if (histLines.length === 0) {
    headerErrs.push(`${path} : History 行が見つからない`);
    continue;
  }

  // 各行の形式と降順チェック
  let prevDate = null;
  for (const l of histLines) {
    if (!histLineRe.test(l)) {
      headerErrs.push(`${path} : History 行の形式誤り → ${l.trim()}`);
      break;
    }
    const m = l.match(/-\s*(\d{4}-\d{2}-\d{2})\s*\((v[\d.]+_\d+)\)/);
    if (m) {
      const d = m[1];
      if (prevDate && d > prevDate) {
        headerErrs.push(`${path} : History が降順でありません（${prevDate} の後に ${d}）`);
        break;
      }
      prevDate = prevDate ?? d; // 最初だけ設定
    }
  }
}

if (headerErrs.length) {
  fail(`ヘッダ／履歴ルール違反を検出：\n  - ${headerErrs.join('\n  - ')}\nヘッダを更新し、Historyは「最新→過去」の降順＆(vX_YYY)併記で修正してください。`);
}

process.exit(0);
