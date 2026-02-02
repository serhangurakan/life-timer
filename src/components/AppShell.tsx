"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

// Pages that don't require authentication
const publicRoutes = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicRoute) {
      // Not logged in and trying to access protected route
      router.push("/login");
    } else if (user && isPublicRoute) {
      // Logged in but on login/register page
      router.push("/");
    }
  }, [user, loading, isPublicRoute, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  // Public routes (login/register) - no bottom nav
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes - with bottom nav
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">Yönlendiriliyor...</div>
      </div>
    );
  }

  return (
    <>
      <main className="pb-20 min-h-screen">{children}</main>
      <BottomNav />
    </>
  );
}
