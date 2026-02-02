"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// SVG Icons as components
const QuestIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`w-6 h-6 ${active ? "text-blue-500" : "text-gray-500"}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`w-6 h-6 ${active ? "text-blue-500" : "text-gray-500"}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const InventoryIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`w-6 h-6 ${active ? "text-blue-500" : "text-gray-500"}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const AddIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export default function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isQuests = pathname === "/quests" || pathname === "/quests/new";
  const isInventory = pathname === "/inventory";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {/* Quest */}
        <Link
          href="/quests"
          className={`flex flex-col items-center justify-center w-16 h-full ${
            isQuests ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <QuestIcon active={isQuests} />
          <span className="text-xs mt-1">Quest</span>
        </Link>

        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-16 h-full ${
            isHome ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <HomeIcon active={isHome} />
          <span className="text-xs mt-1">Home</span>
        </Link>

        {/* Inventory */}
        <Link
          href="/inventory"
          className={`flex flex-col items-center justify-center w-16 h-full ${
            isInventory ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <InventoryIcon active={isInventory} />
          <span className="text-xs mt-1">Inventory</span>
        </Link>

        {/* Add button - only visible on quests page */}
        {isQuests && (
          <Link
            href="/quests/new"
            className="absolute right-4 bottom-20 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg active:bg-blue-600"
          >
            <AddIcon />
          </Link>
        )}
      </div>
    </nav>
  );
}
