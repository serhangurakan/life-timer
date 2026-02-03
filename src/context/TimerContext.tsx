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
// PROVIDER COMPONENT
// ============================================
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showPlayEndedNotification, setShowPlayEndedNotification] = useState(false);

  const notificationPermissionRequested = useRef(false);
  const isLoadingFromFirestore = useRef(false);
  const lastSaveTime = useRef<number>(0);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<AppState>(state);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ============================================
  // DIRECT SAVE FUNCTION (no debounce)
  // ============================================
  const saveNow = useCallback(async (userId: string, data: AppState) => {
    if (isLoadingFromFirestore.current) return;

    try {
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, data);
      lastSaveTime.current = Date.now();
      console.log("[Firestore] Saved:", data.workElapsedSeconds, "work,", data.playBalanceSeconds, "play");
    } catch (error) {
      console.error("[Firestore] Save error:", error);
    }
  }, []);

  // ============================================
  // PERIODIC SAVE - Every 5 seconds while active
  // ============================================
  useEffect(() => {
    if (!user || !isHydrated) return;

    // Save every 5 seconds if mode is WORK or PLAY
    saveIntervalRef.current = setInterval(() => {
      const currentState = stateRef.current;
      if (currentState.mode === "WORK" || currentState.mode === "PLAY") {
        saveNow(user.uid, currentState);
      }
    }, 5000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [user, isHydrated, saveNow]);

  // ============================================
  // FIRESTORE LOAD - Only on mount/user change
  // ============================================
  useEffect(() => {
    if (!user) {
      setState(initialState);
      setIsHydrated(false);
      return;
    }

    const loadFromFirestore = async () => {
      isLoadingFromFirestore.current = true;
      console.log("[Firestore] Loading data for user:", user.uid);

      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as AppState;
          console.log("[Firestore] Loaded:", data);

          const now = Date.now();
          const lastTimestamp = data.lastTickTimestamp || now;
          const elapsedSeconds = Math.floor((now - lastTimestamp) / 1000);

          // Calculate time that passed while offline
          let workElapsed = data.workElapsedSeconds || 0;
          let playBalance = data.playBalanceSeconds || 0;
          let mode = data.mode || "NOTHING";

          if (elapsedSeconds > 0) {
            if (mode === "WORK") {
              workElapsed += elapsedSeconds;
              playBalance += Math.floor(elapsedSeconds * PLAY_GAIN_RATE);
              console.log("[Firestore] Added offline work time:", elapsedSeconds, "seconds");
            } else if (mode === "PLAY") {
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
          stateRef.current = newState;
        } else {
          console.log("[Firestore] No data found, creating new document");
          const newState = {
            ...initialState,
            lastTickTimestamp: Date.now(),
          };
          await setDoc(userDocRef, newState);
          setState(newState);
          stateRef.current = newState;
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
  // SAVE ON MODE CHANGE (immediate)
  // ============================================
  const previousMode = useRef<Mode>("NOTHING");
  useEffect(() => {
    if (!user || !isHydrated || isLoadingFromFirestore.current) return;

    // Save immediately when mode changes
    if (state.mode !== previousMode.current) {
      previousMode.current = state.mode;
      saveNow(user.uid, state);
    }
  }, [user, state.mode, state, isHydrated, saveNow]);

  // ============================================
  // SAVE ON PAGE VISIBILITY CHANGE
  // ============================================
  useEffect(() => {
    if (!user || !isHydrated) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        // Immediately save when user leaves
        console.log("[Firestore] Saving on visibility hidden");
        await saveNow(user.uid, stateRef.current);
      } else if (document.visibilityState === "visible") {
        // Reload from Firestore when user returns to get latest data
        console.log("[Firestore] Reloading on visibility visible");
        isLoadingFromFirestore.current = true;

        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as AppState;
            const now = Date.now();
            const lastTimestamp = data.lastTickTimestamp || now;
            const elapsedSeconds = Math.floor((now - lastTimestamp) / 1000);

            let workElapsed = data.workElapsedSeconds || 0;
            let playBalance = data.playBalanceSeconds || 0;
            let mode = data.mode || "NOTHING";

            if (elapsedSeconds > 0) {
              if (mode === "WORK") {
                workElapsed += elapsedSeconds;
                playBalance += Math.floor(elapsedSeconds * PLAY_GAIN_RATE);
              } else if (mode === "PLAY") {
                playBalance = Math.max(0, playBalance - elapsedSeconds);
                if (playBalance === 0) {
                  mode = "NOTHING";
                  triggerPlayEndedNotification();
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
            stateRef.current = newState;
          }
        } catch (error) {
          console.error("[Firestore] Reload error:", error);
        } finally {
          isLoadingFromFirestore.current = false;
        }
      }
    };

    const handleBeforeUnload = () => {
      // Sync save before page unload using navigator.sendBeacon workaround
      const data = JSON.stringify(stateRef.current);
      localStorage.setItem("life-timer-pending-save", data);
      localStorage.setItem("life-timer-pending-uid", user.uid);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Check for pending save from previous session
    const pendingSave = localStorage.getItem("life-timer-pending-save");
    const pendingUid = localStorage.getItem("life-timer-pending-uid");
    if (pendingSave && pendingUid === user.uid) {
      const pendingData = JSON.parse(pendingSave) as AppState;
      saveNow(user.uid, pendingData);
      localStorage.removeItem("life-timer-pending-save");
      localStorage.removeItem("life-timer-pending-uid");
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, isHydrated, saveNow]);

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
