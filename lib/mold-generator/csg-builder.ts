"use client";

import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION, ADDITION, INTERSECTION } from "three-bvh-csg";

import type { MoldGeneratorSku } from "@/lib/services/mold-generator-service";
import type { SectionPlan } from "@/lib/engines/mold-print-engine";

const IN_TO_MM = 25.4;
const MOLD_BASE_THICKNESS = 10; // mm base plate under the product

/**
 * Builds a watertight solid mold mesh using CSG boolean operations.
 * Outer shell minus inner cavity minus drain minus overflow = printable mold.
 *
 * For multi-section molds, pass a sectionIndex to clip to that section only.
 */
export function buildSolidMoldMesh(
  sku: MoldGeneratorSku,
  sectionPlan: SectionPlan,
  sectionIndex?: number,
): THREE.BufferGeometry {
  if (sku.category === "WALL_TILE") {
    return buildTileSolidGeometry(sku);
  }

  const isRound =
    sku.outerLength === sku.outerWidth &&
    sku.innerLength === sku.innerWidth &&
    sku.category === "VESSEL_SINK";
  const isOval =
    !isRound &&
    sku.category === "VESSEL_SINK" &&
    sku.type.toLowerCase().match(/oval|bowl/);

  let moldGeo: THREE.BufferGeometry;
  if (isRound) {
    moldGeo = buildRoundMoldCSG(sku);
  } else if (isOval) {
    moldGeo = buildOvalMoldCSG(sku);
  } else {
    moldGeo = buildRectangularMoldCSG(sku);
  }

  // Section clipping for multi-section molds
  if (sectionIndex !== undefined && !sectionPlan.fitsInOnePrint) {
    moldGeo = clipToSection(moldGeo, sku, sectionPlan, sectionIndex);
  }

  // Ensure geometry is centered at origin, base on build plate
  moldGeo.computeBoundingBox();
  const bb = moldGeo.boundingBox!;
  moldGeo.translate(
    -(bb.min.x + bb.max.x) / 2,
    -bb.min.y,
    -(bb.min.z + bb.max.z) / 2,
  );

  return moldGeo;
}

// ── Rectangular Mold CSG ────────────────────────────────────────

function buildRectangularMoldCSG(sku: MoldGeneratorSku): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const dummyMat = new THREE.MeshBasicMaterial();

  const oL = sku.outerLength * IN_TO_MM;
  const oW = sku.outerWidth * IN_TO_MM;
  const oH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;
  const iL = sku.innerLength * IN_TO_MM;
  const iW = sku.innerWidth * IN_TO_MM;
  const iD = sku.innerDepth * IN_TO_MM;

  // Outer solid box
  const outerGeo = new THREE.BoxGeometry(oL, oH, oW);
  outerGeo.translate(0, oH / 2, 0);
  let result = new Brush(outerGeo, dummyMat);

  // Subtract inner cavity
  if (iL > 0 && iW > 0 && iD > 0) {
    const cavityGeo = new THREE.BoxGeometry(iL, iD + 1, iW); // +1mm to punch through top
    cavityGeo.translate(0, oH - iD / 2 + 0.5, 0);
    const cavityBrush = new Brush(cavityGeo, dummyMat);
    result = evaluator.evaluate(result, cavityBrush, SUBTRACTION);

    // Add shaped basin floor insert (erosion, ramp, facet, dome)
    const floorInsert = buildBasinFloorInsert(sku, oH, iL, iW, iD);
    if (floorInsert) {
      const floorBrush = new Brush(floorInsert, dummyMat);
      result = evaluator.evaluate(result, floorBrush, ADDITION);
    }
  }

  // Subtract drain hole
  if (sku.drainDiameter > 0) {
    const drainGeo = buildDrainGeometry(sku, oH, iW);
    const drainBrush = new Brush(drainGeo, dummyMat);
    result = evaluator.evaluate(result, drainBrush, SUBTRACTION);
  }

  // Subtract overflow hole
  if (sku.hasOverflow && sku.overflowHoleDiameter > 0 && iW > 0 && iD > 0) {
    const overflowGeo = buildOverflowGeometry(sku, oH);
    const overflowBrush = new Brush(overflowGeo, dummyMat);
    result = evaluator.evaluate(result, overflowBrush, SUBTRACTION);
  }

  return result.geometry;
}

// ── Round Mold CSG ──────────────────────────────────────────────

function buildRoundMoldCSG(sku: MoldGeneratorSku): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const dummyMat = new THREE.MeshBasicMaterial();

  const outerR = (sku.outerLength * IN_TO_MM) / 2;
  const innerR = (sku.innerLength * IN_TO_MM) / 2;
  const totalH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;
  const innerD = sku.innerDepth * IN_TO_MM;

  // Outer cylinder
  const outerGeo = new THREE.CylinderGeometry(outerR, outerR, totalH, 48);
  outerGeo.translate(0, totalH / 2, 0);
  let result = new Brush(outerGeo, dummyMat);

  // Subtract inner basin
  if (innerR > 0 && innerD > 0) {
    const innerGeo = new THREE.CylinderGeometry(innerR, innerR, innerD + 1, 48);
    innerGeo.translate(0, totalH - innerD / 2 + 0.5, 0);
    const innerBrush = new Brush(innerGeo, dummyMat);
    result = evaluator.evaluate(result, innerBrush, SUBTRACTION);
  }

  // Add ridge torus geometry if present (The Ridge vessel)
  if (sku.longRibCount >= 6 && sku.crossRibCount === 0 && sku.ribHeight > 0) {
    const productH = sku.outerHeight * IN_TO_MM;
    const ridgeDepth = sku.ribHeight * IN_TO_MM;
    const spacing = productH / (sku.longRibCount + 1);
    for (let i = 1; i <= sku.longRibCount; i++) {
      const y = MOLD_BASE_THICKNESS + spacing * i;
      const ridgeR = outerR + ridgeDepth * 0.5;
      const torusGeo = new THREE.TorusGeometry(ridgeR, ridgeDepth / 2, 12, 48);
      torusGeo.rotateX(Math.PI / 2);
      torusGeo.translate(0, y, 0);
      const torusBrush = new Brush(torusGeo, dummyMat);
      result = evaluator.evaluate(result, torusBrush, ADDITION);
    }
  }

  // Subtract drain
  if (sku.drainDiameter > 0) {
    const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
    const drainGeo = new THREE.CylinderGeometry(drainR, drainR, MOLD_BASE_THICKNESS + 4, 24);
    drainGeo.translate(0, MOLD_BASE_THICKNESS / 2, 0);
    const drainBrush = new Brush(drainGeo, dummyMat);
    result = evaluator.evaluate(result, drainBrush, SUBTRACTION);
  }

  return result.geometry;
}

// ── Oval Mold CSG ───────────────────────────────────────────────

function buildOvalMoldCSG(sku: MoldGeneratorSku): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const dummyMat = new THREE.MeshBasicMaterial();

  const oL = sku.outerLength * IN_TO_MM;
  const oW = sku.outerWidth * IN_TO_MM;
  const totalH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;
  const iL = sku.innerLength * IN_TO_MM;
  const iW = sku.innerWidth * IN_TO_MM;
  const iD = sku.innerDepth * IN_TO_MM;

  // Outer elliptical extrusion
  const outerShape = createEllipseShape(oL / 2, oW / 2, 64);
  const outerGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: totalH,
    bevelEnabled: false,
  });
  outerGeo.rotateX(-Math.PI / 2);
  let result = new Brush(outerGeo, dummyMat);

  // Subtract inner cavity
  if (iL > 0 && iW > 0 && iD > 0) {
    const innerShape = createEllipseShape(iL / 2, iW / 2, 64);
    const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
      depth: iD + 1,
      bevelEnabled: false,
    });
    innerGeo.rotateX(-Math.PI / 2);
    innerGeo.translate(0, totalH - iD, 0);
    const innerBrush = new Brush(innerGeo, dummyMat);
    result = evaluator.evaluate(result, innerBrush, SUBTRACTION);
  }

  // Subtract drain
  if (sku.drainDiameter > 0) {
    const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
    const drainGeo = new THREE.CylinderGeometry(drainR, drainR, MOLD_BASE_THICKNESS + 4, 24);
    drainGeo.translate(0, MOLD_BASE_THICKNESS / 2, 0);
    const drainBrush = new Brush(drainGeo, dummyMat);
    result = evaluator.evaluate(result, drainBrush, SUBTRACTION);
  }

  return result.geometry;
}

// ── Tile Solid Geometry ─────────────────────────────────────────

function buildTileSolidGeometry(sku: MoldGeneratorSku): THREE.BufferGeometry {
  const searchText = `${sku.name} ${sku.type} ${sku.code}`.toLowerCase();
  const isHex = searchText.includes("hex") || searchText.includes("tectonic");

  if (isHex) {
    return buildHexTileSolidGeometry(sku);
  }

  const evaluator = new Evaluator();
  const dummyMat = new THREE.MeshBasicMaterial();

  const tileW = sku.outerLength * IN_TO_MM;
  const tileH = sku.outerWidth * IN_TO_MM;
  const tileT = sku.outerHeight * IN_TO_MM;

  // Main slab
  const slabGeo = new THREE.BoxGeometry(tileW, tileT, tileH);
  slabGeo.translate(0, tileT / 2, 0);
  let result = new Brush(slabGeo, dummyMat);

  // Add ridges on top face
  if (sku.longRibCount > 0 && sku.ribHeight > 0) {
    const ridgeDepth = sku.ribHeight * IN_TO_MM;
    const ribW = sku.ribWidth * IN_TO_MM;
    const spacing = tileH / (sku.longRibCount + 1);
    for (let i = 1; i <= sku.longRibCount; i++) {
      const ridgeGeo = new THREE.BoxGeometry(tileW * 0.95, ridgeDepth, ribW);
      ridgeGeo.translate(0, tileT + ridgeDepth / 2, -tileH / 2 + spacing * i);
      const ridgeBrush = new Brush(ridgeGeo, dummyMat);
      result = evaluator.evaluate(result, ridgeBrush, ADDITION);
    }
  }

  // Add vertical channels on top face
  if (sku.crossRibCount > 0 && sku.ribHeight > 0) {
    const channelDepth = sku.ribHeight * IN_TO_MM;
    const ribW = sku.ribWidth * IN_TO_MM;
    const spacing = tileW / (sku.crossRibCount + 1);
    for (let i = 1; i <= sku.crossRibCount; i++) {
      const channelGeo = new THREE.BoxGeometry(ribW, channelDepth, tileH * 0.95);
      channelGeo.translate(-tileW / 2 + spacing * i, tileT + channelDepth / 2, 0);
      const channelBrush = new Brush(channelGeo, dummyMat);
      result = evaluator.evaluate(result, channelBrush, ADDITION);
    }
  }

  return result.geometry;
}

// ── Hex Tile Solid Geometry ──────────────────────────────────────

function buildHexTileSolidGeometry(sku: MoldGeneratorSku): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const dummyMat = new THREE.MeshBasicMaterial();

  const pointToPoint = sku.outerLength * IN_TO_MM;
  const tileT = sku.outerHeight * IN_TO_MM;
  const hexR = pointToPoint / 2;

  // Create hex shape (flat-top orientation)
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = hexR * Math.cos(angle);
    const z = hexR * Math.sin(angle);
    if (i === 0) hexShape.moveTo(x, z);
    else hexShape.lineTo(x, z);
  }
  hexShape.closePath();

  // Extrude base hex tile
  const hexGeo = new THREE.ExtrudeGeometry(hexShape, { depth: tileT, bevelEnabled: false });
  hexGeo.rotateX(-Math.PI / 2);
  ensureUvs(hexGeo);
  let result = new Brush(hexGeo, dummyMat);

  // Add varying depth facets on top surface
  const facetDepth = (sku.ribHeight > 0 ? sku.ribHeight : 0.5) * IN_TO_MM;
  for (let i = 0; i < 5; i++) {
    const angle1 = (Math.PI / 3) * i - Math.PI / 6;
    const angle2 = (Math.PI / 3) * (i + 1) - Math.PI / 6;
    const depth = facetDepth * (0.4 + Math.sin(i * 1.7) * 0.6);

    const facetShape = new THREE.Shape();
    facetShape.moveTo(0, 0);
    facetShape.lineTo(hexR * 0.93 * Math.cos(angle1), hexR * 0.93 * Math.sin(angle1));
    facetShape.lineTo(hexR * 0.93 * Math.cos(angle2), hexR * 0.93 * Math.sin(angle2));
    facetShape.closePath();

    const facetGeo = new THREE.ExtrudeGeometry(facetShape, { depth, bevelEnabled: false });
    facetGeo.rotateX(-Math.PI / 2);
    facetGeo.translate(0, tileT, 0);
    ensureUvs(facetGeo);
    const facetBrush = new Brush(facetGeo, dummyMat);
    result = evaluator.evaluate(result, facetBrush, ADDITION);
  }

  // Subtract LED channel grooves at hex edges
  const channelWidth = 4; // mm
  const channelDepth = tileT * 0.4;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const nextAngle = (Math.PI / 3) * (i + 1) - Math.PI / 6;
    const x1 = hexR * Math.cos(angle);
    const z1 = hexR * Math.sin(angle);
    const x2 = hexR * Math.cos(nextAngle);
    const z2 = hexR * Math.sin(nextAngle);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const edgeLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    const edgeAngle = Math.atan2(z2 - z1, x2 - x1);

    const channelGeo = new THREE.BoxGeometry(edgeLen * 0.85, channelDepth, channelWidth);
    channelGeo.rotateY(-edgeAngle);
    channelGeo.translate(midX * 0.92, tileT * 0.7, midZ * 0.92);
    const channelBrush = new Brush(channelGeo, dummyMat);
    result = evaluator.evaluate(result, channelBrush, SUBTRACTION);
  }

  return result.geometry;
}

// ── Section Clipping ────────────────────────────────────────────

function clipToSection(
  moldGeo: THREE.BufferGeometry,
  sku: MoldGeneratorSku,
  sectionPlan: SectionPlan,
  sectionIndex: number,
): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  const dummyMat = new THREE.MeshBasicMaterial();

  const section = sectionPlan.sections[sectionIndex];
  if (!section) return moldGeo;

  const oL = sku.outerLength * IN_TO_MM;
  const oW = sku.outerWidth * IN_TO_MM;
  const oH = sku.outerHeight * IN_TO_MM + MOLD_BASE_THICKNESS;

  // Determine grid position for this section
  const totalLSections = Math.ceil(oL / 400) || 1;
  const totalWSections = Math.ceil(oW / 400) || 1;

  const lIndex = Math.floor((sectionIndex) / totalWSections);
  const wIndex = (sectionIndex) % totalWSections;

  const secL = oL / totalLSections;
  const secW = oW / totalWSections;

  // Clipping box positioned at this section's location
  const clipGeo = new THREE.BoxGeometry(secL + 2, oH + 20, secW + 2);
  const clipX = -oL / 2 + secL / 2 + lIndex * secL;
  const clipZ = -oW / 2 + secW / 2 + wIndex * secW;
  clipGeo.translate(clipX, oH / 2, clipZ);

  const moldBrush = new Brush(moldGeo, dummyMat);
  const clipBrush = new Brush(clipGeo, dummyMat);

  const clipped = evaluator.evaluate(moldBrush, clipBrush, INTERSECTION);
  const geo = clipped.geometry;

  // Re-center the section so it sits at origin on the build plate
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  geo.translate(
    -(bb.min.x + bb.max.x) / 2, // center X
    -bb.min.y,                    // bottom sits at Y=0
    -(bb.min.z + bb.max.z) / 2,  // center Z
  );

  return geo;
}

// ── Drain Geometry Builders ─────────────────────────────────────

function buildDrainGeometry(
  sku: MoldGeneratorSku,
  moldHeight: number,
  innerWidth: number,
): THREE.BufferGeometry {
  const drainType = sku.drainType.toLowerCase();
  // Drain must punch from below the base through the full bottom wall + floor insert
  // Height spans from Y=-2 to Y = moldHeight (guaranteed to clear everything)
  const drainHeight = moldHeight + 4;
  const drainCenterY = drainHeight / 2 - 2;

  if (drainType === "slot") {
    const slotWidth = sku.drainDiameter * IN_TO_MM;
    const slotLength = innerWidth * 0.75;
    const slopeToRear = sku.slopeDirection.toLowerCase().includes("back");
    const iW = sku.innerWidth * IN_TO_MM;
    const slotZ = slopeToRear ? -(iW / 2 - slotWidth) : 0;

    const slotGeo = new THREE.BoxGeometry(slotLength, drainHeight, slotWidth);
    slotGeo.translate(0, drainCenterY, slotZ);
    return slotGeo;
  }

  // Round/grid drain — cylindrical hole through entire bottom
  const drainR = (sku.drainDiameter * IN_TO_MM) / 2;
  const drainGeo = new THREE.CylinderGeometry(drainR, drainR, drainHeight, 24);
  drainGeo.translate(0, drainCenterY, 0);
  return drainGeo;
}

function buildOverflowGeometry(sku: MoldGeneratorSku, moldHeight: number): THREE.BufferGeometry {
  const overflowR = (sku.overflowHoleDiameter * IN_TO_MM) / 2;
  const lipOffset = sku.topLipThickness * IN_TO_MM;
  const overflowY = moldHeight - lipOffset - 1 * IN_TO_MM;
  const oW = sku.outerWidth * IN_TO_MM;
  const iW = sku.innerWidth * IN_TO_MM;
  // Actual rear wall thickness = (outerWidth - innerWidth) / 2
  const rearWallThickness = (oW - iW) / 2;
  // Center the cylinder in the middle of the rear wall
  const rearWallCenterZ = -(iW / 2 + rearWallThickness / 2);

  const overflowGeo = new THREE.CylinderGeometry(overflowR, overflowR, rearWallThickness + 10, 24);
  overflowGeo.rotateX(Math.PI / 2);
  overflowGeo.translate(0, overflowY, rearWallCenterZ);
  return overflowGeo;
}

// ── Basin Floor Insert ──────────────────────────────────────────
// Builds a closed solid volume that sits inside the cavity, shaping
// the flat floor into erosion, ramp, facet, or dome surfaces.
// Added to the mold via CSG ADDITION after the flat cavity is subtracted.

function buildBasinFloorInsert(
  sku: MoldGeneratorSku,
  moldHeight: number,
  iL: number,
  iW: number,
  iD: number,
): THREE.BufferGeometry | null {
  const searchText = `${sku.name} ${sku.type} ${sku.code}`.toLowerCase();
  const isErosion = searchText.includes("erosion") || searchText.includes("carved");
  const isRamp = searchText.includes("ramp") || sku.slopeDirection.toLowerCase().includes("back");
  const isFacet = searchText.includes("facet");
  const domeRise = ((sku.domeRiseMin + sku.domeRiseMax) / 2) * IN_TO_MM;
  const hasDome = domeRise > 0 && !isErosion && !isRamp && !isFacet;

  if (!isErosion && !isRamp && !isFacet && !hasDome) return null;

  const segX = 24;
  const segZ = 18;
  const floorY = moldHeight - iD; // flat cavity floor level
  // Inset slightly from cavity walls to avoid CSG edge artifacts
  const inset = 0.5;
  const fL = iL - inset * 2;
  const fW = iW - inset * 2;

  // Generate height values for the top surface
  const heights: number[] = [];

  if (isErosion) {
    for (let zi = 0; zi <= segZ; zi++) {
      for (let xi = 0; xi <= segX; xi++) {
        const x = (xi / segX - 0.5) * fL;
        const z = (zi / segZ - 0.5) * fW;
        const wave1 = Math.sin(x * 0.025) * Math.cos(z * 0.03) * domeRise * 2.5;
        const wave2 = Math.sin(x * 0.06 + 1.2) * Math.sin(z * 0.05 + 0.8) * domeRise * 1.5;
        const wave3 = Math.cos(x * 0.04 - 0.5) * Math.cos(z * 0.07 + 2.1) * domeRise * 1.0;
        const nx = x / (fL / 2);
        const nz = z / (fW / 2);
        const radial = 1 - Math.sqrt(nx * nx + nz * nz) * 0.4;
        const displacement = (wave1 + wave2 + wave3) * Math.max(0.3, radial);
        // Floor insert height = domeRise baseline + displacement, minimum 1mm
        heights.push(Math.max(1, domeRise + displacement));
      }
    }
  } else if (isRamp) {
    const slopeRad = (sku.basinSlopeDeg * Math.PI) / 180;
    const rampDrop = Math.tan(slopeRad) * fW;
    for (let zi = 0; zi <= segZ; zi++) {
      for (let xi = 0; xi <= segX; xi++) {
        const z = (zi / segZ - 0.5) * fW;
        // Front (positive Z) is higher, rear (negative Z) is lower
        const normalized = (z + fW / 2) / fW; // 0 at rear, 1 at front
        heights.push(Math.max(1, normalized * rampDrop));
      }
    }
  } else if (isFacet) {
    const centerRise = domeRise > 0 ? domeRise : iD * 0.15;
    const facetDepth = iD * 0.7;
    for (let zi = 0; zi <= segZ; zi++) {
      for (let xi = 0; xi <= segX; xi++) {
        const z = (zi / segZ - 0.5) * fW;
        // V-shape: height peaks at center (z=0), drops toward edges
        const distFromCenter = Math.abs(z) / (fW / 2);
        const h = centerRise * (1 - distFromCenter) + (facetDepth - iD) * distFromCenter;
        heights.push(Math.max(1, centerRise - Math.abs(z) / (fW / 2) * (centerRise * 0.7)));
      }
    }
  } else {
    // Dome
    for (let zi = 0; zi <= segZ; zi++) {
      for (let xi = 0; xi <= segX; xi++) {
        const nx = (xi / segX - 0.5) * 2;
        const nz = (zi / segZ - 0.5) * 2;
        const r = Math.sqrt(nx * nx + nz * nz);
        const dome = Math.cos(Math.min(r, 1) * Math.PI * 0.5) * domeRise;
        heights.push(Math.max(1, dome));
      }
    }
  }

  // Build closed volume geometry
  return buildFloorVolume(fL, fW, segX, segZ, heights, floorY);
}

/**
 * Builds a watertight volume from a heightmap.
 * Bottom face is flat at baseY, top face follows heights array.
 */
function buildFloorVolume(
  width: number,
  depth: number,
  segX: number,
  segZ: number,
  heights: number[],
  baseY: number,
): THREE.BufferGeometry {
  const cols = segX + 1;
  const rows = segZ + 1;
  const totalGridVerts = cols * rows;

  // Vertices: bottom grid + top grid
  const positions: number[] = [];

  // Bottom grid (flat at y=0)
  for (let zi = 0; zi <= segZ; zi++) {
    for (let xi = 0; xi <= segX; xi++) {
      const x = (xi / segX - 0.5) * width;
      const z = (zi / segZ - 0.5) * depth;
      positions.push(x, 0, z);
    }
  }

  // Top grid (displaced by heights)
  for (let zi = 0; zi <= segZ; zi++) {
    for (let xi = 0; xi <= segX; xi++) {
      const x = (xi / segX - 0.5) * width;
      const z = (zi / segZ - 0.5) * depth;
      const h = heights[zi * cols + xi];
      positions.push(x, h, z);
    }
  }

  const indices: number[] = [];

  // Bottom face (facing down — clockwise winding)
  for (let zi = 0; zi < segZ; zi++) {
    for (let xi = 0; xi < segX; xi++) {
      const a = zi * cols + xi;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // Top face (facing up — counter-clockwise winding)
  for (let zi = 0; zi < segZ; zi++) {
    for (let xi = 0; xi < segX; xi++) {
      const a = totalGridVerts + zi * cols + xi;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Side walls — 4 edges connecting bottom to top
  // Front edge (zi=0)
  for (let xi = 0; xi < segX; xi++) {
    const bl = xi;
    const br = xi + 1;
    const tl = totalGridVerts + xi;
    const tr = totalGridVerts + xi + 1;
    indices.push(bl, br, tl);
    indices.push(br, tr, tl);
  }

  // Back edge (zi=segZ)
  for (let xi = 0; xi < segX; xi++) {
    const bl = segZ * cols + xi;
    const br = bl + 1;
    const tl = totalGridVerts + segZ * cols + xi;
    const tr = tl + 1;
    indices.push(bl, tl, br);
    indices.push(br, tl, tr);
  }

  // Left edge (xi=0)
  for (let zi = 0; zi < segZ; zi++) {
    const bl = zi * cols;
    const br = (zi + 1) * cols;
    const tl = totalGridVerts + zi * cols;
    const tr = totalGridVerts + (zi + 1) * cols;
    indices.push(bl, tl, br);
    indices.push(br, tl, tr);
  }

  // Right edge (xi=segX)
  for (let zi = 0; zi < segZ; zi++) {
    const bl = zi * cols + segX;
    const br = (zi + 1) * cols + segX;
    const tl = totalGridVerts + zi * cols + segX;
    const tr = totalGridVerts + (zi + 1) * cols + segX;
    indices.push(bl, br, tl);
    indices.push(br, tr, tl);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Translate to cavity floor position
  geo.translate(0, baseY, 0);

  // Add dummy UVs for CSG compatibility with THREE.js built-in geometries
  ensureUvs(geo);

  return geo;
}

// ── Helpers ─────────────────────────────────────────────────────

/** Add dummy UVs to a geometry that lacks them (needed for CSG compatibility). */
function ensureUvs(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.getAttribute("uv")) {
    const posAttr = geo.getAttribute("position");
    const uvs = new Float32Array(posAttr.count * 2);
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }
  return geo;
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
