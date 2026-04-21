import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingExcludes: {
    "*": [
      "node_modules/three/**",
      "node_modules/@react-three/**",
      "node_modules/three-bvh-csg/**",
    ],
  },
};

export default nextConfig;
