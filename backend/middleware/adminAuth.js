// ============================================================================
// File: backend/middleware/adminAuth.js
// Version: v1_2(2025-08-24)
// ============================================================================
// Specifications:
// - 開発(dev): ADMIN_SECRET 未設定なら 'test' を既定値として許可
// - 本番(prod): ADMIN_SECRET は必須。未設定なら 500 を返して検知
// - ヘッダ 'x-admin-secret' または Bearer トークンのどちらか一致で認証OK
// - 値は process.env から取得（dotenv は index.js 先頭で初期化済み）
// ============================================================================
// History (recent only):
// - 2025-08-24: 環境別の期待値ロジックに刷新（dev=既定'test'/prod=必須）
// ============================================================================

module.exports = function adminAuth(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const envSecret = (process.env.ADMIN_SECRET || '').trim();

  // dev では未設定なら 'test' を既定にする。prod では必須。
  const expected = envSecret || (isProd ? '' : 'test');
  if (!expected) {
    return res.status(500).json({
      message: 'Server misconfig: ADMIN_SECRET is required in production.'
    });
  }

  const headerSecret = String(req.get('x-admin-secret') || '').trim();
  const bearer = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();

  if (headerSecret === expected || bearer === expected) {
    return next();
  }

  return res.status(401).json({ message: 'Unauthorized (invalid admin secret)' });
};