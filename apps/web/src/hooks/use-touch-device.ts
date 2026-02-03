"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the user is on a touch device.
 * Uses multiple detection methods for reliability.
 *
 * @returns boolean - true if touch device, false otherwise
 */
export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      // Check for touch support
      const hasTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints is IE-specific
        navigator.msMaxTouchPoints > 0;

      // Check if it's a coarse pointer (finger vs mouse)
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

      // Check if no hover support (touch-only devices)
      const noHover = window.matchMedia("(hover: none)").matches;

      setIsTouchDevice(hasTouch && (isCoarsePointer || noHover));
    };

    checkTouchDevice();

    // Listen for pointer type changes (e.g., tablet with keyboard)
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const handler = () => checkTouchDevice();

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isTouchDevice;
}

/**
 * Hook to detect if the user prefers reduced motion.
 * Respects system-level accessibility settings.
 *
 * @returns boolean - true if reduced motion preferred
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to detect if device is low-power (mobile or prefers reduced motion)
 * Use this to disable expensive animations like blur, parallax, etc.
 *
 * @returns boolean - true if should optimize for performance
 */
export function useLowPowerMode(): boolean {
  const isTouchDevice = useTouchDevice();
  const prefersReducedMotion = usePrefersReducedMotion();

  return isTouchDevice || prefersReducedMotion;
}

export default useTouchDevice;
