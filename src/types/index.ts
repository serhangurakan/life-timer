// Life Timer - Core Types

export type Mode = "WORK" | "PLAY" | "NOTHING";

export interface Quest {
  id: string;
  title: string;
  rewardMinutes: number;
}

export interface InventoryItem {
  id: string;
  questId: string;
  title: string;
  minutes: number;
  createdAt: number; // timestamp
}

export interface TimerState {
  workElapsedSeconds: number;    // Total work time (chronometer, increases)
  playBalanceSeconds: number;    // Earned play time (increases during work, decreases during play)
  mode: Mode;
  lastTickTimestamp: number;     // For calculating elapsed time after refresh/background
}

export interface AppState extends TimerState {
  quests: Quest[];
  inventory: InventoryItem[];
}

// Play gain rate: 0.5 (10 min work = 5 min play)
export const PLAY_GAIN_RATE = 0.5;

// Penalty amount in seconds (5 minutes)
export const PENALTY_SECONDS = 300;
