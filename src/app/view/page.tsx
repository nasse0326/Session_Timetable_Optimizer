"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
  ChevronRight,
  CheckCircle2,
  Printer,
  SlidersHorizontal,
  Sun,
  Moon,
  RotateCcw,
  Check,
  CheckSquare,
  Square,
  FileText
} from 'lucide-react';
import Link from 'next/link';

type ColumnKey = 'number' | 'time' | 'title' | 'members' | 'equipment';

interface ColumnOption {
  key: ColumnKey;
  label: string;
  desc: string;
}

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'number', label: '#', desc: '曲順番号' },
  { key: 'time', label: '時間・区分', desc: '演奏時刻と曲カテゴリ' },
  { key: 'title', label: '曲名 / バンド', desc: '曲名、アーティスト、バンド名' },
  { key: 'members', label: '担当メンバー', desc: 'パート別メンバー一覧' },
  { key: 'equipment', label: '機材・備考', desc: '持込・レンタル・転換情報' },
];

type TimelineItem = 
  | {
      type: 'song';
      id: string;
      originalIndex: number;
      item: SharedScheduleData['schedule'][0];
    }
  | {
      type: 'break';
      id: string;
      breakIndex: number;
      afterOriginalIndex: number;
      startTime: string;
      endTime: string;
    };

function ParticipantViewContent() {
  const [data, setData] = useState<SharedScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // ライト / ダークモード切り替え
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // 表示カラム選択
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    number: true,
    time: true,
    title: true,
    members: true,
    equipment: true,
  });
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // テーマ初期読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('session_timetable_theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
      const savedCols = localStorage.getItem('session_timetable_columns');
      if (savedCols) {
        try {
          const parsed = JSON.parse(savedCols);
          setVisibleColumns(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Failed to parse columns from localStorage', e);
        }
      }
    }
  }, []);

  // テーマ切り替え処理
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('session_timetable_theme', nextTheme);
    }
  };

  // テーマ変更をbodyタグに反映
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('light-theme', theme === 'light');
    }
  }, [theme]);

  // カラム選択トグル
  const handleToggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_timetable_columns', JSON.stringify(next));
      }
      return next;
    });
  };

  // カラムリセット
  const handleResetColumns = () => {
    const defaultCols: Record<ColumnKey, boolean> = {
      number: true,
      time: true,
      title: true,
      members: true,
      equipment: true,
    };
    setVisibleColumns(defaultCols);
    if (typeof window !== 'undefined') {
      localStorage.setItem('session_timetable_columns', JSON.stringify(defaultCols));
    }
  };

  // ポップオーバー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setIsColumnPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // タイムライン全体（曲 + 休憩）の構築
  const fullTimeline = useMemo<TimelineItem[]>(() => {
    if (!data) return [];
    const items: TimelineItem[] = [];
    let breakIndex = 0;

    data.schedule.forEach((item, idx) => {
      items.push({
        type: 'song',
        id: `song-${idx}`,
        originalIndex: idx,
        item
      });

      if (item.isBreakAfter) {
        breakIndex++;
        const nextSong = data.schedule[idx + 1];
        const breakStartTime = item.endTime;
        const breakEndTime = nextSong ? nextSong.startTime : (data.eventEndTime || item.endTime);

        items.push({
          type: 'break',
          id: `break-${idx}`,
          breakIndex,
          afterOriginalIndex: idx,
          startTime: breakStartTime,
          endTime: breakEndTime
        });
      }
    });

    return items;
  }, [data]);

  // フィルタリングされたタイムライン項目（メンバー・検索ワード適用時も休憩は必ず保持）
  const filteredTimeline = useMemo<TimelineItem[]>(() => {
    if (!fullTimeline.length) return [];

    return fullTimeline.filter(tItem => {
      if (tItem.type === 'break') {
        // 休憩は名前ソートや検索時にも必ず保持して表示する
        return true;
      }

      const s = tItem.item.song;
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
  }, [fullTimeline, selectedMember, searchQuery]);

  // 現在表示されている曲数
  const matchingSongsCount = useMemo(() => {
    return filteredTimeline.filter(t => t.type === 'song').length;
  }, [filteredTimeline]);

  // 現在表示されているカラム数（colSpan計算用）
  const visibleColumnCount = useMemo(() => {
    return Object.values(visibleColumns).filter(Boolean).length;
  }, [visibleColumns]);

  const isDark = theme === 'dark';

  const getPartBadgeStyle = (part: string) => {
    const p = part.toLowerCase();
    if (isDark) {
      if (p.includes('vo') || p.includes('ボーカル')) return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
      if (p.includes('gt') || p.includes('ギター')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      if (p.includes('ba') || p.includes('ベース')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      if (p.includes('dr') || p.includes('ドラム')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      if (p.includes('key') || p.includes('キーボード') || p.includes('pf')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      return 'bg-slate-800 text-slate-300 border-slate-700';
    } else {
      if (p.includes('vo') || p.includes('ボーカル')) return 'bg-pink-100 text-pink-700 border-pink-300';
      if (p.includes('gt') || p.includes('ギター')) return 'bg-amber-100 text-amber-800 border-amber-300';
      if (p.includes('ba') || p.includes('ベース')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      if (p.includes('dr') || p.includes('ドラム')) return 'bg-purple-100 text-purple-800 border-purple-300 font-medium';
      if (p.includes('key') || p.includes('キーボード') || p.includes('pf')) return 'bg-blue-100 text-blue-800 border-blue-300';
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getCategoryBadgeStyle = (category: string) => {
    if (isDark) {
      if (category === '課題曲') return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      if (category === 'インスト' || category === 'セッション') return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      return 'bg-slate-800 text-slate-400 border-slate-700';
    } else {
      if (category === '課題曲') return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      if (category === 'インスト' || category === 'セッション') return 'bg-purple-100 text-purple-700 border-purple-300';
      return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>タイムテーブルを読み込み中...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
        <div className={`max-w-md w-full border rounded-3xl p-6 text-center space-y-4 shadow-xl ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>タイムテーブルを表示できません</h2>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-colors shadow-md"
          >
            タイムテーブル作成ツールへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen py-6 px-3 sm:px-6 max-w-5xl mx-auto font-sans transition-colors duration-200 pb-20 ${
      isDark ? 'text-slate-200' : 'text-slate-800'
    }`}>
      {/* 🖨️ 印刷専用ヘッダー（紙面出力時のみ表示） */}
      <div className="hidden print-only mb-6 border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-black tracking-tight">
              {data.title || '軽音セッション タイムテーブル'}
            </h1>
            <p className="text-xs text-slate-700 mt-1">
              全 {data.schedule.length} 曲 ｜ 参加メンバー {allMembers.length} 名
              {data.eventStartTime && data.eventEndTime && (
                <span className="ml-3 font-mono font-bold">
                  時間: {data.eventStartTime} 〜 {data.eventEndTime}
                </span>
              )}
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-600 font-mono">
            出力日: {new Date().toLocaleDateString('ja-JP')}
          </div>
        </div>
      </div>

      {/* トップアクションバー（ライト/ダークモード切替 & 作成ツールリンク） */}
      <div className="no-print flex items-center justify-between gap-3 mb-4">
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs px-3 py-1 rounded-full font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          参加者専用タイムテーブル
        </div>

        <div className="flex items-center gap-2">
          {/* テーマ切り替えスイッチ */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800 hover:border-slate-700' 
                : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200 hover:border-slate-300'
            }`}
            title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>ライト</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>ダーク</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ヘッダー */}
      <header className="no-print text-center space-y-2 mb-6">
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
          isDark 
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300' 
            : 'text-slate-900'
        }`}>
          {data.title || '軽音セッション タイムテーブル'}
        </h1>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          全 {data.schedule.length} 曲 ｜ 参加メンバー {allMembers.length} 名
          {data.eventStartTime && data.eventEndTime && (
            <span className={`block mt-1 font-mono ${isDark ? 'text-indigo-300' : 'text-indigo-700 font-semibold'}`}>
              🕒 イベント時間: {data.eventStartTime} 〜 {data.eventEndTime}
              {data.isExtended && (
                <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-sans">
                  自動延長
                </span>
              )}
            </span>
          )}
        </p>
      </header>

      {/* 上部スポンサー広告バナー */}
      <div className="no-print mb-6">
        <AdInlineBanner variant="compact" />
      </div>

      {/* 🌟 マイ出演曲ハイライト・メンバーセレクター */}
      <section className={`no-print border rounded-3xl p-4 sm:p-5 mb-6 shadow-xl backdrop-blur-md transition-colors ${
        isDark 
          ? 'bg-slate-900/80 border-indigo-500/30' 
          : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Users className="w-4 h-4 text-indigo-500" />
            <span>名前を選択して自分の出演曲をハイライト</span>
          </h2>
          {selectedMember && (
            <button
              onClick={() => setSelectedMember(null)}
              className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors border ${
                isDark 
                  ? 'text-slate-400 hover:text-white bg-slate-800 border-slate-700' 
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200'
              }`}
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
                : isDark
                ? 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
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
                  : isDark
                  ? 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* 選択メンバーのサマリーカード */}
        {selectedMember && selectedMemberSummary && (
          <div className={`mt-4 p-3.5 border rounded-2xl animate-in fade-in duration-200 flex flex-wrap items-center justify-between gap-3 ${
            isDark 
              ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500/40' 
              : 'bg-indigo-50/70 border-indigo-200'
          }`}>
            <div>
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{selectedMember} さんの出演情報</span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                合計 <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-indigo-700'}`}>{selectedMemberSummary.totalSongs}</span> 曲出演 ｜ 担当: {selectedMemberSummary.partsSummary}
              </p>
            </div>
            <div className={`text-[11px] px-3 py-1.5 rounded-xl border ${
              isDark 
                ? 'text-slate-400 bg-slate-900/80 border-slate-800' 
                : 'text-slate-600 bg-white border-slate-200 shadow-sm'
            }`}>
              該当曲 + 休憩時間を表示中
            </div>
          </div>
        )}
      </section>

      {/* 検索・表示切替・カラム選択・印刷ツールバー */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5 mb-4">
        {/* 検索窓 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="曲名、アーティスト、メンバー名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500' 
                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-sm'
            }`}
          />
        </div>

        {/* アクションボタングループ */}
        <div className="flex items-center gap-2 shrink-0">
          {/* カード / 表 表示モード切替 */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'card' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              カード表示
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              表表示
            </button>
          </div>

          {/* 表表示時のカラム選択ドロップダウン */}
          {viewMode === 'table' && (
            <div className="relative" ref={columnPickerRef}>
              <button
                type="button"
                onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
                  isColumnPickerOpen
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="表示するカラムを選択"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>表示列</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isColumnPickerOpen ? 'bg-white/20 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {visibleColumnCount}
                </span>
              </button>

              {isColumnPickerOpen && (
                <div className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/50">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      表示列の選択
                    </span>
                    <button
                      type="button"
                      onClick={handleResetColumns}
                      className={`text-[10px] flex items-center gap-1 hover:underline ${
                        isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      リセット
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {COLUMN_OPTIONS.map(col => {
                      const isChecked = visibleColumns[col.key];
                      return (
                        <label
                          key={col.key}
                          className={`flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? isDark ? 'bg-indigo-950/40 text-slate-100' : 'bg-indigo-50/70 text-slate-900'
                              : isDark ? 'hover:bg-slate-800/60 text-slate-400' : 'hover:bg-slate-50 text-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleColumn(col.key)}
                            className="sr-only"
                          />
                          <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-xs leading-none">{col.label}</div>
                            <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {col.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 🖨️ 印刷ボタン */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            title="タイムテーブルを印刷する"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>印刷</span>
          </button>
        </div>
      </div>

      {/* タイムテーブル一覧 */}
      {viewMode === 'card' ? (
        /* スマホ向けカード表示 */
        <div className="space-y-3">
          {/* 集合・セッティング・オープニング枠 */}
          {!selectedMember && data.eventStartTime && data.openingEndTime && data.eventStartTime !== data.openingEndTime && (
            <div className={`rounded-2xl p-4 border flex items-center justify-between gap-3 shadow-sm ${
              isDark 
                ? 'bg-indigo-950/30 border-indigo-500/30' 
                : 'bg-indigo-50/80 border-indigo-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                  🎪
                </div>
                <div>
                  <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    集合・機材セッティング・オープニング
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>音出し・進行確認・出欠確認</p>
                </div>
              </div>
              <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                isDark 
                  ? 'text-indigo-300 bg-indigo-950/80 border-indigo-500/30' 
                  : 'text-indigo-700 bg-white border-indigo-200 shadow-sm'
              }`}>
                {data.eventStartTime} - {data.openingEndTime}
              </div>
            </div>
          )}

          {filteredTimeline.map((item) => {
            if (item.type === 'break') {
              return (
                <div 
                  key={item.id}
                  className={`p-3.5 border rounded-2xl text-center text-xs font-semibold flex items-center justify-between gap-2 shadow-sm ${
                    isDark 
                      ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>☕ 休憩・インターバル（セット転換＆進行調整）</span>
                  </div>
                  <div className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border shrink-0 ${
                    isDark 
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
                      : 'bg-white border-emerald-300 text-emerald-800 shadow-sm'
                  }`}>
                    {item.startTime} 〜 {item.endTime}
                  </div>
                </div>
              );
            }

            const s = item.item.song;
            const isUserSong = selectedMember && s.members.some(m => m.name === selectedMember);
            const category = s.category || '通常';

            return (
              <div 
                key={item.id}
                className={`rounded-2xl p-4 transition-all border shadow-sm ${
                  isUserSong
                    ? isDark
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10 scale-[1.01]'
                      : 'bg-indigo-50/90 border-indigo-400 shadow-md ring-1 ring-indigo-400/40 scale-[1.01]'
                    : isDark
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* カード上段: 番号・時間・カテゴリ */}
                <div className={`flex items-center justify-between gap-2 mb-2 pb-2 border-b ${
                  isDark ? 'border-slate-800/60' : 'border-slate-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.originalIndex + 1}
                    </span>
                    <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {item.item.startTime} - {item.item.endTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadgeStyle(category)}`}>
                      {category}
                    </span>
                  </div>
                </div>

                {/* カード中段: 曲名・バンド名・原曲アーティスト */}
                <div className="mb-3">
                  <h3 className={`text-sm sm:text-base font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    <Music className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{s.title}</span>
                  </h3>
                  {(s.bandName || s.artist) && (
                    <div className={`text-[11px] mt-1 flex flex-wrap gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {s.bandName && <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>🎸 {s.bandName}</span>}
                      {s.artist && <span>({s.artist})</span>}
                    </div>
                  )}
                </div>

                {/* 機材情報 */}
                {(s.bring || s.rental || (s.requiresLongSetup && !s.bring && !s.rental)) && (
                  <div className="mb-2.5 flex flex-wrap gap-2 text-[11px]">
                    {s.requiresLongSetup && !s.bring && !s.rental && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-[10px]">
                        ⚡ 転換長
                      </span>
                    )}
                    {s.bring && (
                      <span className={`px-2 py-0.5 rounded border ${
                        isDark ? 'text-slate-300 bg-slate-950 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-200'
                      }`}>
                        持込: {s.bring}
                      </span>
                    )}
                    {s.rental && (
                      <span className={`px-2 py-0.5 rounded border ${
                        isDark ? 'text-slate-300 bg-slate-950 border-slate-800' : 'text-slate-700 bg-slate-50 border-slate-200'
                      }`}>
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
                          isHighlighted ? 'ring-2 ring-pink-500 font-bold scale-105' : ''
                        }`}
                      >
                        <span className="font-mono text-[10px] opacity-75">{m.part}</span>
                        <span>{m.name}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 全曲終了・完全撤収枠 */}
          {!selectedMember && data.eventEndTime && (
            <div className={`rounded-2xl p-4 border flex items-center justify-between gap-3 shadow-sm ${
              isDark 
                ? 'bg-purple-950/30 border-purple-500/30' 
                : 'bg-purple-50/80 border-purple-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                  🏁
                </div>
                <div>
                  <h3 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    全曲演奏終了・片付け・写真撮影・完全撤収
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>機材撤収・完全退館</p>
                </div>
              </div>
              <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                isDark 
                  ? 'text-purple-300 bg-purple-950/80 border-purple-500/30' 
                  : 'text-purple-700 bg-white border-purple-200 shadow-sm'
              }`}>
                〜 {data.eventEndTime}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 表表示（印刷時は全行展開） */
        <div className={`print-table border rounded-2xl overflow-hidden max-h-[700px] overflow-y-auto overflow-x-auto shadow-xl relative ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/60'
        }`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-20 border-b font-bold uppercase shadow-md ${
              isDark ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              <tr>
                {visibleColumns.number && (
                  <th className={`sticky left-0 z-30 px-2.5 py-3 w-10 text-center ${
                    isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    #
                  </th>
                )}
                {visibleColumns.time && (
                  <th className={`px-3 py-3 min-w-[105px] ${
                    visibleColumns.number ? 'border-l border-slate-700/50' : ''
                  }`}>
                    時間 / 区分
                  </th>
                )}
                {visibleColumns.title && (
                  <th className="px-3 py-3 min-w-[160px]">曲名 / バンド</th>
                )}
                {visibleColumns.members && (
                  <th className="px-3 py-3 min-w-[200px]">担当メンバー</th>
                )}
                {visibleColumns.equipment && (
                  <th className="px-3 py-3 min-w-[110px]">機材 / 備考</th>
                )}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-slate-950' : 'divide-slate-200 bg-white'}`}>
              {/* オープニング枠 */}
              {!selectedMember && data.eventStartTime && data.openingEndTime && data.eventStartTime !== data.openingEndTime && (
                <tr className={isDark ? 'bg-indigo-950/30 border-b border-indigo-500/30 text-indigo-300' : 'bg-indigo-50/80 border-b border-indigo-200 text-indigo-900'}>
                  {visibleColumns.number && (
                    <td className="sticky left-0 z-10 px-2.5 py-3 text-center font-mono font-bold">
                      -
                    </td>
                  )}
                  {visibleColumns.time && (
                    <td className="px-3 py-3 font-mono whitespace-nowrap font-medium text-[11px]">
                      <div>{data.eventStartTime} - {data.openingEndTime}</div>
                      <div className="mt-0.5">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          準備
                        </span>
                      </div>
                    </td>
                  )}
                  <td colSpan={Math.max(1, visibleColumnCount - (visibleColumns.number ? 1 : 0) - (visibleColumns.time ? 1 : 0))} className="px-3 py-3 font-bold text-xs">
                    🎪 集合・機材セッティング・オープニング（音出し・出欠確認）
                  </td>
                </tr>
              )}

              {filteredTimeline.map((item) => {
                if (item.type === 'break') {
                  return (
                    <tr key={item.id} className={isDark ? 'bg-emerald-950/30 border-y border-emerald-500/30' : 'bg-emerald-50 border-y border-emerald-200'}>
                      {visibleColumns.number && (
                        <td className="sticky left-0 z-10 px-2.5 py-2.5 text-center font-mono text-emerald-400 font-bold">
                          ☕
                        </td>
                      )}
                      {visibleColumns.time && (
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap font-bold text-xs text-emerald-600 dark:text-emerald-300">
                          {item.startTime} - {item.endTime}
                        </td>
                      )}
                      <td 
                        colSpan={Math.max(1, visibleColumnCount - (visibleColumns.number ? 1 : 0) - (visibleColumns.time ? 1 : 0))} 
                        className={`px-3 py-2.5 font-semibold text-xs ${
                          isDark ? 'text-emerald-300' : 'text-emerald-800'
                        }`}
                      >
                        ☕ 休憩・インターバル（セット転換＆進行調整）
                      </td>
                    </tr>
                  );
                }

                const s = item.item.song;
                const isUserSong = selectedMember && s.members.some(m => m.name === selectedMember);
                const category = s.category || '通常';

                return (
                  <tr 
                    key={item.id} 
                    className={`transition-colors group ${
                      isUserSong 
                        ? isDark ? 'bg-indigo-950/40 font-medium' : 'bg-indigo-50/90 font-medium'
                        : isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* 曲番号 (#) */}
                    {visibleColumns.number && (
                      <td className={`sticky left-0 z-10 px-2.5 py-3 text-center font-mono font-bold ${
                        isUserSong 
                          ? isDark ? 'bg-indigo-950/80 text-indigo-200' : 'bg-indigo-100 text-indigo-900'
                          : isDark ? 'bg-slate-950 text-slate-400 group-hover:bg-slate-900' : 'bg-white text-slate-500 group-hover:bg-slate-50'
                      }`}>
                        {item.originalIndex + 1}
                      </td>
                    )}

                    {/* 時間・カテゴリ（統合） */}
                    {visibleColumns.time && (
                      <td className={`px-3 py-3 font-mono whitespace-nowrap font-medium ${
                        isUserSong 
                          ? isDark ? 'text-white' : 'text-indigo-950 font-bold'
                          : isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        <div>{item.item.startTime} - {item.item.endTime}</div>
                        <div className="mt-1">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${getCategoryBadgeStyle(category)}`}>
                            {category}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* 曲名 / バンド */}
                    {visibleColumns.title && (
                      <td className="px-3 py-3 break-words">
                        <div className={`font-bold text-xs flex items-start gap-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          <Music className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{s.title}</span>
                        </div>
                        {(s.bandName || s.artist) && (
                          <div className={`text-[11px] mt-0.5 break-words ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {s.bandName && <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{s.bandName} </span>}
                            {s.artist && <span>({s.artist})</span>}
                          </div>
                        )}
                      </td>
                    )}

                    {/* 担当メンバー */}
                    {visibleColumns.members && (
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.members.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] ${getPartBadgeStyle(m.part)} ${
                                selectedMember === m.name ? 'ring-2 ring-pink-500 font-bold scale-105' : ''
                              }`}
                            >
                              <span className="font-mono text-[9px] opacity-75">{m.part}</span>
                              <span>{m.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* 機材・備考 */}
                    {visibleColumns.equipment && (
                      <td className={`px-3 py-3 text-[11px] break-words ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="space-y-0.5">
                          {s.bring && <div>持込: {s.bring}</div>}
                          {s.rental && <div>レンタル: {s.rental}</div>}
                          {!s.bring && !s.rental && !s.requiresLongSetup && <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>-</span>}
                          {s.requiresLongSetup && !s.bring && !s.rental && (
                            <div>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[9px] font-bold">
                                ⚡ 転換長
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* 全曲終了・完全撤収枠 */}
              {!selectedMember && data.eventEndTime && (
                <tr className={isDark ? 'bg-purple-950/30 border-t border-purple-500/30 text-purple-300' : 'bg-purple-50/80 border-t border-purple-200 text-purple-900'}>
                  {visibleColumns.number && (
                    <td className="sticky left-0 z-10 px-2.5 py-3 text-center font-mono font-bold">
                      -
                    </td>
                  )}
                  {visibleColumns.time && (
                    <td className="px-3 py-3 font-mono whitespace-nowrap font-medium text-[11px]">
                      <div>〜 {data.eventEndTime}</div>
                      <div className="mt-0.5">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          撤収
                        </span>
                      </div>
                    </td>
                  )}
                  <td colSpan={Math.max(1, visibleColumnCount - (visibleColumns.number ? 1 : 0) - (visibleColumns.time ? 1 : 0))} className="px-3 py-3 font-bold text-xs">
                    🏁 全曲演奏終了・片付け・写真撮影・完全撤収
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 下部スポンサー広告バナー */}
      <div className="no-print mt-8">
        <AdInlineBanner variant="standard" />
      </div>

      {/* フッター */}
      <footer className={`no-print mt-12 text-center text-xs space-y-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        <p>Session Timetable Optimizer &copy; {new Date().getFullYear()}</p>
        <Link
          href="/"
          className={`inline-flex items-center gap-1 hover:underline ${
            isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
          }`}
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
