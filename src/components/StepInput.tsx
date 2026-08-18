import React, { useState } from 'react';
import { SAMPLE_TSV } from '../utils/parser';
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-indigo-500/40">
      {/* ヘッダーエリア */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30 shadow-inner">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Step 1: 演奏データの入力・確認
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              スプレッドシートやExcelのセルをコピーして貼り付けるだけで自動解析します
            </p>
          </div>
        </div>

        {/* ガイド開閉ボタン */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
        >
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          制約の書き方ガイド
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 制約書き方ガイド（開閉式） */}
      {showGuide && (
        <div className="mb-6 space-y-3">
          <div className="p-5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl animate-in fade-in duration-300">
            <h4 className="text-sm font-semibold text-indigo-200 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              スプレッドシートの「備考」列に書ける時間・配置指定フォーマット
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20">
                <span className="font-semibold text-amber-300 block mb-1">⏱️ 遅刻・早退・時間指定</span>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block mb-1">山田 15:00以降</code>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block mb-1">加藤 〜16:30</code>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block">佐藤 14:00~16:00</code>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20">
                <span className="font-semibold text-amber-300 block mb-1">🔰 初参加の配慮</span>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block mb-1">田中 初参加</code>
                <p className="text-slate-400 mt-1.5">全体の「前半」に優先配置します</p>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20">
                <span className="font-semibold text-amber-300 block mb-1">👑 前回トッパー・トリ回避</span>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block mb-1">鈴木 前回トッパー</code>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block mb-1">伊藤 前回トリ</code>
                <p className="text-slate-400 mt-1.5">最初・最後の枠を回避します</p>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20">
                <span className="font-semibold text-amber-300 block mb-1">🥁 転換長・その他</span>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block mb-1">転換長</code>
                <code className="text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded block mb-1">インスト (※人名不要)</code>
                <p className="text-slate-400 mt-1.5">休憩明けや連続演奏に優先配置します</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300/90 font-medium flex items-center gap-2">
              <span>💡</span>
              <span><strong>重要：</strong>備考欄に複数の制約や指定を書く場合は、必ず<strong>カンマ ( , )</strong> で区切って記入してください（例: <code className="bg-slate-950/80 px-1.5 py-0.5 rounded text-amber-200">山田 15:00以降, 田中 初参加, 転換長</code>）。</span>
            </div>
            <p className="text-[11px] text-indigo-300/80 mt-2">
              ※「バンドメンバー重複」「マルチプレイヤーの体力配慮」「ドラム転換効率化」などの高度なルールは、AIが自動で考慮します。
            </p>
          </div>
          
          <div className="p-5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl animate-in fade-in duration-300">
            <h4 className="text-sm font-semibold text-emerald-200 flex items-center gap-2 mb-3">
              <Table className="w-4 h-4 text-emerald-400" />
              自動認識される特別な列（ヘッダー名）
            </h4>
            <div className="text-xs text-slate-300 space-y-2">
              <p>以下の文字列が1行目（ヘッダー）に含まれていると、自動的に機能が有効になります。</p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                <li><strong className="text-emerald-300">「カテゴリ」列 または「課題曲」列</strong>: 「カテゴリ」列に「課題曲」と記載するか、「課題曲」列を用意すると、ボーカルの連続出演ペナルティが免除されます。</li>
                <li><strong className="text-emerald-300">「レンタル」または「持込」列</strong>: 「なし」以外の文字が入っていると、自動的に「転換長」扱いになり、休憩明けなどが優先されます。</li>
                <li><strong className="text-emerald-300">「メンバー〇 名前」「メンバー〇 パート」</strong>: パート固定列ではなく、名前とパートがペアになったフォーマット（Format B）も自動認識します。</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* タブ切り替えとアクションボタン */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
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
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            見やすい表形式 ({songs.length}曲)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSampleLoad}
            className="text-xs text-indigo-300 hover:text-indigo-100 transition-colors flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 px-3.5 py-2 rounded-xl hover:bg-indigo-500/25 shadow-sm font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            サンプルデータを読込
          </button>
          {tsv && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 bg-slate-800/50 hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 px-3 py-2 rounded-xl"
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
              className="w-full h-44 bg-slate-950/70 border border-slate-700 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all leading-relaxed shadow-inner"
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
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
          <div className="max-h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-slate-400 font-semibold backdrop-blur">
                <tr>
                  <th className="px-4 py-3 w-12 text-center text-slate-500">#</th>
                  <th className="px-4 py-3 min-w-[140px]">曲名</th>
                  <th className="px-4 py-3 min-w-[260px]">担当メンバー</th>
                  <th className="px-4 py-3 min-w-[160px]">備考 / 制約</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {songs.map((song, idx) => (
                  <tr key={song.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-2.5 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-100">
                      <div className="flex items-center gap-2">
                        <Music2 className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                        <span>{song.title}</span>
                      </div>
                      {(song.requiresLongSetup || song.isAssignment || song.isSession) && (
                        <div className="flex flex-wrap gap-1 mt-1 pl-5">
                          {song.requiresLongSetup && (
                            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                              ⚡ 転換長
                            </span>
                          )}
                          {song.isAssignment && (
                            <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono">
                              🎯 課題曲
                            </span>
                          )}
                          {song.isSession && (
                            <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono">
                              ☕ セッション
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {song.members.map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${getPartBadgeStyle(m.part)}`}
                          >
                            <span className="font-mono text-[10px] opacity-70">{m.part}</span>
                            <span className="font-medium">{m.name}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {song.rawNotes ? (
                        <div className="flex items-center gap-1.5 text-amber-300/90 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 w-fit">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="font-mono text-[11px]">{song.rawNotes}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* パース結果サマリー & メンバー一覧バッジ */}
      {songs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-4 animate-in fade-in duration-300">
          {/* サマリーカード */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100">{songs.length} <span className="text-xs font-normal text-slate-400">曲</span></div>
                <div className="text-xs text-slate-400">登録済み楽曲数</div>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100">{memberSongCounts.length} <span className="text-xs font-normal text-slate-400">名</span></div>
                <div className="text-xs text-slate-400">参加プレイヤー総数</div>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">{constraints.length} <span className="text-xs font-normal text-slate-400">件</span></div>
                <div className="text-xs text-slate-400">自動認識された時間制約</div>
              </div>
            </div>
          </div>

          {/* 参加メンバー一覧と制約チップ */}
          <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                参加メンバー一覧 (出演曲数)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                🟡 は時間制約あり
              </span>
            </div>
            <div className="space-y-3">
              {groupedMembers.map(([count, names]) => (
                <div key={count} className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap border border-slate-700/50 w-fit shrink-0 flex items-center justify-center min-w-[70px]">
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
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-medium">{name}</span>
                          {constraint && (
                            <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-semibold">
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
