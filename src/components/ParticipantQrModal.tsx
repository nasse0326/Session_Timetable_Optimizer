"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, ScanLine } from 'lucide-react';

interface ParticipantQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  isDark?: boolean;
}

export default function ParticipantQrModal({
  isOpen,
  onClose,
  memberName,
  isDark = true
}: ParticipantQrModalProps) {
  if (!isOpen || !memberName) return null;

  // QRコードに埋め込むデータ
  const qrValue = `checkin:${memberName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className={`border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col ${
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
                <span>あなたの入場用QR</span>
              </h3>
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
        <div className="p-6 space-y-5 text-center flex flex-col items-center">
          <div className="font-bold text-lg text-indigo-400">
            {memberName} <span className="text-sm text-slate-400 font-normal">さん</span>
          </div>

          {/* QRコード表示ボックス */}
          <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner border border-slate-200">
            <QRCodeSVG
              value={qrValue}
              size={220}
              level="M"
              marginSize={1}
            />
          </div>

          <div className={`w-full p-4 rounded-xl border text-sm text-left space-y-2 ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}>
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <ScanLine className="w-4 h-4" />
              <span>受付スタッフにご提示ください</span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              このQRコードを受付スタッフに提示し、カメラで読み取ってもらうと入場チェックインが完了します。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className={`px-5 py-3 border-t flex items-center justify-center ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
