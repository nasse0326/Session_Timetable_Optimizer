"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans text-slate-200">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="text-4xl">\u26A0\uFE0F</div>
        <h2 className="text-lg font-bold text-slate-100">
          \u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          {error.message || "\u4E88\u671F\u3057\u306A\u3044\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
        >
          \u518D\u8AAD\u307F\u8FBC\u307F\u3059\u308B
        </button>
      </div>
    </main>
  );
}
