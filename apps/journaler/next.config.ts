import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jf/ui", "@jf/auth", "@jf/db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
        pathname: "/journaler/**",
      },
    ],
  },
};

export default nextConfig;
