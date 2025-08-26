// ============================================================================
// File: frontend/src/__tests__/QRPage.test.jsx
// Version: v0.1_002 (2025-08-21)
// ============================================================================
// 仕様:
// - QRPage を MemoryRouter でレンダリングできることのスモークテスト
// - locale と API をモックしてネットワーク/辞書依存を排除
// ============================================================================
// 履歴（直近のみ）:
// - locale モック未適用による t is not a function を修正
// - モック宣言順を import 前に固定
// ============================================================================

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// locale をモック
jest.mock("../locale", () => ({
  __esModule: true,
  default: (key, arg) => {
    const dict = {
      "qr.title": (name) => `${name} の抽選ページ`,
      "common.loading": "読み込み中です…",
      "common.errorPrefix": "エラー: ",
      "qr.noData": "データがありません。",
      "prizes.publishAt": (txt) => `公開日時（JST）: ${txt}`,
    };
    const v = dict[key];
    if (typeof v === "function") return v(arg);
    if (v != null) return v;
    return typeof arg === "string" ? arg : key;
  },
}));

// API をモック
jest.mock("../api", () => ({
  getPrizes: jest.fn().mockResolvedValue([
    { id: "TEST1", name: "テスト賞", result_time_jst: "2099-01-01 00:00" },
  ]),
  checkResult: jest.fn().mockResolvedValue({ result: "OK" }),
}));

import QRPage from "../QRPage";

const prize = { id: "TEST1", name: "テスト賞", result_time_jst: "2099-01-01 00:00" };

test("renders QR page title", async () => {
  render(
    <MemoryRouter initialEntries={["/p?prizeId=TEST1"]}>
      <QRPage />
    </MemoryRouter>
  );
  expect(await screen.findByText(`${prize.name} の抽選ページ`)).toBeInTheDocument();
});

// ============================================================================
// File: frontend/src/__tests__/Participant.test.jsx
// Version: v0.1_002 (2025-08-21)
// ============================================================================
// 仕様:
// - Participant を MemoryRouter でレンダリングできることのスモークテスト
// - locale と API をモックしてネットワーク/辞書依存を排除
// ============================================================================
// 履歴（直近のみ）:
// - locale モック未適用による t is not a function を修正
// - モック宣言順を import 前に固定
// ============================================================================

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// locale をモック
jest.mock("../locale", () => ({
  __esModule: true,
  default: (key, arg) => {
    const dict = {
      "qr.title": (name) => `${name} の抽選ページ`,
      "qr.prizeIdPrefix": "賞品ID：",
      "qr.entryPlaceholder": "抽選番号（例: 001）",
      "qr.passwordPlaceholder": "パスワード（例: 1111）",
      "qr.submit": "抽選結果を確認する",
      "qr.resultPrefix": "結果：",
      "qr.noData": "データがありません。",
      "common.errorPrefix": "エラー: ",
      "common.loading": "読み込み中です…",
      "prizes.publishAt": (txt) => `公開日時（JST）: ${txt}`,
    };
    const v = dict[key];
    if (typeof v === "function") return v(arg);
    if (v != null) return v;
    return typeof arg === "string" ? arg : key;
  },
}));

// API をモック
jest.mock("../api", () => ({
  getPrizes: jest.fn().mockResolvedValue([
    { id: "TEST1", name: "テスト賞", result_time_jst: "2099-01-01 00:00" },
  ]),
  checkResult: jest.fn().mockResolvedValue({ result: "OK" }),
}));

import Participant from "../Participant";

const prize = { id: "TEST1", name: "テスト賞", result_time_jst: "2099-01-01 00:00" };

test("renders Participant title", async () => {
  render(
    <MemoryRouter initialEntries={["/p?prizeId=TEST1"]}>
      <Participant />
    </MemoryRouter>
  );
  expect(await screen.findByText(`${prize.name} の抽選ページ`)).toBeInTheDocument();
});
