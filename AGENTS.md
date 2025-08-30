# Project Memory (AGENTS.md)

## プロジェクト要約
- 抽選管理システム（みらくじ）/ React + Node/Express + PostgreSQL
- 本番は Render、Git 管理（非公開）

## 重要ルール
- ターミナルは3つ（[FRONTEND]=シアン, [BACKEND]=白, [ROOT]=黄）
- すべてのコマンドは（clear → echo "# 説明" → 実行）
- サーバ起動コマンドは必ず別ブロック
- 公式ヘッダ形式（// File: … / Version: v… / Specifications / History）
- 強調記法のバグ回避（括弧は太字の外側、行末緩衝）

## API・認証
- Backend: `require('dotenv').config();` を先頭
- `/api/lottery/check` → `lotteryRouter('/check')` に委譲
- 管理操作は `x-admin-secret` 必須（dev="test", prod=本番値）

## Frontend I/F
- `frontend/src/api.js` の `checkResult()` は `/api/lottery/check`
- 送信 `{ prizeId, entryNumber, password }`
- localStorage: `ADMIN_SECRET`, `distribution-lottery/admin/secret`

## 開発フロー
- /admin で賞品作成 → UPSERT でエントリ → /participant?prizeId=... で表示
- 公開前は非公開、公開後に当落表示

## ウォッチリスト
- frontend/src/Admin.jsx — 535行, Version: v0.1 (2025-08-19)
- frontend/src/AdminList.jsx — 211行, Version: v0.1 (2025-08-19)
- frontend/src/AdminEdit.jsx
- frontend/src/Participant.jsx
- frontend/src/PrizeList.jsx
- frontend/src/QRPage.jsx
- frontend/src/api.js
- frontend/src/App.jsx
- frontend/src/locale/ja.js
- frontend/src/locale/index.js

## 禁則事項 / セーフティ
- VSCode連携のファイル取り違え時は作業停止→確認
- 出店情報などは一次情報クロスチェック（ブランド混同禁止） 

## 内部文書参照
- 詳細な更新履歴やPJメモリーは `internal_docs/memory_update.md` を参照