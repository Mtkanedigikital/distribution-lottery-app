

// ============================================================================
// File: frontend/src/components/admin/QrCard.jsx
// Version: v0.1_001 (2025-08-21)
// ============================================================================
// 仕様:
// - 賞品ごとのQRコード表示とPNG保存ボタン
// ============================================================================
// 履歴（直近のみ）:
// - 初版作成（Admin.jsx から切り出し）
// ============================================================================

import React from "react";
import QRCode from "react-qr-code";
import * as QR from "qrcode";
import { formatJstDate } from "../../utils/datetime";
import { BUTTON_STYLE } from "../../ui/styles";

export default function QrCard({ prize }) {
  const participantUrl = `${window.location.origin}/p?prizeId=${encodeURIComponent(prize.id)}`;

  const downloadQR = async () => {
    try {
      const qrPngDataUrl = await QR.toDataURL(participantUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 8,
      });
      const img = new Image();
      img.onload = () => {
        const qrTarget = 256;
        const padding = 24;
        const textLineHeight = 18;
        const extraTextLines = 2;
        const extraHeight = extraTextLines * textLineHeight + padding;

        const canvas = document.createElement("canvas");
        canvas.width = qrTarget + padding * 2;
        canvas.height = qrTarget + padding * 2 + extraHeight;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const x = (canvas.width - qrTarget) / 2;
        const y = (canvas.height - extraHeight - qrTarget) / 2;
        ctx.drawImage(img, x, y, qrTarget, qrTarget);

        ctx.fillStyle = "#000";
        ctx.font =
          "14px 'Hiragino Sans','Noto Sans JP',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
        const textYStart = qrTarget + padding * 2 + textLineHeight / 2;
        ctx.fillText(`賞品ID: ${prize.id}`, padding, textYStart);
        ctx.fillText(
          formatJstDate(prize.result_time_jst),
          padding,
          textYStart + textLineHeight,
        );

        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `qr_${prize.id}.png`;
        a.click();
      };
      img.onerror = () => alert("QRのPNG変換に失敗しました（画像読み込みエラー）");
      img.src = qrPngDataUrl;
    } catch (e) {
      console.error("downloadQR error:", e);
      alert("QRのPNG変換に失敗しました（例外）。コンソールを確認してください。");
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <QRCode value={participantUrl} size={128} />
      <div style={{ marginTop: 8 }}>
        <button onClick={downloadQR} style={BUTTON_STYLE}>
          QRをPNG保存
        </button>
      </div>
    </div>
  );
}