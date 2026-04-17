"use client";

import * as THREE from "three";

type SkuGeometryInput = {
  outerLength: number; // inches
  outerWidth: number;
  outerHeight: number;
  innerLength: number;
  innerWidth: number;
  innerDepth: number;
  wallThickness: number;
  bottomThickness: number;
  topLipThickness: number;
  longRibCount: number;
  crossRibCount: number;
  ribWidth: number;
  ribHeight: number;
  drainDiameter: number;
  drainType: string;
  slopeDirection: string;
  cornerRadius: number;
  hasOverflow: boolean;
  overflowHoleDiameter: number;
  basinSlopeDeg: number;
  domeRiseMin: number;
  domeRiseMax: number;
  type: string;
  category: string;
  name: string;
  code: string;
};

const IN_TO_MM = 25.4;
const MOLD_BASE_THICKNESS = 10; // mm base plate under the product

/**
 * Generates a THREE.js Group containing wireframe meshes
 * representing the mold form for the given SKU.
 */
export function generateMoldGeometry(sku: SkuGeometryInput): THREE.Group {
  if (sku.category === "WALL_TILE") {
    return generateTileMoldGeometry(sku);
  }

  const isRound = sku.outerLength === sku.outerWidth && sku.innerLength === sku.innerWidth && sku.category === "VESSEL_SINK";
  const isOval = !isRound && sku.category === "VESSEL_SINK" && sku.type.toLowerCase().match(/oval|bowl/);
  const hasHorizontalRidges = sku.longRibCount >= 6 && sku.crossRibCount === 0;
  const hasVerticalChannels = sku.crossRibCount >= 8 && sku.longRibCount === 0;

  if (isRound && hasHorizontalRidges) {
    return generateRidgeVesselGeometry(sku);
  }
  if (hasVerticalChannels || isOval) {
    return generateChannelVesselGeometry(sku);
  }
  if (isRound) {
    return generateRoundVesselGeometry(sku);
  }
  return generateRectangularMoldGeometry(sku);
}

/**
 * Creates a wireframe display AND a hidden solid mesh from the same geometry.
 * The wireframe is visible in the 3D preview; the solid mesh is invisible
 * but gets picked up by the STL exporter for valid triangle data.
 */
function createWireframeMesh(geometry: THREE.BufferGeometry, color: number): THREE.Group {
  const container = new THREE.Group();

  // Hidden solid mesh — STL exporter collects triangles from this
  const solidMat = new THREE.MeshBasicMaterial({ visible: false });
  container.add(new THREE.Mesh(geometry, solidMat));

  // Visible wireframe — what the user sees in the preview
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({ color });
  container.add(new THREE.LineSegments(edges, lineMat));

  return container;
}

/**
 * Generates a shaped basin interior based on the sink type.
 * - Erosion: organic undulating floor with dome rise
 * - Ramp/Slope: tilted floor plane from front to back
 * - Facet: angular faceted planes inside the cavity
 * - Default: flat bottom with optional dome rise
 */
function generateBasinInterior(
  sku: SkuGeometryInput,
  moldHeight: number,
  iL: number,
  iW: number,
  iD: number,
): THREE.Group {
  const basinGroup = new THREE.Group();
  const searchText = `${sku.name} ${sku.type} ${sku.code}`.toLowerCase();
  const isErosion = searchText.includes("erosion") || searchText.includes("carved");
  const isRamp = searchText.includes("ramp") || sku.slopeDirection.toLowerCase().includes("back");
  const isFacet = searchText.includes("facet");

  const cavityTopY = moldHeight;
  const segX = 16; // resolution along length
  const segZ = 12; // resolution along width
  const domeRise = ((sku.domeRiseMin + sku.domeRiseMax) / 2) * IN_TO_MM;
  const slopeRad = (sku.basinSlopeDeg * Math.PI) / 180;

  if (isErosion) {
    // Organic erosion basin — undulating floor with sine-wave displacement
    const floorGeo = new THREE.PlaneGeometry(iL, iW, segX, segZ);
    const pos = floorGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // PlaneGeometry Y maps to our Z
      // Organic undulation: layered sine waves at different frequencies
      const wave1 = Math.sin(x * 0.025) * Math.cos(z * 0.03) * domeRise * 2.5;
      const wave2 = Math.sin(x * 0.06 + 1.2) * Math.sin(z * 0.05 + 0.8) * domeRise * 1.5;
      const wave3 = Math.cos(x * 0.04 - 0.5) * Math.cos(z * 0.07 + 2.1) * domeRise * 1.0;
      // Radial falloff from center — deeper near center, rising toward edges
      const nx = x / (iL / 2);
      const nz = z / (iW / 2);
      const radial = 1 - Math.sqrt(nx * nx + nz * nz) * 0.4;
      const height = (wave1 + wave2 + wave3) * Math.max(0.3, radial);
      pos.setZ(i, height);
    }
    floorGeo.computeVertexNormals();
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(0, cavityTopY - iD + domeRise, 0);
    basinGroup.add(createWireframeMesh(floorGeo, 0x4a9eff));

    // Basin walls — 4 side panels connecting floor to rim
    addBasinWalls(basinGroup, iL, iW, iD, cavityTopY, 0x4a9eff);

    // Rim outline at the top
    const rimGeo = new THREE.PlaneGeometry(iL, iW, 1, 1);
    rimGeo.rotateX(-Math.PI / 2);
    rimGeo.translate(0, cavityTopY, 0);
    basinGroup.add(createWireframeMesh(rimGeo, 0x4a9eff));

  } else if (isRamp) {
    // Ramp basin — floor tilts from front (high) down to rear (low) at slopeAngle
    const rampDrop = Math.tan(slopeRad) * iW;
    const floorGeo = new THREE.PlaneGeometry(iL, iW, 2, 2);
    const pos = floorGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getY(i); // local Y = our Z direction
      // Slope: front edge (positive Z) is higher, rear edge (negative Z) is lower
      const normalized = (z + iW / 2) / iW; // 0 at rear, 1 at front
      const slopeOffset = normalized * rampDrop;
      pos.setZ(i, slopeOffset);
    }
    floorGeo.computeVertexNormals();
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(0, cavityTopY - iD, 0);
    basinGroup.add(createWireframeMesh(floorGeo, 0x4a9eff));

    // Basin walls
    addBasinWalls(basinGroup, iL, iW, iD, cavityTopY, 0x4a9eff);

    // Trough line at the rear (lowest point)
    const troughPoints = [
      new THREE.Vector3(-iL / 2, cavityTopY - iD, -iW / 2),
      new THREE.Vector3(iL / 2, cavityTopY - iD, -iW / 2),
    ];
    const troughGeo = new THREE.BufferGeometry().setFromPoints(troughPoints);
    basinGroup.add(new THREE.Line(troughGeo, new THREE.LineBasicMaterial({ color: 0x4a9eff, linewidth: 2 })));

    // Rim outline
    const rimGeo = new THREE.PlaneGeometry(iL, iW, 1, 1);
    rimGeo.rotateX(-Math.PI / 2);
    rimGeo.translate(0, cavityTopY, 0);
    basinGroup.add(createWireframeMesh(rimGeo, 0x4a9eff));

  } else if (isFacet) {
    // Faceted basin — angular planes meeting at center crease
    // Create two tilted planes meeting at a center ridge (jewel-cut)
    const halfL = iL / 2;
    const facetDepth = iD * 0.7;
    const centerRise = domeRise > 0 ? domeRise : iD * 0.15;

    // Left facet plane
    const leftVerts = new Float32Array([
      -halfL, cavityTopY - iD + centerRise, 0,  // center ridge
      -halfL, cavityTopY - facetDepth, -iW / 2,  // left-rear bottom
      halfL, cavityTopY - facetDepth, -iW / 2,   // right-rear bottom
      halfL, cavityTopY - iD + centerRise, 0,    // center ridge
    ]);
    const leftIdx = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const leftGeo = new THREE.BufferGeometry();
    leftGeo.setAttribute("position", new THREE.BufferAttribute(leftVerts, 3));
    leftGeo.setIndex(new THREE.BufferAttribute(leftIdx, 1));
    leftGeo.computeVertexNormals();
    basinGroup.add(createWireframeMesh(leftGeo, 0x4a9eff));

    // Right facet plane
    const rightVerts = new Float32Array([
      -halfL, cavityTopY - iD + centerRise, 0,
      -halfL, cavityTopY - facetDepth, iW / 2,
      halfL, cavityTopY - facetDepth, iW / 2,
      halfL, cavityTopY - iD + centerRise, 0,
    ]);
    const rightGeo = new THREE.BufferGeometry();
    rightGeo.setAttribute("position", new THREE.BufferAttribute(rightVerts, 3));
    rightGeo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
    rightGeo.computeVertexNormals();
    basinGroup.add(createWireframeMesh(rightGeo, 0x4a9eff));

    // Center crease line
    const creasePts = [
      new THREE.Vector3(-halfL, cavityTopY - iD + centerRise, 0),
      new THREE.Vector3(halfL, cavityTopY - iD + centerRise, 0),
    ];
    const creaseGeo = new THREE.BufferGeometry().setFromPoints(creasePts);
    basinGroup.add(new THREE.Line(creaseGeo, new THREE.LineBasicMaterial({ color: 0x4a9eff })));

    // Basin walls + rim
    addBasinWalls(basinGroup, iL, iW, iD, cavityTopY, 0x4a9eff);
    const rimGeo = new THREE.PlaneGeometry(iL, iW, 1, 1);
    rimGeo.rotateX(-Math.PI / 2);
    rimGeo.translate(0, cavityTopY, 0);
    basinGroup.add(createWireframeMesh(rimGeo, 0x4a9eff));

  } else {
    // Default flat basin with optional dome rise
    if (domeRise > 0) {
      // Domed floor — subtle convex curve at the basin bottom
      const floorGeo = new THREE.PlaneGeometry(iL, iW, segX, segZ);
      const pos = floorGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / (iL / 2);
        const z = pos.getY(i) / (iW / 2);
        const r = Math.sqrt(x * x + z * z);
        const dome = Math.cos(Math.min(r, 1) * Math.PI * 0.5) * domeRise;
        pos.setZ(i, dome);
      }
      floorGeo.computeVertexNormals();
      floorGeo.rotateX(-Math.PI / 2);
      floorGeo.translate(0, cavityTopY - iD, 0);
      basinGroup.add(createWireframeMesh(floorGeo, 0x4a9eff));
    } else {
      // Truly flat bottom
      const flatGeo = new THREE.PlaneGeometry(iL, iW, 1, 1);
      flatGeo.rotateX(-Math.PI / 2);
      flatGeo.translate(0, cavityTopY - iD, 0);
      basinGroup.add(createWireframeMesh(flatGeo, 0x4a9eff));
    }

    // Basin walls + rim
    addBasinWalls(basinGroup, iL, iW, iD, cavityTopY, 0x4a9eff);
    const rimGeo = new THREE.PlaneGeometry(iL, iW, 1, 1);
    rimGeo.rotateX(-Math.PI / 2);
    rimGeo.translate(0, cavityTopY, 0);
    basinGroup.add(createWireframeMesh(rimGeo, 0x4a9eff));
  }

  return basinGroup;
}

/**
 * Adds 4 vertical wall planes around the basin perimeter.
 */
function addBasinWalls(
  group: THREE.Group,
  iL: number,
  iW: number,
  iD: number,
  topY: number,
  color: number,
) {
  const bottomY = topY - iD;

  // Front wall (+Z)
  const frontGeo = new THREE.PlaneGeometry(iL, iD, 1, 1);
  frontGeo.translate(0, topY - iD / 2, iW / 2);
  group.add(createWireframeMesh(frontGeo, color));

  // Back wall (-Z)
  const backGeo = new THREE.PlaneGeometry(iL, iD, 1, 1);
  backGeo.rotateY(Math.PI);
  backGeo.translate(0, topY - iD / 2, -iW / 2);
  group.add(createWireframeMesh(backGeo, color));

  // Left wall (-X)
  const leftGeo = new THREE.PlaneGeometry(iW, iD, 1, 1);
  leftGeo.rotateY(Math.PI / 2);
  leftGeo.translate(-iL / 2, topY - iD / 2, 0);
  group.add(createWireframeMesh(leftGeo, color));

  // Right wall (+X)
  const rightGeo = new THREE.PlaneGeometry(iW, iD, 1, 1);
  rightGeo.rotateY(-Math.PI / 2);
  rightGeo.translate(iL / 2, topY - iD / 2, 0);
  group.add(createWireframeMesh(rightGeo, color));
}

/**
 * Rectangular sink/furniture mold — outer shell + shaped inner cavity + drain + overflow
 */
function generateRectangularMoldGeometry(sku: SkuGeometryInput): THREE.Group {
  const group = new THREE.Group();
  const oL = sku.outerLength * IN_TO_MM;
  const oW = sku.outerWidth * IN_TO_MM;
  const oH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;
  const iL = sku.innerLength * IN_TO_MM;
  const iW = sku.innerWidth * IN_TO_MM;
  const iD = sku.innerDepth * IN_TO_MM;

  // Outer shell (mold box)
  const outerBox = new THREE.BoxGeometry(oL, oH, oW);
  outerBox.translate(0, oH / 2, 0);
  group.add(createWireframeMesh(outerBox, 0x888888));

  // Inner cavity — shape depends on sink type
  if (iL > 0 && iW > 0 && iD > 0) {
    const basinGroup = generateBasinInterior(sku, oH, iL, iW, iD);
    group.add(basinGroup);
  }

  // Ribs (structural reinforcement under cavity)
  if (sku.longRibCount > 0) {
    const ribW = sku.ribWidth * IN_TO_MM;
    const ribH = sku.ribHeight * IN_TO_MM;
    const spacing = iL / (sku.longRibCount + 1);
    for (let i = 1; i <= sku.longRibCount; i++) {
      const rib = new THREE.BoxGeometry(ribW, ribH, iW * 0.8);
      rib.translate(-iL / 2 + spacing * i, oH - iD - ribH / 2, 0);
      group.add(createWireframeMesh(rib, 0xffaa00));
    }
  }
  if (sku.crossRibCount > 0 && sku.crossRibCount < 8) {
    const ribW = sku.ribWidth * IN_TO_MM;
    const ribH = sku.ribHeight * IN_TO_MM;
    const spacing = iW / (sku.crossRibCount + 1);
    for (let i = 1; i <= sku.crossRibCount; i++) {
      const rib = new THREE.BoxGeometry(iL * 0.8, ribH, ribW);
      rib.translate(0, oH - iD - ribH / 2, -iW / 2 + spacing * i);
      group.add(createWireframeMesh(rib, 0xffaa00));
    }
  }

  // ── DRAIN ──────────────────────────────────────────────────
  if (sku.drainDiameter > 0) {
    const drainType = sku.drainType.toLowerCase();

    if (drainType === "slot") {
      // Slot drain: narrow rectangular opening running across the basin width
      // Positioned at the rear of the basin (where slope directs water)
      const slotWidth = sku.drainDiameter * IN_TO_MM;  // slot width = drain diameter
      const slotLength = iW * 0.75;                     // 75% of inner basin width
      const slotDepth = MOLD_BASE_THICKNESS + 2;

      // Place slot at rear of basin (positive Z = rear for "Front to Back" slope)
      const slopeToRear = sku.slopeDirection.toLowerCase().includes("back");
      const slotZOffset = slopeToRear ? iW / 2 - slotWidth : 0;
      const slotXOffset = 0; // centered on Datum B

      const slotGeo = new THREE.BoxGeometry(slotLength, slotDepth, slotWidth);
      slotGeo.translate(slotXOffset, MOLD_BASE_THICKNESS / 2, slopeToRear ? -slotZOffset : 0);
      group.add(createWireframeMesh(slotGeo, 0xff4444));

    } else if (drainType === "grid") {
      // Grid drain: round opening with a crosshatch grid inside
      const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
      const drainCyl = new THREE.CylinderGeometry(drainR, drainR, MOLD_BASE_THICKNESS + 2, 16);
      drainCyl.translate(0, MOLD_BASE_THICKNESS / 2, 0);
      group.add(createWireframeMesh(drainCyl, 0xff4444));

      // Grid crossbars inside drain
      const barThickness = 2;
      for (let i = -1; i <= 1; i++) {
        if (i === 0) continue;
        const hBar = new THREE.BoxGeometry(drainR * 1.6, barThickness, barThickness);
        hBar.translate(0, MOLD_BASE_THICKNESS / 2, i * drainR * 0.4);
        group.add(createWireframeMesh(hBar, 0xff4444));
        const vBar = new THREE.BoxGeometry(barThickness, barThickness, drainR * 1.6);
        vBar.translate(i * drainR * 0.4, MOLD_BASE_THICKNESS / 2, 0);
        group.add(createWireframeMesh(vBar, 0xff4444));
      }

    } else {
      // Round drain (default)
      const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
      const drainCyl = new THREE.CylinderGeometry(drainR, drainR, MOLD_BASE_THICKNESS + 2, 16);
      drainCyl.translate(0, MOLD_BASE_THICKNESS / 2, 0);
      group.add(createWireframeMesh(drainCyl, 0xff4444));
    }
  }

  // ── OVERFLOW HOLE ──────────────────────────────────────────
  // Positioned on the rear basin wall, 1" below the top lip, centered on Datum C
  if (sku.hasOverflow && sku.overflowHoleDiameter > 0 && iW > 0 && iD > 0) {
    const overflowR = (sku.overflowHoleDiameter * IN_TO_MM) / 2;
    const lipOffset = sku.topLipThickness * IN_TO_MM;
    // Overflow sits 1" below top of basin opening on the rear wall
    const overflowY = oH - lipOffset - (1 * IN_TO_MM);
    // Rear wall center (positive Z direction = rear)
    const rearWallZ = -iW / 2;
    const wallT = sku.wallThickness * IN_TO_MM;

    // Cylinder punched through the rear wall
    const overflowCyl = new THREE.CylinderGeometry(overflowR, overflowR, wallT + 4, 16);
    overflowCyl.rotateX(Math.PI / 2);
    overflowCyl.translate(0, overflowY, rearWallZ);
    group.add(createWireframeMesh(overflowCyl, 0x22cc88));
  }

  return group;
}

/**
 * Simple round vessel (S7-ROUND) — cylinder with basin, no ridges
 */
function generateRoundVesselGeometry(sku: SkuGeometryInput): THREE.Group {
  const group = new THREE.Group();
  const outerR = (sku.outerLength * IN_TO_MM) / 2;
  const innerR = (sku.innerLength * IN_TO_MM) / 2;
  const totalH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;
  const innerD = sku.innerDepth * IN_TO_MM;

  // Outer cylinder
  const outerCyl = new THREE.CylinderGeometry(outerR, outerR, totalH, 32);
  outerCyl.translate(0, totalH / 2, 0);
  group.add(createWireframeMesh(outerCyl, 0x888888));

  // Inner basin cavity
  if (innerR > 0 && innerD > 0) {
    const innerCyl = new THREE.CylinderGeometry(innerR, innerR, innerD, 32);
    innerCyl.translate(0, totalH - innerD / 2, 0);
    group.add(createWireframeMesh(innerCyl, 0x4a9eff));
  }

  // Drain hole
  if (sku.drainDiameter > 0) {
    const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
    const drain = new THREE.CylinderGeometry(drainR, drainR, MOLD_BASE_THICKNESS + 2, 16);
    drain.translate(0, MOLD_BASE_THICKNESS / 2, 0);
    group.add(createWireframeMesh(drain, 0xff4444));
  }

  return group;
}

/**
 * Round vessel with horizontal ridges (The Ridge — S9-RIDGE)
 */
function generateRidgeVesselGeometry(sku: SkuGeometryInput): THREE.Group {
  const group = new THREE.Group();
  const outerR = (sku.outerLength * IN_TO_MM) / 2;
  const innerR = (sku.innerLength * IN_TO_MM) / 2;
  const totalH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;
  const innerD = sku.innerDepth * IN_TO_MM;

  // Outer cylinder (mold body)
  const outerCyl = new THREE.CylinderGeometry(outerR, outerR, totalH, 32);
  outerCyl.translate(0, totalH / 2, 0);
  group.add(createWireframeMesh(outerCyl, 0x888888));

  // Inner basin cavity
  const innerCyl = new THREE.CylinderGeometry(innerR, innerR, innerD, 32);
  innerCyl.translate(0, totalH - innerD / 2, 0);
  group.add(createWireframeMesh(innerCyl, 0x4a9eff));

  // Horizontal ridge rings on the exterior
  const productH = sku.outerHeight * IN_TO_MM;
  const ridgeDepth = sku.ribHeight * IN_TO_MM;
  if (sku.longRibCount > 0 && ridgeDepth > 0) {
    const spacing = productH / (sku.longRibCount + 1);
    for (let i = 1; i <= sku.longRibCount; i++) {
      const y = MOLD_BASE_THICKNESS + spacing * i;
      const ridgeR = outerR + ridgeDepth;
      const ridge = new THREE.TorusGeometry(ridgeR, ridgeDepth / 2, 8, 32);
      ridge.rotateX(Math.PI / 2);
      ridge.translate(0, y, 0);
      group.add(createWireframeMesh(ridge, 0xffaa00));
    }
  }

  // Drain hole
  if (sku.drainDiameter > 0) {
    const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
    const drain = new THREE.CylinderGeometry(drainR, drainR, MOLD_BASE_THICKNESS + 2, 16);
    drain.translate(0, MOLD_BASE_THICKNESS / 2, 0);
    group.add(createWireframeMesh(drain, 0xff4444));
  }

  return group;
}

/**
 * Oval vessel with vertical channels (The Channel — S10-CHANNEL)
 */
function generateChannelVesselGeometry(sku: SkuGeometryInput): THREE.Group {
  const group = new THREE.Group();
  const oL = sku.outerLength * IN_TO_MM;
  const oW = sku.outerWidth * IN_TO_MM;
  const totalH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;
  const iL = sku.innerLength * IN_TO_MM;
  const iW = sku.innerWidth * IN_TO_MM;
  const iD = sku.innerDepth * IN_TO_MM;

  // Approximate oval with elliptical cylinder using lathe
  const outerShape = createEllipseShape(oL / 2, oW / 2, 64);
  const outerGeo = new THREE.ExtrudeGeometry(outerShape, { depth: totalH, bevelEnabled: false });
  outerGeo.rotateX(-Math.PI / 2);
  outerGeo.translate(0, 0, 0);
  group.add(createWireframeMesh(outerGeo, 0x888888));

  // Inner cavity
  if (iL > 0 && iW > 0 && iD > 0) {
    const innerShape = createEllipseShape(iL / 2, iW / 2, 64);
    const innerGeo = new THREE.ExtrudeGeometry(innerShape, { depth: iD, bevelEnabled: false });
    innerGeo.rotateX(-Math.PI / 2);
    innerGeo.translate(0, totalH - iD, 0);
    group.add(createWireframeMesh(innerGeo, 0x4a9eff));
  }

  // Vertical channels as line indicators around the perimeter
  const channelCount = sku.crossRibCount;
  const channelDepth = sku.ribHeight * IN_TO_MM;
  const productH = sku.outerHeight * IN_TO_MM;
  const rimBand = 5; // mm smooth rim band at top

  if (channelCount > 0 && channelDepth > 0) {
    for (let i = 0; i < channelCount; i++) {
      const angle = (i / channelCount) * Math.PI * 2;
      const rx = (oL / 2 + channelDepth) * Math.cos(angle);
      const rz = (oW / 2 + channelDepth) * Math.sin(angle);

      const points = [
        new THREE.Vector3(rx, MOLD_BASE_THICKNESS, rz),
        new THREE.Vector3(rx, MOLD_BASE_THICKNESS + productH - rimBand, rz),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffaa00 }));
      group.add(line);
    }
  }

  // Drain hole
  if (sku.drainDiameter > 0) {
    const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
    const drain = new THREE.CylinderGeometry(drainR, drainR, MOLD_BASE_THICKNESS + 2, 16);
    drain.translate(0, MOLD_BASE_THICKNESS / 2, 0);
    group.add(createWireframeMesh(drain, 0xff4444));
  }

  return group;
}

/**
 * Tile mold — flat slab with optional surface texture indicators
 */
function generateTileMoldGeometry(sku: SkuGeometryInput): THREE.Group {
  const group = new THREE.Group();
  const tileW = sku.outerLength * IN_TO_MM;
  const tileH = sku.outerWidth * IN_TO_MM;
  const tileT = sku.outerHeight * IN_TO_MM;

  // Main tile slab
  const slab = new THREE.BoxGeometry(tileW, tileT, tileH);
  slab.translate(0, tileT / 2, 0);
  group.add(createWireframeMesh(slab, 0x888888));

  // Horizontal ridges on top face (Ridge Tile)
  if (sku.longRibCount > 0 && sku.ribHeight > 0) {
    const ridgeDepth = sku.ribHeight * IN_TO_MM;
    const spacing = tileH / (sku.longRibCount + 1);
    for (let i = 1; i <= sku.longRibCount; i++) {
      const ridge = new THREE.BoxGeometry(tileW * 0.95, ridgeDepth, sku.ribWidth * IN_TO_MM);
      ridge.translate(0, tileT + ridgeDepth / 2, -tileH / 2 + spacing * i);
      group.add(createWireframeMesh(ridge, 0xffaa00));
    }
  }

  // Vertical channels on top face (Channel Tile)
  if (sku.crossRibCount > 0 && sku.ribHeight > 0) {
    const channelDepth = sku.ribHeight * IN_TO_MM;
    const spacing = tileW / (sku.crossRibCount + 1);
    for (let i = 1; i <= sku.crossRibCount; i++) {
      const channel = new THREE.BoxGeometry(sku.ribWidth * IN_TO_MM, channelDepth, tileH * 0.95);
      channel.translate(-tileW / 2 + spacing * i, tileT + channelDepth / 2, 0);
      group.add(createWireframeMesh(channel, 0xffaa00));
    }
  }

  return group;
}

function createEllipseShape(rx: number, ry: number, segments: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(rx, 0);
  for (let i = 1; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    shape.lineTo(rx * Math.cos(angle), ry * Math.sin(angle));
  }
  return shape;
}
