// ============================================================================
// File: frontend/src/ui/ErrorBoundary.jsx
// Version: v0.1_001 (2025-08-21)
// ============================================================================
// 仕様:
// - ページ単位のエラーバウンダリを提供
// ============================================================================
// 履歴（直近のみ）:
// - 新規作成
// ============================================================================

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 本番では抑制、開発時のみログ出力
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", this.props.scope, error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h2>エラーが発生しました</h2>
          {this.props.scope && (
            <p style={{ opacity: 0.7 }}>画面: {this.props.scope}</p>
          )}
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#f7f7f7",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          >
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
