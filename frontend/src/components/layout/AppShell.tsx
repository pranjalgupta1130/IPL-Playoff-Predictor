"use client";

import { useEffect } from "react";
import { Navbar } from "./Navbar";
import { useSimulatorStore } from "@/store/simulatorStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const fetchAll = useSimulatorStore((s) => s.fetchAll);
  const error = useSimulatorStore((s) => s.error);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/20">
      <Navbar />
      {error && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
