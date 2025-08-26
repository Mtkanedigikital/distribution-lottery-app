// ============================================================================
// File: frontend/src/__tests__/QRPage.test.jsx
// Version: v0.1_002 (2025-08-21)
// ============================================================================
// 仕様:
// - QRPage が MemoryRouter 配下でレンダリングできることのスモークテスト
// - 「<賞品名> の抽選ページ」タイトルが表示されることを確認
// ============================================================================
// 履歴（直近のみ）:
// - 初版作成（依存APIをモックして最小描画を確認）
// - locale モック未適用による t is not a function を修正
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

const prize = { id: "TEST1", name: "テスト賞", result_time_jst: "2099-01-01 00:00" };

jest.mock("../api", () => ({
  getPrizes: jest.fn().mockResolvedValue([{ id: "TEST1", name: "テスト賞", result_time_jst: "2099-01-01 00:00" }]),
  checkResult: jest.fn().mockResolvedValue({ result: "OK" }),
}));

import QRPage from "../QRPage";

test("renders QR page title", async () => {
  render(
    <MemoryRouter initialEntries={["/p?prizeId=TEST1"]}>
      <QRPage />
    </MemoryRouter>
  );
  expect(await screen.findByText(`${prize.name} の抽選ページ`)).toBeInTheDocument();
});
