"use client";

interface TimerDisplayProps {
  seconds: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

// Format seconds to HH:MM:SS or MM:SS
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function TimerDisplay({ seconds, label, size = "lg" }: TimerDisplayProps) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
  };

  return (
    <div className="flex flex-col items-center">
      <span className={`font-mono font-bold ${sizeClasses[size]} tabular-nums`}>
        {formatTime(seconds)}
      </span>
      {label && <span className="text-sm text-gray-500 mt-1">{label}</span>}
    </div>
  );
}

export { formatTime };
