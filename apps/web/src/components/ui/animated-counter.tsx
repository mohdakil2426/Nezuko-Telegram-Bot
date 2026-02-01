"use client";

import { useEffect, useState } from "react";
import { useThemeConfig } from "@/lib/hooks/use-theme-config";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

/**
 * Animated number counter that counts up from 0 to target value.
 * Uses requestAnimationFrame for smooth animation.
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1500,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const { reducedMotion } = useThemeConfig();

  useEffect(() => {
    // If reduced motion, show final value immediately
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    const steps = 60;
    const increment = value / steps;
    let current = 0;

    // Reset to 0 when value changes
    setDisplayValue(0);

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, duration, reducedMotion]);

  return (
    <span className="tabular-nums">
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
