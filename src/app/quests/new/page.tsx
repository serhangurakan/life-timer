"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTimer } from "@/context/TimerContext";

export default function AddQuestPage() {
  const router = useRouter();
  const { addQuest } = useTimer();

  const [title, setTitle] = useState("");
  const [rewardMinutes, setRewardMinutes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!title.trim()) {
      setError("Görev adı gerekli");
      return;
    }

    const minutes = parseInt(rewardMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      setError("Geçerli bir dakika değeri girin (1+)");
      return;
    }

    // Add quest and navigate back
    addQuest(title.trim(), minutes);
    router.push("/quests");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-2xl font-bold ml-2">Yeni Görev Ekle</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Görev Adı / Açıklaması
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="örn: 30 dakika kitap oku"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            autoFocus
          />
        </div>

        {/* Reward Input */}
        <div>
          <label htmlFor="reward" className="block text-sm font-medium text-gray-700 mb-2">
            Ödül (dakika)
          </label>
          <input
            type="number"
            id="reward"
            value={rewardMinutes}
            onChange={(e) => setRewardMinutes(e.target.value)}
            placeholder="örn: 15"
            min="1"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
          />
          <p className="text-xs text-gray-400 mt-1">
            Bu görevi tamamladığınızda kazanacağınız Play süresi
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors"
        >
          Görevi Kaydet
        </button>
      </form>

      {/* Example quests */}
      <div className="mt-8 p-4 bg-gray-100 rounded-xl">
        <h3 className="font-medium text-gray-700 mb-2">Örnek görevler:</h3>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• 30 dk kitap oku → 15 dk ödül</li>
          <li>• Spor yap → 30 dk ödül</li>
          <li>• Meditasyon yap → 10 dk ödül</li>
          <li>• Yeni bir şey öğren → 20 dk ödül</li>
        </ul>
      </div>
    </div>
  );
}
