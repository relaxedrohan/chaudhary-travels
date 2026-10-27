import type { NextConfig } from "next";

// GitHub Pages serves the site under /<repo>; locally it runs at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["192.168.1.6"],
  experimental: {
    // The persistent compile cache kept serving old code and CSS after edits
    // (stale styles, then "onValueChange is not a function"). This app is
    // small enough that compiling fresh each run costs almost nothing.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
