export type DensityFn = (yFrac: number, xFrac: number) => number;

export type PrintScenario = {
  id: string;
  label: string;
  sideALabel: string;
  sideBLabel: string;
  emergentLabel: string;
  color: string;
  densityA: DensityFn;
  densityB: DensityFn;
  densityC: DensityFn;
};

export const SCENARIOS: Record<string, PrintScenario> = {
  skull: {
    id: "skull",
    label: "Skull",
    sideALabel: "Ocean Waves",
    sideBLabel: "Solar Disc",
    emergentLabel: "Skull",
    color: "#c8a96e",
    densityA: (yFrac) => {
      if (yFrac < 0.12) return 0.02;
      if (yFrac < 0.28) return 0.08 + yFrac * 0.3;
      if (yFrac < 0.42) return 0.25 + Math.sin(yFrac * Math.PI) * 0.15;
      if (yFrac < 0.58) return 0.65 + Math.sin(yFrac * Math.PI * 1.5) * 0.2;
      if (yFrac < 0.72) return 0.85;
      if (yFrac < 0.88) return 0.5;
      return 0.08;
    },
    densityB: (yFrac, xFrac) => {
      const dy = yFrac - 0.5, dx = xFrac - 0.5;
      const dist = Math.sqrt(dx * dx * 4 + dy * dy);
      if (dist < 0.30) return 0.95 - dist * 0.4;
      if (dist < 0.42) return 0.18;
      return 0.06;
    },
    densityC: (yFrac, xFrac) => {
      const dy = yFrac - 0.45, dx = xFrac - 0.5;
      const cranium = Math.max(0, 0.92 - Math.sqrt(dx * dx * 3 + dy * dy) * 3.4);
      const leftEye = Math.sqrt(Math.pow(xFrac - 0.33, 2) * 6 + Math.pow(yFrac - 0.46, 2) * 8);
      const rightEye = Math.sqrt(Math.pow(xFrac - 0.67, 2) * 6 + Math.pow(yFrac - 0.46, 2) * 8);
      const eyeVoid = leftEye < 0.12 || rightEye < 0.12 ? -0.85 : 0;
      const nose = Math.sqrt(Math.pow(xFrac - 0.5, 2) * 10 + Math.pow(yFrac - 0.56, 2) * 12);
      const noseVoid = nose < 0.08 ? -0.65 : 0;
      const jaw = Math.max(0, 0.55 - Math.sqrt(Math.pow(dx * 1.2, 2) + Math.pow(yFrac - 0.66, 2) * 4));
      return Math.max(0, cranium + jaw + eyeVoid + noseVoid);
    },
  },
  wolf: {
    id: "wolf",
    label: "Wolf",
    sideALabel: "Mountain Peak",
    sideBLabel: "Solar Eclipse",
    emergentLabel: "Wolf",
    color: "#9eb8d4",
    densityA: (yFrac, xFrac) => {
      const dx = xFrac - 0.5;
      const peakY = 0.28 + Math.abs(dx) * 0.82;
      if (yFrac > peakY) return Math.min(0.95, (yFrac - peakY) * 4.2 + 0.28);
      if (yFrac > peakY - 0.04) return 0.18;
      return 0.02;
    },
    densityB: (yFrac, xFrac) => {
      const dy = yFrac - 0.5, dx = xFrac - 0.5;
      const dist = Math.sqrt(dx * dx * 4 + dy * dy);
      if (dist < 0.32) return 0.98;
      if (dist < 0.42) return 0.18;
      return 0.05;
    },
    densityC: (yFrac, xFrac) => {
      const dy = yFrac - 0.44, dx = xFrac - 0.5;
      const head = Math.max(0, 0.88 - Math.sqrt(dx * dx * 2.5 + dy * dy) * 3.2);
      const leftEar = Math.max(0, 0.72 - Math.sqrt(Math.pow(xFrac - 0.34, 2) * 8 + Math.pow(yFrac - 0.18, 2) * 6));
      const rightEar = Math.max(0, 0.72 - Math.sqrt(Math.pow(xFrac - 0.66, 2) * 8 + Math.pow(yFrac - 0.18, 2) * 6));
      const leftEye = Math.sqrt(Math.pow(xFrac - 0.35, 2) * 7 + Math.pow(yFrac - 0.44, 2) * 9);
      const rightEye = Math.sqrt(Math.pow(xFrac - 0.65, 2) * 7 + Math.pow(yFrac - 0.44, 2) * 9);
      const eyeVoid = leftEye < 0.11 || rightEye < 0.11 ? -0.88 : 0;
      const noseVoid = Math.sqrt(Math.pow(xFrac - 0.5, 2) * 12 + Math.pow(yFrac - 0.54, 2) * 14) < 0.07 ? -0.55 : 0;
      return Math.max(0, head + leftEar + rightEar + eyeVoid + noseVoid);
    },
  },
  eagle: {
    id: "eagle",
    label: "Eagle",
    sideALabel: "Desert Dunes",
    sideBLabel: "Crescent Moon",
    emergentLabel: "Eagle",
    color: "#d4a96e",
    densityA: (yFrac, xFrac) => {
      const leftDune = Math.max(0, 0.82 - Math.sqrt(Math.pow(xFrac - 0.28, 2) * 3 + Math.pow(yFrac - 0.34, 2) * 4));
      const rightDune = Math.max(0, 0.82 - Math.sqrt(Math.pow(xFrac - 0.72, 2) * 3 + Math.pow(yFrac - 0.38, 2) * 4));
      const ground = yFrac > 0.72 ? (yFrac - 0.72) * 2.2 : 0;
      if (yFrac > 0.84) return 0.04;
      return Math.max(0, Math.min(0.92, leftDune + rightDune + ground));
    },
    densityB: (yFrac, xFrac) => {
      const dy = yFrac - 0.48, dx = xFrac - 0.38;
      const full = Math.sqrt(dx * dx * 5 + dy * dy * 3) < 0.28 ? 0.92 : 0;
      const cut = Math.sqrt(Math.pow(xFrac - 0.52, 2) * 5 + Math.pow(yFrac - 0.44, 2) * 3) < 0.26 ? -0.96 : 0;
      return Math.max(0, full + cut);
    },
    densityC: (yFrac, xFrac) => {
      const dy = yFrac - 0.44, dx = xFrac - 0.5;
      const head = Math.max(0, 0.82 - Math.sqrt(dx * dx * 3 + dy * dy) * 3.4);
      const leftEye = Math.sqrt(Math.pow(xFrac - 0.36, 2) * 8 + Math.pow(yFrac - 0.42, 2) * 10);
      const rightEye = Math.sqrt(Math.pow(xFrac - 0.64, 2) * 8 + Math.pow(yFrac - 0.42, 2) * 10);
      const eyeVoid = leftEye < 0.10 || rightEye < 0.10 ? -0.92 : 0;
      const beak = Math.max(0, 0.62 - Math.sqrt(Math.pow(xFrac - 0.5, 2) * 15 + Math.pow(yFrac - 0.57, 2) * 8));
      return Math.max(0, head + eyeVoid + beak);
    },
  },
  bear: {
    id: "bear",
    label: "Bear",
    sideALabel: "City Skyline",
    sideBLabel: "Storm Clouds",
    emergentLabel: "Bear",
    color: "#a96e6e",
    densityA: (yFrac, xFrac) => {
      if (yFrac > 0.86) return 0.92;
      const buildings = [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88, 0.95];
      const heights = [0.44, 0.26, 0.58, 0.20, 0.36, 0.16, 0.48, 0.30, 0.42, 0.52];
      let d = 0;
      buildings.forEach((bx, i) => {
        if (Math.abs(xFrac - bx) < 0.055 && yFrac > heights[i]) d = Math.max(d, 0.92);
      });
      if (yFrac > 0.68) d = Math.max(d, (yFrac - 0.68) * 2.8);
      return Math.min(0.92, d);
    },
    densityB: (yFrac) => {
      if (yFrac > 0.88) return 0.96;
      if (yFrac > 0.72) return 0.88 - (yFrac - 0.72) * 0.15;
      if (yFrac > 0.52) return 0.72 - (yFrac - 0.52) * 0.6;
      if (yFrac > 0.32) return Math.max(0.06, 0.40 - (yFrac - 0.32) * 1.7);
      if (yFrac > 0.14) return 0.06;
      return 0.0;
    },
    densityC: (yFrac, xFrac) => {
      const dy = yFrac - 0.44, dx = xFrac - 0.5;
      const head = Math.max(0, 0.88 - Math.sqrt(dx * dx * 2 + dy * dy) * 3.0);
      const leftEar = Math.max(0, 0.72 - Math.sqrt(Math.pow(xFrac - 0.35, 2) * 10 + Math.pow(yFrac - 0.20, 2) * 8));
      const rightEar = Math.max(0, 0.72 - Math.sqrt(Math.pow(xFrac - 0.65, 2) * 10 + Math.pow(yFrac - 0.20, 2) * 8));
      const leftEye = Math.sqrt(Math.pow(xFrac - 0.36, 2) * 6 + Math.pow(yFrac - 0.44, 2) * 8);
      const rightEye = Math.sqrt(Math.pow(xFrac - 0.64, 2) * 6 + Math.pow(yFrac - 0.44, 2) * 8);
      const eyeVoid = leftEye < 0.12 || rightEye < 0.12 ? -0.88 : 0;
      const muzzle = Math.max(0, 0.52 - Math.sqrt(Math.pow(dx, 2) * 5 + Math.pow(yFrac - 0.58, 2) * 6));
      const noseVoid = Math.sqrt(Math.pow(xFrac - 0.5, 2) * 14 + Math.pow(yFrac - 0.55, 2) * 16) < 0.06 ? -0.42 : 0;
      return Math.max(0, head + leftEar + rightEar + eyeVoid + muzzle + noseVoid);
    },
  },
  buddha: {
    id: "buddha",
    label: "Buddha",
    sideALabel: "Storm Sky",
    sideBLabel: "Rising Sun",
    emergentLabel: "Buddha Face",
    color: "#d4a96e",
    densityA: (yFrac) => {
      const invY = 1 - yFrac;
      if (invY < 0.08) return 0.0;
      if (invY < 0.20) return invY * 0.35;
      if (invY < 0.36) return 0.12 + invY * 0.55;
      if (invY < 0.52) return 0.30 + invY * 0.65;
      if (invY < 0.68) return 0.65 + invY * 0.28;
      if (invY < 0.82) return 0.82 + invY * 0.14;
      return 0.94;
    },
    densityB: (yFrac, xFrac) => {
      const dy = yFrac - 0.38, dx = xFrac - 0.5;
      const discDist = Math.sqrt(dx * dx * 4 + dy * dy);
      const disc = discDist < 0.30 ? Math.min(0.96, 0.96 - discDist * 0.4) : 0;
      const ground = yFrac < 0.18 ? (0.18 - yFrac) * 4.8 : 0;
      const horizon = yFrac < 0.24 && yFrac > 0.12 ? 0.85 : 0;
      const outerField = discDist > 0.30 ? Math.max(0, 0.06 - discDist * 0.04) : 0;
      return Math.min(0.96, Math.max(disc, ground, horizon) + outerField);
    },
    densityC: (yFrac, xFrac) => {
      const dy = yFrac - 0.46, dx = xFrac - 0.5;
      const face = Math.max(0, 0.88 - Math.sqrt(dx * dx * 1.8 + dy * dy) * 2.8);
      const ushnisha = Math.max(0, 0.72 - Math.sqrt(Math.pow(xFrac - 0.5, 2) * 6 + Math.pow(yFrac - 0.18, 2) * 5));
      const leftEar = Math.max(0, 0.45 - Math.sqrt(Math.pow(xFrac - 0.18, 2) * 8 + Math.pow(yFrac - 0.56, 2) * 4));
      const rightEar = Math.max(0, 0.45 - Math.sqrt(Math.pow(xFrac - 0.82, 2) * 8 + Math.pow(yFrac - 0.56, 2) * 4));
      const leftEyeY = Math.abs(yFrac - 0.46) < 0.028;
      const leftEyeX = xFrac > 0.28 && xFrac < 0.44;
      const rightEyeY = Math.abs(yFrac - 0.46) < 0.028;
      const rightEyeX = xFrac > 0.56 && xFrac < 0.72;
      const eyeVoid = (leftEyeY && leftEyeX) || (rightEyeY && rightEyeX) ? -0.82 : 0;
      const noseVoid = Math.sqrt(Math.pow(xFrac - 0.5, 2) * 16 + Math.pow(yFrac - 0.56, 2) * 18) < 0.05 ? -0.32 : 0;
      return Math.max(0, face + ushnisha + leftEar + rightEar + eyeVoid + noseVoid);
    },
  },
};

export const SCENARIO_LIST = Object.values(SCENARIOS);

export const WALL_SIZES = {
  small: { label: "SW-SMALL", slatCount: 16, slatWidthMM: 228.6, slatHeightMM: 2438.4, lineWeightMM: 0.75 },
  standard: { label: "SW-STANDARD", slatCount: 32, slatWidthMM: 228.6, slatHeightMM: 3048, lineWeightMM: 0.75 },
  large: { label: "SW-LARGE", slatCount: 48, slatWidthMM: 228.6, slatHeightMM: 3657.6, lineWeightMM: 0.75 },
} as const;

export type WallSizeKey = keyof typeof WALL_SIZES;

export type WallConfig = {
  slatCount: number;
  slatWidthMM: number;
  slatHeightMM: number;
  lineWeightMM: number;
};
