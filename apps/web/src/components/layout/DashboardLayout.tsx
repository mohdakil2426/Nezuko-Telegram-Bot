"use client";

import { ReactNode } from "react";
import { m } from "motion/react";
import Sidebar from "./Sidebar";
import ParticleBackground from "@/components/ParticleBackground";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { particles, animations, accentHex: accentColor } = useThemeConfig();

  return (
    <div className="min-h-screen bg-[var(--nezuko-bg)] relative overflow-hidden transition-colors duration-300">
      {/* Particle Background - Conditional */}
      {particles && <ParticleBackground />}

      {/* Enhanced Grid Pattern */}
      <div
        className="fixed inset-0 bg-grid-pattern opacity-60 pointer-events-none"
        style={{ backgroundSize: "40px 40px" }}
      />

      {/* Gradient Orbs - Only animate when animations are enabled, uses accent color */}
      <m.div
        className="fixed top-20 right-20 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}14 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
        animate={
          animations
            ? {
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }
            : { scale: 1, opacity: 0.6 }
        }
        transition={
          animations
            ? {
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : { duration: 0 }
        }
      />
      <m.div
        className="fixed bottom-20 left-1/3 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor}0f 0%, transparent 70%)`,
          filter: "blur(50px)",
        }}
        animate={
          animations
            ? {
                scale: [1.2, 1, 1.2],
                opacity: [0.6, 0.9, 0.6],
              }
            : { scale: 1, opacity: 0.7 }
        }
        transition={
          animations
            ? {
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : { duration: 0 }
        }
      />

      <Sidebar />
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
