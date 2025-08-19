# distribution-lottery-app

このリポジトリは、頒布会などのイベントで使用する「抽選・配布管理システム」です。  
フロントエンドは React、バックエンドは Node.js (Express) で構成されています。

---

## 📖 開発運用ルール (日本語)

### 1. ヘッダコメントのルール
- 各ソースコードの冒頭にヘッダコメントを入れる。
- フォーマットは以下のとおり：

    ```txt
    // ====================
    // File: ファイルパス
    // Version: v0.1_001
    // ---
    // 仕様: このファイルの役割・仕様の概要
    // 履歴: 直近の更新履歴のみ記載
    // ====================
    ```

### 2. バージョン番号管理
- `v0.1_001` のように、更新ごとに末尾の `_NNN` を +1 する。
- バージョンの更新は **リコ（AIアシスタント）** が指示に基づいて行う。

### 3. 更新履歴
- 「プログラムの内容の変更」のみを記載。
- フォーマットやコメントの修正は履歴に含めない。

### 4. 運用フロー
1. 開発者がファイルを提示
2. リコがヘッダを管理ルールに従って修正
3. Git で管理してリポジトリへ反映

### 5. 特記事項
- リポジトリ名は **distribution-lottery-app** （小文字）で統一。

### 6. リコについて
- 本プロジェクトでは、AIアシスタントを「リコ」と呼称しています。
- 名前の由来は「Reliable Co-assistant（信頼できる共同アシスタント）」に基づきます。
- ファイル管理やバージョン更新をサポートし、開発者の補助役を担います。

---

## 📖 Development Rules (English)

### 1. Header Comment Rule
- Each source file must start with a header comment.
- Format:

    ```txt
    // ====================
    // File: file path
    // Version: v0.1_001
    // ---
    // Spec: Overview of the role/specification
    // History: Only the latest update
    // ====================
    ```

### 2. Version Management
- Use format `v0.1_001` and increment `_NNN` by +1 for each update.
- Version updates are managed by **Riko (AI assistant)** under instruction.

### 3. Update History
- Only include **program/content changes**.
- Do not include format/comment-only edits.

### 4. Workflow
1. Developer provides file
2. Riko updates header according to rules
3. Commit and push to repository

### 5. Notes
- Repository name unified as **distribution-lottery-app** (lowercase).

### 6. About Riko
- In this project, the AI assistant is called "Riko".
- The name comes from "Reliable Co-assistant".
- Riko supports file management and version updates, acting as a development partner.

---
