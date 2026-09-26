"use client";

import React, { useEffect, useState } from 'react';
import { Megaphone, Music, Sparkles } from 'lucide-react';

export interface RealBannerAd {
  advertiserName: string;
  badge: string;
  imageUrl: string;
  width: number;
  height: number;
  clickUrl: string;
  trackingPixel?: string;
}

interface AdInlineBannerProps {
  variant?: 'compact' | 'standard';
  /** 実際のA8.net等の広告を差し込む場合に指定（複数指定すると自動でローテーション表示） */
  ads?: RealBannerAd[];
  /** ローテーション間隔（ms）。デフォルト8秒 */
  rotateIntervalMs?: number;
}

export default function AdInlineBanner({ variant = 'standard', ads, rotateIntervalMs = 8000 }: AdInlineBannerProps) {
  // 複数箇所に配置しても同じ広告が同時に並ばないよう、開始位置をランダムにする
  const [index, setIndex] = useState(() => (ads && ads.length > 0 ? Math.floor(Math.random() * ads.length) : 0));

  useEffect(() => {
    if (!ads || ads.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % ads.length);
    }, rotateIntervalMs);
    return () => clearInterval(timer);
  }, [ads, rotateIntervalMs]);

  const ad = ads && ads.length > 0 ? ads[index % ads.length] : undefined;

  return (
    <div className="w-full bg-slate-900/50 light:bg-white border border-slate-800/80 light:border-slate-200 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-lg light:shadow-md transition-all hover:border-slate-700/80 light:hover:border-slate-300">
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-slate-500 light:text-slate-400 uppercase tracking-wider mb-2 px-1">
        <span className="flex items-center gap-1">
          <Megaphone className="w-3 h-3 text-indigo-400 light:text-indigo-600" />
          スポンサーリンク
        </span>
        <span className="text-[9px] sm:text-[10px] bg-slate-800 light:bg-slate-200 px-1.5 py-0.5 rounded text-slate-400 light:text-slate-600 font-mono">
          {ad ? ad.badge : 'PR'}
        </span>
      </div>

      {ad ? (
        <div key={ad.advertiserName} className="w-full flex items-center justify-center py-1 animate-in fade-in duration-500">
          {/* A8.net 標準タグ相当（クリック計測リンク + 表示画像 + 計測用ピクセル） */}
          <a href={ad.clickUrl} rel="nofollow noopener" target="_blank" className="inline-block max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageUrl}
              width={ad.width}
              height={ad.height}
              alt={ad.advertiserName}
              className="max-w-full h-auto rounded-lg"
              style={{ border: 0 }}
            />
          </a>
          {ad.trackingPixel && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.trackingPixel} width={1} height={1} alt="" style={{ border: 0 }} />
          )}
        </div>
      ) : (
        /*
          【広告コード挿入エリア】
          Google AdSense（レスポンシブ/728x90等）や アフィリエイトバナーをここに挿入できます。
        */
        <div className={`w-full ${variant === 'compact' ? 'h-[75px] sm:h-[90px]' : 'h-[90px] sm:h-[110px]'} bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/20 light:from-slate-50 light:via-white light:to-indigo-50 border border-dashed border-slate-800 light:border-slate-300 rounded-xl flex items-center justify-between px-4 sm:px-6 group hover:border-indigo-500/40 transition-colors overflow-hidden`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 light:bg-indigo-100 border border-indigo-500/20 light:border-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Music className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 light:text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold text-slate-200 light:text-slate-700 flex items-center gap-1.5">
                <span>音楽スタジオ・楽器機材スポンサー枠</span>
                <Sparkles className="w-3 h-3 text-pink-400 hidden sm:inline" />
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 light:text-slate-400 mt-0.5 line-clamp-1">
                リハスタ予約・機材レンタル・セッションイベント情報などのバナー掲載エリア (728×90 / レスポンシブ)
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-indigo-400 light:text-indigo-600 bg-indigo-500/10 light:bg-indigo-100 border border-indigo-500/20 light:border-indigo-300 px-2.5 py-1 rounded-lg">
              広告バナー枠
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
