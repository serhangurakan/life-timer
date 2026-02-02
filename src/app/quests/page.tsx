"use client";

import { useState } from "react";
import { useTimer } from "@/context/TimerContext";
import Modal from "@/components/Modal";
import { Quest } from "@/types";

export default function QuestsPage() {
  const { quests, isHydrated, claimQuest, deleteQuest } = useTimer();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Show loading state until hydrated from localStorage
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  const handleQuestClick = (quest: Quest) => {
    setSelectedQuest(quest);
    setShowClaimModal(true);
  };

  const handleClaimConfirm = () => {
    if (selectedQuest) {
      claimQuest(selectedQuest);
      setShowClaimModal(false);
      setSelectedQuest(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, quest: Quest) => {
    e.stopPropagation();
    setSelectedQuest(quest);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedQuest) {
      deleteQuest(selectedQuest.id);
      setShowDeleteModal(false);
      setSelectedQuest(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Claim Modal */}
      <Modal
        show={showClaimModal}
        title="Görevi Tamamla"
        message={`"${selectedQuest?.title}" görevini tamamlayıp ${selectedQuest?.rewardMinutes} dakika ödülü envantere ekleyeyim mi?`}
        onConfirm={handleClaimConfirm}
        onCancel={() => setShowClaimModal(false)}
        confirmText="Tamamla"
        cancelText="İptal"
      />

      {/* Delete Modal */}
      <Modal
        show={showDeleteModal}
        title="Görevi Sil"
        message={`"${selectedQuest?.title}" görevini silmek istediğinize emin misiniz?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
        confirmText="Sil"
        cancelText="İptal"
      />

      {/* Header */}
      <h1 className="text-2xl font-bold text-center mb-6">Görevler</h1>

      {/* Quest List */}
      {quests.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-500 mb-2">Henüz görev yok</p>
          <p className="text-gray-400 text-sm">Sağ alttaki + butonuna tıklayarak görev ekleyin</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quests.map((quest) => (
            <div
              key={quest.id}
              onClick={() => handleQuestClick(quest)}
              className="bg-white rounded-xl p-4 shadow hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between group"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{quest.title}</h3>
                <p className="text-sm text-gray-500">Tıkla = Tamamla + Envantere ekle</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  +{quest.rewardMinutes} dk
                </span>
                <button
                  onClick={(e) => handleDeleteClick(e, quest)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Görevi sil"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info text */}
      <p className="text-xs text-gray-400 text-center mt-6 px-4">
        Bir göreve tıklayarak tamamlayabilir ve ödülünü envantere ekleyebilirsiniz.
        <br />
        Aynı görevi birden fazla kez tamamlayabilirsiniz.
      </p>
    </div>
  );
}
