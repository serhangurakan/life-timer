"use client";

import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Mode,
  Quest,
  InventoryItem,
  AppState,
  PLAY_GAIN_RATE,
  PENALTY_SECONDS,
} from "@/types";

// ============================================
// INITIAL STATE
// ============================================
const initialState: AppState = {
  workElapsedSeconds: 0,
  playBalanceSeconds: 0,
  mode: "NOTHING",
  lastTickTimestamp: Date.now(),
  quests: [],
  inventory: [],
};

// ============================================
// CONTEXT TYPES
// ============================================
interface TimerContextType {
  // State
  workElapsedSeconds: number;
  playBalanceSeconds: number;
  mode: Mode;
  quests: Quest[];
  inventory: InventoryItem[];
  isHydrated: boolean;

  // Timer Actions
  setMode: (mode: Mode) => void;
  applyPenalty: () => void;

  // Quest Actions
  addQuest: (title: string, rewardMinutes: number) => void;
  deleteQuest: (id: string) => void;
  claimQuest: (quest: Quest) => void;

  // Inventory Actions
  useInventoryItems: (ids: string[]) => void;

  // Notification state
  showPlayEndedNotification: boolean;
  dismissPlayEndedNotification: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState, isHydrated] = useLocalStorage<AppState>("life-timer-state", initialState);
  const [showPlayEndedNotification, setShowPlayEndedNotification] = useState(false);

  // Ref to track if we've requested notification permission
  const notificationPermissionRequested = useRef(false);

  // ============================================
  // REQUEST NOTIFICATION PERMISSION
  // ============================================
  useEffect(() => {
    if (!notificationPermissionRequested.current && typeof Notification !== "undefined") {
      notificationPermissionRequested.current = true;
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // ============================================
  // MAIN TIMER LOGIC - Date.now based
  // ============================================
  useEffect(() => {
    if (!isHydrated) return;

    // Calculate elapsed time since last tick (handles refresh/background)
    const now = Date.now();
    const elapsedMs = now - state.lastTickTimestamp;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    // If significant time has passed (more than 1 second), catch up
    if (elapsedSeconds > 1) {
      setState((prev) => {
        let newWorkElapsed = prev.workElapsedSeconds;
        let newPlayBalance = prev.playBalanceSeconds;
        let newMode = prev.mode;

        if (prev.mode === "WORK") {
          // Work mode: add elapsed time to work, and half to play balance
          newWorkElapsed += elapsedSeconds;
          newPlayBalance += Math.floor(elapsedSeconds * PLAY_GAIN_RATE);
        } else if (prev.mode === "PLAY") {
          // Play mode: subtract elapsed time from play balance
          newPlayBalance = Math.max(0, newPlayBalance - elapsedSeconds);
          if (newPlayBalance === 0) {
            newMode = "NOTHING";
            // Trigger notification
            triggerPlayEndedNotification();
          }
        }
        // NOTHING mode: no changes

        return {
          ...prev,
          workElapsedSeconds: newWorkElapsed,
          playBalanceSeconds: newPlayBalance,
          mode: newMode,
          lastTickTimestamp: now,
        };
      });
    }

    // Set up interval for real-time updates (every second)
    const interval = setInterval(() => {
      setState((prev) => {
        const currentTime = Date.now();
        let newWorkElapsed = prev.workElapsedSeconds;
        let newPlayBalance = prev.playBalanceSeconds;
        let newMode = prev.mode;

        if (prev.mode === "WORK") {
          // WORK: increment work elapsed, add play balance at half rate
          newWorkElapsed += 1;
          newPlayBalance += PLAY_GAIN_RATE; // 0.5 seconds per second
        } else if (prev.mode === "PLAY") {
          // PLAY: decrement play balance
          newPlayBalance = Math.max(0, newPlayBalance - 1);
          if (newPlayBalance === 0) {
            // Play time ended!
            newMode = "NOTHING";
            triggerPlayEndedNotification();
          }
        }
        // NOTHING: no changes to timers

        return {
          ...prev,
          workElapsedSeconds: newWorkElapsed,
          playBalanceSeconds: newPlayBalance,
          mode: newMode,
          lastTickTimestamp: currentTime,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHydrated, setState, state.lastTickTimestamp, state.mode]);

  // ============================================
  // NOTIFICATION HELPERS
  // ============================================
  const triggerPlayEndedNotification = useCallback(() => {
    // Show in-app notification
    setShowPlayEndedNotification(true);

    // Try Web Notification API
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Life Timer", {
        body: "Play time is over! Time to get back to work or rest.",
        icon: "/favicon.ico",
      });
    }

    // Play a simple beep sound
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // Audio not available, ignore
    }
  }, []);

  const dismissPlayEndedNotification = useCallback(() => {
    setShowPlayEndedNotification(false);
  }, []);

  // ============================================
  // MODE SETTER
  // ============================================
  const setMode = useCallback(
    (newMode: Mode) => {
      // Don't allow switching to PLAY if balance is 0
      if (newMode === "PLAY" && state.playBalanceSeconds <= 0) {
        alert("Play bakiyeniz yok! Önce Work yapın veya Inventory'den süre kullanın.");
        return;
      }

      setState((prev) => ({
        ...prev,
        mode: newMode,
        lastTickTimestamp: Date.now(),
      }));
    },
    [setState, state.playBalanceSeconds]
  );

  // ============================================
  // PENALTY (-5 minutes from work)
  // ============================================
  const applyPenalty = useCallback(() => {
    setState((prev) => {
      // Reduce work by 5 minutes (300 seconds)
      const newWorkElapsed = Math.max(0, prev.workElapsedSeconds - PENALTY_SECONDS);

      // IMPORTANT: Reduce play balance proportionally (half of work penalty)
      // This maintains the 0.5 ratio between work and play earned
      // If user earned play through work, removing work should remove proportional play
      const playPenalty = Math.floor(PENALTY_SECONDS * PLAY_GAIN_RATE); // 150 seconds
      const newPlayBalance = Math.max(0, prev.playBalanceSeconds - playPenalty);

      return {
        ...prev,
        workElapsedSeconds: newWorkElapsed,
        playBalanceSeconds: newPlayBalance,
      };
    });
  }, [setState]);

  // ============================================
  // QUEST ACTIONS
  // ============================================
  const addQuest = useCallback(
    (title: string, rewardMinutes: number) => {
      const newQuest: Quest = {
        id: crypto.randomUUID(),
        title,
        rewardMinutes,
      };
      setState((prev) => ({
        ...prev,
        quests: [...prev.quests, newQuest],
      }));
    },
    [setState]
  );

  const deleteQuest = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        quests: prev.quests.filter((q) => q.id !== id),
      }));
    },
    [setState]
  );

  const claimQuest = useCallback(
    (quest: Quest) => {
      // Add to inventory
      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        questId: quest.id,
        title: quest.title,
        minutes: quest.rewardMinutes,
        createdAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        inventory: [...prev.inventory, newItem],
      }));
    },
    [setState]
  );

  // ============================================
  // INVENTORY ACTIONS
  // ============================================
  const useInventoryItems = useCallback(
    (ids: string[]) => {
      setState((prev) => {
        // Calculate total minutes from selected items
        const selectedItems = prev.inventory.filter((item) => ids.includes(item.id));
        const totalMinutes = selectedItems.reduce((sum, item) => sum + item.minutes, 0);
        const totalSeconds = totalMinutes * 60;

        // Add to play balance and remove items from inventory
        return {
          ...prev,
          playBalanceSeconds: prev.playBalanceSeconds + totalSeconds,
          inventory: prev.inventory.filter((item) => !ids.includes(item.id)),
        };
      });
    },
    [setState]
  );

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value: TimerContextType = {
    workElapsedSeconds: state.workElapsedSeconds,
    playBalanceSeconds: state.playBalanceSeconds,
    mode: state.mode,
    quests: state.quests,
    inventory: state.inventory,
    isHydrated,
    setMode,
    applyPenalty,
    addQuest,
    deleteQuest,
    claimQuest,
    useInventoryItems,
    showPlayEndedNotification,
    dismissPlayEndedNotification,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

// ============================================
// HOOK
// ============================================
export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
