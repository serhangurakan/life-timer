"use client";

import { useState } from "react";
import { useTimer } from "@/context/TimerContext";
import Modal from "@/components/Modal";

export default function InventoryPage() {
  const { inventory, isHydrated, useInventoryItems, playBalanceSeconds } = useTimer();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showUseModal, setShowUseModal] = useState(false);

  // Show loading state until hydrated from localStorage
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === inventory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inventory.map((item) => item.id));
    }
  };

  const selectedItems = inventory.filter((item) => selectedIds.includes(item.id));
  const totalSelectedMinutes = selectedItems.reduce((sum, item) => sum + item.minutes, 0);

  const handleUseClick = () => {
    if (selectedIds.length === 0) return;
    setShowUseModal(true);
  };

  const handleUseConfirm = () => {
    useInventoryItems(selectedIds);
    setSelectedIds([]);
    setShowUseModal(false);
  };

  // Format seconds to readable time
  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins} dk`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours} sa ${remainingMins} dk` : `${hours} sa`;
  };

  const currentPlayMinutes = Math.floor(playBalanceSeconds / 60);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Use Modal */}
      <Modal
        show={showUseModal}
        title="Süreleri Kullan"
        message={`Seçilen ${selectedIds.length} öğeyi kullanarak toplam ${totalSelectedMinutes} dakika Play bakiyesi eklensin mi?`}
        onConfirm={handleUseConfirm}
        onCancel={() => setShowUseModal(false)}
        confirmText="Kullan"
        cancelText="İptal"
      />

      {/* Header */}
      <h1 className="text-2xl font-bold text-center mb-2">Envanter</h1>

      {/* Current Play Balance */}
      <div className="text-center mb-6">
        <span className="text-sm text-gray-500">Mevcut Play Bakiyesi: </span>
        <span className="font-semibold text-blue-600">{formatMinutes(currentPlayMinutes)}</span>
      </div>

      {/* Inventory List */}
      {inventory.length === 0 ? (
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-gray-500 mb-2">Envanter boş</p>
          <p className="text-gray-400 text-sm">
            Görevleri tamamlayarak ödül kazanın ve burada toplayın
          </p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedIds.length === inventory.length ? "Seçimi Kaldır" : "Tümünü Seç"}
            </button>
            <span className="text-sm text-gray-500">
              {selectedIds.length} seçili ({totalSelectedMinutes} dk)
            </span>
          </div>

          {/* Items */}
          <div className="space-y-2 mb-20">
            {inventory.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "bg-white border-2 border-transparent shadow"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{item.title}</h3>
                      <p className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Minutes */}
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      +{item.minutes} dk
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Use Button - Fixed at bottom */}
      {inventory.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-gray-50 to-transparent pt-8">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleUseClick}
              disabled={selectedIds.length === 0}
              className={`w-full py-4 font-semibold rounded-xl transition-colors ${
                selectedIds.length > 0
                  ? "bg-green-500 text-white hover:bg-green-600 active:bg-green-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {selectedIds.length > 0
                ? `Kullan (+${totalSelectedMinutes} dk Play)`
                : "Öğe seçin"}
            </button>
          </div>
        </div>
      )}

      {/* Info text */}
      {inventory.length > 0 && (
        <p className="text-xs text-gray-400 text-center px-4 pb-24">
          Seçtiğiniz öğelerin dakikaları Play bakiyenize eklenir ve envanterden silinir.
        </p>
      )}
    </div>
  );
}
