import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: lets phones on the LAN load HMR/static assets when testing
  // via the machine's network IP. No effect on production builds.
  allowedDevOrigins: ["192.168.1.7"],
  experimental: {
    serverActions: {
      // Receipt uploads: 5MB image + form overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
