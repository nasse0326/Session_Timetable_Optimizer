"use client";

import React, { useState, useMemo } from 'react';
import { OptimizationResult } from '../types';
import { 
  Play, Copy, Check, AlertTriangle, Coffee, Loader2, 
  Calendar, Sparkles, FileSpreadsheet, MessageSquare, 
  Music, Table, Download, Eye
} from 'lucide-react';

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
  const [outputTab, setOutputTab] = useState<'table' | 'tsv' | 'text'>('table');
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // TSVテキストの生成（Excel / Googleスプレッドシート貼付用）
  const generatedTsv = useMemo(() => {
    if (!result) return '';

    const headers = [
      'No.',
      '開始時間',
      '終了時間',
      'カテゴリ',
      'バンド名',
      'アーティスト名',
      '曲名',
      'レンタル',
      '持込',
      'Vo',
      'Gt1',
      'Gt2',
      'Ba',
      'Dr',
      'Key',
      'その他メンバー',
      '備考',
      '警告/状況'
    ];

    const lines: string[] = [headers.join('\t')];

    const isNoneVal = (val?: string) => !val || val === 'なし' || val === '無し' || val === '無' || val === 'none' || val === '-' || val === 'FALSE' || val === 'false';

    result.schedule.forEach((item, idx) => {
      const s = item.song;

      const vo = s.members.filter(m => m.part.toLowerCase().includes('vo') || m.part.includes('ボーカル')).map(m => m.name).join(', ') || '';
      const gt1 = s.members.find(m => m.part.toLowerCase() === 'gt1' || m.part.toLowerCase() === 'gt' || m.part.includes('ギター1'))?.name || 
                  s.members.filter(m => m.part.toLowerCase().includes('gt') || m.part.includes('ギター'))[0]?.name || '';
      const gt2 = s.members.find(m => m.part.toLowerCase() === 'gt2' || m.part.includes('ギター2'))?.name || 
                  s.members.filter(m => m.part.toLowerCase().includes('gt') || m.part.includes('ギター'))[1]?.name || '';
      const ba = s.members.filter(m => m.part.toLowerCase().includes('ba') || m.part.includes('ベース')).map(m => m.name).join(', ') || '';
      const dr = s.members.filter(m => m.part.toLowerCase().includes('dr') || m.part.includes('ドラム')).map(m => m.name).join(', ') || '';
      const key = s.members.filter(m => m.part.toLowerCase().includes('key') || m.part.includes('キーボード') || m.part.includes('pf')).map(m => m.name).join(', ') || '';

      const otherMembers = s.members
        .filter(m => {
          const p = m.part.toLowerCase();
          return !p.includes('vo') && !p.includes('gt') && !p.includes('ba') && !p.includes('dr') && !p.includes('key') && !p.includes('キーボード') && !p.includes('ベース') && !p.includes('ドラム') && !p.includes('ギター') && !p.includes('ボーカル');
        })
        .map(m => `${m.part}:${m.name}`)
        .join(', ') || '';

      const category = s.category || (s.isAssignment ? '課題曲' : (s.isSession ? 'セッション' : '通常'));
      const band = s.bandName || '';
      const artist = s.artist || '';
      const rental = s.rental || '';
      const bring = s.bring || (s.requiresLongSetup ? '転換長' : '');
      const notes = (s.rawNotes || '').replace(/[\t\r\n]+/g, ' ');
      const conflicts = item.conflicts.length > 0 ? item.conflicts.join('; ') : '';

      const row = [
        (idx + 1).toString(),
        item.startTime,
        item.endTime,
        category,
        band,
        artist,
        s.title,
        rental,
        bring,
        vo,
        gt1,
        gt2,
        ba,
        dr,
        key,
        otherMembers,
        notes,
        conflicts
      ];

      lines.push(row.join('\t'));

      if (item.isBreakAfter) {
        const breakRow = [
          '',
          item.endTime,
          '',
          '休憩',
          '',
          '',
          '☕ 休憩・インターバル',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'セット転換・進行調整',
          ''
        ];
        lines.push(breakRow.join('\t'));
      }
    });

    return lines.join('\n');
  }, [result]);

  // LINE / Slack用テキストの生成
  const generatedText = useMemo(() => {
    if (!result) return '';

    let text = "📋 【タイムテーブル】\n\n";
    result.schedule.forEach((item, idx) => {
      const s = item.song;
      text += `【${idx + 1}】 ${item.startTime}〜${item.endTime}\n`;
      text += `曲名: ${s.title}\n`;
      
      const category = s.category || (s.isAssignment ? '課題曲' : (s.isSession ? 'セッション' : '通常'));
      text += `カテゴリ: ${category}\n`;
      
      if (s.bandName) text += `バンド名: ${s.bandName}\n`;
      if (s.artist) text += `アーティスト名: ${s.artist}\n`;
      
      if (s.rental) text += `レンタル: ${s.rental}\n`;
      if (s.bring) text += `持込: ${s.bring}\n`;
      if (s.requiresLongSetup && !s.bring && !s.rental) {
        text += `備考: 転換長\n`;
      }

      const parts = sortMembers(s.members).map(m => `${m.part}:${m.name}`).join(' / ');
      if (parts) {
        text += `メンバー: ${parts}\n`;
      }
      
      if (item.conflicts.length > 0) {
        text += `⚠️ 状況: ${item.conflicts.join(', ')}\n`;
      }
      
      if (item.isBreakAfter) {
        text += `\n☕ 休憩（転換・インターバル）\n\n`;
      } else {
        text += `\n`;
      }
    });

    return text;
  }, [result]);

  const handleCopyTsv = () => {
    if (!generatedTsv) return;
    navigator.clipboard.writeText(generatedTsv).then(() => {
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2000);
    });
  };

  const handleCopyText = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  const handleDownloadTsv = () => {
    if (!generatedTsv) return;
    const blob = new Blob([generatedTsv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timetable_${new Date().toISOString().slice(0, 10)}.tsv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-pink-500/40">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-pink-500/20 p-2.5 rounded-xl border border-pink-500/30 shadow-inner">
            <Calendar className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Step 3: タイムテーブル出力結果</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              最適化ボタンを押すと、連続出演や時間制約を考慮した曲順を即座に計算し、Excel/スプレッドシートやLINE用に整理して出力します
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

          {/* 出力結果コンテナ */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            {/* ヘッダー & タブ切り替えバー */}
            <div className="flex flex-wrap justify-between items-center p-4 border-b border-slate-800 bg-slate-900/60 gap-3">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setOutputTab('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    outputTab === 'table'
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  タイムテーブル表
                </button>

                <button
                  type="button"
                  onClick={() => setOutputTab('tsv')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    outputTab === 'tsv'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel / スプシ貼付用 (TSV)
                </button>

                <button
                  type="button"
                  onClick={() => setOutputTab('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    outputTab === 'text'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  LINE / Slack用
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Excel / スプレッドシート用 TSVコピーボタン */}
                <button
                  type="button"
                  onClick={handleCopyTsv}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 hover:text-white transition-all bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500/40 px-3.5 py-2 rounded-xl shadow-sm"
                  title="ExcelやGoogleスプレッドシートに直接貼り付けられる表形式でコピーします"
                >
                  {copiedTsv ? <Check className="w-4 h-4 text-emerald-300" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-300" />}
                  {copiedTsv ? 'TSVコピー完了！' : 'Excel/スプシ用にコピー'}
                </button>

                {/* LINE / Slack用テキストコピーボタン */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white transition-all bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/40 px-3.5 py-2 rounded-xl shadow-sm"
                  title="LINEやSlack等で見やすいテキスト形式でコピーします"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-300" /> : <MessageSquare className="w-4 h-4" />}
                  {copiedText ? 'テキストコピー完了！' : 'LINE/Slack用にコピー'}
                </button>

                {/* TSVファイルダウンロード */}
                <button
                  type="button"
                  onClick={handleDownloadTsv}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors"
                  title="TSVファイルとして保存"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* タブ1: タイムテーブル表ビュー */}
            {outputTab === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-2 py-2.5 w-8 text-center text-slate-500">#</th>
                      <th className="px-2.5 py-2.5 min-w-[85px]">時間</th>
                      <th className="px-2.5 py-2.5 min-w-[75px]">カテゴリ</th>
                      <th className="px-2.5 py-2.5 min-w-[90px]">バンド名</th>
                      <th className="px-2.5 py-2.5 min-w-[95px]">アーティスト名</th>
                      <th className="px-2.5 py-2.5 min-w-[120px]">曲名</th>
                      <th className="px-2 py-2.5 min-w-[70px]">レンタル</th>
                      <th className="px-2 py-2.5 min-w-[70px]">持込</th>
                      <th className="px-2.5 py-2.5 min-w-[180px]">担当メンバー</th>
                      <th className="px-2.5 py-2.5 min-w-[110px]">備考 / 状況</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {result.schedule.map((item, idx) => {
                      const s = item.song;
                      const category = s.category || (s.isAssignment ? '課題曲' : (s.isSession ? 'セッション' : '通常'));
                      
                      return (
                        <React.Fragment key={idx}>
                          <tr className="hover:bg-slate-900/40 transition-colors">
                            <td className="px-2 py-2.5 text-center text-slate-500 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-200 font-mono whitespace-nowrap font-medium text-[11px]">
                              {item.startTime} - {item.endTime}
                            </td>
                            <td className="px-2.5 py-2.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                category === '課題曲'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                  : category === 'インスト' || category === 'セッション'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {category}
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-300 font-medium text-[11px]">
                              {s.bandName || <span className="text-slate-600">-</span>}
                            </td>
                            <td className="px-2.5 py-2.5 text-slate-400 text-[11px]">
                              {s.artist || <span className="text-slate-600">-</span>}
                            </td>
                            <td className="px-2.5 py-2.5">
                              <div className="font-semibold text-slate-100 text-xs flex items-center gap-1">
                                <Music className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>{s.title}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-slate-300 text-[11px]">
                              {s.rental ? (
                                <span className="truncate block max-w-[90px]" title={s.rental}>{s.rental}</span>
                              ) : <span className="text-slate-600">-</span>}
                            </td>
                            <td className="px-2 py-2.5 text-slate-300 text-[11px]">
                              <div className="space-y-0.5">
                                {s.bring ? (
                                  <span className="truncate block max-w-[90px]" title={s.bring}>{s.bring}</span>
                                ) : <span className="text-slate-600">-</span>}
                                {s.requiresLongSetup && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-bold">
                                    ⚡ 転換長
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2.5 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {sortMembers(s.members).map((m, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${getPartBadgeStyle(m.part)}`}
                                  >
                                    <span className="font-mono text-[9px] opacity-70">{m.part}</span>
                                    <span className="font-medium">{m.name}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-2.5 py-2.5">
                              {item.conflicts.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {item.conflicts.map((c, i) => (
                                    <span
                                      key={i}
                                      className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 w-max font-medium ${
                                        c.includes('違反')
                                          ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                      }`}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-400/80 text-[10px] font-medium flex items-center gap-0.5">
                                  ✓ 良好
                                </span>
                              )}
                              {s.rawNotes && (
                                <div className="text-[9px] text-slate-500 mt-0.5 font-mono truncate max-w-[110px]" title={s.rawNotes}>
                                  📝 {s.rawNotes}
                                </div>
                              )}
                            </td>
                          </tr>
                          {item.isBreakAfter && (
                            <tr className="bg-emerald-950/25 border-y border-emerald-500/25">
                              <td colSpan={10} className="px-3 py-2 text-center text-emerald-300">
                                <div className="flex items-center justify-center gap-2 font-semibold text-xs">
                                  <Coffee className="w-3.5 h-3.5 text-emerald-400" />
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
            )}

            {/* タブ2: Excel/スプレッドシート用 TSVテキストビュー */}
            {outputTab === 'tsv' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>ExcelやGoogleスプレッドシートに直接貼り付け可能なタブ区切りテキストです：</span>
                  <span className="text-[11px] text-emerald-400 font-mono">全 {result.schedule.length} 曲 + 休憩行</span>
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedTsv}
                    onFocus={(e) => e.target.select()}
                    rows={12}
                    className="w-full bg-slate-950 text-slate-200 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500/50 shadow-inner whitespace-pre leading-relaxed"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  ※ テキストエリアをクリックして全選択（Ctrl+A）→ コピー（Ctrl+C）または上部の「Excel/スプシ用にコピー」ボタンをご利用ください。
                </p>
              </div>
            )}

            {/* タブ3: LINE/Slack用テキストビュー */}
            {outputTab === 'text' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>LINEやSlack等で共有しやすいフォーマットです：</span>
                  <span className="text-[11px] text-indigo-400 font-mono">連絡用テキスト</span>
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedText}
                    onFocus={(e) => e.target.select()}
                    rows={12}
                    className="w-full bg-slate-950 text-slate-200 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/50 shadow-inner whitespace-pre leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
