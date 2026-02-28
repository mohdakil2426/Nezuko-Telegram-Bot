"use client";

import { motion } from "@/components/motion-client";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Hoist variants outside component to avoid re-creation on every render
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const reducedContainerVariants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

const itemVariants = (y: number) => ({
  hidden: { opacity: 0, y },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
});

const reducedItemVariants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

/**
 * PageTransition wrapper
 * Encapsulates the staggered animation logic to allow parent pages
 * to remain Server Components (Next.js performance best practice).
 * Respects prefers-reduced-motion for accessibility.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={prefersReduced ? reducedContainerVariants : containerVariants}
    >
      {children}
    </motion.div>
  );
}

/**
 * Motion item for staggered revealing
 */
export function RevealItem({
  children,
  className,
  y = 15,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={prefersReduced ? reducedItemVariants : itemVariants(y)}
    >
      {children}
    </motion.div>
  );
}
