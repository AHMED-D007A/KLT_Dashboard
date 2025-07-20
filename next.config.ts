import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: "export",
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
