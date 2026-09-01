"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PricingTier, 
  PaymentConfig, 
  ParticipantCheckInRecord 
} from '@/types';
import { SharedScheduleData } from '@/utils/share';
import { aggregateMemberRentalInfo } from '@/utils/rental';
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
  BadgeCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  Database,
  Radio
} from 'lucide-react';
import { GAS_SCRIPT_CODE } from '@/utils/gasTemplate';
import { 
  fetchSheetData, 
  initSpreadsheet, 
  updateParticipantOnSheet 
} from '@/utils/spreadsheetSync';

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
  spreadsheetWebhookUrl?: string;
  onSpreadsheetWebhookUrlChange?: (url: string) => void;
  adminPassword?: string;
  isAuthenticated?: boolean;
  onAuthenticate?: () => void;
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
  onPricingConfigChange,
  spreadsheetWebhookUrl,
  onSpreadsheetWebhookUrlChange,
  adminPassword,
  isAuthenticated,
  onAuthenticate
}: ReceptionManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'settings' | 'summary' | 'sheets'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unCheckedIn' | 'checkedIn' | 'unpaid' | 'paid' | 'party'>('all');
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // 会場QRコード表示モーダル状態

  // 📊 スプレッドシート連携ステート
  const activeWebhookUrl = spreadsheetWebhookUrl || scheduleData.spreadsheetWebhookUrl || '';
  const [webhookInput, setWebhookInput] = useState(activeWebhookUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializingSheet, setIsInitializingSheet] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error'>(activeWebhookUrl ? 'connected' : 'idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedGasCode, setCopiedGasCode] = useState(false);
  const [showGasCodePreview, setShowGasCodePreview] = useState(false);

  // 元の曲リストから個人へのレンタル自動紐づけマップを構築
  const autoRentalMap = useMemo(() => {
    return aggregateMemberRentalInfo(scheduleData.schedule);
  }, [scheduleData]);

  // 各メンバーの参加曲数・レンタル有無・パート一覧の集計
  const memberStats = useMemo(() => {
    const stats = new Map<string, { songCount: number; hasRental: boolean; rentalItems: string[]; parts: string[] }>();
    allMembers.forEach(name => {
      const autoRental = autoRentalMap.get(name);
      stats.set(name, {
        songCount: 0,
        hasRental: autoRental?.hasRental || false,
        rentalItems: autoRental?.rentalItems || [],
        parts: []
      });
    });

    scheduleData.schedule.forEach(item => {
      const s = item.song;
      s.members.forEach(m => {
        const entry = stats.get(m.name);
        if (entry) {
          entry.songCount += 1;
          if (!entry.parts.includes(m.part)) {
            entry.parts.push(m.part);
          }
        }
      });
    });

    return stats;
  }, [allMembers, scheduleData, autoRentalMap]);

  // 金額再計算ヘルパー
  const calculateParticipantFee = (
    name: string, 
    customFee: number | undefined, 
    partyJoined: boolean,
    hasRentalOverride?: boolean,
    config: PaymentConfig = pricingConfig
  ) => {
    if (customFee !== undefined && customFee >= 0) return customFee;

    const stats = memberStats.get(name);
    const songCount = stats?.songCount || 0;
    const hasRental = hasRentalOverride !== undefined ? hasRentalOverride : (stats?.hasRental || false);

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

  // 各レコードの取得（未初期化なら元のリストからの自動紐づけ値で生成）
  const getRecord = (name: string): ParticipantCheckInRecord => {
    if (records[name]) return records[name];
    const stats = memberStats.get(name);
    const songCount = stats?.songCount || 0;
    const hasRental = stats?.hasRental || false;
    const fee = calculateParticipantFee(name, undefined, false, hasRental);

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

  // スプレッドシートへの非同期バックグラウンド送信
  const sendBackgroundSheetUpdate = (updatedRec: ParticipantCheckInRecord) => {
    if (!activeWebhookUrl) return;
    const stats = memberStats.get(updatedRec.memberName);
    updateParticipantOnSheet(
      activeWebhookUrl,
      updatedRec,
      stats?.parts,
      stats?.rentalItems.join('/')
    ).then(res => {
      if (res.success) {
        setLastSyncTime(new Date().toLocaleTimeString('ja-JP'));
        setSyncStatus('connected');
      }
    }).catch(err => {
      console.warn('Background sheet update failed', err);
    });
  };

  // 単一レコード更新
  const updateRecord = (name: string, partial: Partial<ParticipantCheckInRecord>) => {
    const current = getRecord(name);
    const updated = { ...current, ...partial };
    
    // 金額再計算（partyJoined, hasRental, customFeeの変更時）
    if ('partyJoined' in partial || 'hasRental' in partial || 'customFee' in partial) {
      updated.calculatedFee = calculateParticipantFee(
        name, 
        updated.customFee, 
        updated.partyJoined,
        updated.hasRental
      );
    }

    const next = { ...records, [name]: updated };
    onRecordsChange(next);

    // スプレッドシート連携が有効な場合は非同期送信
    sendBackgroundSheetUpdate(updated);
  };

  // レンタル加算トグル（手動変更可能）
  const handleToggleRental = (name: string) => {
    const current = getRecord(name);
    updateRecord(name, { hasRental: !current.hasRental });
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

  // 📊 スプレッドシートからの手動同期
  const handleSyncFromSheet = async (targetUrl = activeWebhookUrl) => {
    if (!targetUrl || !targetUrl.trim().startsWith('http')) {
      setSyncMessage('有効なWebhook URLを入力してください');
      setSyncStatus('error');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncMessage(null);

    try {
      const res = await fetchSheetData(targetUrl);
      if (res.success && res.records) {
        if (!res.initialized) {
          setSyncMessage('スプレッドシートはまだ初期化されていません。「初期セットアップ」ボタンを押してください。');
          setSyncStatus('idle');
        } else {
          // リモートレコードをローカルレコードにマージ
          const nextRecords: Record<string, ParticipantCheckInRecord> = { ...records };
          allMembers.forEach(name => {
            const current = getRecord(name);
            const remote = res.records?.[name];
            if (remote) {
              nextRecords[name] = {
                ...current,
                paid: remote.paid,
                checkedIn: remote.checkedIn,
                checkInTime: remote.checkInTime || current.checkInTime,
                partyJoined: remote.partyJoined !== undefined ? remote.partyJoined : current.partyJoined,
                hasRental: remote.hasRental !== undefined ? remote.hasRental : current.hasRental,
                notes: remote.notes || current.notes
              };
            }
          });
          onRecordsChange(nextRecords);
          setSyncStatus('connected');
          const time = new Date().toLocaleTimeString('ja-JP');
          setLastSyncTime(time);
          setSyncMessage(`✓ スプレッドシートから最新データを同期しました (${time})`);
        }
      } else {
        setSyncStatus('error');
        setSyncMessage(`同期エラー: ${res.error || '通信に失敗しました'}`);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncMessage(`通信エラー: ${e.message || '接続できませんでした'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 📊 空のスプレッドシートを初期化（見出し＆参加者一覧を作成）
  const handleInitSheet = async () => {
    const targetUrl = webhookInput.trim() || activeWebhookUrl;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      setSyncMessage('Webhook URLを入力してください');
      return;
    }

    setIsInitializingSheet(true);
    setSyncMessage(null);

    const participants = allMembers.map(name => {
      const rec = getRecord(name);
      const stats = memberStats.get(name);
      return {
        memberName: name,
        songCount: stats?.songCount || 0,
        parts: stats?.parts || [],
        hasRental: rec.hasRental,
        rentalItemName: stats?.rentalItems.join('/') || '',
        partyJoined: rec.partyJoined,
        calculatedFee: rec.calculatedFee,
        paid: rec.paid,
        checkedIn: rec.checkedIn,
        checkInTime: rec.checkInTime || '',
        notes: rec.notes || ''
      };
    });

    try {
      const res = await initSpreadsheet(targetUrl, participants);
      if (res.success) {
        setSyncStatus('connected');
        const time = new Date().toLocaleTimeString('ja-JP');
        setLastSyncTime(time);
        setSyncMessage(`🎉 スプレッドシートの初期セットアップが完了しました！(${participants.length}名登録)`);
        if (onSpreadsheetWebhookUrlChange && targetUrl !== activeWebhookUrl) {
          onSpreadsheetWebhookUrlChange(targetUrl);
        }
      } else {
        setSyncStatus('error');
        setSyncMessage(`初期化エラー: ${res.error || '失敗しました'}`);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncMessage(`初期化通信エラー: ${e.message}`);
    } finally {
      setIsInitializingSheet(false);
    }
  };

  // 📊 Webhook URLの保存
  const handleSaveWebhookUrl = () => {
    const trimmed = webhookInput.trim();
    if (onSpreadsheetWebhookUrlChange) {
      onSpreadsheetWebhookUrlChange(trimmed);
    }
    if (trimmed) {
      handleSyncFromSheet(trimmed);
    } else {
      setSyncStatus('idle');
      setSyncMessage('スプレッドシート連携を解除しました');
    }
  };

  // 📊 GASコードのコピー
  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE);
    setCopiedGasCode(true);
    setTimeout(() => setCopiedGasCode(false), 3000);
  };

  // 📊 バックグラウンド自動ポーリング（モーダル表示中、6秒おきにスプシの最新状況を巡回取得）
  useEffect(() => {
    if (!isOpen || !activeWebhookUrl) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchSheetData(activeWebhookUrl);
        if (res.success && res.records && res.initialized) {
          allMembers.forEach(name => {
            const remote = res.records?.[name];
            if (remote) {
              const current = getRecord(name);
              if (
                current.paid !== remote.paid ||
                current.checkedIn !== remote.checkedIn ||
                current.partyJoined !== remote.partyJoined ||
                current.hasRental !== remote.hasRental
              ) {
                // リモートで変更があった場合のみ更新
                onRecordsChange({
                  ...records,
                  [name]: {
                    ...current,
                    paid: remote.paid,
                    checkedIn: remote.checkedIn,
                    checkInTime: remote.checkInTime || current.checkInTime,
                    partyJoined: remote.partyJoined !== undefined ? remote.partyJoined : current.partyJoined,
                    hasRental: remote.hasRental !== undefined ? remote.hasRental : current.hasRental,
                    notes: remote.notes || current.notes
                  }
                });
              }
            }
          });
          setSyncStatus('connected');
          setLastSyncTime(new Date().toLocaleTimeString('ja-JP'));
        }
      } catch (e) {
        // バックグラウンドポーリングのエラーは静かに握りつぶす
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isOpen, activeWebhookUrl, allMembers, records]);

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
      const fee = calculateParticipantFee(name, current.customFee, current.partyJoined, current.hasRental, config);
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
      if (rec.hasRental) {
        totalRentalCount++;
        rentalTotalFee += pricingConfig.rentalDailyFee;
      }

      const individualRental = rec.hasRental ? pricingConfig.rentalDailyFee : 0;
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

  if (!isOpen) return null;

  if (adminPassword && !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className={`border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col p-6 text-center ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200'}`}>
          <div className="flex justify-center mb-4 text-indigo-500">
            <Settings className="w-10 h-10" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>受付管理画面</h3>
          <p className={`text-xs mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            アクセスするには管理用パスワードを入力してください。
          </p>
          <input 
            type="password" 
            value={pinInput} 
            onChange={(e) => setPinInput(e.target.value)}
            className={`w-full text-center tracking-widest text-lg px-4 py-3 rounded-xl border mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-950 text-white border-slate-700' : 'bg-slate-50 text-slate-800 border-slate-200'}`}
            placeholder="パスワード"
          />
          <div className="flex gap-2">
            <button onClick={onClose} className={`flex-1 py-3 rounded-xl font-semibold transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              キャンセル
            </button>
            <button 
              onClick={() => { if (pinInput === adminPassword) { onAuthenticate?.(); } else { alert('パスワードが違います'); } }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all shadow-md"
            >
              入室
            </button>
          </div>
        </div>
      </div>
    );
  }

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

            <button
              type="button"
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'sheets'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>スプレッドシート連携</span>
              {activeWebhookUrl ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="スプレッドシート連携中" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-500" title="未連携" />
              )}
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
              {/* 📊 スプレッドシート同期ミニステータスバー */}
              <div className={`p-2.5 px-3.5 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
                activeWebhookUrl
                  ? isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-2">
                  {activeWebhookUrl ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold">Googleスプレッドシート同期中</span>
                      {lastSyncTime && <span className="opacity-75 text-[11px] font-mono">（最終同期: {lastSyncTime}）</span>}
                    </>
                  ) : (
                    <>
                      <Radio className="w-3.5 h-3.5 opacity-50" />
                      <span>スプレッドシート未連携（複数スマホでリアルタイム共有するには「スプレッドシート連携」タブでURLを設定してください）</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {activeWebhookUrl ? (
                    <button
                      type="button"
                      onClick={() => handleSyncFromSheet()}
                      disabled={isSyncing}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? '同期中...' : '今すぐ同期'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('sheets')}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                    >
                      連携設定を開く
                    </button>
                  )}
                </div>
              </div>

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
                                <button
                                  type="button"
                                  onClick={() => handleToggleRental(name)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                                    rec.hasRental
                                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 shadow-sm'
                                      : isDark ? 'text-slate-500 border-slate-800 hover:text-slate-300' : 'text-slate-400 border-slate-200 hover:text-slate-700'
                                  }`}
                                  title="クリックしてレンタル加算のあり/なしを切り替え"
                                >
                                  <Guitar className="w-3 h-3" />
                                  <span>
                                    {rec.hasRental 
                                      ? `レンタル有 (+¥${pricingConfig.rentalDailyFee})${stats?.rentalItems && stats.rentalItems.length ? ` [${stats.rentalItems.join('/')}]` : ''}` 
                                      : 'なし'}
                                  </span>
                                </button>
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

          {/* TAB 4: スプレッドシート連携 */}
          {activeTab === 'sheets' && (
            <div className="space-y-6">
              {/* 連携ステータスカード */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                activeWebhookUrl
                  ? isDark ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50/70 border-emerald-300'
                  : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${
                      activeWebhookUrl ? 'bg-emerald-600 shadow-emerald-500/25' : 'bg-slate-700'
                    }`}>
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <span>Googleスプレッドシート連携ステータス</span>
                        {activeWebhookUrl ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            連携中・リアルタイム同期
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-500/20 text-slate-400 border border-slate-500/40 px-2 py-0.5 rounded-full font-bold">
                            ⚪ 未連携
                          </span>
                        )}
                      </h4>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {activeWebhookUrl 
                          ? `複数のスタッフスマホ間で支払い＆入場ステータスを自動同期します（最終同期: ${lastSyncTime || '未実行'}）` 
                          : 'GoogleスプレッドシートのWebhook URLを設定すると、複数スタッフのスマホ間で受付状況をリアルタイム同期できます'}
                      </p>
                    </div>
                  </div>

                  {activeWebhookUrl && (
                    <button
                      type="button"
                      onClick={() => handleSyncFromSheet()}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? '同期中...' : '今すぐ最新同期'}</span>
                    </button>
                  )}
                </div>

                {syncMessage && (
                  <div className={`mt-3 p-2.5 rounded-xl text-xs font-medium ${
                    syncStatus === 'connected'
                      ? isDark ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : isDark ? 'bg-rose-900/40 text-rose-200 border border-rose-500/30' : 'bg-rose-100 text-rose-900 border border-rose-200'
                  }`}>
                    {syncMessage}
                  </div>
                )}
              </div>

              {/* Webhook URL 設定 ＆ 初期化 */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <span>Google Apps Script (GAS) Webhook URL の設定</span>
                </h4>

                <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  発行された「ウェブアプリのURL」を貼り付けてください。登録されたURLはタイムテーブル共有リンク（/view#d=...）にも自動的に含まれ、スタッフ全員のスマホで即座に同期が有効になります。
                </p>

                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      value={webhookInput}
                      onChange={(e) => setWebhookInput(e.target.value)}
                      className={`flex-1 border rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleSaveWebhookUrl}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shrink-0"
                    >
                      URLを保存・接続
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleInitSheet}
                      disabled={isInitializingSheet || !webhookInput.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isInitializingSheet ? 'animate-spin' : ''}`} />
                      <span>{isInitializingSheet ? '初期セットアップ中...' : '空のスプレッドシートを初期化（参加者表を自動作成）'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3ステップ初期設定ガイド ＆ GASコード */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>かんたん3ステップ初期設定ガイド（完全無料・3分で完了）</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleCopyGasCode}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    {copiedGasCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGasCode ? 'GASコードをコピーしました！' : '専用GASコードをコピー'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">1</span>
                      <span className="text-xs font-bold">空のスプシを作成</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Googleドライブで新規スプレッドシートを<strong>空（白紙）のまま</strong>作成します（名前は自由）。
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">2</span>
                      <span className="text-xs font-bold">スクリプトを貼り付け</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      スプシのメニュー「<strong>拡張機能</strong>」→「<strong>Apps Script</strong>」を開き、コピーしたコードを貼り付けて保存します。
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">3</span>
                      <span className="text-xs font-bold">ウェブアプリとして公開</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      右上の「<strong>デプロイ</strong>」→「<strong>新しいデプロイ</strong>」で種類を「ウェブアプリ」、アクセスを「<strong>全員</strong>」にしてデプロイ。発行されたURLを上に貼り付けます。
                    </p>
                  </div>
                </div>

                {/* スクリプトプレビュー切り替え */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGasCodePreview(!showGasCodePreview)}
                    className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>{showGasCodePreview ? '▼ GASスクリプトコードを閉じる' : '▶ GASスクリプトコードを確認・表示する'}</span>
                  </button>

                  {showGasCodePreview && (
                    <div className="mt-2 relative">
                      <pre className={`p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 border ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}>
                        <code>{GAS_SCRIPT_CODE}</code>
                      </pre>
                    </div>
                  )}
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

    </div>
  );
}
