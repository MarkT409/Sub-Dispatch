import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Bundle build-time Google SA key into serverless traces (avoids Lambda 4KB env limit)
  outputFileTracingIncludes: {
    "/*": ["./secrets/google-sa.pem"],
  },
};

export default nextConfig;
