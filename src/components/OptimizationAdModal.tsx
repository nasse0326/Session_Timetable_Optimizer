import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, Megaphone, Lightbulb, ArrowRight, Music, Radio, Headphones, ShoppingBag, Volume2 } from 'lucide-react';

interface OptimizationAdModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

// 軽音セッションお役立ちTipsリスト
const TIPS = [
  '出演時間が限られているメンバーは、Step 2で「参加可能時間」を指定すると自動で時間内に収まるよう調整されます。',
  'ドラムが同じ人の連続演奏は機材のセッティング変更が不要なため、転換が非常にスムーズになります。',
  '転換時間を10分程度確保しておくと、当日の進行トラブルやアンプトラブルでもタイムテーブルが押しにくくなります。',
  'ボーカルが連続すると声帯への負担が大きいため、AIが自動的に間隔を空けるよう優先調整しています。',
  '持ち込みエフェクターや特殊機材が多いパートは、あらかじめ転換長フラグを設定しておくと安心です。',
  '「1部・2部・3部構成」を設定すると、各部の中間に自動で15分休憩を挟むタイムテーブルを生成できます。',
];

// ダミースポンサー広告データ（純広告・音楽系アフィリエイト風）
const SPONSOR_ADS = [
  {
    id: 'studio-rehearsal',
    badge: 'STUDIO INFO',
    title: '深夜パックでお得にリハ！バンド練習スタジオ',
    description: '学割20%OFF・個人練習直前予約OK。全国主要駅チカの音楽リハーサルスタジオ。',
    cta: 'Web予約はこちら',
    icon: Radio,
    color: 'from-purple-500/20 via-indigo-500/20 to-blue-500/20',
    border: 'border-purple-500/30',
    accent: 'text-purple-400',
    btnBg: 'bg-purple-600 hover:bg-purple-500',
  },
  {
    id: 'gear-shop',
    badge: 'GEAR SALE',
    title: '楽器・音響機材・消耗品 最短当日出荷！',
    description: '弦・シールド・ドラムスティックからマイクまで国内最大級の品揃えと衝撃プライス。',
    cta: '最新セールをチェック',
    icon: Headphones,
    color: 'from-amber-500/20 via-orange-500/20 to-rose-500/20',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
    btnBg: 'bg-amber-600 hover:bg-amber-500',
  },
  {
    id: 'session-goods',
    badge: 'SPECIAL PR',
    title: 'セッション定番曲スコア＆耳コピ支援アプリ',
    description: 'コード進行の一発移調やテンポ変更練習に最適。バンドマン必須の練習サポートツール。',
    cta: '無料トライアル中',
    icon: Music,
    color: 'from-pink-500/20 via-rose-500/20 to-indigo-500/20',
    border: 'border-pink-500/30',
    accent: 'text-pink-400',
    btnBg: 'bg-pink-600 hover:bg-pink-500',
  },
];

export default function OptimizationAdModal({ isOpen, onComplete }: OptimizationAdModalProps) {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('制約条件を解析中...');

  // モーダルが開くたびにランダムなTipsと広告を選択
  const tip = useMemo(() => {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }, [isOpen]);

  const ad = useMemo(() => {
    return SPONSOR_ADS[Math.floor(Math.random() * SPONSOR_ADS.length)];
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStatusMessage('制約条件を解析中...');
      return;
    }

    const duration = 2800; // 2.8秒かけてプログレスを進める
    const intervalTime = 40;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setStatusMessage('最適化完了！タイムテーブルを生成しました');
          setTimeout(() => {
            onComplete();
          }, 350);
          return 100;
        }

        if (next < 25) {
          setStatusMessage('参加者データと出演可能時間を検証中...');
        } else if (next < 60) {
          setStatusMessage('遺伝的アルゴリズムで最適な曲順を探索中...');
        } else if (next < 85) {
          setStatusMessage('連続演奏ペナルティと転換効率を最小化中...');
        } else {
          setStatusMessage('タイムテーブルと休憩時間を確定中...');
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const AdIcon = ad.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        {/* 背景の装飾グロー */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* 上部: プログレス演出 */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 animate-pulse">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                  <span>曲順を自動最適化中</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {Math.round(progress)}%
                  </span>
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-[260px] sm:max-w-[340px]">
                  {statusMessage}
                </p>
              </div>
            </div>
            
            {/* スキップボタン */}
            <button
              type="button"
              onClick={onComplete}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700 font-medium"
            >
              スキップ
            </button>
          </div>

          {/* プログレスバー */}
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-75 shadow-lg shadow-pink-500/30"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 中央: 大型広告表示枠 (300x250 レクタングル / 336x280) */}
        <div className="relative z-10 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2 px-1">
            <span className="flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
              スポンサーリンク
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
              {ad.badge}
            </span>
          </div>

          {/* 
            ========================================================================
            【Google AdSense または 広告タグ差し替えエリア】
            Google AdSense (レクタングル 300x250 または 336x280) や
            アフィリエイトASPのiframe/スクリプトを設置する場合は、
            以下のコンテナ内部を差し替えてください。
            ========================================================================
          */}
          <div className={`w-full min-h-[200px] sm:min-h-[220px] bg-gradient-to-br ${ad.color} border ${ad.border} rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group`}>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 shadow-sm">
                  <AdIcon className={`w-5 h-5 ${ad.accent}`} />
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug group-hover:text-indigo-200 transition-colors">
                  {ad.title}
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {ad.description}
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-800/60 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-mono">300×250 / 336×280 広告枠</span>
              <a
                href="#ad-sponsor-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert('【スポンサーリンク例】\n実際の広告配信時は、音楽スタジオ予約ページやアフィリエイトリンク先が開きます。');
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-bold text-white ${ad.btnBg} px-3.5 py-1.5 rounded-lg shadow-md transition-all hover:scale-105 active:scale-95`}
              >
                <span>{ad.cta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* 下部: 軽音セッションお役立ちTips */}
        <div className="relative z-10 bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 flex items-start gap-2.5 text-slate-400 text-xs leading-relaxed">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">豆知識：</span>
            <span>{tip}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
