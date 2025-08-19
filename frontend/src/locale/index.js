// frontend/src/locale/index.js
import ja from "./ja";

// 単純な t 関数（今回は日本語固定）
export const t = (path, ...args) => {
  const segs = path.split(".");
  let cur = ja;
  for (const s of segs) {
    if (cur == null) return path;
    cur = cur[s];
  }
  if (typeof cur === "function") return cur(...args);
  return cur ?? path;
};