"use client";

import React from 'react';
import { Megaphone, Music, Sparkles } from 'lucide-react';

interface AdInlineBannerProps {
  variant?: 'compact' | 'standard';
}

export default function AdInlineBanner({ variant = 'standard' }: AdInlineBannerProps) {
  return (
    <div className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-lg transition-all hover:border-slate-700/80">
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
        <span className="flex items-center gap-1">
          <Megaphone className="w-3 h-3 text-indigo-400" />
          スポンサーリンク
        </span>
        <span className="text-[9px] sm:text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">PR</span>
      </div>

      {/* 
        【広告コード挿入エリア】
        Google AdSense（レスポンシブ/728x90等）や アフィリエイトバナーをここに挿入できます。
      */}
      <div className={`w-full ${variant === 'compact' ? 'h-[75px] sm:h-[90px]' : 'h-[90px] sm:h-[110px]'} bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/20 border border-dashed border-slate-800 rounded-xl flex items-center justify-between px-4 sm:px-6 group hover:border-indigo-500/40 transition-colors overflow-hidden`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Music className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <span>音楽スタジオ・楽器機材スポンサー枠</span>
              <Sparkles className="w-3 h-3 text-pink-400 hidden sm:inline" />
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              リハスタ予約・機材レンタル・セッションイベント情報などのバナー掲載エリア (728×90 / レスポンシブ)
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
            広告バナー枠
          </span>
        </div>
      </div>
    </div>
  );
}
