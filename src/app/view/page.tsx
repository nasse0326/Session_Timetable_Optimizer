"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { decodeScheduleFromUrl, SharedScheduleData } from '@/utils/share';
import AdInlineBanner from '@/components/AdInlineBanner';
import ReceptionManagementModal from '@/components/ReceptionManagementModal';
import { 
  PricingTier, 
  PaymentConfig, 
  ParticipantCheckInRecord 
} from '@/types';
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
  FileText,
  Radio,
  ClipboardCheck,
  Wine,
  Guitar,
  ArrowDownCircle,
  QrCode
} from 'lucide-react';
import Link from 'next/link';

type ColumnKey = 'number' | 'time' | 'title' | 'members' | 'equipment';

interface ColumnOption {
  key: ColumnKey;
  label: string;
  desc: string;
}

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'number', label: '曲番号 (#)', desc: '曲の演奏順番号' },
  { key: 'time', label: '時間・区分', desc: '演奏時刻と曲カテゴリ' },
  { key: 'title', label: '曲名 / バンド', desc: '楽曲名・アーティスト・バンド名' },
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

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const DEFAULT_PRICING_CONFIG: PaymentConfig = {
  pricingTiers: [
    { id: '1', minSongs: 1, maxSongs: 2, price: 2000, label: '1〜2曲' },
    { id: '2', minSongs: 3, maxSongs: 4, price: 2500, label: '3〜4曲' },
    { id: '3', minSongs: 5, maxSongs: 999, price: 3000, label: '5曲以上' },
  ],
  rentalDailyFee: 500,
  partyFee: 3500
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

  // 現在時刻 (分 & フォーマット文字列)
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const [nowFormatted, setNowFormatted] = useState<string>(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);

  // 受付・集金管理モーダル状態 & データ永続化
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<PaymentConfig>(DEFAULT_PRICING_CONFIG);
  const [records, setRecords] = useState<Record<string, ParticipantCheckInRecord>>({});

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

  // 定期タイマーで現在時刻を更新 (5秒ごと)
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const mins = d.getHours() * 60 + d.getMinutes();
      setNowMinutes(mins);
      setNowFormatted(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  // イベント固有のストレージキー
  const eventStorageKey = useMemo(() => {
    if (!data) return 'session_reception_default';
    return `session_reception_${data.title || 'event'}_${data.schedule.length}_${data.eventStartTime || ''}`;
  }, [data]);

  // 受付・支払いデータの復元
  useEffect(() => {
    if (typeof window !== 'undefined' && eventStorageKey) {
      const savedConfig = localStorage.getItem(`${eventStorageKey}_pricing`);
      if (savedConfig) {
        try {
          setPricingConfig(JSON.parse(savedConfig));
        } catch (e) {
          console.error('Failed to parse pricing from localStorage', e);
        }
      }
      const savedRecords = localStorage.getItem(`${eventStorageKey}_records`);
      if (savedRecords) {
        try {
          setRecords(JSON.parse(savedRecords));
        } catch (e) {
          console.error('Failed to parse records from localStorage', e);
        }
      }
    }
  }, [eventStorageKey]);

  const handlePricingConfigChange = (newConfig: PaymentConfig) => {
    setPricingConfig(newConfig);
    if (typeof window !== 'undefined' && eventStorageKey) {
      localStorage.setItem(`${eventStorageKey}_pricing`, JSON.stringify(newConfig));
    }
  };

  const handleRecordsChange = (newRecords: Record<string, ParticipantCheckInRecord>) => {
    setRecords(newRecords);
    if (typeof window !== 'undefined' && eventStorageKey) {
      localStorage.setItem(`${eventStorageKey}_records`, JSON.stringify(newRecords));
    }
  };

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

  // 現在の進行ステータス判定（現在時刻に連動）
  const currentProgress = useMemo(() => {
    if (!data || data.schedule.length === 0) return null;

    const eventStart = data.eventStartTime ? parseTimeToMinutes(data.eventStartTime) : parseTimeToMinutes(data.schedule[0].startTime);
    const openingEnd = data.openingEndTime ? parseTimeToMinutes(data.openingEndTime) : eventStart;
    const songsEnd = data.schedule.length > 0 ? parseTimeToMinutes(data.schedule[data.schedule.length - 1].endTime) : openingEnd;
    const eventEnd = data.eventEndTime ? parseTimeToMinutes(data.eventEndTime) : (songsEnd + 15);

    // 開場前
    if (nowMinutes < eventStart) {
      const remaining = eventStart - nowMinutes;
      return {
        status: 'before' as const,
        label: '開場前・準備中',
        detail: `開始まであと ${remaining} 分 (${data.eventStartTime || data.schedule[0].startTime} 予定)`,
        activeTimelineId: null,
        activeOriginalIndex: -1
      };
    }

    // オープニング中
    if (data.eventStartTime && data.openingEndTime && nowMinutes >= eventStart && nowMinutes < openingEnd) {
      const remaining = openingEnd - nowMinutes;
      return {
        status: 'opening' as const,
        label: '🎪 集合・機材セッティング中',
        detail: `1曲目開始まであと ${remaining} 分 (〜${data.openingEndTime})`,
        activeTimelineId: 'opening',
        activeOriginalIndex: -1
      };
    }

    // 各曲または休憩の判定
    for (let idx = 0; idx < fullTimeline.length; idx++) {
      const tItem = fullTimeline[idx];
      if (tItem.type === 'song') {
        const sStart = parseTimeToMinutes(tItem.item.startTime);
        const sEnd = parseTimeToMinutes(tItem.item.endTime);
        if (nowMinutes >= sStart && nowMinutes < sEnd) {
          const remaining = sEnd - nowMinutes;
          return {
            status: 'playing' as const,
            label: `🔴 現在演奏中: #${tItem.originalIndex + 1} ${tItem.item.song.title}`,
            detail: `残り約 ${remaining} 分 (〜${tItem.item.endTime})`,
            activeTimelineId: tItem.id,
            activeOriginalIndex: tItem.originalIndex
          };
        }
      } else if (tItem.type === 'break') {
        const bStart = parseTimeToMinutes(tItem.startTime);
        const bEnd = parseTimeToMinutes(tItem.endTime);
        if (nowMinutes >= bStart && nowMinutes < bEnd) {
          const remaining = bEnd - nowMinutes;
          return {
            status: 'break' as const,
            label: '☕ 休憩・セット転換中',
            detail: `次曲まであと約 ${remaining} 分 (〜${tItem.endTime})`,
            activeTimelineId: tItem.id,
            activeOriginalIndex: -1
          };
        }
      }
    }

    // 撤収中
    if (nowMinutes >= songsEnd && nowMinutes < eventEnd) {
      const remaining = eventEnd - nowMinutes;
      return {
        status: 'closing' as const,
        label: '🏁 全曲演奏終了・片付け・完全撤収中',
        detail: `完全撤収まであと ${remaining} 分 (〜${data.eventEndTime})`,
        activeTimelineId: 'closing',
        activeOriginalIndex: -1
      };
    }

    // イベント終了後
    if (nowMinutes >= eventEnd) {
      return {
        status: 'finished' as const,
        label: '✨ 本日の全セッション終了',
        detail: 'お疲れ様でした！',
        activeTimelineId: null,
        activeOriginalIndex: -1
      };
    }

    return null;
  }, [data, fullTimeline, nowMinutes]);

  // 現在演奏中の要素へスクロール
  const scrollToActiveSong = () => {
    if (!currentProgress?.activeTimelineId) return;
    const el = document.getElementById(`timeline-${currentProgress.activeTimelineId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 自動追従が有効な場合、曲進行時に自動スクロール
  useEffect(() => {
    if (isAutoScroll && currentProgress?.activeTimelineId) {
      scrollToActiveSong();
    }
  }, [currentProgress?.activeTimelineId, isAutoScroll]);

  // 選択されたメンバーの出演サマリー計算
  const selectedMemberSummary = useMemo(() => {
    if (!data || !selectedMember) return null;

    const songs: { songTitle: string; part: string; time: string; index: number; hasRental: boolean }[] = [];
    data.schedule.forEach((item, idx) => {
      const matchMember = item.song.members.find(m => m.name === selectedMember);
      if (matchMember) {
        songs.push({
          songTitle: item.song.title,
          part: matchMember.part,
          time: `${item.startTime}〜${item.endTime}`,
          index: idx + 1,
          hasRental: Boolean(item.song.rental && item.song.rental !== 'なし' && item.song.rental !== '-')
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

    const hasRental = songs.some(s => s.hasRental);
    const rec = records[selectedMember];

    return {
      totalSongs: songs.length,
      partsSummary,
      songs,
      hasRental,
      record: rec
    };
  }, [data, selectedMember, records]);

  // フィルタリングされたタイムライン項目
  const filteredTimeline = useMemo<TimelineItem[]>(() => {
    if (!fullTimeline.length) return [];

    return fullTimeline.filter(tItem => {
      if (tItem.type === 'break') {
        return true;
      }

      const s = tItem.item.song;
      if (selectedMember) {
        const isMemberInSong = s.members.some(m => m.name === selectedMember);
        if (!isMemberInSong) return false;
      }
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

  // 現在表示されているカラム数
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

  // 参加者セルフチェックイン処理
  const handleSelfCheckIn = (memberName: string) => {
    const current = records[memberName] || {
      memberName,
      checkedIn: false,
      paid: false,
      partyJoined: false,
      hasRental: false,
      songCount: selectedMemberSummary?.totalSongs || 1,
      calculatedFee: 2000
    };
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const updated = {
      ...current,
      checkedIn: true,
      checkInTime: timeStr
    };
    handleRecordsChange({ ...records, [memberName]: updated });
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

  // タイムテーブル（表）のレンダリング関数
  const renderTableView = (isPrintTableOnly = false) => {
    return (
      <div className={`print-table border rounded-2xl overflow-hidden shadow-xl relative ${
        isPrintTableOnly ? 'hidden print:block' : 'max-h-[700px] overflow-y-auto overflow-x-auto'
      } ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/60'
      }`}>
        <table className="w-full text-left text-xs border-collapse">
          <thead className={`border-b font-bold uppercase shadow-md ${
            isPrintTableOnly ? '' : 'sticky top-0 z-20'
          } ${
            isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
          }`}>
            <tr>
              {visibleColumns.number && (
                <th className={`px-2.5 py-3 w-10 text-center ${
                  !isPrintTableOnly && 'sticky left-0 z-30'
                } ${
                  isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-600'
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
              <tr 
                id="timeline-opening"
                className={`print-opening-row transition-all ${
                  currentProgress?.activeTimelineId === 'opening' ? 'ring-2 ring-indigo-500 font-bold scale-[1.005]' : ''
                } ${
                  isDark ? 'bg-indigo-950/30 border-b border-indigo-500/30 text-indigo-300' : 'bg-indigo-50/80 border-b border-indigo-200 text-indigo-900'
                }`}
              >
                {visibleColumns.number && (
                  <td className={`px-2.5 py-3 text-center font-mono font-bold ${!isPrintTableOnly && 'sticky left-0 z-10'}`}>
                    -
                  </td>
                )}
                {visibleColumns.time && (
                  <td className="px-3 py-3 font-mono whitespace-nowrap font-medium text-[11px]">
                    <div>{data.eventStartTime} - {data.openingEndTime}</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        準備
                      </span>
                      {currentProgress?.activeTimelineId === 'opening' && (
                        <span className="inline-flex items-center text-[9px] text-pink-400 font-bold animate-pulse">
                          🔴 今ここ
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td colSpan={Math.max(1, visibleColumnCount - (visibleColumns.number ? 1 : 0) - (visibleColumns.time ? 1 : 0))} className="px-3 py-3 font-bold text-xs">
                  🎪 集合・機材セッティング・オープニング（音出し・出欠確認）
                </td>
              </tr>
            )}

            {filteredTimeline.map((item) => {
              const isItemActive = currentProgress?.activeTimelineId === item.id;

              if (item.type === 'break') {
                return (
                  <tr 
                    key={item.id} 
                    id={`timeline-${item.id}`}
                    className={`print-break-row transition-all ${
                      isItemActive ? 'ring-2 ring-emerald-500 font-bold' : ''
                    } ${
                      isDark ? 'bg-emerald-950/30 border-y border-emerald-500/30' : 'bg-emerald-50 border-y border-emerald-200'
                    }`}
                  >
                    {visibleColumns.number && (
                      <td className={`px-2.5 py-2.5 text-center font-mono text-emerald-500 dark:text-emerald-400 font-bold ${!isPrintTableOnly && 'sticky left-0 z-10'}`}>
                        ☕
                      </td>
                    )}
                    {visibleColumns.time && (
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap font-bold text-xs text-emerald-700 dark:text-emerald-300">
                        <div>{item.startTime} - {item.endTime}</div>
                        {isItemActive && (
                          <div className="mt-0.5 text-[9px] text-pink-400 font-bold animate-pulse">
                            🔴 休憩中
                          </div>
                        )}
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
                  id={`timeline-${item.id}`}
                  className={`transition-colors group ${
                    isItemActive
                      ? isDark ? 'bg-indigo-950/80 font-semibold ring-2 ring-pink-500/80' : 'bg-pink-50 font-semibold ring-2 ring-pink-500'
                      : isUserSong 
                      ? isDark ? 'bg-indigo-950/40 font-medium' : 'bg-indigo-50/90 font-medium'
                      : isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* 曲番号 (#) */}
                  {visibleColumns.number && (
                    <td className={`px-2.5 py-3 text-center font-mono font-bold ${!isPrintTableOnly && 'sticky left-0 z-10'} ${
                      isItemActive
                        ? 'bg-pink-600 text-white'
                        : isUserSong 
                        ? isDark ? 'bg-indigo-950/80 text-indigo-200' : 'bg-indigo-100 text-indigo-900'
                        : isDark ? 'bg-slate-950 text-slate-400 group-hover:bg-slate-900' : 'bg-white text-slate-500 group-hover:bg-slate-50'
                    }`}>
                      {item.originalIndex + 1}
                    </td>
                  )}

                  {/* 時間・カテゴリ（統合） */}
                  {visibleColumns.time && (
                    <td className={`px-3 py-3 font-mono whitespace-nowrap font-medium ${
                      isItemActive
                        ? isDark ? 'text-pink-300 font-bold' : 'text-pink-700 font-bold'
                        : isUserSong 
                        ? isDark ? 'text-white' : 'text-indigo-950 font-bold'
                        : isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      <div>{item.item.startTime} - {item.item.endTime}</div>
                      <div className="mt-1 flex items-center gap-1">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${getCategoryBadgeStyle(category)}`}>
                          {category}
                        </span>
                        {isItemActive && (
                          <span className="inline-flex items-center text-[9px] bg-pink-500/20 text-pink-400 border border-pink-500/40 px-1 py-0.2 rounded font-bold animate-pulse">
                            🔴 演奏中
                          </span>
                        )}
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
              <tr 
                id="timeline-closing"
                className={`print-closing-row transition-all ${
                  currentProgress?.activeTimelineId === 'closing' ? 'ring-2 ring-purple-500 font-bold' : ''
                } ${
                  isDark ? 'bg-purple-950/30 border-t border-purple-500/30 text-purple-300' : 'bg-purple-50/80 border-t border-purple-200 text-purple-900'
                }`}
              >
                {visibleColumns.number && (
                  <td className={`px-2.5 py-3 text-center font-mono font-bold ${!isPrintTableOnly && 'sticky left-0 z-10'}`}>
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
    );
  };

  return (
    <main className={`min-h-screen py-6 px-3 sm:px-6 max-w-5xl mx-auto font-sans transition-colors duration-200 pb-20 ${
      isDark ? 'text-slate-200' : 'text-slate-800'
    }`}>
      {/* 🖨️ 印刷専用ヘッダー（紙面出力時のみ確実に表示） */}
      <div className="hidden print:block print-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-black tracking-tight">
              {data.title || '軽音セッション タイムテーブル'}
            </h1>
            <div className="text-xs text-slate-700 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
              <span>全 {data.schedule.length} 曲</span>
              <span>参加メンバー {allMembers.length} 名</span>
              {data.eventStartTime && data.eventEndTime && (
                <span className="font-mono font-bold text-black">
                  時間: {data.eventStartTime} 〜 {data.eventEndTime}
                </span>
              )}
              {selectedMember && (
                <span className="text-indigo-900 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  👤 {selectedMember} さんの出演曲（{selectedMemberSummary?.totalSongs || 0}曲）
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-600 font-mono">
            出力日: {new Date().toLocaleDateString('ja-JP')}
          </div>
        </div>
      </div>

      {/* トップアクションバー（ライト/ダークモード切替 & 受付管理ボタン） */}
      <div className="no-print flex items-center justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs px-3 py-1 rounded-full font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          参加者専用タイムテーブル
        </div>

        <div className="flex items-center gap-2">
          {/* 受付・集金管理ボタン */}
          <button
            type="button"
            onClick={() => setIsReceptionModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isDark 
                ? 'bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>受付・集金管理</span>
          </button>

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

      {/* 🔴 固定 / 追従型 現在時刻・リアルタイムステータスバー */}
      {currentProgress && (
        <div className={`no-print sticky top-2 z-40 mb-5 p-3 rounded-2xl border backdrop-blur-md shadow-xl flex items-center justify-between gap-3 flex-wrap transition-all ${
          isDark 
            ? 'bg-slate-900/90 border-indigo-500/40 text-slate-100 shadow-indigo-950/50' 
            : 'bg-white/95 border-indigo-200 text-slate-900 shadow-indigo-100'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  現在 {nowFormatted}
                </span>
                <span className="text-xs font-bold truncate">
                  {currentProgress.label}
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentProgress.detail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 現在地にジャンプボタン */}
            {currentProgress.activeTimelineId && (
              <button
                type="button"
                onClick={scrollToActiveSong}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-md active:scale-95 transition-all"
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>今ここへ移動</span>
              </button>
            )}

            {/* 自動追従トグル */}
            <button
              type="button"
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isAutoScroll
                  ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 font-bold'
                  : isDark ? 'text-slate-400 border-slate-800 bg-slate-950' : 'text-slate-500 border-slate-200 bg-slate-50'
              }`}
              title="演奏曲の時間に合わせて自動的にスクロール追従します"
            >
              自動追従: {isAutoScroll ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* 画面用ヘッダー */}
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
            <span>名前を選択して自分の出演曲・受付チケットを確認</span>
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

        {/* 選択メンバーのチケット・出演サマリーカード */}
        {selectedMember && selectedMemberSummary && (
          <div className={`mt-4 p-4 sm:p-5 border rounded-2xl animate-in fade-in duration-200 space-y-4 ${
            isDark 
              ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500/40' 
              : 'bg-indigo-50/80 border-indigo-200'
          }`}>
            {/* ヘッダー情報 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-indigo-200' : 'text-indigo-950'}`}>
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  <span>{selectedMember} さんの受付・入場チケット</span>
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  出演: <strong className="text-white bg-indigo-600 px-2 py-0.5 rounded font-mono font-bold">{selectedMemberSummary.totalSongs}曲</strong> ｜ 担当パート: {selectedMemberSummary.partsSummary}
                </p>
              </div>

              {/* 入場状態バッジ */}
              <div>
                {selectedMemberSummary.record?.checkedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>🎉 入場完了 ({selectedMemberSummary.record.checkInTime || '済'})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>未チェックイン</span>
                  </span>
                )}
              </div>
            </div>

            {/* 2ステップ受付手続きパネル */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* STEP 1: お支払い */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                selectedMemberSummary.record?.paid
                  ? isDark ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
                  : isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      STEP 1: 参加費のお支払い
                    </span>
                    {selectedMemberSummary.record?.paid ? (
                      <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> 支払済
                      </span>
                    ) : (
                      <span className="text-rose-400 text-xs font-bold">未払い</span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold font-mono text-indigo-400">
                      ¥{(selectedMemberSummary.record?.calculatedFee || 2000).toLocaleString()}
                    </span>
                    <div className="flex gap-1">
                      {selectedMemberSummary.hasRental && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                          レンタル加算込
                        </span>
                      )}
                      {selectedMemberSummary.record?.partyJoined && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold">
                          懇親会込
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className={`text-[11px] ${
                  selectedMemberSummary.record?.paid ? 'text-emerald-400' : isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {selectedMemberSummary.record?.paid 
                    ? '✓ 受付にて参加費の受取が完了しています' 
                    : '※ 受付カウンターにてスタッフへお支払いください'}
                </p>
              </div>

              {/* STEP 2: QRチェックイン */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                selectedMemberSummary.record?.checkedIn
                  ? isDark ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
                  : isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      STEP 2: 入場チェックイン
                    </span>
                    {selectedMemberSummary.record?.checkedIn && (
                      <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> 入場済
                      </span>
                    )}
                  </div>

                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {selectedMemberSummary.record?.checkedIn
                      ? `✓ 入場チェックインが完了しました (${selectedMemberSummary.record.checkInTime})`
                      : selectedMemberSummary.record?.paid
                      ? 'お支払いを確認しました！下のボタンを押して入場完了にしてください。'
                      : 'お支払い後、受付のQRコード読み取りまたは下のボタンでチェックインします。'}
                  </p>
                </div>

                {!selectedMemberSummary.record?.checkedIn && (
                  <button
                    type="button"
                    onClick={() => handleSelfCheckIn(selectedMember)}
                    className={`w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
                      selectedMemberSummary.record?.paid
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>
                      {selectedMemberSummary.record?.paid 
                        ? '支払い確認済・入場チェックインする' 
                        : '支払いを済ませてチェックインする'}
                    </span>
                  </button>
                )}
              </div>
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

          {/* カラム選択ドロップダウン */}
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

      {/* タイムテーブル表示 */}
      {viewMode === 'card' ? (
        <>
          {/* 画面用: スマホ向けカード表示 */}
          <div className="no-print space-y-3">
            {/* 集合・セッティング・オープニング枠 */}
            {!selectedMember && data.eventStartTime && data.openingEndTime && data.eventStartTime !== data.openingEndTime && (
              <div 
                id="timeline-opening"
                className={`rounded-2xl p-3 sm:p-3.5 border flex items-center justify-between gap-3 shadow-sm transition-all ${
                  currentProgress?.activeTimelineId === 'opening' ? 'ring-2 ring-indigo-500 shadow-lg font-bold' : ''
                } ${
                  isDark 
                    ? 'bg-indigo-950/30 border-indigo-500/30' 
                    : 'bg-indigo-50/80 border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  }`}>
                    🎪
                  </span>
                  <span className={`font-mono text-xs font-bold shrink-0 ${
                    isDark ? 'text-indigo-200' : 'text-indigo-950'
                  }`}>
                    {data.eventStartTime} - {data.openingEndTime}
                  </span>
                  <span className={`text-xs font-medium truncate hidden sm:inline ${
                    isDark ? 'text-indigo-300/80' : 'text-indigo-700'
                  }`}>
                    集合・機材セッティング・オープニング
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  }`}>
                    準備
                  </span>
                  {currentProgress?.activeTimelineId === 'opening' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/40 animate-pulse">
                      🔴 今ここ
                    </span>
                  )}
                </div>
              </div>
            )}

            {filteredTimeline.map((item) => {
              const isItemActive = currentProgress?.activeTimelineId === item.id;

              if (item.type === 'break') {
                return (
                  <div 
                    key={item.id}
                    id={`timeline-${item.id}`}
                    className={`p-3 sm:p-3.5 border rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-sm transition-all ${
                      isItemActive ? 'ring-2 ring-emerald-500 shadow-md font-bold' : ''
                    } ${
                      isDark 
                        ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                        isDark ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        ☕
                      </span>
                      <span className={`font-mono text-xs font-bold shrink-0 ${
                        isDark ? 'text-emerald-200' : 'text-emerald-950'
                      }`}>
                        {item.startTime} - {item.endTime}
                      </span>
                      <span className={`text-xs font-medium truncate hidden sm:inline ${
                        isDark ? 'text-emerald-300/80' : 'text-emerald-700'
                      }`}>
                        休憩・インターバル（セット転換＆進行調整）
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      }`}>
                        休憩
                      </span>
                      {isItemActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/40 animate-pulse">
                          🔴 休憩中
                        </span>
                      )}
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
                  id={`timeline-${item.id}`}
                  className={`rounded-2xl p-4 transition-all border shadow-sm ${
                    isItemActive
                      ? isDark
                        ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-pink-500/80 ring-2 ring-pink-500 shadow-xl shadow-pink-500/10 scale-[1.01]'
                        : 'bg-pink-50/90 border-pink-400 ring-2 ring-pink-500 shadow-lg scale-[1.01]'
                      : isUserSong
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
                        isItemActive
                          ? 'bg-pink-600 text-white shadow-md'
                          : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.originalIndex + 1}
                      </span>
                      <span className={`text-xs font-mono font-bold ${
                        isItemActive 
                          ? isDark ? 'text-pink-300' : 'text-pink-700'
                          : isDark ? 'text-slate-100' : 'text-slate-900'
                      }`}>
                        {item.item.startTime} - {item.item.endTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isItemActive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/40 animate-pulse">
                          🔴 現在演奏中
                        </span>
                      )}
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
                        {s.bandName && <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{s.bandName} </span>}
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
              <div 
                id="timeline-closing"
                className={`rounded-2xl p-3 sm:p-3.5 border flex items-center justify-between gap-3 shadow-sm transition-all ${
                  currentProgress?.activeTimelineId === 'closing' ? 'ring-2 ring-purple-500 font-bold' : ''
                } ${
                  isDark 
                    ? 'bg-purple-950/30 border-purple-500/30' 
                    : 'bg-purple-50/80 border-purple-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-300'
                  }`}>
                    🏁
                  </span>
                  <span className={`font-mono text-xs font-bold shrink-0 ${
                    isDark ? 'text-purple-200' : 'text-purple-950'
                  }`}>
                    〜 {data.eventEndTime}
                  </span>
                  <span className={`text-xs font-medium truncate hidden sm:inline ${
                    isDark ? 'text-purple-300/80' : 'text-purple-700'
                  }`}>
                    全曲演奏終了・片付け・写真撮影・完全撤収
                  </span>
                </div>
                <div className="shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-700 border-purple-300'
                  }`}>
                    撤収
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 印刷用: カード表示時でも印刷時はテーブルを展開 */}
          {renderTableView(true)}
        </>
      ) : (
        /* 表表示（画面 & 印刷） */
        renderTableView(false)
      )}

      {/* 下部スポンサー広告バナー */}
      <div className="no-print mt-8">
        <AdInlineBanner variant="standard" />
      </div>

      {/* 受付・集金管理モーダル */}
      <ReceptionManagementModal
        isOpen={isReceptionModalOpen}
        onClose={() => setIsReceptionModalOpen(false)}
        allMembers={allMembers}
        scheduleData={data}
        isDark={isDark}
        records={records}
        onRecordsChange={handleRecordsChange}
        pricingConfig={pricingConfig}
        onPricingConfigChange={handlePricingConfigChange}
      />

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
