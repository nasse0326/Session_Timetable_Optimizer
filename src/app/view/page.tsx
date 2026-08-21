"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { decodeScheduleFromUrl, SharedScheduleData } from '@/utils/share';
import AdInlineBanner from '@/components/AdInlineBanner';
import { 
  Music, 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  Coffee, 
  Sparkles, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

function ParticipantViewContent() {
  const [data, setData] = useState<SharedScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // URLハッシュまたはパラメータからデータを復元
  useEffect(() => {
    const parseUrlData = () => {
      try {
        if (typeof window === 'undefined') return;

        let compressedStr: string | null = null;

        // 1. ハッシュ(#d=...)を優先チェック
        const hash = window.location.hash;
        if (hash && hash.includes('d=')) {
          const match = hash.match(/[#&]d=([^&]+)/);
          if (match && match[1]) {
            compressedStr = decodeURIComponent(match[1]);
          }
        }

        // 2. クエリパラメータ(?d=...)もチェック
        if (!compressedStr && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const dParam = params.get('d');
          if (dParam) {
            compressedStr = dParam;
          }
        }

        if (!compressedStr) {
          setError('有効なタイムテーブルデータが見つかりませんでした。');
          setLoading(false);
          return;
        }

        const decoded = decodeScheduleFromUrl(compressedStr);
        if (!decoded || !decoded.schedule || decoded.schedule.length === 0) {
          setError('データの復元に失敗しました。URLが途中で切れている可能性があります。');
          setLoading(false);
          return;
        }

        setData(decoded);
        setLoading(false);
      } catch (err) {
        console.error('Error parsing view data', err);
        setError('データの読み込み中にエラーが発生しました。');
        setLoading(false);
      }
    };

    parseUrlData();
    window.addEventListener('hashchange', parseUrlData);
    return () => window.removeEventListener('hashchange', parseUrlData);
  }, []);

  // 全参加メンバー一覧（重複なし・五十音順ソート）
  const allMembers = useMemo(() => {
    if (!data) return [];
    const memberSet = new Set<string>();
    data.schedule.forEach(item => {
      item.song.members.forEach(m => {
        if (m.name && m.name.trim()) memberSet.add(m.name.trim());
      });
    });
    return Array.from(memberSet).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [data]);

  // 選択されたメンバーの出演サマリー計算
  const selectedMemberSummary = useMemo(() => {
    if (!data || !selectedMember) return null;

    const songs: { songTitle: string; part: string; time: string; index: number }[] = [];
    data.schedule.forEach((item, idx) => {
      const matchMember = item.song.members.find(m => m.name === selectedMember);
      if (matchMember) {
        songs.push({
          songTitle: item.song.title,
          part: matchMember.part,
          time: `${item.startTime}〜${item.endTime}`,
          index: idx + 1
        });
      }
    });

    const partCounts = new Map<string, number>();
    songs.forEach(s => {
      partCounts.set(s.part, (partCounts.get(s.part) || 0) + 1);
    });

    const partsSummary = Array.from(partCounts.entries())
      .map(([part, count]) => `${part} (${count}曲)`)
      .join(' / ');

    return {
      totalSongs: songs.length,
      partsSummary,
      songs
    };
  }, [data, selectedMember]);

  // フィルタリングされた曲一覧
  const filteredSchedule = useMemo(() => {
    if (!data) return [];
    return data.schedule.filter(item => {
      const s = item.song;
      // メンバー絞り込み
      if (selectedMember) {
        const isMemberInSong = s.members.some(m => m.name === selectedMember);
        if (!isMemberInSong) return false;
      }
      // 検索ワード絞り込み
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = s.title.toLowerCase().includes(q);
        const artistMatch = s.artist?.toLowerCase().includes(q) ?? false;
        const bandMatch = s.bandName?.toLowerCase().includes(q) ?? false;
        const memberMatch = s.members.some(m => m.name.toLowerCase().includes(q) || m.part.toLowerCase().includes(q));
        if (!titleMatch && !artistMatch && !bandMatch && !memberMatch) return false;
      }
      return true;
    });
  }, [data, selectedMember, searchQuery]);

  const getPartBadgeStyle = (part: string) => {
    const p = part.toLowerCase();
    if (p.includes('vo') || p.includes('ボーカル')) return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
    if (p.includes('gt') || p.includes('ギター')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (p.includes('ba') || p.includes('ベース')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (p.includes('dr') || p.includes('ドラム')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (p.includes('key') || p.includes('キーボード') || p.includes('pf')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">タイムテーブルを読み込み中...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans text-slate-200">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">タイムテーブルを表示できません</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-colors"
          >
            タイムテーブル作成ツールへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-6 px-3 sm:px-6 max-w-4xl mx-auto font-sans text-slate-200 pb-20">
      {/* ヘッダー */}
      <header className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs px-3 py-1 rounded-full font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          参加者専用タイムテーブル
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 tracking-tight">
          {data.title || '軽音セッション タイムテーブル'}
        </h1>
        <p className="text-xs text-slate-400">
          全 {data.schedule.length} 曲 ｜ 参加メンバー {allMembers.length} 名
        </p>
      </header>

      {/* 上部スポンサー広告バナー */}
      <div className="mb-6">
        <AdInlineBanner variant="compact" />
      </div>

      {/* 🌟 マイ出演曲ハイライト・メンバーセレクター */}
      <section className="bg-slate-900/80 border border-indigo-500/30 rounded-3xl p-4 sm:p-5 mb-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>名前を選択して自分の出演曲をハイライト</span>
          </h2>
          {selectedMember && (
            <button
              onClick={() => setSelectedMember(null)}
              className="text-[11px] text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg transition-colors"
            >
              選択解除
            </button>
          )}
        </div>

        {/* メンバーピル一覧 */}
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
          <button
            onClick={() => setSelectedMember(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedMember === null
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            全員（{data.schedule.length}曲）
          </button>
          {allMembers.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMember(selectedMember === m ? null : m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedMember === m
                  ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md font-bold scale-105'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* 選択メンバーのサマリーカード */}
        {selectedMember && selectedMemberSummary && (
          <div className="mt-4 p-3.5 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 rounded-2xl animate-in fade-in duration-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{selectedMember} さんの出演情報</span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">
                合計 <span className="font-bold text-white text-sm">{selectedMemberSummary.totalSongs}</span> 曲出演 ｜ 担当: {selectedMemberSummary.partsSummary}
              </p>
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              該当曲のみ表示中（全{filteredSchedule.length}曲）
            </div>
          </div>
        )}
      </section>

      {/* 検索・表示切替バー */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="曲名、アーティスト、メンバー名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            カード表示
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            表表示
          </button>
        </div>
      </div>

      {/* タイムテーブル一覧 */}
      {viewMode === 'card' ? (
        /* スマホ向けカード表示 */
        <div className="space-y-3">
          {filteredSchedule.map((item, idx) => {
            const s = item.song;
            const isUserSong = selectedMember && s.members.some(m => m.name === selectedMember);
            const category = s.category || '通常';

            return (
              <React.Fragment key={idx}>
                <div className={`rounded-2xl p-4 transition-all border ${
                  isUserSong
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10 scale-[1.01]'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}>
                  {/* カード上段: 番号・時間・カテゴリ */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                        {data.schedule.indexOf(item) + 1}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-100">
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        category === '課題曲'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : category === 'インスト' || category === 'セッション'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {category}
                      </span>
                    </div>
                  </div>

                  {/* カード中段: 曲名・バンド名・原曲アーティスト */}
                  <div className="mb-3">
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{s.title}</span>
                    </h3>
                    {(s.bandName || s.artist) && (
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-2">
                        {s.bandName && <span className="text-slate-300 font-medium">🎸 {s.bandName}</span>}
                        {s.artist && <span className="text-slate-400">({s.artist})</span>}
                      </div>
                    )}
                  </div>

                  {/* 機材情報 */}
                  {(s.bring || s.rental || s.requiresLongSetup) && (
                    <div className="mb-2.5 flex flex-wrap gap-2 text-[11px]">
                      {s.requiresLongSetup && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                          ⚡ 転換長
                        </span>
                      )}
                      {s.bring && (
                        <span className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          持込: {s.bring}
                        </span>
                      )}
                      {s.rental && (
                        <span className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          レンタル: {s.rental}
                        </span>
                      )}
                    </div>
                  )}

                  {/* メンバー一覧 */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {s.members.map((m, mIdx) => {
                      const isHighlighted = selectedMember === m.name;
                      return (
                        <span
                          key={mIdx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs transition-all ${getPartBadgeStyle(m.part)} ${
                            isHighlighted ? 'ring-2 ring-pink-400 font-bold scale-105' : ''
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-70">{m.part}</span>
                          <span>{m.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 休憩・インターバル */}
                {item.isBreakAfter && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-center text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                    <Coffee className="w-4 h-4 text-emerald-400" />
                    <span>☕ 休憩・インターバル（セット転換＆進行調整）</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        /* 表表示 */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase">
              <tr>
                <th className="px-3 py-3 w-8 text-center text-slate-500">#</th>
                <th className="px-3 py-3 min-w-[85px]">時間</th>
                <th className="px-3 py-3 min-w-[75px]">カテゴリ</th>
                <th className="px-3 py-3 min-w-[130px]">曲名 / バンド</th>
                <th className="px-3 py-3 min-w-[180px]">担当メンバー</th>
                <th className="px-3 py-3 min-w-[90px]">機材</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSchedule.map((item, idx) => {
                const s = item.song;
                const isUserSong = selectedMember && s.members.some(m => m.name === selectedMember);
                const category = s.category || '通常';

                return (
                  <React.Fragment key={idx}>
                    <tr className={`transition-colors ${isUserSong ? 'bg-indigo-950/40 font-medium' : 'hover:bg-slate-900/40'}`}>
                      <td className="px-3 py-3 text-center text-slate-500 font-mono">
                        {data.schedule.indexOf(item) + 1}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-200 whitespace-nowrap font-medium">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          category === '課題曲'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : category === 'インスト' || category === 'セッション'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-100 text-xs">{s.title}</div>
                        {(s.bandName || s.artist) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {s.bandName && <span>{s.bandName} </span>}
                            {s.artist && <span>({s.artist})</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.members.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] ${getPartBadgeStyle(m.part)} ${
                                selectedMember === m.name ? 'ring-1 ring-pink-400 font-bold' : ''
                              }`}
                            >
                              <span className="font-mono text-[9px] opacity-70">{m.part}</span>
                              <span>{m.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-300">
                        {s.bring ? `持込: ${s.bring}` : s.rental ? `レンタル: ${s.rental}` : '-'}
                      </td>
                    </tr>
                    {item.isBreakAfter && (
                      <tr className="bg-emerald-950/20 border-y border-emerald-500/25">
                        <td colSpan={6} className="px-3 py-2 text-center text-emerald-300 font-semibold text-xs">
                          ☕ 休憩・インターバル（セット転換＆進行調整）
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

      {/* 下部スポンサー広告バナー */}
      <div className="mt-8">
        <AdInlineBanner variant="standard" />
      </div>

      {/* フッター */}
      <footer className="mt-12 text-center text-xs text-slate-500 space-y-2">
        <p>Session Timetable Optimizer &copy; {new Date().getFullYear()}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          タイムテーブル作成ツールで新しく作成する
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </main>
  );
}

export default function ParticipantViewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">タイムテーブルを読み込み中...</p>
        </div>
      </main>
    }>
      <ParticipantViewContent />
    </Suspense>
  );
}
