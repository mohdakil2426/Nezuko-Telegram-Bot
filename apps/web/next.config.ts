import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "recharts",
      "@insforge/sdk",
      "@insforge/nextjs",
      "@radix-ui/react-icons",
    ],
    // Restore scroll position on back/forward navigation (smoother UX)
    scrollRestoration: true,
    turbopackFileSystemCacheForBuild: true,
  },
  cacheComponents: true,
};

export default nextConfig;
