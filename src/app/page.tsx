"use client";

import { useTimer } from "@/context/TimerContext";
import TimerDisplay from "@/components/TimerDisplay";
import Toast from "@/components/Toast";

export default function HomePage() {
  const {
    workElapsedSeconds,
    playBalanceSeconds,
    mode,
    isHydrated,
    setMode,
    applyPenalty,
    showPlayEndedNotification,
    dismissPlayEndedNotification,
  } = useTimer();

  // Show loading state until hydrated from localStorage
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Play ended notification toast */}
      <Toast
        show={showPlayEndedNotification}
        message="Play süresi bitti! Çalışmaya geri dön."
        onDismiss={dismissPlayEndedNotification}
      />

      {/* Header */}
      <h1 className="text-2xl font-bold text-center mb-8">Life Timer</h1>

      {/* Work Panel */}
      <button
        onClick={() => setMode("WORK")}
        className={`w-full p-6 rounded-2xl mb-4 transition-all ${
          mode === "WORK"
            ? "bg-green-500 text-white shadow-lg scale-[1.02]"
            : "bg-white text-gray-700 shadow hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold">Work</span>
          {mode === "WORK" && (
            <span className="text-sm bg-green-600 px-2 py-1 rounded-full">Aktif</span>
          )}
        </div>
        <TimerDisplay seconds={workElapsedSeconds} size="lg" />
        <p className="text-sm mt-2 opacity-75">
          Toplam çalışma süresi (Play hakki = Work / 2)
        </p>
      </button>

      {/* Play Panel */}
      <button
        onClick={() => setMode("PLAY")}
        className={`w-full p-6 rounded-2xl mb-4 transition-all ${
          mode === "PLAY"
            ? "bg-blue-500 text-white shadow-lg scale-[1.02]"
            : "bg-white text-gray-700 shadow hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold">Play</span>
          {mode === "PLAY" && (
            <span className="text-sm bg-blue-600 px-2 py-1 rounded-full">Aktif</span>
          )}
        </div>
        <TimerDisplay seconds={playBalanceSeconds} size="lg" />
        <p className="text-sm mt-2 opacity-75">
          {playBalanceSeconds > 0
            ? "Kalan oyun/dinlenme süresi"
            : "Süre yok - Work yap veya Inventory kullan"}
        </p>
      </button>

      {/* Nothing Panel */}
      <button
        onClick={() => setMode("NOTHING")}
        className={`w-full p-4 rounded-2xl mb-6 transition-all ${
          mode === "NOTHING"
            ? "bg-gray-700 text-white shadow-lg scale-[1.02]"
            : "bg-white text-gray-700 shadow hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-semibold">Nothing (Duraklat)</span>
        </div>
        {mode === "NOTHING" && <p className="text-sm mt-1 opacity-75">Tüm sayaçlar durdu</p>}
      </button>

      {/* Penalty Button */}
      <div className="flex justify-center">
        <button
          onClick={applyPenalty}
          className="flex items-center gap-2 px-6 py-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:bg-red-300 transition-colors"
          title="Work süresinden 5 dakika düşer, Play bakiyesinden de 2.5 dakika düşer (yarı oran)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          <span className="font-medium">Penalty (-5 dk)</span>
        </button>
      </div>

      {/* Penalty explanation */}
      <p className="text-xs text-gray-400 text-center mt-2 px-4">
        Work&apos;ten 5 dk, Play&apos;den 2.5 dk düşer (oran korunur).
        <br />
        Açık unuttuğunuz süreyi geri almak için kullanın.
      </p>

      {/* Current mode indicator */}
      <div className="mt-8 text-center">
        <span className="text-sm text-gray-500">
          Şu anki mod:{" "}
          <span
            className={`font-semibold ${
              mode === "WORK"
                ? "text-green-600"
                : mode === "PLAY"
                ? "text-blue-600"
                : "text-gray-600"
            }`}
          >
            {mode}
          </span>
        </span>
      </div>
    </div>
  );
}
