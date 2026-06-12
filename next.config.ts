import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Optimize heavy package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
      "recharts",
      "framer-motion",
    ],
  },
};

export default nextConfig;
