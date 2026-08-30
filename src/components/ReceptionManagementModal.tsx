"use client";

import React, { useState, useMemo, useRef } from 'react';
import { 
  PricingTier, 
  PaymentConfig, 
  ParticipantCheckInRecord 
} from '@/types';
import { SharedScheduleData } from '@/utils/share';
import { QRCodeCanvas } from 'qrcode.react';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  DollarSign,
  Settings,
  PieChart,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  ClipboardCheck,
  Wine,
  Guitar,
  Clock,
  FileSpreadsheet,
  QrCode,
  Printer,
  BadgeCheck
} from 'lucide-react';

interface ReceptionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMembers: string[];
  scheduleData: SharedScheduleData;
  isDark: boolean;
  records: Record<string, ParticipantCheckInRecord>;
  onRecordsChange: (records: Record<string, ParticipantCheckInRecord>) => void;
  pricingConfig: PaymentConfig;
  onPricingConfigChange: (config: PaymentConfig) => void;
}

export default function ReceptionManagementModal({
  isOpen,
  onClose,
  allMembers,
  scheduleData,
  isDark,
  records,
  onRecordsChange,
  pricingConfig,
  onPricingConfigChange
}: ReceptionManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'settings' | 'summary'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unCheckedIn' | 'checkedIn' | 'unpaid' | 'paid' | 'party'>('all');
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // 会場QRコード表示モーダル状態
  const [isVenueQrOpen, setIsVenueQrOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // 各メンバーの参加曲数・レンタル有無・パート一覧の集計
  const memberStats = useMemo(() => {
    const stats = new Map<string, { songCount: number; hasRental: boolean; parts: string[] }>();
    allMembers.forEach(name => {
      stats.set(name, { songCount: 0, hasRental: false, parts: [] });
    });

    scheduleData.schedule.forEach(item => {
      const s = item.song;
      s.members.forEach(m => {
        const entry = stats.get(m.name);
        if (entry) {
          entry.songCount += 1;
          if (s.rental && s.rental.trim() && s.rental !== 'なし' && s.rental !== '無し' && s.rental !== '-') {
            entry.hasRental = true;
          }
          if (!entry.parts.includes(m.part)) {
            entry.parts.push(m.part);
          }
        }
      });
    });

    return stats;
  }, [allMembers, scheduleData]);

  // 金額再計算ヘルパー
  const calculateParticipantFee = (
    name: string, 
    customFee: number | undefined, 
    partyJoined: boolean,
    config: PaymentConfig = pricingConfig
  ) => {
    if (customFee !== undefined && customFee >= 0) return customFee;

    const stats = memberStats.get(name);
    const songCount = stats?.songCount || 0;
    const hasRental = stats?.hasRental || false;

    let tierPrice = 0;
    for (const tier of config.pricingTiers) {
      if (songCount >= tier.minSongs && songCount <= tier.maxSongs) {
        tierPrice = tier.price;
        break;
      }
    }
    if (tierPrice === 0 && config.pricingTiers.length > 0) {
      tierPrice = config.pricingTiers[config.pricingTiers.length - 1].price;
    }

    const rentalFee = hasRental ? config.rentalDailyFee : 0;
    const partyFee = partyJoined ? config.partyFee : 0;

    return tierPrice + rentalFee + partyFee;
  };

  // 各レコードの取得（未初期化ならデフォルト値で生成）
  const getRecord = (name: string): ParticipantCheckInRecord => {
    if (records[name]) return records[name];
    const stats = memberStats.get(name);
    const songCount = stats?.songCount || 0;
    const hasRental = stats?.hasRental || false;
    const fee = calculateParticipantFee(name, undefined, false);

    return {
      memberName: name,
      checkedIn: false,
      paid: false,
      partyJoined: false,
      hasRental,
      songCount,
      calculatedFee: fee
    };
  };

  // 単一レコード更新
  const updateRecord = (name: string, partial: Partial<ParticipantCheckInRecord>) => {
    const current = getRecord(name);
    const updated = { ...current, ...partial };
    
    // 金額再計算（partyJoinedやcustomFeeの変更時）
    if ('partyJoined' in partial || 'customFee' in partial) {
      updated.calculatedFee = calculateParticipantFee(
        name, 
        updated.customFee, 
        updated.partyJoined
      );
    }

    const next = { ...records, [name]: updated };
    onRecordsChange(next);
  };

  // 支払い＆チェックイン一発完了
  const handlePayAndCheckIn = (name: string) => {
    const current = getRecord(name);
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (!current.paid || !current.checkedIn) {
      updateRecord(name, {
        paid: true,
        checkedIn: true,
        checkInTime: current.checkInTime || timeStr
      });
    } else {
      // 既に両方完了している場合は未払いに戻す（誤操作取消）
      updateRecord(name, {
        paid: false,
        checkedIn: false,
        checkInTime: undefined
      });
    }
  };

  // 個別入場トグル
  const handleToggleCheckIn = (name: string) => {
    const current = getRecord(name);
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    updateRecord(name, {
      checkedIn: !current.checkedIn,
      checkInTime: !current.checkedIn ? timeStr : undefined
    });
  };

  // 個別支払いトグル
  const handleTogglePaid = (name: string) => {
    const current = getRecord(name);
    updateRecord(name, { paid: !current.paid });
  };

  // 懇親会トグル
  const handleToggleParty = (name: string) => {
    const current = getRecord(name);
    updateRecord(name, { partyJoined: !current.partyJoined });
  };

  // 料金設定変更ハンドラ
  const handleUpdateTier = (id: string, field: keyof PricingTier, value: any) => {
    const nextTiers = pricingConfig.pricingTiers.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    });
    const nextConfig = { ...pricingConfig, pricingTiers: nextTiers };
    onPricingConfigChange(nextConfig);
    recalculateAllRecordsWithConfig(nextConfig);
  };

  const handleAddTier = () => {
    const lastTier = pricingConfig.pricingTiers[pricingConfig.pricingTiers.length - 1];
    const newMin = (lastTier ? lastTier.maxSongs : 0) + 1;
    const newTier: PricingTier = {
      id: Date.now().toString(),
      minSongs: newMin,
      maxSongs: newMin + 1,
      price: (lastTier ? lastTier.price : 2000) + 500,
      label: `${newMin}〜${newMin + 1}曲`
    };
    const nextConfig = {
      ...pricingConfig,
      pricingTiers: [...pricingConfig.pricingTiers, newTier]
    };
    onPricingConfigChange(nextConfig);
    recalculateAllRecordsWithConfig(nextConfig);
  };

  const handleDeleteTier = (id: string) => {
    if (pricingConfig.pricingTiers.length <= 1) return;
    const nextConfig = {
      ...pricingConfig,
      pricingTiers: pricingConfig.pricingTiers.filter(t => t.id !== id)
    };
    onPricingConfigChange(nextConfig);
    recalculateAllRecordsWithConfig(nextConfig);
  };

  const handleUpdateDailyRental = (fee: number) => {
    const nextConfig = { ...pricingConfig, rentalDailyFee: fee };
    onPricingConfigChange(nextConfig);
    recalculateAllRecordsWithConfig(nextConfig);
  };

  const handleUpdatePartyFee = (fee: number) => {
    const nextConfig = { ...pricingConfig, partyFee: fee };
    onPricingConfigChange(nextConfig);
    recalculateAllRecordsWithConfig(nextConfig);
  };

  const recalculateAllRecordsWithConfig = (config: PaymentConfig) => {
    const nextRecords: Record<string, ParticipantCheckInRecord> = {};
    allMembers.forEach(name => {
      const current = getRecord(name);
      const fee = calculateParticipantFee(name, current.customFee, current.partyJoined, config);
      nextRecords[name] = { ...current, calculatedFee: fee };
    });
    onRecordsChange(nextRecords);
  };

  // 全体集計データ計算
  const summary = useMemo(() => {
    let totalExpectedFee = 0;
    let totalCollectedFee = 0;
    let totalCheckedIn = 0;
    let totalPaid = 0;
    let totalParty = 0;
    let totalRentalCount = 0;
    let partyTotalFee = 0;
    let rentalTotalFee = 0;
    let baseSessionTotalFee = 0;

    allMembers.forEach(name => {
      const rec = getRecord(name);
      const stats = memberStats.get(name);
      const fee = rec.calculatedFee;

      totalExpectedFee += fee;
      if (rec.paid) {
        totalCollectedFee += fee;
        totalPaid++;
      }
      if (rec.checkedIn) {
        totalCheckedIn++;
      }
      if (rec.partyJoined) {
        totalParty++;
        partyTotalFee += pricingConfig.partyFee;
      }
      if (stats?.hasRental) {
        totalRentalCount++;
        rentalTotalFee += pricingConfig.rentalDailyFee;
      }

      const individualRental = stats?.hasRental ? pricingConfig.rentalDailyFee : 0;
      const individualParty = rec.partyJoined ? pricingConfig.partyFee : 0;
      baseSessionTotalFee += (fee - individualRental - individualParty);
    });

    const uncollectedFee = totalExpectedFee - totalCollectedFee;
    const checkInRate = allMembers.length > 0 ? Math.round((totalCheckedIn / allMembers.length) * 100) : 0;
    const collectionRate = totalExpectedFee > 0 ? Math.round((totalCollectedFee / totalExpectedFee) * 100) : 0;

    return {
      totalMembers: allMembers.length,
      totalCheckedIn,
      checkInRate,
      totalPaid,
      collectionRate,
      totalExpectedFee,
      totalCollectedFee,
      uncollectedFee,
      totalParty,
      partyTotalFee,
      totalRentalCount,
      rentalTotalFee,
      baseSessionTotalFee
    };
  }, [allMembers, records, pricingConfig, memberStats]);

  // フィルタリングされたメンバー一覧
  const filteredMembers = useMemo(() => {
    return allMembers.filter(name => {
      const rec = getRecord(name);
      const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (filterMode === 'checkedIn') return rec.checkedIn;
      if (filterMode === 'unCheckedIn') return !rec.checkedIn;
      if (filterMode === 'paid') return rec.paid;
      if (filterMode === 'unpaid') return !rec.paid;
      if (filterMode === 'party') return rec.partyJoined;
      return true;
    });
  }, [allMembers, searchQuery, filterMode, records]);

  // TSVエクスポートテキスト生成
  const generateExportTsv = () => {
    const headers = [
      '名前',
      '参加曲数',
      '担当パート',
      'レンタル機材',
      '入場ステータス',
      'チェックイン時刻',
      '懇親会参加',
      '参加費(円)',
      '支払ステータス',
      '備考'
    ];
    const rows = allMembers.map(name => {
      const rec = getRecord(name);
      const stats = memberStats.get(name);
      return [
        name,
        stats?.songCount || 0,
        (stats?.parts || []).join('/'),
        stats?.hasRental ? 'あり' : 'なし',
        rec.checkedIn ? '入場済' : '未入場',
        rec.checkInTime || '',
        rec.partyJoined ? '参加' : '不参加',
        rec.calculatedFee,
        rec.paid ? '支払済' : '未払い',
        rec.notes || ''
      ].join('\t');
    });
    return [headers.join('\t'), ...rows].join('\n');
  };

  const handleCopyTsv = () => {
    const tsv = generateExportTsv();
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2000);
    });
  };

  const handleCopyJsonBackup = () => {
    const payload = {
      updatedAt: new Date().toISOString(),
      pricingConfig,
      records
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    });
  };

  const handleRestoreFromJson = () => {
    setRestoreError(null);
    setRestoreSuccess(false);
    try {
      if (!restoreText.trim()) {
        setRestoreError('JSONテキストを入力してください。');
        return;
      }
      const parsed = JSON.parse(restoreText);
      if (parsed && typeof parsed === 'object') {
        if (parsed.pricingConfig) {
          onPricingConfigChange(parsed.pricingConfig);
        }
        if (parsed.records) {
          onRecordsChange(parsed.records);
        }
        setRestoreSuccess(true);
        setRestoreText('');
        setTimeout(() => setRestoreSuccess(false), 3000);
      } else {
        setRestoreError('データ形式が正しくありません。');
      }
    } catch (e) {
      setRestoreError('JSONの解析に失敗しました。正しいバックアップテキストを貼り付けてください。');
    }
  };

  const handleDownloadVenueQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `reception_checkin_qr_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`border rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDark ? 'bg-slate-900 border-indigo-500/30 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* モーダルヘッダー */}
        <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
          isDark 
            ? 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 border-slate-800' 
            : 'bg-gradient-to-r from-indigo-50 via-slate-50 to-purple-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>受付・集金＆入場QR管理</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  スタッフ専用
                </span>
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                参加費の支払い確認と入場QRチェックイン、集金のリアルタイム集計を管理します
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 受付QRコード表示ボタン */}
            <button
              type="button"
              onClick={() => setIsVenueQrOpen(true)}
              className="flex items-center gap-1 text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
              title="受付デスクに置く入場チェックイン用QRコードを表示"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">受付用QR表示</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className={`px-5 py-2.5 border-b flex items-center justify-between gap-2 flex-wrap ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>参加者一覧・受付 ({allMembers.length}名)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'summary'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>集金集計・データ管理</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>料金ルール設定</span>
            </button>
          </div>

          {/* クイック集金サマリーミニバッジ */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="text-[11px] opacity-75">入場:</span>
              <strong className="text-emerald-500">{summary.totalCheckedIn}/{summary.totalMembers}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[11px] opacity-75">集金:</span>
              <strong className="text-indigo-500">¥{summary.totalCollectedFee.toLocaleString()}</strong>
              <span className="text-[10px] opacity-60">/ ¥{summary.totalExpectedFee.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* タブコンテンツ */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: 参加者一覧・チェックイン */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* フロー案内バナー */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                isDark ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    💡
                  </span>
                  <span>
                    <strong>受付フロー:</strong> 参加者から参加費を受け取ったら「💰 支払＆入場完了」をタップ。支払いが完了した参加者はQRコードを読み取って入場完了になります。
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsVenueQrOpen(true)}
                  className="shrink-0 text-xs font-bold underline hover:opacity-80 flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  受付用QRを表示
                </button>
              </div>

              {/* 検索・絞り込みフィルターバー */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="参加者名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      filterMode === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    全員 ({allMembers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('unpaid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      filterMode === 'unpaid'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : isDark ? 'bg-slate-950 text-rose-400 border-slate-800' : 'bg-white text-rose-700 border-slate-200'
                    }`}
                  >
                    未払い ({summary.totalMembers - summary.totalPaid})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('unCheckedIn')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      filterMode === 'unCheckedIn'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : isDark ? 'bg-slate-950 text-amber-400 border-slate-800' : 'bg-white text-amber-700 border-slate-200'
                    }`}
                  >
                    未入場 ({summary.totalMembers - summary.totalCheckedIn})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('party')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      filterMode === 'party'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : isDark ? 'bg-slate-950 text-purple-400 border-slate-800' : 'bg-white text-purple-700 border-slate-200'
                    }`}
                  >
                    懇親会 ({summary.totalParty})
                  </button>
                </div>
              </div>

              {/* 参加者テーブル */}
              <div className={`border rounded-2xl overflow-hidden shadow-inner ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`sticky top-0 z-10 border-b font-bold text-[11px] uppercase ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}>
                      <tr>
                        <th className="px-3 py-2.5">参加者名</th>
                        <th className="px-3 py-2.5 text-center">曲数 / パート</th>
                        <th className="px-3 py-2.5 text-center">機材レンタル</th>
                        <th className="px-3 py-2.5 text-center">懇親会</th>
                        <th className="px-3 py-2.5 text-right">料金</th>
                        <th className="px-3 py-2.5 text-center">支払い＆入場ステータス</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-xs text-slate-400">
                            該当する参加者が見つかりませんでした。
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map(name => {
                          const rec = getRecord(name);
                          const stats = memberStats.get(name);
                          const songCount = stats?.songCount || 0;
                          const hasRental = stats?.hasRental || false;
                          const isFullyDone = rec.paid && rec.checkedIn;

                          return (
                            <tr 
                              key={name}
                              className={`transition-colors ${
                                isFullyDone 
                                  ? isDark ? 'bg-emerald-950/20' : 'bg-emerald-50/50' 
                                  : rec.paid
                                  ? isDark ? 'bg-indigo-950/20' : 'bg-indigo-50/40'
                                  : isDark ? 'hover:bg-slate-900/40' : 'hover:bg-white'
                              }`}
                            >
                              {/* 参加者名 */}
                              <td className="px-3 py-2.5 font-bold whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>{name}</span>
                                  {rec.checkedIn && (
                                    <span className="text-[10px] text-emerald-500 font-normal">
                                      ({rec.checkInTime})
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 曲数 / パート */}
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                                }`}>
                                  {songCount}曲
                                </span>
                                <span className="text-[10px] ml-1.5 opacity-70 truncate max-w-[100px] inline-block align-middle">
                                  {(stats?.parts || []).join(', ')}
                                </span>
                              </td>

                              {/* 機材レンタル加算 */}
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                {hasRental ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                    <Guitar className="w-3 h-3" />
                                    レンタル有 (+¥{pricingConfig.rentalDailyFee})
                                  </span>
                                ) : (
                                  <span className="text-[10px] opacity-40">-</span>
                                )}
                              </td>

                              {/* 懇親会トグル */}
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleParty(name)}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
                                    rec.partyJoined
                                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                                      : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {rec.partyJoined ? '🍻 参加' : '不参加'}
                                </button>
                              </td>

                              {/* 料金 */}
                              <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                                <div>¥{rec.calculatedFee.toLocaleString()}</div>
                              </td>

                              {/* 支払い＆入場一括ボタングループ */}
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* 一括クイックボタン */}
                                  <button
                                    type="button"
                                    onClick={() => handlePayAndCheckIn(name)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 ${
                                      isFullyDone
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : rec.paid
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white'
                                    }`}
                                  >
                                    {isFullyDone ? (
                                      <>
                                        <BadgeCheck className="w-4 h-4" />
                                        <span>受付完了</span>
                                      </>
                                    ) : rec.paid ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>支払済(未入場)</span>
                                      </>
                                    ) : (
                                      <>
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>支払＆入場完了</span>
                                      </>
                                    )}
                                  </button>

                                  {/* 個別入場トグル（任意手動） */}
                                  {!isFullyDone && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleCheckIn(name)}
                                      className={`p-1.5 rounded-lg border text-[10px] ${
                                        rec.checkedIn 
                                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                          : isDark ? 'text-slate-500 border-slate-800' : 'text-slate-400 border-slate-200'
                                      }`}
                                      title={rec.checkedIn ? '入場済' : '未入場'}
                                    >
                                      {rec.checkedIn ? '入場済' : '未入場'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 料金ルール設定 */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* 曲数レンジ料金テーブル */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-indigo-500" />
                      <span>参加曲数に応じた参加費設定（テーブル方式）</span>
                    </h4>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      参加曲数ごとの料金を自由に設定できます。変更すると全参加者の金額が即座に自動再計算されます。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="flex items-center gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>区分を追加</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {pricingConfig.pricingTiers.map((tier, idx) => (
                    <div 
                      key={tier.id}
                      className={`flex items-center gap-2 sm:gap-4 p-3 rounded-xl border ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-mono font-bold w-6 text-center text-slate-400">
                        #{idx + 1}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="number"
                          min={1}
                          value={tier.minSongs}
                          onChange={(e) => handleUpdateTier(tier.id, 'minSongs', Number(e.target.value))}
                          className={`w-16 border rounded-lg px-2 py-1 text-center font-bold ${
                            isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                        <span>〜</span>
                        <input
                          type="number"
                          min={tier.minSongs}
                          value={tier.maxSongs >= 999 ? 99 : tier.maxSongs}
                          onChange={(e) => handleUpdateTier(tier.id, 'maxSongs', Number(e.target.value))}
                          className={`w-16 border rounded-lg px-2 py-1 text-center font-bold ${
                            isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                        <span>曲:</span>
                      </div>

                      <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                        <span className="text-xs font-bold">¥</span>
                        <input
                          type="number"
                          step={100}
                          min={0}
                          value={tier.price}
                          onChange={(e) => handleUpdateTier(tier.id, 'price', Number(e.target.value))}
                          className={`w-28 border rounded-lg px-2.5 py-1 text-right font-mono font-bold ${
                            isDark ? 'bg-slate-950 border-slate-700 text-indigo-400' : 'bg-slate-50 border-slate-300 text-indigo-600'
                          }`}
                        />
                        <span className="text-xs font-medium">円</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTier(tier.id)}
                        disabled={pricingConfig.pricingTiers.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg disabled:opacity-20 transition-colors"
                        title="この区分を削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* レンタル機材加算 ＆ 懇親会費 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1日レンタル機材加算 */}
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="text-sm font-bold flex items-center gap-1.5 mb-1">
                    <Guitar className="w-4 h-4 text-amber-500" />
                    <span>レンタル機材加算（1日一律）</span>
                  </h4>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    演奏曲でレンタル機材を利用するメンバーに日額で加算されます
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">¥</span>
                    <input
                      type="number"
                      step={100}
                      min={0}
                      value={pricingConfig.rentalDailyFee}
                      onChange={(e) => handleUpdateDailyRental(Number(e.target.value))}
                      className={`w-32 border rounded-xl px-3 py-2 text-right font-mono font-bold text-sm ${
                        isDark ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-700'
                      }`}
                    />
                    <span className="text-xs font-semibold">円 / 1日</span>
                  </div>
                </div>

                {/* 懇親会（打ち上げ）費用 */}
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="text-sm font-bold flex items-center gap-1.5 mb-1">
                    <Wine className="w-4 h-4 text-purple-500" />
                    <span>懇親会（打ち上げ）参加費</span>
                  </h4>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    懇親会参加トグルをONにしたメンバーに加算されます
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">¥</span>
                    <input
                      type="number"
                      step={100}
                      min={0}
                      value={pricingConfig.partyFee}
                      onChange={(e) => handleUpdatePartyFee(Number(e.target.value))}
                      className={`w-32 border rounded-xl px-3 py-2 text-right font-mono font-bold text-sm ${
                        isDark ? 'bg-slate-900 border-slate-700 text-purple-400' : 'bg-white border-slate-300 text-purple-700'
                      }`}
                    />
                    <span className="text-xs font-semibold">円 / 1名</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 集金集計・データバックアップ */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* 集計統計カードグリッド */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[11px] text-slate-400">入場者数</div>
                  <div className="text-xl font-extrabold mt-1 text-emerald-500">
                    {summary.totalCheckedIn} / {summary.totalMembers}
                    <span className="text-xs font-normal ml-1 opacity-70">({summary.checkInRate}%)</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[11px] text-slate-400">集金回収状況</div>
                  <div className="text-xl font-extrabold mt-1 text-indigo-400">
                    ¥{summary.totalCollectedFee.toLocaleString()}
                    <span className="text-xs font-normal ml-1 opacity-70">({summary.collectionRate}%)</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[11px] text-slate-400">未回収残高</div>
                  <div className="text-xl font-extrabold mt-1 text-rose-400">
                    ¥{summary.uncollectedFee.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[11px] text-slate-400">セッション参加費合計</div>
                  <div className="text-base font-bold font-mono mt-1">
                    ¥{summary.baseSessionTotalFee.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[11px] text-slate-400">レンタル機材費 ({summary.totalRentalCount}名)</div>
                  <div className="text-base font-bold font-mono mt-1 text-amber-500">
                    ¥{summary.rentalTotalFee.toLocaleString()}
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="text-[11px] text-slate-400">懇親会費 ({summary.totalParty}名)</div>
                  <div className="text-base font-bold font-mono mt-1 text-purple-400">
                    ¥{summary.partyTotalFee.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* エクスポート・バックアップ操作 */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>データのエクスポート ＆ 他端末への引き継ぎ</span>
                </h4>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyTsv}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95"
                  >
                    {copiedTsv ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedTsv ? 'コピー完了！' : 'Excel/スプシ用TSVをコピー'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJsonBackup}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm active:scale-95"
                  >
                    {copiedBackup ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedBackup ? 'バックアップ完了！' : '端末引継ぎ用JSONをコピー'}</span>
                  </button>
                </div>

                {/* 貼り付け復元 */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <label className="text-xs font-semibold text-slate-400">
                    別端末から引き継ぐ場合は、コピーしたバックアップJSONを貼り付けてください：
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder='{"updatedAt":..., "records":...}'
                      value={restoreText}
                      onChange={(e) => setRestoreText(e.target.value)}
                      className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleRestoreFromJson}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm shrink-0"
                    >
                      復元・反映
                    </button>
                  </div>
                  {restoreError && <p className="text-xs text-rose-400 font-medium">{restoreError}</p>}
                  {restoreSuccess && <p className="text-xs text-emerald-400 font-medium">✓ データを正常に復元・同期しました！</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className={`px-5 py-3 border-t flex items-center justify-end ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            閉じる
          </button>
        </div>
      </div>

      {/* 🖨️ 会場受付デスク用 QRコード拡大表示モーダル */}
      {isVenueQrOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`border rounded-3xl w-full max-w-md shadow-2xl p-6 text-center space-y-4 ${
            isDark ? 'bg-slate-900 border-indigo-500/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold flex items-center gap-1.5">
                <QrCode className="w-5 h-5 text-indigo-500" />
                <span>受付チェックイン用 QRコード</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsVenueQrOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              受付デスクに印刷または提示してください。参加者が参加費をお支払い後、スマホカメラで読み取って入場完了にします。
            </p>

            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner my-2">
              <div ref={qrRef} className="p-2">
                <QRCodeCanvas 
                  value={currentUrl} 
                  size={190} 
                  level="L" 
                  marginSize={1}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-800 mt-2">
                📱 カメラで読み取ってチェックイン
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadVenueQr}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>QR画像をダウンロード</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVenueQrOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
