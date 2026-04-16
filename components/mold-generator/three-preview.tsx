"use client";

import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoldGeneratorSku } from "@/lib/services/mold-generator-service";
import { generateMoldGeometry } from "@/lib/mold-generator/geometries";
import { downloadSTL } from "@/lib/mold-generator/stl-exporter";

type Props = {
  sku: MoldGeneratorSku | null;
};

function buildGeometryInput(sku: MoldGeneratorSku) {
  return {
    outerLength: sku.outerLength,
    outerWidth: sku.outerWidth,
    outerHeight: sku.outerHeight,
    innerLength: sku.innerLength,
    innerWidth: sku.innerWidth,
    innerDepth: sku.innerDepth,
    wallThickness: sku.wallThickness,
    bottomThickness: sku.bottomThickness,
    topLipThickness: sku.topLipThickness,
    longRibCount: sku.longRibCount,
    crossRibCount: sku.crossRibCount,
    ribWidth: sku.ribWidth,
    ribHeight: sku.ribHeight,
    drainDiameter: sku.drainDiameter,
    drainType: sku.drainType,
    slopeDirection: sku.slopeDirection,
    cornerRadius: sku.cornerRadius,
    hasOverflow: sku.hasOverflow,
    overflowHoleDiameter: sku.overflowHoleDiameter,
    basinSlopeDeg: sku.basinSlopeDeg,
    domeRiseMin: sku.domeRiseMin,
    domeRiseMax: sku.domeRiseMax,
    type: sku.type,
    category: sku.category,
  };
}

function MoldScene({ sku }: { sku: MoldGeneratorSku }) {
  const groupRef = useRef<THREE.Group>(null);

  const moldGroup = useMemo(() => {
    return generateMoldGeometry(buildGeometryInput(sku));
  }, [sku]);

  return (
    <group ref={groupRef}>
      <primitive object={moldGroup} />
    </group>
  );
}

export function ThreePreview({ sku }: Props) {
  function handleDownloadSTL() {
    if (!sku) return;
    const group = generateMoldGeometry(buildGeometryInput(sku));
    downloadSTL(group, `${sku.code}-mold.stl`);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>3D Mold Preview</CardTitle>
        {sku && (
          <button
            type="button"
            onClick={handleDownloadSTL}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Download STL
          </button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] w-full bg-zinc-950">
          {sku ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Loading 3D preview...
                </div>
              }
            >
              <Canvas
                camera={{ position: [400, 300, 400], fov: 45, near: 1, far: 10000 }}
                gl={{ antialias: true }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[200, 400, 200]} intensity={0.8} />
                <MoldScene sku={sku} />
                <OrbitControls
                  enableDamping
                  dampingFactor={0.1}
                  minDistance={50}
                  maxDistance={2000}
                />
                <gridHelper args={[1000, 20, 0x333333, 0x222222]} />
              </Canvas>
            </Suspense>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
              <p className="text-sm font-medium">No product selected</p>
              <p className="text-xs">Select a SKU to preview the mold geometry</p>
            </div>
          )}
        </div>
        {sku && (
          <div className="border-t border-border bg-muted/50 px-4 py-2">
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#888888]" /> Outer Shell
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#4a9eff]" /> Inner Cavity
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#ffaa00]" /> Ribs / Texture
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#ff4444]" /> Drain
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#22cc88]" /> Overflow
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
