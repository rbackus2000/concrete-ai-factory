import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingExcludes: {
    "*": [
      "node_modules/three/**",
      "node_modules/@react-three/**",
      "node_modules/three-bvh-csg/**",
      "node_modules/@react-three/drei/**",
      "node_modules/@react-three/fiber/**",
      "node_modules/pdf-lib/**",
      "node_modules/jszip/**",
      "node_modules/@zxing/**",
      "public/generated-images/**",
    ],
  },
};

export default nextConfig;
