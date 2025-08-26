// ============================================================================
// File: dev/publishNow.js
// Version: v0_1(2025-08-23)
// ============================================================================
// Specifications:
// - 開発環境限定の一時API。指定IDの result_time_jst を「今から1分前」,
//   publish_time_utc を「今から5分前」に更新して、公開後UIを確認可能にする
// ============================================================================
// History (recent only):
// - 初版: POST /dev/publish/:id
// - 2025-08-23: dev用フォールバック（pg / better-sqlite3 / sqlite3）と詳細ログを追加
// ============================================================================
const express = require('express');
const router = express.Router();

function isoUtcMinus(minutes){
  return new Date(Date.now() - minutes*60*1000).toISOString();
}
function jstNowMinus(minutes){
  const d = new Date(Date.now() - minutes*60*1000);
  // JSTはUTC+9（簡便に手動オフセット）
  const j = new Date(d.getTime() + 9*60*60*1000);
  const pad = n => String(n).padStart(2,'0');
  return `${j.getUTCFullYear()}-${pad(j.getUTCMonth()+1)}-${pad(j.getUTCDate())} ${pad(j.getUTCHours())}:${pad(j.getUTCMinutes())}`;
}

// --- dev fallbacks: direct DB updates if prisma/knex/memory are unavailable ---
function parseDatabaseUrl(url){
  try {
    if (!url) return null;
    if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return {kind:'pg', url};
    if (url.startsWith('sqlite://')) return {kind:'sqlite', url: url.replace('sqlite://','')};
    if (url.endsWith('.sqlite') || url.endsWith('.db') || url.endsWith('.sqlite3')) return {kind:'sqlite', url};
  } catch (_) {}
  return null;
}

async function updateViaPg(url, id, publish_time_utc, result_time_jst){
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url });
  const sql = 'UPDATE prizes SET publish_time_utc=$1, result_time_jst=$2 WHERE id=$3';
  const res = await pool.query(sql, [publish_time_utc, result_time_jst, id]);
  await pool.end();
  return res.rowCount;
}

function updateViaBetterSqlite(file, id, publish_time_utc, result_time_jst){
  const Database = require('better-sqlite3');
  const db = new Database(file);
  const stmt = db.prepare('UPDATE prizes SET publish_time_utc=?, result_time_jst=? WHERE id=?');
  const info = stmt.run(publish_time_utc, result_time_jst, id);
  db.close();
  return info.changes;
}

function updateViaSqlite3(file, id, publish_time_utc, result_time_jst){
  return new Promise((resolve, reject)=>{
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database(file);
    db.run('UPDATE prizes SET publish_time_utc=?, result_time_jst=? WHERE id=?',
      [publish_time_utc, result_time_jst, id],
      function(err){
        if (err) return reject(err);
        db.close(()=> resolve(this.changes));
      }
    );
  });
}

async function updatePublishTime_Knexlike(knexLike, id, publish_time_utc, result_time_jst) {
  const k = (typeof knexLike === 'function')
    ? knexLike
    : (knexLike && typeof knexLike.knex === 'function')
      ? knexLike.knex
      : (knexLike && typeof knexLike.default === 'function')
        ? knexLike.default
        : null;
  if (!k) throw new Error('knex instance not callable');
  return await k('prizes').where({ id }).update({ publish_time_utc, result_time_jst });
}

router.post('/publish/:id', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'forbidden in production' });
    }
    const { id } = req.params;
    const app = req.app;

    const publish_time_utc = isoUtcMinus(5);
    const result_time_jst  = jstNowMinus(1);

    // ▼ データ層に合わせて順に試す（存在するものだけ通る）
    if (app.locals && app.locals.prisma) {
      const prisma = app.locals.prisma;
      const out = await prisma.prize.update({
        where: { id },
        data: { publish_time_utc, result_time_jst }
      });
      return res.json({ ok:true, via:'prisma', out });
    }
    if (app.locals && app.locals.knex) {
      const updated = await updatePublishTime_Knexlike(app.locals.knex, id, publish_time_utc, result_time_jst);
      return res.json({ ok:true, via:'knex', updated });
    }
    // env-based DB fallbacks (dev only): try DATABASE_URL with pg/sqlite
    try {
      const info = parseDatabaseUrl(process.env.DATABASE_URL || process.env.DB_URL || '');
      if (info) {
        if (info.kind === 'pg') {
          try {
            const changed = await updateViaPg(info.url, id, publish_time_utc, result_time_jst);
            if (changed > 0) return res.json({ ok:true, via:'pg', updated: changed });
            console.warn('[dev] pg fallback executed but updated=0 for id=', id);
          } catch (e) {
            console.warn('[dev] pg fallback failed:', String(e));
          }
        } else if (info.kind === 'sqlite') {
          // try better-sqlite3 first, then sqlite3
          try {
            const changed = updateViaBetterSqlite(info.url, id, publish_time_utc, result_time_jst);
            if (changed > 0) return res.json({ ok:true, via:'better-sqlite3', updated: changed });
            console.warn('[dev] better-sqlite3 fallback executed but updated=0 for id=', id);
          } catch (e) {
            console.warn('[dev] better-sqlite3 fallback failed:', String(e));
            try {
              const changed2 = await updateViaSqlite3(info.url, id, publish_time_utc, result_time_jst);
              if (changed2 > 0) return res.json({ ok:true, via:'sqlite3', updated: changed2 });
              console.warn('[dev] sqlite3 fallback executed but updated=0 for id=', id);
            } catch (e2) {
              console.warn('[dev] sqlite3 fallback failed:', String(e2));
            }
          }
        }
      } else {
        console.warn('[dev] No DATABASE_URL compatible with fallbacks; skipping direct DB update');
      }
    } catch (e) {
      console.warn('[dev] env-based fallback block failed:', String(e));
    }
    // メモリ/JSONなど仮データ
    const store = app.locals && app.locals.prizes;
    if (Array.isArray(store)) {
      const t = store.find(x => x.id === id);
      if (!t) throw new Error('prize not found: '+id);
      t.publish_time_utc = publish_time_utc;
      t.result_time_jst  = result_time_jst;
      return res.json({ ok:true, via:'memory', prize: t });
    }
    console.warn('[dev] publish fallback exhausted: prisma/knex/memory/env-fallbacks all unavailable');
    throw new Error('no supported datastore (prisma/knex/memory) or knex instance not resolved');
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e) });
  }
});

module.exports = router;
