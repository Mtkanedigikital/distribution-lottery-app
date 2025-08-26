// ============================================================================
// File: frontend/src/App.test.js
// Version: v0.1_002 (2025-08-21)
// ============================================================================
// 仕様:
// - App を MemoryRouter でラップしてレンダリングできることを確認
// - 初期レンダリング時にタイトル「抽選アプリ」が表示されることをテスト
// ============================================================================
// 履歴（直近のみ）:
// - CRA 初期テストを Router 対応に変更（learn react → 抽選アプリ）
// ============================================================================

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

test("renders app title", () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText(/抽選アプリ/)).toBeInTheDocument();
});
