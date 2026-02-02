"use client";

import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
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
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showPlayEndedNotification, setShowPlayEndedNotification] = useState(false);

  // Ref to track if we've requested notification permission
  const notificationPermissionRequested = useRef(false);
  // Ref to prevent saving during initial load
  const isInitialLoad = useRef(true);

  // ============================================
  // FIRESTORE SYNC - Load user data
  // ============================================
  useEffect(() => {
    if (!user) {
      setState(initialState);
      setIsHydrated(false);
      isInitialLoad.current = true;
      return;
    }

    // Subscribe to user's data in Firestore
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppState;
        setState({
          ...initialState,
          ...data,
          lastTickTimestamp: data.lastTickTimestamp || Date.now(),
        });
      } else {
        // New user - create initial document
        setDoc(userDocRef, {
          ...initialState,
          lastTickTimestamp: Date.now(),
        });
      }
      setIsHydrated(true);
      // Allow saving after initial load completes
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    });

    return () => unsubscribe();
  }, [user]);

  // ============================================
  // FIRESTORE SYNC - Save user data
  // ============================================
  useEffect(() => {
    if (!user || !isHydrated || isInitialLoad.current) return;

    const userDocRef = doc(db, "users", user.uid);
    setDoc(userDocRef, state, { merge: true });
  }, [user, state, isHydrated]);

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

  // ============================================
  // MAIN TIMER LOGIC - Date.now based
  // ============================================
  useEffect(() => {
    if (!isHydrated || !user) return;

    // Calculate elapsed time since last tick (handles refresh/background)
    const now = Date.now();
    const elapsedMs = now - state.lastTickTimestamp;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    // If significant time has passed (more than 1 second), catch up
    if (elapsedSeconds > 1 && !isInitialLoad.current) {
      setState((prev) => {
        let newWorkElapsed = prev.workElapsedSeconds;
        let newPlayBalance = prev.playBalanceSeconds;
        let newMode = prev.mode;

        if (prev.mode === "WORK") {
          newWorkElapsed += elapsedSeconds;
          newPlayBalance += Math.floor(elapsedSeconds * PLAY_GAIN_RATE);
        } else if (prev.mode === "PLAY") {
          newPlayBalance = Math.max(0, newPlayBalance - elapsedSeconds);
          if (newPlayBalance === 0) {
            newMode = "NOTHING";
            triggerPlayEndedNotification();
          }
        }

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
          newWorkElapsed += 1;
          newPlayBalance += PLAY_GAIN_RATE;
        } else if (prev.mode === "PLAY") {
          newPlayBalance = Math.max(0, newPlayBalance - 1);
          if (newPlayBalance === 0) {
            newMode = "NOTHING";
            triggerPlayEndedNotification();
          }
        }

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
  }, [isHydrated, user, state.lastTickTimestamp, state.mode, triggerPlayEndedNotification]);

  const dismissPlayEndedNotification = useCallback(() => {
    setShowPlayEndedNotification(false);
  }, []);

  // ============================================
  // MODE SETTER
  // ============================================
  const setMode = useCallback(
    (newMode: Mode) => {
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
    [state.playBalanceSeconds]
  );

  // ============================================
  // PENALTY (-5 minutes from work)
  // ============================================
  const applyPenalty = useCallback(() => {
    setState((prev) => {
      const newWorkElapsed = Math.max(0, prev.workElapsedSeconds - PENALTY_SECONDS);
      const playPenalty = Math.floor(PENALTY_SECONDS * PLAY_GAIN_RATE);
      const newPlayBalance = Math.max(0, prev.playBalanceSeconds - playPenalty);

      return {
        ...prev,
        workElapsedSeconds: newWorkElapsed,
        playBalanceSeconds: newPlayBalance,
      };
    });
  }, []);

  // ============================================
  // QUEST ACTIONS
  // ============================================
  const addQuest = useCallback((title: string, rewardMinutes: number) => {
    const newQuest: Quest = {
      id: crypto.randomUUID(),
      title,
      rewardMinutes,
    };
    setState((prev) => ({
      ...prev,
      quests: [...prev.quests, newQuest],
    }));
  }, []);

  const deleteQuest = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      quests: prev.quests.filter((q) => q.id !== id),
    }));
  }, []);

  const claimQuest = useCallback((quest: Quest) => {
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
  }, []);

  // ============================================
  // INVENTORY ACTIONS
  // ============================================
  const useInventoryItems = useCallback((ids: string[]) => {
    setState((prev) => {
      const selectedItems = prev.inventory.filter((item) => ids.includes(item.id));
      const totalMinutes = selectedItems.reduce((sum, item) => sum + item.minutes, 0);
      const totalSeconds = totalMinutes * 60;

      return {
        ...prev,
        playBalanceSeconds: prev.playBalanceSeconds + totalSeconds,
        inventory: prev.inventory.filter((item) => !ids.includes(item.id)),
      };
    });
  }, []);

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
