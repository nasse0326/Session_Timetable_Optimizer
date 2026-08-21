import React from 'react';
import { Megaphone, Sparkles, Music, ShieldCheck } from 'lucide-react';

export default function AdSidebar() {
  return (
    <aside className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {/* 広告枠 1: レクタングル (300x250 互換) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 backdrop-blur-md shadow-xl transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
          <span className="flex items-center gap-1">
            <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
            スポンサーリンク
          </span>
          <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400">PR</span>
        </div>

        {/* 
          【広告コード挿入エリア 1】
          Google AdSense や アフィリエイトタグ（サウンドハウス、音楽スタジオ等）をここに貼り付けます。
        */}
        <div className="w-full h-[180px] sm:h-[200px] bg-gradient-to-br from-slate-950 to-slate-900 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-4 group hover:border-indigo-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Music className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-xs font-bold text-slate-300 mb-1">
            広告・スポンサー掲載枠
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-[240px]">
            楽器・機材・音楽スタジオ・軽音イベント等のバナー掲載エリア (レスポンシブ / 300×250)
          </p>
        </div>
      </div>

      {/* サポート・おすすめ情報 or 広告枠 2 */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 backdrop-blur-md shadow-xl transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            おすすめサービス
          </span>
          <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400">INFO</span>
        </div>

        {/* 
          【広告コード挿入エリア 2】
        */}
        <div className="w-full h-[180px] sm:h-[200px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-4 group hover:border-pink-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-xs font-bold text-slate-300 mb-0.5">
            Session Timetable Optimizer
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2 max-w-[240px]">
            データはすべてブラウザ内で安全に計算され、外部サーバーに送信されません。
          </p>
          <div className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
            常設バナー枠 (レスポンシブ)
          </div>
        </div>
      </div>
    </aside>
  );
}
