import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip compression
  compress: true,

  // React compiler (experimental in Next.js 16)
  experimental: {
    // CRITICAL: Optimize barrel file imports for faster dev boot (15-70%) and cold starts (40%)
    // Rule: bundle-barrel-imports - Avoid loading entire libraries when only a few exports are needed
    optimizePackageImports: [
      "lucide-react",              // 1,583 modules → only used icons
      "recharts",                   // Heavy charting library
      "@radix-ui/react-icons",      // Icon library
      "motion/react",               // Animation library (formerly framer-motion)
      "date-fns",                   // Date utilities - loads many unnecessary locales
      "@tanstack/react-query",      // Data fetching
      "@tanstack/react-table",      // Table utilities
      "react-hook-form",            // Form library
      "zod",                        // Schema validation
      "react-sparklines",           // Sparkline charts
    ],
  },

  // Output configuration
  output: "standalone",

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws",
  },

  // Image optimization - using remotePatterns (domains is deprecated)
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
