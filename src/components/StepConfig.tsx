"use client";

import { SessionConfig, MemberConstraint, Song } from '../types';
import {
  Settings2,
  Clock,
  FastForward,
  Coffee,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  ListOrdered,
  Anchor,
  Mic2,
  Guitar,
  Users
} from 'lucide-react';

interface StepConfigProps {
  config: SessionConfig;
  onChange: (config: SessionConfig) => void;
  constraints?: MemberConstraint[];
  songs?: Song[];
}

export default function StepConfig({ config, onChange, constraints = [], songs = [] }: StepConfigProps) {
  const handleChange = (field: keyof SessionConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleWeightChange = (field: keyof SessionConfig['weights'], value: number) => {
    onChange({ ...config, weights: { ...config.weights, [field]: value } });
  };

  const slotMinutes = (Number(config.defaultPlayMinutes) || 0) + (Number(config.transitionMinutes) || 0);

  return (
    <div className="bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl light:shadow-lg transition-all duration-300 hover:border-emerald-500/40 light:hover:border-emerald-400">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 light:bg-emerald-100 p-2.5 rounded-xl border border-emerald-500/30 light:border-emerald-300 shadow-inner">
            <Settings2 className="w-6 h-6 text-emerald-400 light:text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 light:text-slate-900">Step 2: 進行設定 & 適用制約の確認</h2>
            <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
              タイムテーブルの進行パラメータと、計算時に適用されるすべての制約ルールを確認できます
            </p>
          </div>
        </div>

        {/* モード切替トグル */}
        <div className="flex bg-slate-800/80 light:bg-slate-100 p-1 rounded-xl border border-slate-700 light:border-slate-200">
          <button
            onClick={() => handleChange('mode', 'session')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              config.mode === 'session'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800 hover:bg-slate-700/50 light:hover:bg-slate-200'
            }`}
          >
            <Mic2 className="w-4 h-4" />
            セッション
          </button>
          <button
            onClick={() => handleChange('mode', 'live')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              config.mode === 'live'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800 hover:bg-slate-700/50 light:hover:bg-slate-200'
            }`}
          >
            <Guitar className="w-4 h-4" />
            ライブ
          </button>
        </div>
      </div>

      {/* 進行設定フォーム */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* 1. 開始時刻（集合） */}
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <Clock className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> 開始時刻 (集合)
          </label>
          <input
            type="time"
            value={config.startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            className="w-full bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-3 py-2 text-slate-100 light:text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
          <span className="text-[11px] text-slate-500 light:text-slate-400 block">イベントの集合・開場時刻</span>
        </div>

        {/* 2. 集合・セッティング時間 */}
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <Users className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> 集合・セッティング枠
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="5"
              value={config.openingMinutes ?? 15}
              onChange={(e) => handleChange('openingMinutes', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-3 py-2 text-slate-100 light:text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
            <span className="text-xs text-slate-400 light:text-slate-500 whitespace-nowrap">分</span>
          </div>
          <span className="text-[11px] text-slate-500 light:text-slate-400 block">1曲目開始前の準備・音出し時間 (0で即演奏)</span>
        </div>

        {/* 3. 終了予定時刻 */}
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <Clock className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> 終了予定時刻 (完全撤収)
          </label>
          <input
            type="time"
            value={config.targetEndTime || ''}
            onChange={(e) => handleChange('targetEndTime', e.target.value || undefined)}
            className="w-full bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-3 py-2 text-slate-100 light:text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
          <span className="text-[11px] text-slate-500 light:text-slate-400 block leading-tight">
            ※ 全曲終了が遅い場合は自動的に延長されます
          </span>
        </div>

        {/* 4. 1曲の演奏時間 */}
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <Sliders className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> 1曲の演奏時間
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={config.defaultPlayMinutes}
              onChange={(e) => handleChange('defaultPlayMinutes', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-3 py-2 text-slate-100 light:text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
            <span className="text-xs text-slate-400 light:text-slate-500 whitespace-nowrap">分</span>
          </div>
          <span className="text-[11px] text-slate-500 light:text-slate-400 block">実演奏の想定時間</span>
        </div>

        {/* 5. 曲間転換時間 */}
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <FastForward className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> 曲間転換時間
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={config.transitionMinutes}
              onChange={(e) => handleChange('transitionMinutes', parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-3 py-2 text-slate-100 light:text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
            <span className="text-xs text-slate-400 light:text-slate-500 whitespace-nowrap">分</span>
          </div>
          <span className="text-[11px] text-slate-500 light:text-slate-400 block">ステージ入替時間</span>
        </div>

        {/* 6. 構成・定期休憩 */}
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <ListOrdered className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> 構成・定期休憩
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={config.numberOfParts}
              onChange={(e) => handleChange('numberOfParts', parseInt(e.target.value))}
              className="w-20 bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-2 py-2 text-slate-100 light:text-slate-900 font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            >
              <option value={1}>1部構成</option>
              <option value={2}>2部構成</option>
              <option value={3}>3部構成</option>
              <option value={4}>4部構成</option>
            </select>
            <span className="text-xs text-slate-400 light:text-slate-500">休</span>
            <input
              type="number"
              min="1"
              value={config.breakMinutes}
              onChange={(e) => handleChange('breakMinutes', parseInt(e.target.value) || 0)}
              className="w-14 bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-2 py-2 text-slate-100 light:text-slate-900 font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            <span className="text-xs text-slate-400 light:text-slate-500">分</span>
          </div>
          <span className="text-[11px] text-slate-500 light:text-slate-400 block leading-tight">
            ※ 休憩も一つのセッションとして計算するため、曲間転換時間に更に何分加えるかを設定してください
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <Anchor className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> トップ固定 (1曲目)
          </label>
          <select
            value={config.fixedTopperId || ""}
            onChange={(e) => handleChange('fixedTopperId', e.target.value || undefined)}
            className="w-full bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-3 py-2 text-slate-100 light:text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          >
            <option value="">-- 指定なし（自動） --</option>
            {songs.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
        <div className="bg-slate-950/60 light:bg-slate-50 p-4 rounded-2xl border border-slate-800 light:border-slate-200 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-600">
            <Anchor className="w-4 h-4 text-emerald-400 light:text-emerald-600" /> トリ固定 (最終曲)
          </label>
          <select
            value={config.fixedToriId || ""}
            onChange={(e) => handleChange('fixedToriId', e.target.value || undefined)}
            className="w-full bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-xl px-3 py-2 text-slate-100 light:text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          >
            <option value="">-- 指定なし（自動） --</option>
            {songs.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 制約スライダー & ルール詳細 */}
      <div className="bg-slate-950/40 light:bg-slate-50 border border-slate-800/80 light:border-slate-200 rounded-2xl p-5 mb-8">
        <h3 className="text-sm font-bold text-slate-200 light:text-slate-800 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400 light:text-indigo-600" />
          制約の重み付けと最適化ルール（ペナルティ度合い）
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <WeightSlider
            label="連続出演の回避"
            icon="🎸"
            description="（重複バンド以外で）同一メンバーが2曲連続で演奏することを回避・分散します。"
            value={config.weights.consecutive}
            onChange={(v) => handleWeightChange('consecutive', v)}
          />
          <WeightSlider
            label="ドラム転換と体力配慮"
            icon="🥁"
            description="「Dr ⇄ 他パート」の連続を回避し、「Dr ⇄ Dr」を推奨。兼任者は体力配慮のため「他 → Dr」の順にします。"
            value={config.weights.drum}
            onChange={(v) => handleWeightChange('drum', v)}
          />
          <WeightSlider
            label="ボーカル分散"
            icon="🎤"
            description="同一ボーカルの連続出演を回避します（※「課題曲」フラグがある曲は免除されます）。"
            value={config.weights.vocal}
            onChange={(v) => handleWeightChange('vocal', v)}
          />
          <WeightSlider
            label="転換長の休憩明け配置"
            icon="⚡"
            description="持込機材等の転換長曲を「休憩明け直後＞休憩前＞連続枠」の順に優先配置します（最終部の通常枠は緩やかに回避）。"
            value={config.weights.longSetup ?? 1.0}
            onChange={(v) => handleWeightChange('longSetup', v)}
          />
          <WeightSlider
            label="初参加・配置ルール"
            icon="🔰"
            description="「初参加」を第1部（前半）に優先配置し、「前回トッパー/トリ」の重複枠を回避します。"
            value={config.weights.placement}
            onChange={(v) => handleWeightChange('placement', v)}
            disabled={config.mode === 'live'}
          />
          <WeightSlider
            label="課題曲の前半集中"
            icon="🎼"
            description="全員参加や初心者歓迎の「課題曲」を開始側（第1部・前半）に極力集めて配置します。"
            value={config.weights.assignment ?? 1.0}
            onChange={(v) => handleWeightChange('assignment', v)}
          />
          <WeightSlider
            label="バンド被り時ボーナス"
            icon="🤝"
            description="曲のメンバーの半数以上が一致する場合、転換効率化のために連続演奏を促します（連続ペナルティ免除）。"
            value={config.weights.efficiency}
            onChange={(v) => handleWeightChange('efficiency', v)}
          />
          <WeightSlider
            label="レンタル機材（鍵盤等）の連続集約"
            icon="🎹"
            description="ピアノやキーボード等のレンタル機材を使用する曲を極力連続・ひとまとまりに集約し、機材レンタル時間と費用を圧縮します。"
            value={config.weights.rentalConsecutive ?? 1.0}
            onChange={(v) => handleWeightChange('rentalConsecutive', v)}
          />
        </div>
      </div>

      {/* 現在適用される制約条件一覧パネル */}
      <div className="bg-slate-950/80 light:bg-slate-50 border border-slate-800/90 light:border-slate-200 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 light:border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 light:text-amber-500" />
            <h3 className="text-sm font-bold text-slate-200 light:text-slate-800">
              メンバー個別の時間指定制約（自動適用）
            </h3>
          </div>
          <span className="text-xs bg-indigo-500/15 light:bg-indigo-100 text-indigo-300 light:text-indigo-700 border border-indigo-500/30 light:border-indigo-300 px-2.5 py-0.5 rounded-full font-medium">
            自動判定中
          </span>
        </div>

        {/* 1. メンバー個別の時間制約 */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-300 light:text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              メンバー個別の時間指定制約（遅刻・早退）
            </span>
            <span className="text-[11px] text-slate-400 light:text-slate-500">
              {constraints.length} 件 登録済み
            </span>
          </div>

          {constraints.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {constraints.map((c, i) => {
                let desc = '';
                if (c.startMinutes !== undefined && c.endMinutes !== undefined) {
                  const s = `${Math.floor(c.startMinutes / 60)}:${(c.startMinutes % 60).toString().padStart(2, '0')}`;
                  const e = `${Math.floor(c.endMinutes / 60)}:${(c.endMinutes % 60).toString().padStart(2, '0')}`;
                  desc = `${s} 〜 ${e} の時間帯のみ出演可能`;
                } else if (c.startMinutes !== undefined) {
                  const s = `${Math.floor(c.startMinutes / 60)}:${(c.startMinutes % 60).toString().padStart(2, '0')}`;
                  desc = `${s} 以降に参加可能（遅刻配慮）`;
                } else if (c.endMinutes !== undefined) {
                  const e = `${Math.floor(c.endMinutes / 60)}:${(c.endMinutes % 60).toString().padStart(2, '0')}`;
                  desc = `${e} までに参加可能（早退配慮）`;
                }

                return (
                  <div
                    key={i}
                    className="bg-slate-900/90 light:bg-white border border-amber-500/30 light:border-amber-300 rounded-xl p-3 flex flex-col justify-between space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-200 light:text-amber-700">{c.name}</span>
                      <span className="text-[10px] bg-amber-500/20 light:bg-amber-100 text-amber-300 light:text-amber-700 px-1.5 py-0.5 rounded font-mono">
                        優先度：最高
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 light:text-slate-700 font-medium">{desc}</p>
                    {c.formattedText && (
                      <span className="text-[10px] text-slate-500 light:text-slate-400 font-mono truncate">
                        元データ: {c.formattedText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-900/50 light:bg-white border border-slate-800 light:border-slate-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-slate-400 light:text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-500 shrink-0" />
              <span>
                現在、個別の時間制約はありません（全員がどの時間帯でも参加可能です）。
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeightSlider({
  label,
  icon,
  description,
  value,
  onChange,
  disabled = false
}: {
  label: string,
  icon: string,
  description: string,
  value: number,
  onChange: (v: number) => void,
  disabled?: boolean
}) {
  return (
    <div className={`bg-slate-900/60 light:bg-white border border-slate-800/80 light:border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 light:text-slate-800">
            <span>{icon} {label}</span>
          </div>
          <span className="text-xs font-mono text-indigo-300 light:text-indigo-700 bg-indigo-500/20 light:bg-indigo-100 px-1.5 py-0.5 rounded">
            {Math.round(value * 100)}%
          </span>
        </div>
        <p className="text-slate-400 light:text-slate-500 text-[11px] leading-relaxed min-h-[34px]">
          {description}
        </p>
      </div>
      <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 light:bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        disabled={disabled}
      />
    </div>
  );
}
