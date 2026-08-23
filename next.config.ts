import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tests build into their own folder (see playwright.config.ts) so the
  // test server never fights the dev server over .next/.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
