import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "recharts", "@insforge/sdk"],
  },
};

export default nextConfig;
