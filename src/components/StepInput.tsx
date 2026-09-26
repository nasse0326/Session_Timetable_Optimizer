"use client";

import React, { useState } from 'react';
import { SAMPLE_TSV } from '../utils/parser';
import { getPartCategory } from '../utils/partStyle';
import { Song, MemberConstraint } from '../types';
import {
  FileSpreadsheet,
  Users,
  Clock,
  HelpCircle,
  Trash2,
  Table,
  FileText,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Music2,
  Mic,
  Tag
} from 'lucide-react';

interface StepInputProps {
  tsv: string;
  onTsvChange: (val: string) => void;
  songs: Song[];
  constraints: MemberConstraint[];
}

// パートごとのバッジカラー
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

export default function StepInput({ tsv, onTsvChange, songs, constraints }: StepInputProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'table'>('text');
  const [showGuide, setShowGuide] = useState(false);

  // 全メンバーと各メンバーの参加曲数を集計
  const memberSongCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach(s => {
      const seenInSong = new Set<string>();
      s.members.forEach(m => {
        if (!seenInSong.has(m.name)) {
          seenInSong.add(m.name);
          counts.set(m.name, (counts.get(m.name) || 0) + 1);
        }
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [songs]);

  const groupedMembers = React.useMemo(() => {
    const groups = new Map<number, string[]>();
    memberSongCounts.forEach(([name, count]) => {
      if (!groups.has(count)) {
        groups.set(count, []);
      }
      groups.get(count)!.push(name);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [memberSongCounts]);

  const handleSampleLoad = () => {
    onTsvChange(SAMPLE_TSV);
    setActiveTab('table'); // サンプル読み込み時は見やすいテーブルへ自動切替
  };

  const handleClear = () => {
    onTsvChange('');
    setActiveTab('text');
  };

  return (
    <div className="bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl light:shadow-lg transition-all duration-300 hover:border-indigo-500/40 light:hover:border-indigo-400">
      {/* ヘッダーエリア */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 light:bg-indigo-100 p-2.5 rounded-xl border border-indigo-500/30 light:border-indigo-300 shadow-inner">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400 light:text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 light:text-slate-900 flex items-center gap-2">
              Step 1: 演奏データの入力・確認
            </h2>
            <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
              スプレッドシートやExcelのセルをコピーして貼り付けるだけで自動解析します
            </p>
          </div>
        </div>

        {/* ガイド開閉ボタン */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs font-medium text-indigo-300 light:text-indigo-700 hover:text-indigo-200 light:hover:text-indigo-800 bg-indigo-500/10 light:bg-indigo-50 hover:bg-indigo-500/20 light:hover:bg-indigo-100 border border-indigo-500/20 light:border-indigo-200 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
        >
          <HelpCircle className="w-4 h-4 text-indigo-400 light:text-indigo-600" />
          制約の書き方ガイド
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 制約書き方ガイド（開閉式） */}
      {showGuide && (
        <div className="mb-6 space-y-3">
          <div className="p-5 bg-indigo-950/40 light:bg-indigo-50 border border-indigo-500/30 light:border-indigo-200 rounded-2xl animate-in fade-in duration-300">
            <h4 className="text-sm font-semibold text-indigo-200 light:text-indigo-800 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400 light:text-amber-500" />
              スプレッドシートの「備考」列に書ける時間・配置指定フォーマット
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-3">
              <div className="bg-slate-900/80 light:bg-white p-3 rounded-xl border border-indigo-500/20 light:border-indigo-200">
                <span className="font-semibold text-amber-300 light:text-amber-600 block mb-1">⏱️ 遅刻・早退・時間指定</span>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block mb-1">山田 15:00以降</code>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block mb-1">加藤 〜16:30</code>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block">佐藤 14:00~16:00</code>
              </div>
              <div className="bg-slate-900/80 light:bg-white p-3 rounded-xl border border-indigo-500/20 light:border-indigo-200">
                <span className="font-semibold text-amber-300 light:text-amber-600 block mb-1">🔰 初参加の配慮</span>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block mb-1">田中 初参加</code>
                <p className="text-slate-400 light:text-slate-500 mt-1.5">全体の「前半」に優先配置します</p>
              </div>
              <div className="bg-slate-900/80 light:bg-white p-3 rounded-xl border border-indigo-500/20 light:border-indigo-200">
                <span className="font-semibold text-amber-300 light:text-amber-600 block mb-1">👑 前回トッパー・トリ回避</span>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block mb-1">鈴木 前回トッパー</code>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block mb-1">伊藤 前回トリ</code>
                <p className="text-slate-400 light:text-slate-500 mt-1.5">最初・最後の枠を回避します</p>
              </div>
              <div className="bg-slate-900/80 light:bg-white p-3 rounded-xl border border-indigo-500/20 light:border-indigo-200">
                <span className="font-semibold text-amber-300 light:text-amber-600 block mb-1">🥁 転換長・その他</span>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block mb-1">転換長</code>
                <code className="text-slate-300 light:text-slate-700 bg-slate-950 light:bg-slate-100 px-1.5 py-0.5 rounded block mb-1">インスト (※人名不要)</code>
                <p className="text-slate-400 light:text-slate-500 mt-1.5">休憩明けや連続演奏に優先配置します</p>
              </div>
            </div>
            <div className="bg-amber-500/10 light:bg-amber-50 border border-amber-500/30 light:border-amber-300 rounded-xl p-2.5 text-xs text-amber-300/90 light:text-amber-700 font-medium flex items-center gap-2">
              <span>💡</span>
              <span><strong>重要：</strong>備考欄に複数の制約や指定を書く場合は、必ず<strong>カンマ ( , )</strong> で区切って記入してください（例: <code className="bg-slate-950/80 light:bg-amber-100 px-1.5 py-0.5 rounded text-amber-200 light:text-amber-800">山田 15:00以降, 田中 初参加, 転換長</code>）。</span>
            </div>
            <p className="text-[11px] text-indigo-300/80 light:text-indigo-600 mt-2">
              ※「バンドメンバー重複」「マルチプレイヤーの体力配慮」「ドラム転換効率化」などの高度なルールは、AIが自動で考慮します。
            </p>
          </div>

          <div className="p-5 bg-emerald-950/20 light:bg-emerald-50 border border-emerald-500/20 light:border-emerald-200 rounded-2xl animate-in fade-in duration-300">
            <h4 className="text-sm font-semibold text-emerald-200 light:text-emerald-800 flex items-center gap-2 mb-3">
              <Table className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
              自動認識される特別な列（ヘッダー名）
            </h4>
            <div className="text-xs text-slate-300 light:text-slate-600 space-y-2">
              <p>以下の文字列が1行目（ヘッダー）に含まれていると、自動的に機能が有効になります。</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-400 light:text-slate-500">
                <li><strong className="text-emerald-300 light:text-emerald-700">「カテゴリ」列 または「課題曲」列</strong>: 「カテゴリ」列に「課題曲」と記載するか、「課題曲」列を用意すると、ボーカルの連続出演ペナルティが免除されます。</li>
                <li><strong className="text-emerald-300 light:text-emerald-700">「レンタル」または「持込」列</strong>: 「なし」以外の文字が入っていると、自動的に「転換長」扱いになり、休憩明けなどが優先されます。</li>
                <li><strong className="text-emerald-300 light:text-emerald-700">「メンバー〇 名前」「メンバー〇 パート」</strong>: パート固定列ではなく、名前とパートがペアになったフォーマット（Format B）も自動認識します。</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* タブ切り替えとアクションボタン */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center bg-slate-950 light:bg-slate-100 p-1 rounded-xl border border-slate-800 light:border-slate-200">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            テキスト貼付
          </button>
          <button
            onClick={() => setActiveTab('table')}
            disabled={songs.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            見やすい表形式 ({songs.length}曲)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSampleLoad}
            className="text-xs text-indigo-300 light:text-indigo-700 hover:text-indigo-100 light:hover:text-indigo-900 transition-colors flex items-center gap-1.5 bg-indigo-500/15 light:bg-indigo-50 border border-indigo-500/30 light:border-indigo-300 px-3.5 py-2 rounded-xl hover:bg-indigo-500/25 light:hover:bg-indigo-100 shadow-sm font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 light:text-indigo-600" />
            サンプルデータを読込
          </button>
          {tsv && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 light:text-slate-500 hover:text-red-400 light:hover:text-red-500 transition-colors flex items-center gap-1 bg-slate-800/50 light:bg-slate-100 hover:bg-red-500/10 light:hover:bg-red-50 border border-slate-700/50 light:border-slate-300 hover:border-red-500/30 light:hover:border-red-300 px-3 py-2 rounded-xl"
              title="クリア"
            >
              <Trash2 className="w-3.5 h-3.5" />
              クリア
            </button>
          )}
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'text' ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              value={tsv}
              onChange={(e) => onTsvChange(e.target.value)}
              className="w-full h-44 bg-slate-950/70 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 light:text-slate-800 font-mono placeholder:text-slate-600 light:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all leading-relaxed shadow-inner"
              placeholder={"曲名\tVo\tGt1\tGt2\tBa\tDr\tKey\t備考\n天体観測\t田中\t佐藤\t鈴木\t高橋\t伊藤\t\t\nPretender\t山田\t\t田中\t中村\t小林\t加藤\t山田 15:00以降\n..."}
            />
            {songs.length > 0 && (
              <div className="absolute bottom-3 right-3">
                <button
                  onClick={() => setActiveTab('table')}
                  className="bg-indigo-500/90 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg backdrop-blur transition-all"
                >
                  <Table className="w-3.5 h-3.5" />
                  表形式で確認する →
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 人間にフレンドリーな表形式ビュー */
        <div className="bg-slate-950/80 light:bg-slate-50 rounded-2xl border border-slate-800 light:border-slate-200 overflow-hidden shadow-inner">
          <div className="max-h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 light:bg-white border-b border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-500 font-semibold backdrop-blur">
                <tr>
                  <th className="px-2 py-2.5 w-8 text-center text-slate-500 light:text-slate-400">#</th>
                  <th className="px-2.5 py-2.5 min-w-[75px]">カテゴリ</th>
                  <th className="px-2.5 py-2.5 min-w-[90px]">バンド名</th>
                  <th className="px-2.5 py-2.5 min-w-[95px]">アーティスト名</th>
                  <th className="px-2.5 py-2.5 min-w-[120px]">曲名</th>
                  <th className="px-2.5 py-2.5 min-w-[70px]">レンタル</th>
                  <th className="px-2.5 py-2.5 min-w-[70px]">持込</th>
                  <th className="px-2.5 py-2.5 min-w-[180px]">担当メンバー</th>
                  <th className="px-2.5 py-2.5 min-w-[110px]">備考 / 制約</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 light:divide-slate-200">
                {songs.map((song, idx) => {
                  const category = song.category || (song.isAssignment ? '課題曲' : (song.isSession ? 'セッション' : '通常'));
                  return (
                    <tr key={song.id} className="hover:bg-slate-900/40 light:hover:bg-slate-100 transition-colors">
                      <td className="px-2 py-2 text-center text-slate-500 light:text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-2.5 py-2">
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
                      <td className="px-2.5 py-2 text-slate-300 light:text-slate-600 font-medium text-[11px]">
                        {song.bandName || <span className="text-slate-600 light:text-slate-400">-</span>}
                      </td>
                      <td className="px-2.5 py-2 text-slate-400 light:text-slate-500 text-[11px]">
                        {song.artist || <span className="text-slate-600 light:text-slate-400">-</span>}
                      </td>
                      <td className="px-2.5 py-2 font-medium text-slate-100 light:text-slate-900">
                        <div className="flex items-center gap-1 font-semibold text-slate-100 light:text-slate-900 text-xs">
                          <Music2 className="w-3 h-3 text-indigo-400/80 light:text-indigo-500 shrink-0" />
                          <span>{song.title}</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-slate-300 light:text-slate-600 text-[11px]">
                        {song.rental ? (
                          <span className="truncate block max-w-[90px]" title={song.rental}>{song.rental}</span>
                        ) : <span className="text-slate-600 light:text-slate-400">-</span>}
                      </td>
                      <td className="px-2.5 py-2 text-slate-300 light:text-slate-600 text-[11px]">
                        <div className="space-y-0.5">
                          {song.bring ? (
                            <span className="truncate block max-w-[90px]" title={song.bring}>{song.bring}</span>
                          ) : <span className="text-slate-600 light:text-slate-400">-</span>}
                          {song.requiresLongSetup && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 light:bg-amber-100 light:text-amber-700 light:border-amber-300 text-[9px] font-bold">
                              ⚡ 転換長
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex flex-wrap gap-1">
                          {song.members.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${getPartBadgeStyle(m.part)}`}
                            >
                              <span className="font-mono text-[9px] opacity-70">{m.part}</span>
                              <span className="font-medium">{m.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        {song.rawNotes ? (
                          <div className="flex items-center gap-1 text-amber-300/90 light:text-amber-700 bg-amber-500/10 light:bg-amber-50 px-1.5 py-0.5 rounded border border-amber-500/20 light:border-amber-300 w-fit">
                            <Clock className="w-2.5 h-2.5 text-amber-400 light:text-amber-500 shrink-0" />
                            <span className="font-mono text-[10px]">{song.rawNotes}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 light:text-slate-400 italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* パース結果サマリー & メンバー一覧バッジ */}
      {songs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-800 light:border-slate-200 space-y-4 animate-in fade-in duration-300">
          {/* サマリーカード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/60 light:bg-slate-50 rounded-2xl p-4 border border-slate-800 light:border-slate-200 flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 light:bg-indigo-100 text-indigo-400 light:text-indigo-600 rounded-xl">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100 light:text-slate-900">{songs.length} <span className="text-xs font-normal text-slate-400 light:text-slate-500">曲</span></div>
                <div className="text-xs text-slate-400 light:text-slate-500">登録済み楽曲数</div>
              </div>
            </div>

            <div className="bg-slate-950/60 light:bg-slate-50 rounded-2xl p-4 border border-slate-800 light:border-slate-200 flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 light:bg-emerald-100 text-emerald-400 light:text-emerald-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100 light:text-slate-900">{memberSongCounts.length} <span className="text-xs font-normal text-slate-400 light:text-slate-500">名</span></div>
                <div className="text-xs text-slate-400 light:text-slate-500">参加プレイヤー総数</div>
              </div>
            </div>

            <div className="bg-slate-950/60 light:bg-slate-50 rounded-2xl p-4 border border-slate-800 light:border-slate-200 flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 light:bg-amber-100 text-amber-400 light:text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400 light:text-amber-600">{constraints.length} <span className="text-xs font-normal text-slate-400 light:text-slate-500">件</span></div>
                <div className="text-xs text-slate-400 light:text-slate-500">自動認識された時間制約</div>
              </div>
            </div>
          </div>

          {/* 参加メンバー一覧と制約チップ */}
          <div className="bg-slate-950/40 light:bg-slate-50 rounded-2xl p-4 border border-slate-800/80 light:border-slate-200">
            <div className="text-xs font-semibold text-slate-300 light:text-slate-600 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400 light:text-slate-500" />
                参加メンバー一覧 (出演曲数)
              </span>
              <span className="text-[11px] text-slate-500 light:text-slate-400 font-normal">
                🟡 は時間制約あり
              </span>
            </div>
            <div className="space-y-3">
              {groupedMembers.map(([count, names]) => (
                <div key={count} className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap border border-slate-700/50 light:border-slate-300 w-fit shrink-0 flex items-center justify-center min-w-[70px]">
                    {count}曲 参加
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {names.map((name) => {
                      const constraint = constraints.find(c => c.name === name);
                      return (
                        <div
                          key={name}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border transition-all ${
                            constraint
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 light:bg-amber-50 light:border-amber-300 light:text-amber-800'
                              : 'bg-slate-900 border-slate-800 text-slate-300 light:bg-white light:border-slate-200 light:text-slate-600'
                          }`}
                        >
                          <span className="font-medium">{name}</span>
                          {constraint && (
                            <span className="text-[10px] bg-amber-400/20 light:bg-amber-200 text-amber-300 light:text-amber-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                              {constraint.startMinutes ? `${Math.floor(constraint.startMinutes / 60)}:${(constraint.startMinutes % 60).toString().padStart(2, '0')}~` : ''}
                              {constraint.endMinutes ? `~${Math.floor(constraint.endMinutes / 60)}:${(constraint.endMinutes % 60).toString().padStart(2, '0')}` : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
