"use client";

import { m, AnimatePresence, type Transition } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
};

const pageTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
} as const;

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

// Stagger container for child animations
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({ children, className, delay = 0 }: StaggerContainerProps) {
  return (
    <m.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: delay,
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </m.div>
  );
}

// Stagger item for use within StaggerContainer
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <m.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
          },
        },
      }}
    >
      {children}
    </m.div>
  );
}

// Fade in animation wrapper
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 0.6,
}: FadeInProps) {
  const directions = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
    none: {},
  };

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </m.div>
  );
}

// Scale in animation wrapper
interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay,
      }}
    >
      {children}
    </m.div>
  );
}

// Floating animation wrapper
interface FloatingProps {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}

export function Floating({ children, className, amplitude = 10, duration = 4 }: FloatingProps) {
  return (
    <m.div
      className={className}
      animate={{
        y: [-amplitude, amplitude, -amplitude],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </m.div>
  );
}

// Glow pulse animation
interface GlowPulseProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

export function GlowPulse({
  children,
  className,
  color = "rgba(168, 85, 247, 0.5)",
}: GlowPulseProps) {
  return (
    <m.div
      className={className}
      animate={{
        boxShadow: [`0 0 20px ${color}`, `0 0 40px ${color}`, `0 0 20px ${color}`],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </m.div>
  );
}
