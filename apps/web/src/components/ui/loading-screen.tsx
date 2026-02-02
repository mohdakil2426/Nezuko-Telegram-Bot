"use client";

import { m } from "motion/react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--nezuko-bg)] text-[var(--text-primary)] z-50">
      <div className="flex flex-col items-center gap-4">
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
        <p className="text-sm font-medium animate-pulse">Initializing...</p>
      </div>
    </div>
  );
}
