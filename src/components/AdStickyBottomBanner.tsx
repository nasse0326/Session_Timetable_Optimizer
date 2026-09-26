"use client";

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { RealBannerAd } from './AdInlineBanner';

interface AdStickyBottomBannerProps {
  ads: RealBannerAd[];
  rotateIntervalMs?: number;
}

const DISMISS_KEY = 'session_timetable_bottom_ad_dismissed';

export default function AdStickyBottomBanner({ ads, rotateIntervalMs = 8000 }: AdStickyBottomBannerProps) {
  const [index, setIndex] = useState(() => (ads.length > 0 ? Math.floor(Math.random() * ads.length) : 0));
  const [dismissed, setDismissed] = useState(true); // サーバー描画時は非表示、クライアントで復元

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % ads.length);
    }, rotateIntervalMs);
    return () => clearInterval(timer);
  }, [ads, rotateIntervalMs]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // localStorage/sessionStorageが使えない環境では単に閉じるだけ
    }
  };

  if (dismissed || ads.length === 0) return null;
  const ad = ads[index % ads.length];

  return (
    <div
      className="no-print fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md bg-slate-900/95 light:bg-white/95 border border-slate-700 light:border-slate-200 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 px-2.5 py-2">
        <span className="shrink-0 text-[9px] font-mono text-slate-400 light:text-slate-500 bg-slate-800 light:bg-slate-100 px-1.5 py-0.5 rounded">
          {ad.badge}
        </span>

        <a
          key={ad.advertiserName}
          href={ad.clickUrl}
          rel="nofollow noopener"
          target="_blank"
          className="flex-1 min-w-0 flex items-center justify-center animate-in fade-in duration-500"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            width={ad.width}
            height={ad.height}
            alt={ad.advertiserName}
            className="max-w-full h-auto max-h-[42px] rounded-md"
            style={{ border: 0 }}
          />
        </a>
        {ad.trackingPixel && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.trackingPixel} width={1} height={1} alt="" style={{ border: 0 }} />
        )}

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="広告を閉じる"
          className="shrink-0 p-1.5 text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-800 hover:bg-slate-800 light:hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
