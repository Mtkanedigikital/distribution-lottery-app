const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");

// 値は返さず、長さとハッシュ指紋だけ返す
function fingerprint(secret) {
  if (!secret) return null;
  const sha = crypto.createHash("sha256").update(secret).digest("hex");
  return sha.slice(0, 8);
}

router.get("/env", adminAuth, (req, res) => {
  const s = process.env.ADMIN_SECRET || "";
  res.json({
    adminSecretLength: s.length,
    adminSecretSha256_8: fingerprint(s),
    cwd: process.cwd(),
    __dirname: __dirname,
    pid: process.pid,
    node: process.version,
  });
});

module.exports = router;
