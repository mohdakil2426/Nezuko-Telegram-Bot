"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { m } from "motion/react";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  intensity?: number;
  glowColor?: string;
  enableTilt?: boolean;
  enableGlow?: boolean;
  /** Enable lift effect on hover */
  enableLift?: boolean;
  /** Lift amount in pixels (default: 4) */
  liftAmount?: number;
  /** Click handler - when provided, renders as a button */
  onClick?: () => void;
  /** Whether this card is currently selected */
  isSelected?: boolean;
}

export default function TiltCard({
  children,
  className,
  index = 0,
  intensity = 15,
  glowColor,
  enableTilt = true,
  enableGlow = true,
  enableLift = true,
  liftAmount = 4,
  onClick,
  isSelected = false,
}: TiltCardProps) {
  const { accentHex: accentColor } = useThemeConfig();
  // Use provided glowColor or derive from accent color
  const effectiveGlowColor = glowColor || `${accentColor}25`;
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltTransform, setTiltTransform] = useState({ rotateX: 0, rotateY: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current || !enableTilt) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -intensity;
      const rotateY = ((x - centerX) / centerX) * intensity;

      setTiltTransform({ rotateX, rotateY });
      setGlowPosition({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
      });
    },
    [enableTilt, intensity]
  );

  const handleMouseLeave = useCallback(() => {
    setTiltTransform({ rotateX: 0, rotateY: 0 });
    setGlowPosition({ x: 50, y: 50 });
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  // Interactive props when onClick is provided
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        "aria-pressed": isSelected,
      }
    : {};

  return (
    <m.div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 transition-colors duration-300",
        "bg-gradient-to-br from-[var(--nezuko-surface)] to-[var(--nezuko-surface)]/80",
        "backdrop-blur-xl group",
        // Selection styling
        isSelected
          ? "border-primary bg-primary/5"
          : "border-[var(--nezuko-border)] hover:border-[var(--nezuko-border-hover)]",
        // Cursor when clickable
        onClick && "cursor-pointer",
        className
      )}
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: 1,
        y: 0,
        // Apply lift and scale via framer-motion animate for smooth transitions
        scale: isHovered ? 1.02 : 1,
        translateY: isHovered && enableLift ? -liftAmount : 0,
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{
        // Entry animation
        opacity: { duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] },
        // Hover animations - fast and snappy
        scale: { type: "spring", stiffness: 400, damping: 25 },
        translateY: { type: "spring", stiffness: 400, damping: 25 },
      }}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
        // Only apply tilt rotation via style (this follows cursor without transition)
        transform: enableTilt
          ? `perspective(1000px) rotateX(${tiltTransform.rotateX}deg) rotateY(${tiltTransform.rotateY}deg)`
          : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      {...interactiveProps}
    >
      {/* Dynamic Glow Effect */}
      {enableGlow && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${glowPosition.x}% ${glowPosition.y}%, ${effectiveGlowColor}, transparent 40%)`,
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        />
      )}

      {/* Selection Glow - visible when selected */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${accentColor}15, transparent 70%)`,
          }}
        />
      )}

      {/* Static Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)",
        }}
      />

      {/* Border Glow on Hover */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500"
        style={{
          boxShadow: isHovered
            ? `inset 0 1px 0 0 rgba(255,255,255,0.1), 0 0 30px -10px ${effectiveGlowColor}`
            : "inset 0 1px 0 0 rgba(255,255,255,0.05)",
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full">{children}</div>
    </m.div>
  );
}

/**
 * SelectionIndicator - A checkmark indicator that animates in when selected
 */
interface SelectionIndicatorProps {
  isSelected: boolean;
  className?: string;
}

export function SelectionIndicator({ isSelected, className }: SelectionIndicatorProps) {
  return (
    <m.div
      className={cn("w-6 h-6 rounded-full bg-primary flex items-center justify-center", className)}
      initial={{ scale: 0 }}
      animate={{ scale: isSelected ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 15 }}
    >
      <svg
        className="w-4 h-4 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </m.div>
  );
}
