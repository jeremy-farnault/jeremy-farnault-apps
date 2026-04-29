import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  transpilePackages: ["@jf/ui", "@jf/auth", "@jf/db"],
  webpack: (config) => {
    config.externals.push({
      bufferutil: "commonjs bufferutil",
      "utf-8-validate": "commonjs utf-8-validate",
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
        pathname: "/classer/**",
      },
    ],
  },
};

export default withSerwist(nextConfig);
