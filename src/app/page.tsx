"use client";

import React, { useState, useEffect, useCallback } from 'react';
import StepInput from '@/components/StepInput';
import StepConfig from '@/components/StepConfig';
import StepResult from '@/components/StepResult';
import AdSidebar from '@/components/AdSidebar';
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
    
    // Use setTimeout to allow UI to update to loading state before blocking thread
    setTimeout(() => {
      try {
        const optimized = optimizeSchedule(songs, constraints, config);
        setResult(optimized);
      } catch (e) {
        console.error("Optimization failed", e);
      } finally {
        setIsOptimizing(false);
      }
    }, 100);
  }, [songs, constraints, config]);

  return (
    <main className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      <header className="mb-10 text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-2">
          <Music2 className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight">
          Session Optimizer
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
          軽音サークルやセッションの演奏希望データから、連続出演や時間制約を考慮した最適なタイムテーブルを自動生成します。
        </p>
      </header>

      {/* メインレイアウト: PC (xl以上) では右側に固定サイドバーを配置 */}
      <div className="flex flex-col xl:flex-row items-start gap-8 justify-center">
        {/* 左側: メインツール領域 */}
        <div className="flex-1 w-full max-w-5xl space-y-8">
          <StepInput
            tsv={tsv}
            onTsvChange={setTsv}
            songs={songs}
            constraints={constraints}
          />

          <StepConfig
            config={config}
            onChange={setConfig}
            constraints={constraints}
            songs={songs}
          />

          <StepResult
            result={result}
            onOptimize={handleOptimize}
            isOptimizing={isOptimizing}
          />
        </div>

        {/* 右側: PC用 常設・追従型サイドバー */}
        <AdSidebar />
      </div>
      
      <footer className="mt-16 text-center text-sm text-slate-600">
        <p>Session Optimizer &copy; {new Date().getFullYear()}</p>
        <p className="mt-1">All processing is done locally in your browser.</p>
      </footer>
    </main>
  );
}

