"use client";

import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  QrCode, 
  Download, 
  Sparkles, 
  MessageSquare, 
  Smartphone,
  Share2,
  CalendarCheck2
} from 'lucide-react';

interface SharePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  songCount: number;
}

export default function SharePublishModal({
  isOpen,
  onClose,
  shareUrl,
  songCount
}: SharePublishModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedLineMessage, setCopiedLineMessage] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const lineMessage = `📋 【セッションタイムテーブルが確定しました！】
全 ${songCount} 曲のタイムテーブルが完成しました。
以下のリンクから自分の出演順や空き時間、機材情報をスマホで確認できます！👇

${shareUrl}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  const handleCopyLineMessage = () => {
    navigator.clipboard.writeText(lineMessage).then(() => {
      setCopiedLineMessage(true);
      setTimeout(() => setCopiedLineMessage(false), 2000);
    });
  };

  const handleDownloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `session_timetable_qr_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* モーダルヘッダー */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <CalendarCheck2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>タイムテーブル確定＆共有リンク発行</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                参加者がスマホで自分の出演曲をハイライト確認できる専用ページです
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* モーダル本文 */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. 共有URLセクション */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              参加者閲覧用 URL (完全永続・サーバー不要)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 bg-slate-950 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/50 shadow-inner"
              />
              <button
                onClick={handleCopyUrl}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0 active:scale-95"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copiedUrl ? 'コピー完了！' : 'URLをコピー'}
              </button>
            </div>
          </div>

          {/* 2. QRコード ＆ プレビューボタン */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {/* QRコード表示 */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900 rounded-xl border border-slate-800/80">
              <div ref={qrRef} className="p-2.5 bg-white rounded-xl shadow-inner mb-2">
                <QRCodeCanvas 
                  value={shareUrl} 
                  size={140}
                  level="M"
                  marginSize={0}
                />
              </div>
              <button
                onClick={handleDownloadQr}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 hover:bg-slate-800 px-3 py-1 rounded-lg transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                QR画像を保存
              </button>
            </div>

            {/* 説明とプレビュー */}
            <div className="flex flex-col justify-between space-y-3 py-1">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  <QrCode className="w-4 h-4 text-purple-400" />
                  会場や受付に貼ってスマホ読取
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  QR画像を印刷してスタジオやライブハウスの壁に貼れば、参加者がスマホカメラでかざすだけで即座にタイムテーブルを開けます。
                </p>
              </div>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                参加者画面をプレビュー確認
              </a>
            </div>
          </div>

          {/* 3. LINE / Slack 連絡用定型文 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                LINE / Slack 連絡用メッセージ
              </label>
              <button
                onClick={handleCopyLineMessage}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copiedLineMessage ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLineMessage ? 'メッセージコピー完了！' : 'メッセージを丸ごとコピー'}
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={lineMessage}
              onFocus={(e) => e.target.select()}
              className="w-full bg-slate-950 text-slate-300 font-mono text-[11px] p-3 rounded-xl border border-slate-800 focus:outline-none leading-relaxed shadow-inner"
            />
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
