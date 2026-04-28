/**
 * GFRC weight estimator for cast panels.
 *
 * Cured GFRC density for decorative cast panels typically ranges from 125-140
 * pcf (lb/ft³). Concrete Collaborative-class thin tile measures ~115-120 pcf;
 * thicker architectural slabs run 130-140 pcf. We use 130 pcf as the working
 * midpoint for our wall-art panels — these are 1-1.25 in thick with
 * deliberate surface relief, so they sit firmly in the "architectural slab"
 * range, not the thin-tile range.
 *
 * Weight = (volume in ft³) × (density in pcf) × (1 + reliefMassFactor)
 *   where reliefMassFactor is + for raised relief (kinetic fins ADD material)
 *   and - for cut relief (stave grooves REMOVE material).
 *
 * Returned range adds ±6% tolerance for batch variation, mix water content,
 * and aggregate distribution.
 */

const GFRC_DENSITY_PCF = 130;
const TOLERANCE_PCT = 0.06;

export type ReliefProfile =
  | "FLAT"           // no surface relief — solid slab
  | "GROOVES_DEEP"   // deep stave / fluted grooves — removes ~15% material
  | "GROOVES_LIGHT"  // shallow flutes / rhythm relief — removes ~10%
  | "UNDULATING"     // wave / dune curves — net ~0% (peaks balance valleys)
  | "PROJECTING";    // kinetic fins / raised projections — ADDS ~20%

export type GfrcPanelDims = {
  outerLengthIn: number;
  outerWidthIn: number;
  outerHeightIn: number;
  reliefProfile: ReliefProfile;
};

export type GfrcWeightEstimate = {
  nominalLbs: number;
  minLbs: number;
  maxLbs: number;
};

const RELIEF_MASS_FACTOR: Record<ReliefProfile, number> = {
  FLAT: 0,
  GROOVES_DEEP: -0.15,
  GROOVES_LIGHT: -0.10,
  UNDULATING: 0,
  PROJECTING: +0.20,
};

export function estimateGfrcPanelWeight(dims: GfrcPanelDims): GfrcWeightEstimate {
  const volumeFt3 = (dims.outerLengthIn * dims.outerWidthIn * dims.outerHeightIn) / 1728;
  const baseLbs = volumeFt3 * GFRC_DENSITY_PCF;
  const reliefAdj = 1 + RELIEF_MASS_FACTOR[dims.reliefProfile];
  const nominal = baseLbs * reliefAdj;

  return {
    nominalLbs: round1(nominal),
    minLbs: round1(nominal * (1 - TOLERANCE_PCT)),
    maxLbs: round1(nominal * (1 + TOLERANCE_PCT)),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
