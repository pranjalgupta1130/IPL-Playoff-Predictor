"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "./Navbar";
import { useSimulatorStore } from "@/store/simulatorStore";
import { useAuthStore } from "@/store/authStore";
import { Loader2, LogOut } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const fetchAll = useSimulatorStore((s) => s.fetchAll);
  const error = useSimulatorStore((s) => s.error);

  const {
    isAuthenticated,
    isInitialized,
    logout,
    user,
    initialize,
  } = useAuthStore();

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
    }
  }, [isAuthenticated, fetchAll]);

  // Route protection guard
  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login");
      } else if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
        router.push("/dashboard");
      }
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  // If auth is not initialized yet, show a clean loading spinner
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-sm font-medium text-muted-foreground">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/15">
      {isAuthenticated && <Navbar />}

      {/* Auth user top-bar for dashboard if authenticated */}
      {isAuthenticated && user && (
        <div className="mx-auto max-w-6xl px-4 pt-4 flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Logged in as <strong className="text-foreground">{user.email}</strong></span>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {isAuthenticated || pathname === "/login" ? (
          children
        ) : (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        )}
      </main>
    </div>
  );
}
