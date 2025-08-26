// ============================================================================
// File: tools/checkWatchlist.js
// Version: v1_0(2025-08-22)
// ============================================================================
// Specifications:
// - watchlist.list を読み込み、各ファイルの lineCount/size/hash を収集
// - .watchlist-baseline.json と比較して差分を表で出力
// - ベースライン未作成時や --init 指定時は現在状態をベースラインとして保存
// ============================================================================
// History (recent only):
// - 初版: ベースライン生成/比較/表形式出力を実装
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WATCHLIST = path.resolve('watchlist.list');
const BASELINE = path.resolve('.watchlist-baseline.json');

const args = new Set(process.argv.slice(2));
const INIT = args.has('--init') || !fs.existsSync(BASELINE);
const JSON_OUT = args.has('--json');
const LIST_ONLY = args.has('--list');

function readWatchlist() {
  if (!fs.existsSync(WATCHLIST)) {
    console.error(`watchlist.list が見つかりません: ${WATCHLIST}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(WATCHLIST, 'utf8')
    .split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines;
}

function statFile(rel) {
  const p = path.resolve(rel);
  if (!fs.existsSync(p)) return { path: rel, exists: false };
  const content = fs.readFileSync(p, 'utf8');
  const lineCount = content.split(/\r?\n/).length;
  const size = Buffer.byteLength(content, 'utf8');
  const hash = crypto.createHash('sha1').update(content).digest('hex');
  return { path: rel, exists: true, lineCount, size, hash };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  } catch {
    console.error('ベースラインのJSONが不正です。削除して --init してください。');
    process.exit(1);
  }
}

function saveBaseline(data) {
  fs.writeFileSync(BASELINE, JSON.stringify(data, null, 2));
}

function compare(curr, base) {
  // ステータス: OK / CHANGED / NEW / MISSING
  const map = new Map(curr.map(x => [x.path, x]));
  const result = [];

  // 既存比較
  for (const [p, b] of Object.entries(base)) {
    const c = map.get(p);
    if (!c || !c.exists) {
      result.push({ path: p, status: 'MISSING', detail: '-' });
    } else {
      if (c.hash === b.hash) {
        result.push({ path: p, status: 'OK', detail: `lines ${c.lineCount}` });
      } else {
        const d = [];
        if (c.lineCount !== b.lineCount) d.push(`lines ${b.lineCount}→${c.lineCount}`);
        if (c.size !== b.size) d.push(`size ${b.size}→${c.size}`);
        result.push({ path: p, status: 'CHANGED', detail: d.join(', ') || 'content changed' });
      }
      map.delete(p);
    }
  }

  // 新規（ベースラインに無いが現存）
  for (const [p, c] of map.entries()) {
    if (c.exists) result.push({ path: p, status: 'NEW', detail: `lines ${c.lineCount}` });
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}

function toTable(rows) {
  const headers = ['STATUS', 'LINES/SIZE/DETAIL', 'PATH'];
  const data = rows.map(r => [r.status, r.detail, r.path]);
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...data.map(row => String(row[i]).length))
  );
  const line = (arr) => arr.map((v, i) => String(v).padEnd(widths[i])).join('  ');
  return [line(headers), line(widths.map(w => '-'.repeat(w))), ...data.map(line)].join('\n');
}

function main() {
  const list = readWatchlist();
  const current = list.map(statFile);
  if (LIST_ONLY) {
    console.log(JSON.stringify(current, null, 2));
    return;
  }

  if (INIT) {
    const baseline = {};
    for (const c of current) {
      if (!c.exists) continue;
      baseline[c.path] = { hash: c.hash, lineCount: c.lineCount, size: c.size };
    }
    saveBaseline(baseline);
    console.log(`ベースラインを作成しました: ${BASELINE}`);
    console.log(`対象: ${Object.keys(baseline).length} ファイル`);
    return;
  }

  const base = loadBaseline();
  const diff = compare(current, base);
  if (JSON_OUT) {
    console.log(JSON.stringify({ summary: { files: current.length }, results: diff }, null, 2));
  } else {
    console.log(toTable(diff));
  }

  const changed = diff.filter(r => r.status !== 'OK');
  process.exit(changed.length ? 2 : 0);
}

main();
