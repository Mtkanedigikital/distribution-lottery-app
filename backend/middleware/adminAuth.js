// backend/middleware/adminAuth.js
// 起動時に一度だけ環境変数を確定させ、以後は固定値で判定（途中で上書きされない）
const SERVER_SECRET = process.env.ADMIN_SECRET || "";

module.exports = function adminAuth(req, res, next) {
  const headerSecret = req.get("x-admin-secret") || "";
  const bearer = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (SERVER_SECRET && (headerSecret === SERVER_SECRET || bearer === SERVER_SECRET)) {
    return next();
  }

  if (!SERVER_SECRET) {
    return res.status(401).json({ error: "Unauthorized (admin secret required)" });
  }
  return res.status(401).json({ error: "Unauthorized (invalid admin secret)" });
};