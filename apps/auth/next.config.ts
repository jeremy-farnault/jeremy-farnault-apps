import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jf/ui", "@jf/auth", "@jf/db"],
};

export default nextConfig;
