import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Session Timetable Optimizer | セッション曲順自動最適化ツール",
  description: "軽音サークルやセッションの演奏希望データから、連続出演や時間制約を考慮した最適なタイムテーブルを自動生成します。",
};

// 保存済みテーマをbodyへ即時反映し、ダーク→ライトの一瞬の切り替わり（FOUC）を防ぐための
// 初回描画前に実行される最小限のインラインスクリプト。localStorageのみを参照し、外部入力は扱わない。
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('session_timetable_theme');if(t==='light'){document.body.classList.add('light-theme');}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        suppressHydrationWarning: 上記スクリプトがハイドレーション前にbodyへlight-themeクラスを
        付与するため、サーバー描画時のclassNameと意図的に差異が生じる（想定通りの挙動）
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
