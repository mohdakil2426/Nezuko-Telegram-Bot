"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion Provider
 * Enables LazyMotion for smaller bundle size (Rule 1.1 in Motion guide).
 * Only loads animation logic when needed.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
