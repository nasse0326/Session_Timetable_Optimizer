"use client";

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, CheckCircle2 } from 'lucide-react';

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export default function QrScanner({ onScan, onClose, isDark = true }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
          videoRef.current.play();
          requestRef.current = requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("カメラへのアクセスが拒否されたか、カメラが見つかりません。ブラウザの設定を確認してください。");
      }
    };

    const tick = () => {
      if (scanned) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            setScanned(true);
            onScan(code.data);
            
            // 少し待ってから閉じる（成功を視覚的に伝えるため）
            setTimeout(() => {
              onClose();
            }, 1500);
            return;
          }
        }
      }
      
      requestRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan, onClose, scanned]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-3xl overflow-hidden border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        {/* ヘッダー */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2 text-white text-sm font-bold drop-shadow-md">
            <Camera className="w-4 h-4" />
            <span>参加者のQRをスキャン</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* カメラ映像 */}
        <div className="relative aspect-[3/4] bg-black overflow-hidden flex flex-col items-center justify-center">
          {error ? (
            <div className="p-6 text-center text-red-400 text-sm font-medium">
              {error}
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* スキャン枠ガイド */}
              {!scanned && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white/30 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                  </div>
                  <p className="mt-6 text-white text-sm font-bold drop-shadow-lg bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md">
                    枠内にQRコードを合わせてください
                  </p>
                </div>
              )}

              {/* 成功アニメーション */}
              {scanned && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-500/90 backdrop-blur-sm text-white animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-20 h-20 mb-4" />
                  <p className="text-xl font-bold">読み取り成功！</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
