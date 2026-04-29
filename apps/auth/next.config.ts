import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jf/ui", "@jf/auth", "@jf/db"],
  serverExternalPackages: ["ws"],
  webpack: (config) => {
    config.externals.push("ws");
    return config;
  },
};

export default nextConfig;
