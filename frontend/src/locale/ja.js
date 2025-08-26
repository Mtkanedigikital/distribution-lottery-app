// ============================================================================
// File: frontend/src/locale/ja.js
// Version: v0.1_007 (2025-08-26)
// ============================================================================
// 仕様:
// - 日本語ロケール定義
// - 画面文言やメッセージを集約
// ============================================================================
// 履歴（直近のみ）:
// - 2025-08-26: participant.resultPrefix をフラグ切替対応（REACT_APP_FLAGS=participant_text_v2）
// - 新規作成
// - QRPage/Participant 固定文言の辞書キーを追加
// - 2025-08-23: QRPage 用の辞書キー（submit / entryPlaceholder / passwordPlaceholder）を追加
// - 2025-08-23: qr.prizeIdPrefix を追加
// - 2025-08-24: participant のエイリアスキー（prizeIdPrefix / prizeNamePrefix / publishedAtJST / entryPlaceholder / passwordPlaceholder / submit）を追加
// - 2025-08-24: admin.title.csvUpload と admin.hint.defaultTime を追加
// ============================================================================

const ja = {
  app: {
    title: "配布抽選システム",
    nav: {
      prizes: "抽選予定（参加者向け）",
      adminList: "管理：賞品一覧・作成",
      adminDebug: "（開発者向け）デバッグ",
    },
  },
  prizes: {
    title: "抽選予定（参加者向け）",
    note: "公開日時（JST）以降に、各賞品ページで抽選結果を確認できます。",
    empty:
      "現在、公開予定の抽選はありません。しばらくしてから再度ご確認ください。",
    publishAt: (txt) => `公開日時（JST）: ${txt}`,
    openParticipant: "参加者ページを開く",
    saveQrPng: "QRコードをPNGで保存",
    errorNetwork:
      "ネットワークエラーが発生しました。時間をおいて再度お試しください。",
    errorGeneric: "取得に失敗しました。時間をおいて再度お試しください。",
  },
  participant: {
    title: "抽選結果確認",
    resultPrefix: (process.env.REACT_APP_FLAGS || "").includes(
      "participant_text_v2",
    )
      ? "当落結果："
      : "結果：",
    // --- aliases for components that reference flat keys ---
    prizeIdPrefix: "賞品ID",
    prizeNamePrefix: "賞品名",
    publishedAtJST: "公開日時（JST）",
    entryPlaceholder: "抽選番号（例: 001）",
    passwordPlaceholder: "パスワード（例: 1111）",
    submit: "抽選結果を確認する",
    labels: {
      entryNumber: "エントリー番号",
      password: "パスワード",
    },
    hint: "エントリー番号とパスワードは配布物のQRコード横をご確認ください。",
    check: "結果を確認する",
    result: {
      win: (name) => `🎉 おめでとうございます！「${name}」に当選しました！`,
      lose: (name) => `残念ながら「${name}」には当選しませんでした。`,
      notPublished:
        "抽選結果はまだ公開されていません。公開日時（JST）以降に再度お試しください。",
      notFound:
        "エントリーが見つかりません。番号とパスワードをご確認ください。",
      required: "エントリー番号とパスワードを入力してください。",
    },
    form: {
      intro: "抽選番号とパスワードを入力して結果を確認してください。",
      entryPlaceholder: "抽選番号（例: 001）",
      passwordPlaceholder: "パスワード（例: 1111）",
      submit: "抽選結果を確認する",
    },
    state: {
      noData: "データがありません。",
    },
    prefix: {
      result: "結果：",
      prizeId: "賞品ID：",
    },
  },
  qr: {
    title: "QRページ",
    prizeIdPrefix: "賞品ID",
    entryPlaceholder: "抽選番号（例: 001）",
    passwordPlaceholder: "パスワード（例: 1111）",
    submit: "抽選結果を確認する",
    errorNetwork:
      "ネットワークエラーが発生しました。時間をおいて再度お試しください。",
    errorGeneric: "処理に失敗しました。時間をおいて再度お試しください。",
  },
  admin: {
    title: {
      prizeList: "管理：賞品一覧・作成",
      createPrize: "賞品の新規作成",
      upsertManual: "単票 UPSERT（手動）",
      csvUpload: "参加者エントリー一括投入（CSV）",
    },
    label: {
      secret: "管理シークレット（ADMIN_SECRET）",
      unpublishedFirst: "未公開を上に並べ替える",
      prizeId: "賞品ID（例: B002）",
      prizeName: "賞品名",
      publishAt: "公開日時（JST）",
      targetPrizeId: "対象の賞品ID",
      conflictPolicy: "重複時の動作",
      prizeIdShort: "賞品ID",
      entryNumber: "抽選番号",
      password: "パスワード",
      isWinner: "当選",
    },
    placeholder: {
      secret: "ここに管理シークレットを入力（ローカル保存）",
      prizeId: "B002",
      prizeName: "○○賞",
    },
    help: {
      secret:
        "ブラウザの <code>localStorage</code> に保存され、管理API呼び出し時に <code>x-admin-secret</code> ヘッダで送信されます。",
      csvFormat: "CSVフォーマット（1行目は必ずヘッダ）：",
      defaultTime: "ヒント：初期値は現時間＋1時間（JST）の表記です。",
    },
    hint: { defaultTime: "ヒント：初期値は現時間＋1時間（JST）の表記です。" },
    button: {
      creating: "作成中…",
      create: "作成する",
      downloadSampleCsv: "サンプルCSVを保存",
      sending: "送信中…",
      upsert: "UPSERT 実行",
      publishNow: "公開時刻を今にする",
    },
    option: {
      selectPrize: "-- 選択してください --",
      ignore: "既存を維持（新規のみ追加）",
      upsert: "上書き（パスワード/当落を更新）",
    },
    state: {
      uploading: "アップロード中…",
      noPrizes: "賞品がありません。",
    },
    link: {
      participantPage: "参加者ページを開く",
    },
    create: {
      section: "賞品の新規作成",
      id: "賞品ID（例: B002）",
      name: "賞品名",
      publishAt: "公開日時（JST）※現在時刻＋1時間が初期値",
      submit: "賞品を作成",
    },
    csv: {
      section: "参加者エントリーの一括投入（CSV）",
      prizeId: "対象の賞品ID（例: B001）",
      modeKeep: "既存を維持（新規のみ追加）",
      sampleTitle: "CSVフォーマット（1行目は必ずヘッダ）：",
      sampleCode:
        "entry_number,password,is_winner\n001,1111,true\n002,2222,false",
    },
    card: {
      publishAt: (txt) => `公開日時（JST）: ${txt}`,
      openParticipant: "参加者ページを開く",
      saveQrPng: "QRコードをPNGで保存",
      edit: "編集",
    },
    edit: {
      title: "管理：賞品編集",
      name: "賞品名",
      publishAt: "公開日時（JST）",
      save: "変更を保存",
      delete: "この賞品を削除",
      confirmDelete: "本当に削除しますか？参加者エントリーも削除されます。",
    },
    toast: {
      saved: "保存しました。",
      created: "作成しました。",
      imported: "CSVを取り込みました。",
      authFail: "認証に失敗しました。管理シークレットを確認してください。",
      network: "通信エラーが発生しました。時間をおいて再度お試しください。",
      invalid: "入力内容に誤りがあります。赤い項目を修正してください。",
      createSuccess: "作成しました。",
      createFail: "作成に失敗しました。",
      publishUpdated: (txt) => `公開時刻を更新: ${txt}`,
      publishFail: "公開に失敗しました。",
      csvResult: (msg) => `CSV処理結果: ${msg}`,
      csvFail: "CSVの処理に失敗しました。",
      upsertSuccess: "登録しました。",
      upsertFail: "登録に失敗しました。",
      secretSaved: "管理者シークレットを保存しました。",
      secretCleared: "管理者シークレットを削除しました。",
    },
  },
  common: {
    required: "必須",
    cancel: "キャンセル",
    close: "閉じる",
    loading: "読み込み中です…",
    retry: "再読み込み",
    errorPrefix: "エラー: ",
    network:
      "ネットワークエラーが発生しました。時間をおいて再度お試しください。",
    server: "サーバーでエラーが発生しました。時間をおいて再度お試しください。",
  },
  format: {
    // 例: format.publishJst("2025/08/19 13:00")
    publishJst: (txt) => `公開日時（JST）: ${txt}`,
  },
};

export default ja;
