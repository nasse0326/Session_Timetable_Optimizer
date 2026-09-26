"use client";

import React, { useState, useMemo } from 'react';
import { OptimizationResult, SessionConfig, MemberConstraint, Song } from '../types';
import { encodeScheduleToUrl } from '../utils/share';
import { recalculateSchedule } from '../utils/optimizer';
import { getPartCategory, getPartPriority, sortMembers } from '../utils/partStyle';
import SharePublishModal from './SharePublishModal';
import {
  Play, Copy, Check, AlertTriangle, Coffee, Loader2,
  Calendar, Sparkles, FileSpreadsheet, MessageSquare,
  Music, Table, Download, Eye, Share2, Smartphone, Clock,
  ArrowUp, ArrowDown, ArrowLeftRight, GripVertical, X
} from 'lucide-react';

interface StepResultProps {
  result: OptimizationResult | null;
  onOptimize: () => void;
  isOptimizing: boolean;
  config?: SessionConfig;
  constraints?: MemberConstraint[];
  onResultChange?: (result: OptimizationResult) => void;
}

const getPartBadgeStyle = (part: string) => {
  switch (getPartCategory(part)) {
    case 'vocal':
      return 'bg-pink-500/15 text-pink-300 border-pink-500/30 light:bg-pink-100 light:text-pink-700 light:border-pink-300';
    case 'guitar':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30 light:bg-sky-100 light:text-sky-700 light:border-sky-300';
    case 'bass':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 light:bg-emerald-100 light:text-emerald-700 light:border-emerald-300';
    case 'drum':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold light:bg-amber-100 light:text-amber-700 light:border-amber-300';
    case 'key':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30 light:bg-purple-100 light:text-purple-700 light:border-purple-300';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700 light:bg-slate-200 light:text-slate-700 light:border-slate-300';
  }
};

export default function StepResult({
  result,
  onOptimize,
  isOptimizing,
  config,
  constraints,
  onResultChange
}: StepResultProps) {
  const [outputTab, setOutputTab] = useState<'table' | 'tsv' | 'text'>('table');
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // 確定共有モーダルの状態
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // ドラッグ＆ドロップ用ステート
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // 2曲スワップモーダル用ステート
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapA, setSwapA] = useState<number>(0);
  const [swapB, setSwapB] = useState<number>(1);

  // スケジュール並び替え＆リアルタイム再計算
  const handleReorder = (newSongList: Song[]) => {
    if (!config || !constraints || !onResultChange) return;
    const newResult = recalculateSchedule(newSongList, constraints, config);
    onResultChange(newResult);
  };

  const handleMoveUp = (idx: number) => {
    if (!result || idx <= 0) return;
    const currentSongs = result.schedule.map(s => s.song);
    const newSongs = [...currentSongs];
    [newSongs[idx - 1], newSongs[idx]] = [newSongs[idx], newSongs[idx - 1]];
    handleReorder(newSongs);
  };

  const handleMoveDown = (idx: number) => {
    if (!result || idx >= result.schedule.length - 1) return;
    const currentSongs = result.schedule.map(s => s.song);
    const newSongs = [...currentSongs];
    [newSongs[idx + 1], newSongs[idx]] = [newSongs[idx], newSongs[idx + 1]];
    handleReorder(newSongs);
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx || !result) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const currentSongs = result.schedule.map(s => s.song);
    const newSongs = [...currentSongs];
    const [removed] = newSongs.splice(draggedIdx, 1);
    newSongs.splice(targetIdx, 0, removed);
    handleReorder(newSongs);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleExecuteSwap = () => {
    if (!result) return;
    if (swapA === swapB || swapA < 0 || swapB < 0 || swapA >= result.schedule.length || swapB >= result.schedule.length) return;
    const currentSongs = result.schedule.map(s => s.song);
    const newSongs = [...currentSongs];
    [newSongs[swapA], newSongs[swapB]] = [newSongs[swapB], newSongs[swapA]];
    handleReorder(newSongs);
    setIsSwapModalOpen(false);
  };


  const handlePublishShare = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      if (!result || result.schedule.length === 0) return;
      const compressed = encodeScheduleToUrl(result.schedule, undefined, {
        eventStartTime: result.eventStartTime,
        openingEndTime: result.openingEndTime,
        eventEndTime: result.eventEndTime,
        isExtended: result.isExtended,
        adminPassword: adminPassword || undefined
      });
      const url = `${window.location.origin}/view#d=${compressed}`;
      setShareUrl(url);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error('[handlePublishShare] ERROR:', err);
      alert('URLの生成中にエラーが発生しました。コンソールを確認してください。\n' + String(err));
    }
  };

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

    // 1. オープニング（集合・機材セッティング枠）
    if (result.eventStartTime && result.openingEndTime && result.eventStartTime !== result.openingEndTime) {
      const openRow = [
        '-',
        result.eventStartTime,
        result.openingEndTime,
        '準備',
        '',
        '',
        '🎪 集合・機材セッティング・オープニング',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '音出し・出欠確認',
        ''
      ];
      lines.push(openRow.join('\t'));
    }

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
      const bring = s.bring || '';
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
          '-',
          item.endTime,
          '',
          '休憩',
          '',
          '',
          '☕ 休憩・インターバル（セット転換＆進行調整）',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ];
        lines.push(breakRow.join('\t'));
      }
    });

    // 2. エンディング（完全撤収枠）
    if (result.songsEndTime && result.eventEndTime) {
      const endRow = [
        '-',
        result.songsEndTime,
        result.eventEndTime,
        '撤収',
        '',
        '',
        '🏁 全曲演奏終了・片付け・完全撤収',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        result.isExtended ? '予定時間より延長' : '完全撤収',
        ''
      ];
      lines.push(endRow.join('\t'));
    }

    return lines.join('\n');
  }, [result]);

  // LINE / Slack用テキストの生成
  const generatedText = useMemo(() => {
    if (!result) return '';

    let text = "📋 【セッションタイムテーブル】\n\n";

    if (result.eventStartTime && result.openingEndTime && result.eventStartTime !== result.openingEndTime) {
      text += `🎪 ${result.eventStartTime}〜${result.openingEndTime} 【集合・機材セッティング・オープニング】\n\n`;
    }

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

    if (result.songsEndTime && result.eventEndTime) {
      text += `🏁 ${result.songsEndTime}〜${result.eventEndTime} 【全曲演奏終了・片付け・完全撤収】\n`;
    }

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
    <div className="bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl light:shadow-lg transition-all duration-300 hover:border-pink-500/40 light:hover:border-pink-400">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-pink-500/20 light:bg-pink-100 p-2.5 rounded-xl border border-pink-500/30 light:border-pink-300 shadow-inner">
            <Calendar className="w-6 h-6 text-pink-400 light:text-pink-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 light:text-slate-900">Step 3: タイムテーブル出力結果</h2>
            <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
              最適化ボタンを押すと、連続出演や時間制約を考慮した曲順を即座に計算し、Excel/スプレッドシートやLINE用に整理して出力します
            </p>
          </div>
        </div>

        <button
          type="button"
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
          {/* スコア・タイムラインサマリー */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* イベント全体タイムライン */}
            <div className="bg-slate-950/60 light:bg-slate-50 rounded-2xl p-4 border border-indigo-500/30 light:border-indigo-300 flex flex-col justify-center space-y-1">
              <span className="text-xs text-indigo-400 light:text-indigo-600 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> イベント全体時間
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-slate-100 light:text-slate-900">
                  {result.eventStartTime || result.schedule[0]?.startTime} - {result.eventEndTime || result.schedule[result.schedule.length - 1]?.endTime}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 light:text-slate-500">
                1曲目開始: {result.openingEndTime || result.schedule[0]?.startTime} ｜ 演奏終了: {result.songsEndTime || result.schedule[result.schedule.length - 1]?.endTime}
              </span>
              {result.isExtended && (
                <span className="inline-flex items-center text-[10px] bg-amber-500/15 light:bg-amber-100 text-amber-300 light:text-amber-700 border border-amber-500/30 light:border-amber-300 px-1.5 py-0.5 rounded font-medium mt-1">
                  ⚠️ 予定終了時刻を自動延長
                </span>
              )}
            </div>

            <div className="bg-slate-950/60 light:bg-slate-50 rounded-2xl p-4 border border-slate-800 light:border-slate-200 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-100 light:text-slate-900">{result.score}</span>
              <span className="text-xs text-slate-400 light:text-slate-500 mt-1">ペナルティスコア (0が理想)</span>
            </div>
            <div className="bg-slate-950/60 light:bg-slate-50 rounded-2xl p-4 border border-slate-800 light:border-slate-200 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-amber-400 light:text-amber-600">
                {result.totalViolations.consecutivePlay + result.totalViolations.drumTransition}
              </span>
              <span className="text-xs text-slate-400 light:text-slate-500 mt-1">連続出演回数</span>
            </div>
            <div className="bg-slate-950/60 light:bg-slate-50 rounded-2xl p-4 border border-slate-800 light:border-slate-200 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold ${result.totalViolations.timeConstraint > 0 ? 'text-red-400 light:text-red-500' : 'text-emerald-400 light:text-emerald-600'}`}>
                {result.totalViolations.timeConstraint}
              </span>
              <span className="text-xs text-slate-400 light:text-slate-500 mt-1">時間制約違反</span>
            </div>
          </div>

          {/* 🌟 最終確定・参加者共有URL発行アクションバー */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 light:from-emerald-50 light:via-white light:to-indigo-50 border border-emerald-500/40 light:border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 light:bg-emerald-100 border border-emerald-500/30 light:border-emerald-300 flex items-center justify-center text-emerald-400 light:text-emerald-600 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-100 light:text-slate-900 flex items-center gap-1.5">
                  <span>参加者用Webタイムテーブルの公開</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-500" />
                </p>
                <p className="text-xs text-slate-400 light:text-slate-500">
                  タイムテーブルが完成したら、参加者がスマホで確認できる専用URL・QRコードを発行します
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePublishShare}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
            >
              <Share2 className="w-4 h-4" />
              <span>タイムテーブル確定して共有URLを発行</span>
            </button>
          </div>

            {/* パスワード設定 (任意) */}
            <div className="mt-3 p-3 bg-slate-950/50 light:bg-slate-50 rounded-xl border border-slate-800 light:border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-300 light:text-slate-600 flex items-center gap-1.5">
                  <span>🔒 受付管理画面のパスワード (任意)</span>
                </p>
                <p className="text-[10px] text-slate-500 light:text-slate-400 mt-1">
                  未設定の場合、誰でもパスワードなしで管理画面を開けます。<br className="hidden sm:block" />
                  参加者にURLを共有する場合は設定を推奨します（※簡易的な悪戯防止であり、強固なセキュリティではありません）。
                </p>
              </div>
              <div className="w-full sm:w-48 shrink-0">
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="例: 1234"
                  className="w-full bg-slate-900 light:bg-white text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

          {/* 出力結果コンテナ */}
          <div className="bg-slate-950/80 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-2xl overflow-hidden shadow-inner">
            {/* ヘッダー & タブ切り替えバー */}
            <div className="flex flex-wrap justify-between items-center p-4 border-b border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-950 light:bg-slate-100 p-1 rounded-xl border border-slate-800 light:border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOutputTab('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      outputTab === 'table'
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800'
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
                        : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800'
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
                        : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    LINE / Slack用
                  </button>
                </div>

                {/* 2曲スワップボタン */}
                {outputTab === 'table' && result.schedule.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSwapA(0);
                      setSwapB(Math.min(1, result.schedule.length - 1));
                      setIsSwapModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-indigo-300 light:text-indigo-700 border border-indigo-500/30 light:border-indigo-300 transition-all shadow-sm active:scale-95"
                    title="指定した2曲の順番を入れ替える"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400 light:text-indigo-600" />
                    <span>2曲を直接スワップ</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Excel / スプレッドシート用 TSVコピーボタン */}
                <button
                  type="button"
                  onClick={handleCopyTsv}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 light:text-emerald-700 hover:text-white light:hover:text-white transition-all bg-emerald-700/80 light:bg-emerald-600 hover:bg-emerald-600 border border-emerald-500/40 light:border-emerald-500 px-3.5 py-2 rounded-xl shadow-sm"
                  title="ExcelやGoogleスプレッドシートに直接貼り付けられる表形式でコピーします"
                >
                  {copiedTsv ? <Check className="w-4 h-4 text-emerald-300 light:text-white" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-300 light:text-white" />}
                  {copiedTsv ? 'TSVコピー完了！' : 'Excel/スプシ用にコピー'}
                </button>

                {/* LINE / Slack用テキストコピーボタン */}
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-200 light:text-white hover:text-white transition-all bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/40 px-3.5 py-2 rounded-xl shadow-sm"
                  title="LINEやSlack等で見やすいテキスト形式でコピーします"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-300" /> : <MessageSquare className="w-4 h-4" />}
                  {copiedText ? 'テキストコピー完了！' : 'LINE/Slack用にコピー'}
                </button>

                {/* TSVファイルダウンロード */}
                <button
                  type="button"
                  onClick={handleDownloadTsv}
                  className="p-2 text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800 hover:bg-slate-800 light:hover:bg-slate-100 rounded-xl border border-slate-700 light:border-slate-300 transition-colors"
                  title="TSVファイルとして保存"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* タブ1: タイムテーブル表ビュー */}
            {outputTab === 'table' && (
              <div>
                <div className="bg-slate-900/40 light:bg-white px-4 py-2 text-[11px] text-slate-400 light:text-slate-500 border-b border-slate-800 light:border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-indigo-500/10 light:bg-indigo-100 border border-indigo-500/30 light:border-indigo-300 text-indigo-300 light:text-indigo-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                      💡 手動入れ替え
                    </span>
                    <span>「▲ / ▼」ボタン、または行の「⠿」をドラッグして曲順を変更できます（時間・警告は即座に自動再計算されます）</span>
                  </div>
                </div>

                <div className="max-h-[650px] overflow-y-auto overflow-x-auto relative rounded-b-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-900 light:bg-white border-b border-slate-700 light:border-slate-200 text-slate-300 light:text-slate-600 uppercase font-bold shadow-md">
                      <tr>
                        <th className="sticky left-0 z-30 bg-slate-900 light:bg-white px-2 py-3 w-14 text-center text-slate-400 light:text-slate-500">移動</th>
                        <th className="sticky left-14 z-30 bg-slate-900 light:bg-white px-2.5 py-3 w-10 text-center text-slate-400 light:text-slate-500">#</th>
                        <th className="sticky left-24 z-30 bg-slate-900 light:bg-white px-3 py-3 min-w-[95px] border-r border-slate-700 light:border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.3)] light:shadow-[2px_0_5px_rgba(0,0,0,0.05)]">時間</th>
                        <th className="px-3 py-3 min-w-[80px]">カテゴリ</th>
                        <th className="px-3 py-3 min-w-[110px]">バンド名</th>
                        <th className="px-3 py-3 min-w-[110px]">アーティスト名</th>
                        <th className="px-3 py-3 min-w-[140px]">曲名</th>
                        <th className="px-3 py-3 min-w-[90px]">レンタル</th>
                        <th className="px-3 py-3 min-w-[110px]">持込</th>
                        <th className="px-3 py-3 min-w-[200px]">担当メンバー</th>
                        <th className="px-3 py-3 min-w-[140px]">備考 / 状況</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 light:divide-slate-200 bg-slate-950 light:bg-white">
                      {/* オープニング枠 */}
                      {result.eventStartTime && result.openingEndTime && result.eventStartTime !== result.openingEndTime && (
                        <tr className="bg-indigo-950/30 light:bg-indigo-50 border-b border-indigo-500/30 light:border-indigo-200 text-indigo-300 light:text-indigo-700">
                          <td className="sticky left-0 z-10 bg-indigo-950 light:bg-indigo-50 px-2 py-3 text-center text-slate-600 light:text-slate-400">
                            -
                          </td>
                          <td className="sticky left-14 z-10 bg-indigo-950 light:bg-indigo-50 px-2.5 py-3 text-center font-mono font-bold text-indigo-400 light:text-indigo-600">
                            -
                          </td>
                          <td className="sticky left-24 z-10 bg-indigo-950 light:bg-indigo-50 px-3 py-3 font-mono whitespace-nowrap font-medium text-[11px] border-r border-indigo-500/30 light:border-indigo-200 shadow-[2px_0_5px_rgba(0,0,0,0.3)] light:shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-indigo-200 light:text-indigo-700">
                            {result.eventStartTime} - {result.openingEndTime}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 light:bg-indigo-100 text-indigo-300 light:text-indigo-700 border border-indigo-500/40 light:border-indigo-300">
                              準備
                            </span>
                          </td>
                          <td colSpan={7} className="px-3 py-3 font-bold text-slate-100 light:text-slate-900 text-xs">
                            🎪 集合・機材セッティング・オープニング（音出し・出欠確認）
                          </td>
                        </tr>
                      )}

                      {result.schedule.map((item, idx) => {
                        const s = item.song;
                        const category = s.category || (s.isAssignment ? '課題曲' : (s.isSession ? 'セッション' : '通常'));
                        const isDragging = draggedIdx === idx;
                        const isDragOver = dragOverIdx === idx;

                        return (
                          <React.Fragment key={`${s.id}-${idx}`}>
                            <tr
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', idx.toString());
                                setDraggedIdx(idx);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOverIdx !== idx) setDragOverIdx(idx);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDrop(idx);
                              }}
                              onDragEnd={() => {
                                setDraggedIdx(null);
                                setDragOverIdx(null);
                              }}
                              className={`transition-colors group ${
                                isDragging ? 'opacity-30 bg-indigo-950/50 light:bg-indigo-100' : 'hover:bg-slate-900/60 light:hover:bg-slate-50'
                              } ${
                                isDragOver ? 'border-t-2 border-indigo-500 bg-indigo-950/40 light:bg-indigo-50' : ''
                              }`}
                            >
                              {/* 固定列 0: 移動ボタン & ドラッグハンドル */}
                              <td className="sticky left-0 z-10 bg-slate-950 light:bg-white group-hover:bg-slate-900 light:group-hover:bg-slate-50 px-1 py-2 text-center select-none">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveUp(idx)}
                                    disabled={idx === 0}
                                    className="p-1 text-slate-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors"
                                    title="1つ上へ移動"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveDown(idx)}
                                    disabled={idx === result.schedule.length - 1}
                                    className="p-1 text-slate-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors"
                                    title="1つ下へ移動"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <div
                                    className="p-1 text-slate-500 light:text-slate-400 hover:text-indigo-400 light:hover:text-indigo-600 cursor-grab active:cursor-grabbing"
                                    title="ドラッグして並び替え"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              </td>

                              {/* 固定列 1: # */}
                              <td className="sticky left-14 z-10 bg-slate-950 light:bg-white group-hover:bg-slate-900 light:group-hover:bg-slate-50 px-2.5 py-3 text-center text-slate-400 light:text-slate-500 font-mono font-bold">
                                {idx + 1}
                              </td>

                              {/* 固定列 2: 時間 */}
                              <td className="sticky left-24 z-10 bg-slate-950 light:bg-white group-hover:bg-slate-900 light:group-hover:bg-slate-50 px-3 py-3 text-slate-200 light:text-slate-700 font-mono whitespace-nowrap font-medium text-[11px] border-r border-slate-800 light:border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.3)] light:shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                {item.startTime} - {item.endTime}
                              </td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  category === '課題曲'
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 light:bg-indigo-100 light:text-indigo-700 light:border-indigo-300'
                                    : category === 'インスト' || category === 'セッション'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 light:bg-purple-100 light:text-purple-700 light:border-purple-300'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 light:bg-slate-200 light:text-slate-700 light:border-slate-300'
                                }`}>
                                  {category}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-slate-300 light:text-slate-600 font-medium text-[11px] break-words">
                                {s.bandName || <span className="text-slate-600 light:text-slate-400">-</span>}
                              </td>
                              <td className="px-3 py-3 text-slate-400 light:text-slate-500 text-[11px] break-words">
                                {s.artist || <span className="text-slate-600 light:text-slate-400">-</span>}
                              </td>
                              <td className="px-3 py-3">
                                <div className="font-semibold text-slate-100 light:text-slate-900 text-xs flex items-start gap-1 break-words">
                                  <Music className="w-3.5 h-3.5 text-indigo-400 light:text-indigo-600 shrink-0 mt-0.5" />
                                  <span>{s.title}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-slate-300 light:text-slate-600 text-[11px] break-words">
                                {s.rental ? s.rental : <span className="text-slate-600 light:text-slate-400">-</span>}
                              </td>
                              <td className="px-3 py-3 text-slate-300 light:text-slate-600 text-[11px] break-words">
                                <div className="space-y-1">
                                  {s.bring ? <span>{s.bring}</span> : <span className="text-slate-600 light:text-slate-400">-</span>}
                                  {s.requiresLongSetup && !s.bring && !s.rental && (
                                    <div>
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 light:bg-amber-100 light:text-amber-700 light:border-amber-300 text-[9px] font-bold">
                                        ⚡ 転換長
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3">
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
                              <td className="px-3 py-3 break-words">
                                {item.conflicts.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {item.conflicts.map((c, i) => (
                                      <span
                                        key={i}
                                        className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 w-max font-medium ${
                                          c.includes('違反')
                                            ? 'bg-red-500/15 text-red-300 border-red-500/30 light:bg-red-100 light:text-red-700 light:border-red-300'
                                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30 light:bg-amber-100 light:text-amber-700 light:border-amber-300'
                                        }`}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-emerald-400/80 light:text-emerald-600 text-[10px] font-medium flex items-center gap-0.5">
                                    ✓ 良好
                                  </span>
                                )}
                                {s.rawNotes && (
                                  <div className="text-[10px] text-slate-400 light:text-slate-500 mt-1 font-mono break-words leading-tight bg-slate-900/60 light:bg-slate-100 p-1 rounded border border-slate-800 light:border-slate-200">
                                    📝 {s.rawNotes}
                                  </div>
                                )}
                              </td>
                            </tr>
                            {item.isBreakAfter && (
                              <tr className="bg-emerald-950/30 light:bg-emerald-50 border-y border-emerald-500/30 light:border-emerald-200">
                                <td colSpan={11} className="px-3 py-2.5 text-center text-emerald-300 light:text-emerald-700">
                                  <div className="flex items-center justify-center gap-2 font-semibold text-xs">
                                    <Coffee className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
                                    <span>☕ 休憩・インターバル（セット転換＆進行調整）</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* エンディング枠 */}
                      {result.songsEndTime && result.eventEndTime && (
                        <tr className="bg-purple-950/30 light:bg-purple-50 border-t border-purple-500/30 light:border-purple-200 text-purple-300 light:text-purple-700">
                          <td className="sticky left-0 z-10 bg-purple-950 light:bg-purple-50 px-2 py-3 text-center text-slate-600 light:text-slate-400">
                            -
                          </td>
                          <td className="sticky left-14 z-10 bg-purple-950 light:bg-purple-50 px-2.5 py-3 text-center font-mono font-bold text-purple-400 light:text-purple-600">
                            -
                          </td>
                          <td className="sticky left-24 z-10 bg-purple-950 light:bg-purple-50 px-3 py-3 font-mono whitespace-nowrap font-medium text-[11px] border-r border-purple-500/30 light:border-purple-200 shadow-[2px_0_5px_rgba(0,0,0,0.3)] light:shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-purple-200 light:text-purple-700">
                            {result.songsEndTime} - {result.eventEndTime}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 light:bg-purple-100 text-purple-300 light:text-purple-700 border border-purple-500/40 light:border-purple-300">
                              撤収
                            </span>
                          </td>
                          <td colSpan={7} className="px-3 py-3 font-bold text-slate-100 light:text-slate-900 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>🏁 全曲演奏終了・片付け・写真撮影・完全撤収</span>
                              {result.isExtended && (
                                <span className="text-[10px] font-normal bg-amber-500/20 light:bg-amber-100 text-amber-300 light:text-amber-700 border border-amber-500/40 light:border-amber-300 px-2 py-0.5 rounded">
                                  ⚠️ 予定時刻を超過したため自動延長
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* タブ2: Excel/スプレッドシート用 TSVテキストビュー */}
            {outputTab === 'tsv' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 light:text-slate-500 px-1">
                  <span>ExcelやGoogleスプレッドシートに直接貼り付け可能なタブ区切りテキストです：</span>
                  <span className="text-[11px] text-emerald-400 light:text-emerald-600 font-mono">全 {result.schedule.length} 曲 + 休憩行</span>
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedTsv}
                    onFocus={(e) => e.target.select()}
                    rows={12}
                    className="w-full bg-slate-950 light:bg-slate-50 text-slate-200 light:text-slate-800 font-mono text-xs p-4 rounded-xl border border-slate-800 light:border-slate-200 focus:outline-none focus:border-emerald-500/50 shadow-inner whitespace-pre leading-relaxed"
                  />
                </div>
                <p className="text-[11px] text-slate-500 light:text-slate-400">
                  ※ テキストエリアをクリックして全選択（Ctrl+A）→ コピー（Ctrl+C）または上部の「Excel/スプシ用にコピー」ボタンをご利用ください。
                </p>
              </div>
            )}

            {/* タブ3: LINE/Slack用テキストビュー */}
            {outputTab === 'text' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 light:text-slate-500 px-1">
                  <span>LINEやSlack等で共有しやすいフォーマットです：</span>
                  <span className="text-[11px] text-indigo-400 light:text-indigo-600 font-mono">連絡用テキスト</span>
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={generatedText}
                    onFocus={(e) => e.target.select()}
                    rows={12}
                    className="w-full bg-slate-950 light:bg-slate-50 text-slate-200 light:text-slate-800 font-mono text-xs p-4 rounded-xl border border-slate-800 light:border-slate-200 focus:outline-none focus:border-indigo-500/50 shadow-inner whitespace-pre leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2曲スワップモーダル */}
      {isSwapModalOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 light:bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 light:bg-white border border-indigo-500/30 light:border-indigo-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-800 light:border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 light:from-indigo-50 light:via-white light:to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 light:bg-indigo-100 border border-indigo-500/30 light:border-indigo-300 flex items-center justify-center text-indigo-400 light:text-indigo-600">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 light:text-slate-900">2曲の順番を入れ替える</h3>
                  <p className="text-xs text-slate-400 light:text-slate-500">入れ替える2曲を選択して実行してください</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="p-2 text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800 hover:bg-slate-800 light:hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 曲A */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 light:text-slate-600">曲 1（入れ替え元）:</label>
                <select
                  value={swapA}
                  onChange={(e) => setSwapA(Number(e.target.value))}
                  className="w-full bg-slate-950 light:bg-slate-50 text-slate-200 light:text-slate-800 border border-slate-800 light:border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {result.schedule.map((item, i) => (
                    <option key={i} value={i}>
                      #{i + 1} {item.song.title} {item.song.artist ? `(${item.song.artist})` : ''} [{item.startTime}〜{item.endTime}]
                    </option>
                  ))}
                </select>
              </div>

              {/* アイコン */}
              <div className="flex justify-center text-indigo-400 light:text-indigo-600">
                <ArrowLeftRight className="w-5 h-5" />
              </div>

              {/* 曲B */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 light:text-slate-600">曲 2（入れ替え先）:</label>
                <select
                  value={swapB}
                  onChange={(e) => setSwapB(Number(e.target.value))}
                  className="w-full bg-slate-950 light:bg-slate-50 text-slate-200 light:text-slate-800 border border-slate-800 light:border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {result.schedule.map((item, i) => (
                    <option key={i} value={i}>
                      #{i + 1} {item.song.title} {item.song.artist ? `(${item.song.artist})` : ''} [{item.startTime}〜{item.endTime}]
                    </option>
                  ))}
                </select>
              </div>

              {swapA === swapB && (
                <p className="text-xs text-amber-400 light:text-amber-600 font-medium">※ 同じ曲が選択されています。異なる曲を選択してください。</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 light:border-slate-200 bg-slate-950 light:bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800 hover:bg-slate-800 light:hover:bg-slate-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleExecuteSwap}
                disabled={swapA === swapB}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
              >
                入れ替えを実行する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確定共有モーダル */}
      {result && (
        <SharePublishModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          result={result}
        />
      )}
    </div>
  );
}
