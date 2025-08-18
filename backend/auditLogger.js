// backend/auditLogger.js
function auditLog(action, details) {
  // 現時点では console 出力のみ
  // 将来は DB保存や外部サービス送信に差し替え可能
  console.log(`[AUDIT] ${new Date().toISOString()} | ${action}`, details);
}

module.exports = { auditLog };