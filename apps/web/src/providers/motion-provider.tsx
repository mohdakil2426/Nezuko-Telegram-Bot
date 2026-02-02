"use client";

import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { ReactNode } from "react";

/**
 * MotionProvider - Wraps the application with Motion's LazyMotion and MotionConfig
 *
 * Features:
 * - LazyMotion with domAnimation: 86% bundle reduction (~34KB → ~4.6KB)
 * - MotionConfig reducedMotion="user": Respects prefers-reduced-motion
 * - strict mode: Warns if motion.* is used instead of m.*
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
