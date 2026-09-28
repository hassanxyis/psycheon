import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server in `.next/standalone/` so the Docker image
  // only ships traced production files instead of the full `node_modules`.
  // (See Dockerfile — this is what the production container runs.)
  output: "standalone",
};

export default nextConfig;
