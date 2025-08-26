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
- README 系もプログラムファイルと同様に履歴対象とする。ただし更新履歴はREADME内ではなくGitのコミットログで管理する（必要ならCHANGELOG.mdを別途用意）。

### 運用フロー
1. VSCodeでファイルを修正。
2. 修正後、必要に応じて依存関係を更新（frontend/backendごとに `npm --prefix` を使用）。
3. Gitで状態を確認し、コミットとプッシュを行う。
4. READMEやドキュメントもプログラムと同様にGitで管理する（更新履歴はコミットログで管理）。

### リコの由来
- このプロジェクトにおけるアシスタントAIの名前は「リコ」。
- いくつかの意味を込めて名付けられている：
  - Reliable Co-pilot（信頼できる相棒） → 開発を一緒に進めるパートナー。
  - Logic & Code の子 → 技術に根ざしたサポート役としての性格を表現。
  - Lottery + Co-pilot → この抽選システムを支える専属アシスタントであることを示す。
  - 単なる補助ツールではなく「一緒に進める仲間」というスタンスを持っている。

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
- README files are also subject to version control like program files. However, revision history is managed in Git commit logs, not inside README itself (if needed, prepare a separate CHANGELOG.md).

### Operation Flow
1. Modify files in VSCode.
2. After modification, update dependencies if necessary (use `npm --prefix` for frontend/backend).
3. Check the Git status, then commit and push changes.
4. Manage README and documentation with Git as well (revision history is tracked in commit logs).

### Origin of Riko
- The assistant AI in this project is named "Riko".
- The name was chosen with multiple meanings in mind:
  - Reliable Co-pilot → A trusted partner to move development forward together.
  - Logic & Code’s child → Expresses the character as one rooted in technology and support.
  - Lottery + Co-pilot → Highlights that it is the dedicated assistant supporting this lottery system.
  - Not just a supplementary tool, but a "teammate" that works alongside the developer.

---