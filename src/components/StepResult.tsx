import React, { useState } from 'react';
import { OptimizationResult } from '../types';
import { Play, Copy, Check, AlertTriangle, Coffee, Loader2, Calendar, Sparkles, FileSpreadsheet, MessageSquare, Music } from 'lucide-react';

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

const getPartPriority = (part: string) => {
  const p = part.toLowerCase();
  if (p.includes('vo') || p.includes('ボーカル') || p.includes('うた')) return 1;
  if (p.includes('gt') || p.includes('ギター') || p.includes('g1') || p.includes('g2')) return 2;
  if (p.includes('ba') || p.includes('ベース')) return 3;
  if (p.includes('dr') || p.includes('ドラム')) return 4;
  return 5;
};

const sortMembers = (members: {name: string, part: string}[]) => {
  return [...members].sort((a, b) => getPartPriority(a.part) - getPartPriority(b.part));
};

export default function StepResult({ result, onOptimize, isOptimizing }: StepResultProps) {
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Excel / Googleスプレッドシート用 TSVコピー
  const handleCopyTsv = () => {
    if (!result) return;
    
    // ヘッダー行
    let tsv = "No.\t開始時間\t終了時間\tカテゴリ\tバンド名\tアーティスト\t曲名\tレンタル\t持込\t転換長\tVo\tGt1\tGt2\tBa\tDr\tKey\tその他メンバー\t備考\t警告/状況\n";
    
    result.schedule.forEach((item, idx) => {
      const s = item.song;
      
      // パートメンバーの振り分け
      const vo = s.members.filter(m => m.part.toLowerCase().includes('vo') || m.part.includes('ボーカル')).map(m => m.name).join(', ');
      const gt1 = s.members.find(m => m.part.toLowerCase() === 'gt1' || m.part.toLowerCase() === 'gt' || m.part.includes('ギター1'))?.name || 
                  s.members.filter(m => m.part.toLowerCase().includes('gt') || m.part.includes('ギター'))[0]?.name || '';
      const gt2 = s.members.find(m => m.part.toLowerCase() === 'gt2' || m.part.includes('ギター2'))?.name || 
                  s.members.filter(m => m.part.toLowerCase().includes('gt') || m.part.includes('ギター'))[1]?.name || '';
      const ba = s.members.filter(m => m.part.toLowerCase().includes('ba') || m.part.includes('ベース')).map(m => m.name).join(', ');
      const dr = s.members.filter(m => m.part.toLowerCase().includes('dr') || m.part.includes('ドラム')).map(m => m.name).join(', ');
      const key = s.members.filter(m => m.part.toLowerCase().includes('key') || m.part.includes('キーボード') || m.part.includes('pf')).map(m => m.name).join(', ');
      
      // 上記主要パート以外のメンバー
      const otherMembers = s.members
        .filter(m => {
          const p = m.part.toLowerCase();
          return !p.includes('vo') && !p.includes('gt') && !p.includes('ba') && !p.includes('dr') && !p.includes('key') && !p.includes('キーボード') && !p.includes('ベース') && !p.includes('ドラム') && !p.includes('ギター') && !p.includes('ボーカル');
        })
        .map(m => `${m.part}:${m.name}`)
        .join(', ');

      const category = s.category || (s.isAssignment ? '課題曲' : (s.isSession ? 'セッション' : '通常'));
      const band = s.bandName || '';
      const artist = s.artist || '';
      const rental = s.rental || '';
      const bring = s.bring || '';
      const longSetup = s.requiresLongSetup ? 'あり' : '';
      const notes = s.rawNotes || '';
      const conflicts = item.conflicts.length > 0 ? item.conflicts.join('; ') : '良好';

      tsv += `${idx + 1}\t${item.startTime}\t${item.endTime}\t${category}\t${band}\t${artist}\t${s.title}\t${rental}\t${bring}\t${longSetup}\t${vo}\t${gt1}\t${gt2}\t${ba}\t${dr}\t${key}\t${otherMembers}\t${notes}\t${conflicts}\n`;

      if (item.isBreakAfter) {
        tsv += `-\t-\t-\t休憩\t-\t-\t☕ 休憩・インターバル\t-\t-\t-\t-\t-\t-\t-\t-\t-\t-\t休憩・転換調整\t-\n`;
      }
    });

    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2000);
    });
  };

  // LINE / Slack用テキストコピー
  const handleCopyText = () => {
    if (!result) return;
    
    let text = "📋 【タイムテーブル】\n\n";
    result.schedule.forEach((item, idx) => {
      const s = item.song;
      text += `${idx + 1}. ${item.startTime}〜${item.endTime} ${s.title}\n`;
      
      const metaInfo = [];
      if (s.category) metaInfo.push(`カテゴリ:${s.category}`);
      if (s.bandName) metaInfo.push(`バンド:${s.bandName}`);
      if (s.artist) metaInfo.push(`原曲:${s.artist}`);
      if (metaInfo.length > 0) {
        text += `   [情報] ${metaInfo.join(' | ')}\n`;
      }

      const gearInfo = [];
      if (s.bring && s.bring !== 'なし') gearInfo.push(`持込:${s.bring}`);
      if (s.rental && s.rental !== 'なし') gearInfo.push(`レンタル:${s.rental}`);
      if (s.requiresLongSetup && gearInfo.length === 0) gearInfo.push('転換長');
      if (gearInfo.length > 0) {
        text += `   [機材] ${gearInfo.join(' / ')}\n`;
      }

      const parts = sortMembers(s.members).map(m => `${m.part}:${m.name}`).join(' / ');
      if (parts) {
        text += `   [メンバー] ${parts}\n`;
      }
      
      if (item.conflicts.length > 0) {
        text += `   ⚠️ ${item.conflicts.join(', ')}\n`;
      }
      if (item.isBreakAfter) {
        text += `\n☕ 休憩（転換・インターバル）\n\n`;
      }
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
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
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Excel / スプレッドシート用 TSVコピーボタン */}
                <button
                  onClick={handleCopyTsv}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 hover:text-white transition-all bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500/40 px-3.5 py-2 rounded-xl shadow-sm"
                  title="ExcelやGoogleスプレッドシートに直接貼り付けられる表形式でコピーします"
                >
                  {copiedTsv ? <Check className="w-4 h-4 text-emerald-300" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-300" />}
                  {copiedTsv ? 'TSVコピー完了！' : 'Excel/スプシ用にコピー'}
                </button>

                {/* LINE / Slack用テキストコピーボタン */}
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white transition-all bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/40 px-3.5 py-2 rounded-xl shadow-sm"
                  title="LINEやSlack等で見やすいテキスト形式でコピーします"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-300" /> : <MessageSquare className="w-4 h-4" />}
                  {copiedText ? 'テキストコピー完了！' : 'LINE/Slack用にコピー'}
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center text-slate-500">#</th>
                    <th className="px-4 py-3 min-w-[110px]">時間</th>
                    <th className="px-4 py-3 min-w-[100px]">カテゴリ</th>
                    <th className="px-4 py-3 min-w-[160px]">曲名 / バンド / 原曲</th>
                    <th className="px-4 py-3 min-w-[110px]">機材・転換</th>
                    <th className="px-4 py-3 min-w-[240px]">担当メンバー</th>
                    <th className="px-4 py-3 min-w-[130px]">備考 / 状況</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.schedule.map((item, idx) => {
                    const s = item.song;
                    const category = s.category || (s.isAssignment ? '課題曲' : (s.isSession ? 'セッション' : '通常'));
                    
                    return (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-200 font-mono whitespace-nowrap font-medium">
                            {item.startTime} - {item.endTime}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                              category === '課題曲'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : category === 'インスト' || category === 'セッション'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                              <Music className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>{s.title}</span>
                            </div>
                            {(s.bandName || s.artist) && (
                              <div className="text-[11px] text-slate-400 mt-0.5 pl-5 flex flex-wrap gap-2">
                                {s.bandName && <span className="text-slate-300 font-medium">🎸 {s.bandName}</span>}
                                {s.artist && <span className="text-slate-400">({s.artist})</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {s.requiresLongSetup && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                  ⚡ 転換長
                                </span>
                              )}
                              {s.bring && s.bring !== 'なし' && (
                                <div className="text-[11px] text-slate-300 truncate max-w-[120px]" title={`持込: ${s.bring}`}>
                                  <span className="text-slate-500">持込:</span> {s.bring}
                                </div>
                              )}
                              {s.rental && s.rental !== 'なし' && (
                                <div className="text-[11px] text-slate-300 truncate max-w-[120px]" title={`レンタル: ${s.rental}`}>
                                  <span className="text-slate-500">ﾚﾝﾀﾙ:</span> {s.rental}
                                </div>
                              )}
                              {!s.requiresLongSetup && (!s.bring || s.bring === 'なし') && (!s.rental || s.rental === 'なし') && (
                                <span className="text-slate-600">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {sortMembers(s.members).map((m, i) => (
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
                            {s.rawNotes && (
                              <div className="text-[10px] text-slate-500 mt-1 font-mono truncate max-w-[130px]" title={s.rawNotes}>
                                📝 {s.rawNotes}
                              </div>
                            )}
                          </td>
                        </tr>
                        {item.isBreakAfter && (
                          <tr className="bg-emerald-950/25 border-y border-emerald-500/25">
                            <td colSpan={7} className="px-4 py-2.5 text-center text-emerald-300">
                              <div className="flex items-center justify-center gap-2 font-semibold text-xs">
                                <Coffee className="w-4 h-4 text-emerald-400" />
                                <span>☕ 休憩・インターバル（セット転換＆進行調整）</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
