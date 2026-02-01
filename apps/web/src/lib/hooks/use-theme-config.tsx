"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ============================================
// Types
// ============================================

export type AccentId =
  | "cyberpunk"
  | "matrix"
  | "synthwave"
  | "system-error"
  | "admin"
  | "docker"
  | "toxic"
  | "night-city"
  | "galaxy"
  | "volcano"
  | "abyss"
  | "custom";

interface AccentConfig {
  id: AccentId;
  name: string;
  hsl: string; // Primary color in HSL (for CSS variables)
  hex: string; // Primary color in Hex (for charts/glow)
  gradient: string; // The gradient background
}

interface ThemeConfigContextType {
  // Accent color
  accentId: AccentId;
  setAccentId: (id: AccentId) => void;
  accentHex: string;
  accentGradient: string;

  // Custom color picker
  customColor: string;
  setCustomColor: (color: string) => void;

  // Effect toggles
  animations: boolean;
  setAnimations: (enabled: boolean) => void;
  glassEffects: boolean;
  setGlassEffects: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;

  // Particles
  particles: boolean;
  setParticles: (enabled: boolean) => void;
  particleDensity: number;
  setParticleDensity: (density: number) => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert hex color to HSL string (without 'hsl()' wrapper)
 */
function hexToHSL(hex: string): string {
  let r = 0,
    g = 0,
    b = 0;

  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;

  let h = 0;
  let s = 0;
  let l = 0;

  if (delta === 0) {
    h = 0;
  } else if (cmax === r) {
    h = ((g - b) / delta) % 6;
  } else if (cmax === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return `${h} ${s}% ${l}%`;
}

/**
 * Generate a complementary gradient from a hex color
 */
function generateGradient(hex: string): string {
  const hsl = hexToHSL(hex);
  const [h, s, l] = hsl.split(" ").map((v) => parseFloat(v));
  const h2 = (h + 40) % 360;
  return `linear-gradient(135deg, ${hex} 0%, hsl(${h2}, ${s}%, ${l}%) 100%)`;
}

// ============================================
// Accent Theme Definitions
// ============================================

export const ACCENT_THEMES: Record<AccentId, AccentConfig> = {
  custom: {
    id: "custom",
    name: "Custom",
    hsl: "0 0% 100%",
    hex: "#ffffff",
    gradient: "none",
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk",
    hsl: "300 76% 60%",
    hex: "#d946ef",
    gradient: "linear-gradient(135deg, #d946ef 0%, #06b6d4 100%)",
  },
  matrix: {
    id: "matrix",
    name: "Matrix",
    hsl: "142 69% 58%",
    hex: "#4ade80",
    gradient: "linear-gradient(135deg, #059669 0%, #a3e635 100%)",
  },
  synthwave: {
    id: "synthwave",
    name: "Synthwave",
    hsl: "270 95% 60%",
    hex: "#9333ea",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #f97316 100%)",
  },
  "system-error": {
    id: "system-error",
    name: "System Error",
    hsl: "0 84% 60%",
    hex: "#ef4444",
    gradient: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
  },
  admin: {
    id: "admin",
    name: "Admin Access",
    hsl: "45 93% 47%",
    hex: "#eab308",
    gradient: "linear-gradient(135deg, #eab308 0%, #f59e0b 100%)",
  },
  docker: {
    id: "docker",
    name: "Docker Blue",
    hsl: "190 90% 50%",
    hex: "#06b6d4",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #22d3ee 100%)",
  },
  toxic: {
    id: "toxic",
    name: "Toxic",
    hsl: "84 81% 44%",
    hex: "#84cc16",
    gradient: "linear-gradient(135deg, #84cc16 0%, #facc15 100%)",
  },
  "night-city": {
    id: "night-city",
    name: "Night City",
    hsl: "260 60% 65%",
    hex: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #4338ca 100%)",
  },
  galaxy: {
    id: "galaxy",
    name: "Galaxy",
    hsl: "270 91% 65%",
    hex: "#a855f7",
    gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 40%, #ec4899 70%, #f43f5e 100%)",
  },
  volcano: {
    id: "volcano",
    name: "Volcano",
    hsl: "24 94% 50%",
    hex: "#f97316",
    gradient: "linear-gradient(135deg, #ca8a04 0%, #ea580c 40%, #dc2626 70%, #991b1b 100%)",
  },
  abyss: {
    id: "abyss",
    name: "Abyss",
    hsl: "199 89% 48%",
    hex: "#0ea5e9",
    gradient: "linear-gradient(135deg, #15803d 0%, #0d9488 33%, #0284c7 66%, #4f46e5 100%)",
  },
};

// ============================================
// Context
// ============================================

const ThemeConfigContext = createContext<ThemeConfigContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

interface ThemeConfigProviderProps {
  children: ReactNode;
}

export function ThemeConfigProvider({ children }: ThemeConfigProviderProps) {
  // State
  const [accentId, setAccentIdState] = useState<AccentId>("cyberpunk");
  const [customColor, setCustomColorState] = useState<string>("#3b82f6");
  const [animations, setAnimationsState] = useState(true);
  const [glassEffects, setGlassEffectsState] = useState(true);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [particles, setParticlesState] = useState(true);
  const [particleDensity, setParticleDensityState] = useState(50);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedAccentId = localStorage.getItem("nezuko-accent-id") as AccentId;
    const savedCustomColor = localStorage.getItem("nezuko-custom-color");
    const savedAnimations = localStorage.getItem("nezuko-animations");
    const savedGlass = localStorage.getItem("nezuko-glass");
    const savedReducedMotion = localStorage.getItem("nezuko-reduced-motion");
    const savedParticles = localStorage.getItem("nezuko-particles");
    const savedParticleDensity = localStorage.getItem("nezuko-particle-density");

    if (savedAccentId && Object.keys(ACCENT_THEMES).includes(savedAccentId)) {
      setAccentIdState(savedAccentId);
    }
    if (savedCustomColor) setCustomColorState(savedCustomColor);
    if (savedAnimations !== null) setAnimationsState(savedAnimations === "true");
    if (savedGlass !== null) setGlassEffectsState(savedGlass === "true");
    if (savedReducedMotion !== null) setReducedMotionState(savedReducedMotion === "true");
    if (savedParticles !== null) setParticlesState(savedParticles === "true");
    if (savedParticleDensity !== null) {
      setParticleDensityState(parseInt(savedParticleDensity, 10) || 50);
    }

    setIsInitialized(true);
  }, []);

  // Apply accent color CSS variables
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;
    let colorData = ACCENT_THEMES[accentId];

    // Handle Custom Color
    if (accentId === "custom") {
      const hsl = hexToHSL(customColor);
      const gradient = generateGradient(customColor);
      colorData = {
        id: "custom",
        name: "Custom",
        hsl: hsl,
        hex: customColor,
        gradient: gradient,
      };
    } else if (!colorData) {
      colorData = ACCENT_THEMES["cyberpunk"];
    }

    if (colorData) {
      // Set all CSS variables that use primary color
      root.style.setProperty("--primary", colorData.hsl);
      root.style.setProperty("--ring", colorData.hsl);
      root.style.setProperty("--sidebar-primary", colorData.hsl);
      root.style.setProperty("--sidebar-ring", colorData.hsl);

      // Set gradient and hex variables
      root.style.setProperty("--accent-gradient", colorData.gradient);
      root.style.setProperty("--accent-hex", colorData.hex);
    }

    localStorage.setItem("nezuko-accent-id", accentId);
    localStorage.setItem("nezuko-custom-color", customColor);
  }, [accentId, customColor, isInitialized]);

  // Apply effect toggle classes
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;

    // Reduced Motion - disables all animations
    if (reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }

    // Glass Effects - removes backdrop blur
    if (!glassEffects) {
      root.classList.add("no-glass");
    } else {
      root.classList.remove("no-glass");
    }

    // Animations toggle
    if (!animations) {
      root.classList.add("no-animations");
    } else {
      root.classList.remove("no-animations");
    }

    localStorage.setItem("nezuko-animations", animations.toString());
    localStorage.setItem("nezuko-glass", glassEffects.toString());
    localStorage.setItem("nezuko-reduced-motion", reducedMotion.toString());
  }, [animations, glassEffects, reducedMotion, isInitialized]);

  // Persist particle settings
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("nezuko-particles", particles.toString());
    localStorage.setItem("nezuko-particle-density", particleDensity.toString());
  }, [particles, particleDensity, isInitialized]);

  // Setters with callbacks
  const setAccentId = useCallback((id: AccentId) => {
    setAccentIdState(id);
  }, []);

  const setCustomColor = useCallback((color: string) => {
    setCustomColorState(color);
  }, []);

  const setAnimations = useCallback((enabled: boolean) => {
    setAnimationsState(enabled);
  }, []);

  const setGlassEffects = useCallback((enabled: boolean) => {
    setGlassEffectsState(enabled);
  }, []);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled);
  }, []);

  const setParticles = useCallback((enabled: boolean) => {
    setParticlesState(enabled);
  }, []);

  const setParticleDensity = useCallback((density: number) => {
    setParticleDensityState(density);
  }, []);

  // Computed values
  const currentTheme =
    accentId === "custom"
      ? {
          hex: customColor,
          gradient: generateGradient(customColor),
        }
      : {
          hex: ACCENT_THEMES[accentId]?.hex || "#d946ef",
          gradient: ACCENT_THEMES[accentId]?.gradient || "",
        };

  const value: ThemeConfigContextType = {
    accentId,
    setAccentId,
    accentHex: currentTheme.hex,
    accentGradient: currentTheme.gradient,
    customColor,
    setCustomColor,
    animations,
    setAnimations,
    glassEffects,
    setGlassEffects,
    reducedMotion,
    setReducedMotion,
    particles,
    setParticles,
    particleDensity,
    setParticleDensity,
  };

  return <ThemeConfigContext.Provider value={value}>{children}</ThemeConfigContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useThemeConfig(): ThemeConfigContextType {
  const context = useContext(ThemeConfigContext);
  if (context === undefined) {
    throw new Error("useThemeConfig must be used within a ThemeConfigProvider");
  }
  return context;
}
