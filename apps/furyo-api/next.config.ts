import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jf/auth", "@jf/db", "@jf/furyo-logic"],
  webpack: (config) => {
    config.externals.push({
      bufferutil: "commonjs bufferutil",
      "utf-8-validate": "commonjs utf-8-validate",
    });
    return config;
  },
};

export default nextConfig;
