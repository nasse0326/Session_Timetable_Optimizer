import React, { useState } from 'react';
import { OptimizationResult } from '../types';
import { Play, Copy, Check, AlertTriangle, Coffee, Loader2, Calendar, Sparkles } from 'lucide-react';

interface StepResultProps {
  result: OptimizationResult | null;
  onOptimize: () => void;
  isOptimizing: boolean;
}

const getPartBadgeStyle = (part: string) => {
  const p = part.toLowerCase();
  if (p.includes('vo') || p.includes('ボーカル') || p.includes('うた')) {
    return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
  }
  if (p.includes('gt') || p.includes('ギター') || p.includes('g1') || p.includes('g2')) {
    return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  }
  if (p.includes('ba') || p.includes('ベース')) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  if (p.includes('dr') || p.includes('ドラム')) {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold';
  }
  if (p.includes('key') || p.includes('キーボード') || p.includes('pf') || p.includes('syn')) {
    return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

export default function StepResult({ result, onOptimize, isOptimizing }: StepResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!result) return;
    
    let text = "📋 【タイムテーブル】\n\n";
    result.schedule.forEach((item, idx) => {
      text += `${idx + 1}. ${item.startTime}〜${item.endTime} ${item.song.title}\n`;
      const parts = item.song.members.map(m => `${m.part}:${m.name}`).join(' / ');
      text += `   [メンバー] ${parts}\n`;
      if (item.conflicts.length > 0) {
        text += `   ⚠️ ${item.conflicts.join(', ')}\n`;
      }
      if (item.isBreakAfter) {
        text += `\n☕ 休憩（転換・インターバル）\n\n`;
      }
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-pink-500/40">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-pink-500/20 p-2.5 rounded-xl border border-pink-500/30 shadow-inner">
            <Calendar className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Step 3: タイムテーブル結果</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              最適化ボタンを押すと、連続出演や時間制約を考慮した曲順を即座に計算します
            </p>
          </div>
        </div>
        
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="flex items-center gap-2 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white px-7 py-3 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              最適化計算中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300 fill-current" />
              曲順を自動最適化する
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* スコア・違反サマリー */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-100">{result.score}</span>
              <span className="text-xs text-slate-400 mt-1">ペナルティスコア (0が理想)</span>
            </div>
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-amber-400">
                {result.totalViolations.consecutivePlay + result.totalViolations.drumTransition}
              </span>
              <span className="text-xs text-slate-400 mt-1">連続出演回数</span>
            </div>
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold ${result.totalViolations.timeConstraint > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {result.totalViolations.timeConstraint}
              </span>
              <span className="text-xs text-slate-400 mt-1">時間制約違反</span>
            </div>
          </div>

          {/* タイムテーブル表示 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            <div className="flex flex-wrap justify-between items-center p-4 border-b border-slate-800 bg-slate-900/60 gap-3">
              <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                <span>📋 完成タイムテーブル</span>
                <span className="text-xs font-normal text-slate-400">({result.schedule.length} 曲)</span>
              </h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white transition-all bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/40 px-4 py-2 rounded-xl shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'コピーしました！' : 'LINE / Slack用にコピー'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center text-slate-500">#</th>
                    <th className="px-4 py-3 min-w-[120px]">時間</th>
                    <th className="px-4 py-3 min-w-[140px]">曲名</th>
                    <th className="px-4 py-3 w-16 text-center">転換長</th>
                    <th className="px-4 py-3 min-w-[260px]">担当メンバー</th>
                    <th className="px-4 py-3 min-w-[140px]">警告 / 状況</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.schedule.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-mono whitespace-nowrap font-medium">
                          {item.startTime} - {item.endTime}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-100">
                          {item.song.title}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.song.requiresLongSetup ? (
                            <span className="inline-flex justify-center items-center w-4 h-4 rounded bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 text-[10px] font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="text-slate-700">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {item.song.members.map((m, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${getPartBadgeStyle(m.part)}`}
                              >
                                <span className="font-mono text-[10px] opacity-70">{m.part}</span>
                                <span className="font-medium">{m.name}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.conflicts.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {item.conflicts.map((c, i) => (
                                <span
                                  key={i}
                                  className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1.5 w-max font-medium ${
                                    c.includes('違反')
                                      ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-400/80 text-[11px] font-medium flex items-center gap-1">
                              ✓ 良好
                            </span>
                          )}
                        </td>
                      </tr>
                      {item.isBreakAfter && (
                        <tr className="bg-emerald-950/20 border-y border-emerald-500/20">
                          <td colSpan={6} className="px-4 py-2.5 text-center text-emerald-300">
                            <div className="flex items-center justify-center gap-2 font-medium text-xs">
                              <Coffee className="w-4 h-4 text-emerald-400" />
                              <span>☕ 休憩・インターバル</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
