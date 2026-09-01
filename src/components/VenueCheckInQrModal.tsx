"use client";

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { shortenUrl } from '@/utils/shortener';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface VenueCheckInQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
  isDark?: boolean;
}

export default function VenueCheckInQrModal({
  isOpen,
  onClose,
  eventTitle,
  isDark = true
}: VenueCheckInQrModalProps) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [qrTargetUrl, setQrTargetUrl] = useState('');
  const [isShortening, setIsShortening] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const fullUrl = window.location.href;
      setCurrentUrl(fullUrl);
      setIsShortening(true);

      shortenUrl(fullUrl)
        .then(short => {
          setQrTargetUrl(short);
        })
        .catch(err => {
          console.warn('URL shortener error', err);
          setQrTargetUrl(fullUrl);
        })
        .finally(() => {
          setIsShortening(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    const urlToCopy = qrTargetUrl || currentUrl;
    if (!urlToCopy) return;
    navigator.clipboard.writeText(urlToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadQr = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `venue_checkin_qr_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  const handlePrintQr = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className={`border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-slate-900 border-indigo-500/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* ヘッダー */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <span>会場受付用 チェックインQR</span>
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                受付デスクに掲示・参加者がスマホで読み取り
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 本文 */}
        <div className="p-5 sm:p-6 space-y-4 text-center">
          {eventTitle && (
            <div className="font-bold text-sm text-indigo-400">
              {eventTitle}
            </div>
          )}

          {/* QRコード表示ボックス */}
          <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner border border-slate-200 max-w-[260px] mx-auto">
            {isShortening ? (
              <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">短縮QRコードを生成中...</span>
              </div>
            ) : (qrTargetUrl || currentUrl) ? (
              <>
                {/* 画面表示用 SVG QR (常に超高精細・スキャンしやすさ抜群) */}
                <QRCodeSVG
                  value={qrTargetUrl || currentUrl}
                  size={200}
                  level="M"
                  marginSize={1}
                />

                {/* ダウンロード用 Canvas (非表示) */}
                <div ref={canvasRef} className="hidden">
                  <QRCodeCanvas
                    value={qrTargetUrl || currentUrl}
                    size={400}
                    level="M"
                    marginSize={2}
                  />
                </div>
              </>
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-slate-400">
                QRコードを読み込み中...
              </div>
            )}

            <span className="text-[11px] font-bold text-slate-900 mt-2.5 flex items-center gap-1">
              📱 スマホカメラでスキャンして入場
            </span>
          </div>

          {/* 短縮URL表示 */}
          {qrTargetUrl && qrTargetUrl.startsWith('http') && (
            <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <span className="font-mono text-[11px] truncate flex-1 text-left">
                {qrTargetUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 shrink-0 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '済' : 'コピー'}</span>
              </button>
            </div>
          )}

          {/* 受付手順案内 */}
          <div className={`p-3 rounded-xl border text-xs text-left space-y-1 ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
          }`}>
            <div className="font-bold text-[11px] text-indigo-400 uppercase">
              【当日の受付・チェックイン手順】
            </div>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] opacity-90">
              <li>参加者が受付にて参加費をお支払い</li>
              <li>このQRコードを参加者スマホでスキャン</li>
              <li>タイムテーブル画面で「入場完了」となります</li>
            </ol>
          </div>

          {/* アクションボタン */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!currentUrl}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>QR画像を保存</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUrl}
              disabled={!currentUrl}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'コピー完了！' : 'URLをコピー'}</span>
            </button>
          </div>
        </div>

        {/* フッター */}
        <div className={`px-5 py-3 border-t flex items-center justify-end ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-1.5 rounded-xl text-xs font-semibold ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
