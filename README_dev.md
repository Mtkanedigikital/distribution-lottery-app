# README_dev.md

## 運用ルール

このリポジトリでは、以下のルールを適用しています。

### ヘッダコメント
- 各ウォッチ対象ファイルの先頭にヘッダコメントを付与する。
- フォーマットは以下の通り。

```txt
// ====================
// File: ファイルパス
// Version: v0.1_NNN
// 
// --- 仕様の説明 ---
// （簡潔に機能を記述する）
//
// --- 更新履歴 ---
// YYYY-MM-DD: 修正内容（プログラム内容のみを記録）
// ====================
```

- バージョンは `v0.1_001` からスタートし、更新ごとに `_NNN` を +1 する。
- フォーマット修正やヘッダ修正は履歴に残さない（プログラムの内容のみを対象とする）。

### Git・コミット関連
- リポジトリ名は `distribution-lottery-app`（小文字）で統一する。

### 運用フロー
1. VSCodeでファイルを修正。
2. リコ（ChatGPT）がバージョン番号・ヘッダを更新。
3. Gitでコミット。

### リコの由来
- このプロジェクトにおけるアシスタントAIの名前は「リコ」。
- 名前の由来は「Reliable Co-pilot（信頼できる相棒）」の略称として。

---

## README_dev.md (English Version)

## Operation Rules

This repository applies the following rules.

### Header Comments
- Attach header comments at the top of each watched file.
- The format is as follows:

```txt
// ====================
// File: file path
// Version: v0.1_NNN
// 
// --- Specification Description ---
// (Briefly describe the functionality)
//
// --- Revision History ---
// YYYY-MM-DD: Details of changes (only record program content)
// ====================
```

- Versions start from `v0.1_001` and increment `_NNN` by +1 with each update.
- Format or header corrections are not recorded in the history (only program content changes are recorded).

### Git and Commit Related
- The repository name is standardized as `distribution-lottery-app` (all lowercase).

### Operation Flow
1. Modify files in VSCode.
2. Riko (ChatGPT) updates the version number and header.
3. Commit with Git.

### Origin of Riko
- The assistant AI in this project is named "Riko".
- The name originates from "Reliable Co-pilot", representing a trusted partner.

---</file>