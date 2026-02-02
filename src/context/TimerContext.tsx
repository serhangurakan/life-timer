"use client";

import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
  workElapsedSeconds: number;
  playBalanceSeconds: number;
  mode: Mode;
  quests: Quest[];
  inventory: InventoryItem[];
  isHydrated: boolean;
  setMode: (mode: Mode) => void;
  applyPenalty: () => void;
  addQuest: (title: string, rewardMinutes: number) => void;
  deleteQuest: (id: string) => void;
  claimQuest: (quest: Quest) => void;
  useInventoryItems: (ids: string[]) => void;
  showPlayEndedNotification: boolean;
  dismissPlayEndedNotification: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

// ============================================
// DEBOUNCE HELPER
// ============================================
function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

// ============================================
// PROVIDER COMPONENT
// ============================================
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showPlayEndedNotification, setShowPlayEndedNotification] = useState(false);

  const notificationPermissionRequested = useRef(false);
  const isLoadingFromFirestore = useRef(false);
  const lastSavedState = useRef<string>("");

  // ============================================
  // FIRESTORE SAVE (debounced - 2 seconds)
  // ============================================
  const saveToFirestore = useDebouncedCallback(
    async (userId: string, data: AppState) => {
      if (isLoadingFromFirestore.current) return;

      const stateString = JSON.stringify(data);
      // Don't save if nothing changed
      if (stateString === lastSavedState.current) return;

      try {
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, data);
        lastSavedState.current = stateString;
        console.log("[Firestore] Saved at", new Date().toLocaleTimeString());
      } catch (error) {
        console.error("[Firestore] Save error:", error);
      }
    },
    2000 // Save every 2 seconds max
  );

  // ============================================
  // FIRESTORE LOAD - Only on mount/user change
  // ============================================
  useEffect(() => {
    if (!user) {
      setState(initialState);
      setIsHydrated(false);
      lastSavedState.current = "";
      return;
    }

    const loadFromFirestore = async () => {
      isLoadingFromFirestore.current = true;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as AppState;
          const now = Date.now();
          const lastTimestamp = data.lastTickTimestamp || now;
          const elapsedSeconds = Math.floor((now - lastTimestamp) / 1000);

          // Calculate time that passed while offline
          let workElapsed = data.workElapsedSeconds || 0;
          let playBalance = data.playBalanceSeconds || 0;
          let mode = data.mode || "NOTHING";

          if (elapsedSeconds > 0) {
            if (mode === "WORK") {
              // Add offline work time
              workElapsed += elapsedSeconds;
              playBalance += Math.floor(elapsedSeconds * PLAY_GAIN_RATE);
            } else if (mode === "PLAY") {
              // Subtract offline play time
              playBalance = Math.max(0, playBalance - elapsedSeconds);
              if (playBalance === 0) {
                mode = "NOTHING";
              }
            }
          }

          const newState: AppState = {
            workElapsedSeconds: workElapsed,
            playBalanceSeconds: playBalance,
            mode: mode,
            lastTickTimestamp: now,
            quests: data.quests || [],
            inventory: data.inventory || [],
          };

          setState(newState);
          lastSavedState.current = JSON.stringify(newState);
        } else {
          // New user - create initial document
          const newState = {
            ...initialState,
            lastTickTimestamp: Date.now(),
          };
          await setDoc(userDocRef, newState);
          setState(newState);
          lastSavedState.current = JSON.stringify(newState);
        }
      } catch (error) {
        console.error("[Firestore] Load error:", error);
      } finally {
        isLoadingFromFirestore.current = false;
        setIsHydrated(true);
      }
    };

    loadFromFirestore();
  }, [user]);

  // ============================================
  // SAVE STATE CHANGES TO FIRESTORE
  // ============================================
  useEffect(() => {
    if (!user || !isHydrated || isLoadingFromFirestore.current) return;
    saveToFirestore(user.uid, state);
  }, [user, state, isHydrated, saveToFirestore]);

  // ============================================
  // SAVE ON PAGE VISIBILITY CHANGE (tab switch, minimize)
  // ============================================
  useEffect(() => {
    if (!user || !isHydrated) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        // Immediately save when user leaves
        try {
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, state);
          lastSavedState.current = JSON.stringify(state);
          console.log("[Firestore] Saved on visibility hidden");
        } catch (error) {
          console.error("[Firestore] Save on hidden error:", error);
        }
      } else if (document.visibilityState === "visible") {
        // Recalculate time when user returns
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - state.lastTickTimestamp) / 1000);

        if (elapsedSeconds > 1) {
          setState((prev) => {
            let workElapsed = prev.workElapsedSeconds;
            let playBalance = prev.playBalanceSeconds;
            let mode = prev.mode;

            if (prev.mode === "WORK") {
              workElapsed += elapsedSeconds;
              playBalance += Math.floor(elapsedSeconds * PLAY_GAIN_RATE);
            } else if (prev.mode === "PLAY") {
              playBalance = Math.max(0, playBalance - elapsedSeconds);
              if (playBalance === 0) {
                mode = "NOTHING";
                triggerPlayEndedNotification();
              }
            }

            return {
              ...prev,
              workElapsedSeconds: workElapsed,
              playBalanceSeconds: playBalance,
              mode,
              lastTickTimestamp: now,
            };
          });
        }
      }
    };

    const handleBeforeUnload = async () => {
      // Save before page unload
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, state);
        } catch {
          // Ignore errors on unload
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
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
    setShowPlayEndedNotification(true);

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Life Timer", {
        body: "Play süresi bitti! Çalışmaya geri dön.",
        icon: "/favicon.ico",
      });
    }

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
      // Audio not available
    }
  }, []);

  // ============================================
  // MAIN TIMER LOGIC - Date.now based
  // ============================================
  useEffect(() => {
    if (!isHydrated || !user) return;

    const interval = setInterval(() => {
      setState((prev) => {
        const currentTime = Date.now();
        let workElapsed = prev.workElapsedSeconds;
        let playBalance = prev.playBalanceSeconds;
        let mode = prev.mode;

        if (prev.mode === "WORK") {
          workElapsed += 1;
          playBalance += PLAY_GAIN_RATE;
        } else if (prev.mode === "PLAY") {
          playBalance = Math.max(0, playBalance - 1);
          if (playBalance === 0) {
            mode = "NOTHING";
            triggerPlayEndedNotification();
          }
        }

        return {
          ...prev,
          workElapsedSeconds: workElapsed,
          playBalanceSeconds: playBalance,
          mode,
          lastTickTimestamp: currentTime,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHydrated, user, triggerPlayEndedNotification]);

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
  // PENALTY
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
