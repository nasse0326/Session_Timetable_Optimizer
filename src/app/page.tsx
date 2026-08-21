"use client";

import React, { useState, useEffect, useCallback } from 'react';
import StepInput from '@/components/StepInput';
import StepConfig from '@/components/StepConfig';
import StepResult from '@/components/StepResult';
import AdSidebar from '@/components/AdSidebar';
import AdInlineBanner from '@/components/AdInlineBanner';
import OptimizationAdModal from '@/components/OptimizationAdModal';
import { SessionConfig, Song, MemberConstraint, OptimizationResult } from '@/types';
import { parseTsv } from '@/utils/parser';
import { optimizeSchedule } from '@/utils/optimizer';
import { Music2 } from 'lucide-react';

export default function Home() {
  const [tsv, setTsv] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [constraints, setConstraints] = useState<MemberConstraint[]>([]);
  
  const [config, setConfig] = useState<SessionConfig>({
    startTime: '13:00',
    defaultPlayMinutes: 5,
    transitionMinutes: 10,
    breakIntervalSongs: 5,
    breakMinutes: 15,
    mode: 'session',
    numberOfParts: 1,
    weights: {
      consecutive: 1.0,
      drum: 1.0,
      vocal: 1.0,
      placement: 1.0,
      efficiency: 1.0,
      longSetup: 1.0
    }
  });

  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [pendingResult, setPendingResult] = useState<OptimizationResult | null>(null);

  // Parse TSV whenever it changes
  useEffect(() => {
    try {
      const { songs, constraints } = parseTsv(tsv);
      setSongs(songs);
      setConstraints(constraints);
      setResult(null); // Reset result when input changes
    } catch (e) {
      console.error("Error parsing TSV", e);
    }
  }, [tsv]);

  const handleOptimize = useCallback(() => {
    if (songs.length === 0) return;
    
    setIsOptimizing(true);
    
    // バックグラウンドで計算を実行しておき、モーダルのアニメーション完了時に反映
    setTimeout(() => {
      try {
        const optimized = optimizeSchedule(songs, constraints, config);
        setPendingResult(optimized);
      } catch (e) {
        console.error("Optimization failed", e);
        setIsOptimizing(false);
      }
    }, 50);
  }, [songs, constraints, config]);

  const handleOptimizationComplete = useCallback(() => {
    if (pendingResult) {
      setResult(pendingResult);
    }
    setIsOptimizing(false);
    
    // Step 3 結果エリアへスムーズにスクロール
    setTimeout(() => {
      const resultElement = document.getElementById('step-result-section');
      if (resultElement) {
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [pendingResult]);

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto font-sans">
      <header className="mb-8 text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-1">
          <Music2 className="w-9 h-9 text-indigo-400" />
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight">
          Session Timetable Optimizer
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
          軽音サークルやセッションの演奏希望データから、連続出演や時間制約を考慮した最適なタイムテーブルを自動生成します。
        </p>
      </header>

      {/* 画面幅 1400px 以上では右側に固定追従サイドバー、1400px 未満では 1 カラム＋インライン広告 */}
      <div className="flex flex-col min-[1400px]:flex-row items-start gap-8 justify-center">
        {/* メインツール領域 */}
        <div className="flex-1 w-full max-w-4xl min-[1400px]:max-w-4xl mx-auto min-[1400px]:mx-0 space-y-8">
          <StepInput
            tsv={tsv}
            onTsvChange={setTsv}
            songs={songs}
            constraints={constraints}
          />

          {/* 1400px 未満（ノートPC・スマホ）でのみ表示されるインライン広告（Step 1とStep 2の間） */}
          <div className="block min-[1400px]:hidden">
            <AdInlineBanner variant="compact" />
          </div>

          <StepConfig
            config={config}
            onChange={setConfig}
            constraints={constraints}
            songs={songs}
          />

          <div id="step-result-section">
            <StepResult
              result={result}
              onOptimize={handleOptimize}
              isOptimizing={isOptimizing}
            />
          </div>

          {/* 1400px 未満（ノートPC・スマホ）でのみ表示される最下部インライン広告 */}
          <div className="block min-[1400px]:hidden">
            <AdInlineBanner variant="standard" />
          </div>
        </div>

        {/* 1400px 以上の大画面でのみ右側に表示される固定追従サイドバー */}
        <div className="hidden min-[1400px]:block">
          <AdSidebar />
        </div>
      </div>

      {/* 最適化計算中の大型広告・プログレス表示モーダル */}
      <OptimizationAdModal
        isOpen={isOptimizing}
        onComplete={handleOptimizationComplete}
      />
      
      <footer className="mt-16 text-center text-sm text-slate-600">
        <p>Session Timetable Optimizer &copy; {new Date().getFullYear()}</p>
        <p className="mt-1">All processing is done locally in your browser.</p>
      </footer>
    </main>
  );
}

