"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";

import { generateSimulatorImage } from "@/app/actions/slat-wall-simulator-actions";
import { SLAT_WALL_IMAGE_COMBOS } from "@/lib/engines/slat-wall-prompt-engine";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type DensityFn = (y: number, x: number) => number;

type Scenario = {
  id: string;
  label: string;
  sideA: string;
  sideB: string;
  emergent: string;
  color: string;
  densityA: DensityFn;
  densityB: DensityFn;
  densityC: DensityFn;
};

type SlatWallSimulatorProps = {
  projectId: string;
  slatCount: number;
  slatWidth: number;
  wallWidthFt: number;
  projectCode: string;
  initialAiImages?: Record<string, Record<string, string>>;
};

// ─── SCENARIOS ────────────────────────────────────────────────────────────────

// Canvas density functions for each of the 9 curated combos.
// These drive the canvas preview — AI images come from the prompt engine.
const DENSITY_MAP: Record<string, { densityA: DensityFn; densityB: DensityFn; densityC: DensityFn; color: string }> = {
  bear: {
    color: "#a96e6e",
    densityA: (y, x) => {
      if (y > 0.85) return 0.9;
      const buildings = [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92];
      const heights = [0.45, 0.28, 0.55, 0.22, 0.38, 0.18, 0.42, 0.5];
      let d = 0;
      buildings.forEach((bx, i) => { if (Math.abs(x - bx) < 0.06 && y > heights[i]) d = Math.max(d, 0.9); });
      if (y > 0.65) d = Math.max(d, (y - 0.65) * 2.5);
      return Math.min(0.9, d);
    },
    densityB: (y) => {
      if (y < 0.15) return 0.95;
      if (y < 0.4) return 0.9 - (y - 0.15) * 0.8;
      if (y < 0.6) return 0.5 - (y - 0.4) * 1.5;
      if (y < 0.8) return Math.max(0.05, 0.2 - (y - 0.6));
      return 0.02;
    },
    densityC: (y, x) => {
      const dy = y - 0.44, dx = x - 0.5;
      const head = Math.max(0, 0.85 - Math.sqrt(dx * dx * 2 + dy * dy) * 3);
      const leftEar = Math.max(0, 0.7 - Math.sqrt(Math.pow(x - 0.35, 2) * 10 + Math.pow(y - 0.2, 2) * 8));
      const rightEar = Math.max(0, 0.7 - Math.sqrt(Math.pow(x - 0.65, 2) * 10 + Math.pow(y - 0.2, 2) * 8));
      const leftEye = Math.sqrt(Math.pow(x - 0.36, 2) * 6 + Math.pow(y - 0.44, 2) * 8);
      const rightEye = Math.sqrt(Math.pow(x - 0.64, 2) * 6 + Math.pow(y - 0.44, 2) * 8);
      const eyeVoid = leftEye < 0.12 || rightEye < 0.12 ? -0.85 : 0;
      const muzzle = Math.max(0, 0.5 - Math.sqrt(Math.pow(x - 0.5, 2) * 5 + Math.pow(y - 0.58, 2) * 6));
      const noseVoid = Math.sqrt(Math.pow(x - 0.5, 2) * 14 + Math.pow(y - 0.55, 2) * 16) < 0.06 ? -0.4 : 0;
      return Math.max(0, head + leftEar + rightEar + eyeVoid + muzzle + noseVoid);
    },
  },
  wolf: {
    color: "#9eb8d4",
    densityA: (y, x) => {
      const dx = x - 0.5;
      const mountainEdge = 0.28 + Math.abs(dx) * 0.8;
      if (y > mountainEdge) return Math.min(0.95, (y - mountainEdge) * 4 + 0.3);
      if (y > mountainEdge - 0.05) return 0.2;
      return 0.02;
    },
    densityB: (y, x) => {
      const dy = y - 0.5, dx = x - 0.5;
      const dist = Math.sqrt(dx * dx * 4 + dy * dy);
      if (dist < 0.32) return 0.98;
      if (dist < 0.4) return 0.2;
      return 0.06;
    },
    densityC: (y, x) => {
      const dy = y - 0.44, dx = x - 0.5;
      const head = Math.max(0, 0.85 - Math.sqrt(dx * dx * 2.5 + dy * dy) * 3.2);
      const leftEar = Math.max(0, 0.7 - Math.sqrt(Math.pow(x - 0.34, 2) * 8 + Math.pow(y - 0.18, 2) * 6));
      const rightEar = Math.max(0, 0.7 - Math.sqrt(Math.pow(x - 0.66, 2) * 8 + Math.pow(y - 0.18, 2) * 6));
      const leftEye = Math.sqrt(Math.pow(x - 0.35, 2) * 7 + Math.pow(y - 0.44, 2) * 9);
      const rightEye = Math.sqrt(Math.pow(x - 0.65, 2) * 7 + Math.pow(y - 0.44, 2) * 9);
      const eyeVoid = leftEye < 0.11 || rightEye < 0.11 ? -0.85 : 0;
      const noseVoid = Math.sqrt(Math.pow(x - 0.5, 2) * 12 + Math.pow(y - 0.54, 2) * 14) < 0.07 ? -0.5 : 0;
      return Math.max(0, head + leftEar + rightEar + eyeVoid + noseVoid);
    },
  },
  eagle: {
    color: "#d4a96e",
    densityA: (y, x) => {
      const leftDune = Math.max(0, 0.8 - Math.sqrt(Math.pow(x - 0.3, 2) * 3 + Math.pow(y - 0.35, 2) * 4));
      const rightDune = Math.max(0, 0.8 - Math.sqrt(Math.pow(x - 0.7, 2) * 3 + Math.pow(y - 0.4, 2) * 4));
      const ground = y > 0.7 ? (y - 0.7) * 2 : 0;
      if (y > 0.82) return 0.05;
      return Math.max(0, Math.min(0.9, leftDune + rightDune + ground));
    },
    densityB: (y, x) => {
      const dy = y - 0.48, dx = x - 0.38;
      const dist = Math.sqrt(dx * dx * 5 + dy * dy * 3);
      const full = dist < 0.28 ? 0.9 : 0;
      const cut = Math.sqrt(Math.pow(x - 0.52, 2) * 5 + Math.pow(y - 0.44, 2) * 3) < 0.26 ? -0.95 : 0;
      return Math.max(0, full + cut);
    },
    densityC: (y, x) => {
      const dy = y - 0.44, dx = x - 0.5;
      const head = Math.max(0, 0.8 - Math.sqrt(dx * dx * 3 + dy * dy) * 3.5);
      const leftEye = Math.sqrt(Math.pow(x - 0.36, 2) * 8 + Math.pow(y - 0.42, 2) * 10);
      const rightEye = Math.sqrt(Math.pow(x - 0.64, 2) * 8 + Math.pow(y - 0.42, 2) * 10);
      const eyeVoid = leftEye < 0.1 || rightEye < 0.1 ? -0.9 : 0;
      const beak = Math.max(0, 0.6 - Math.sqrt(Math.pow(x - 0.5, 2) * 15 + Math.pow(y - 0.56, 2) * 8));
      return Math.max(0, head + eyeVoid + beak);
    },
  },
  skull: {
    color: "#c8a96e",
    densityA: (y) => {
      if (y < 0.1) return 0.05;
      if (y < 0.85) return 0.3 - y * 0.2;
      return 0.05;
    },
    densityB: (y, x) => {
      const dy = y - 0.5, dx = x - 0.5;
      const dist = Math.sqrt(dx * dx * 4 + dy * dy);
      if (dist < 0.35) return 0.95 - dist * 0.5;
      if (dist < 0.55) return 0.15;
      return 0.08;
    },
    densityC: (y, x) => {
      const dy = y - 0.45, dx = x - 0.5;
      const cranium = Math.max(0, 0.9 - Math.sqrt(dx * dx * 3 + dy * dy) * 3.5);
      const leftEye = Math.sqrt(Math.pow(x - 0.33, 2) * 6 + Math.pow(y - 0.46, 2) * 8);
      const rightEye = Math.sqrt(Math.pow(x - 0.67, 2) * 6 + Math.pow(y - 0.46, 2) * 8);
      const eyeVoid = leftEye < 0.12 || rightEye < 0.12 ? -0.8 : 0;
      const nose = Math.sqrt(Math.pow(x - 0.5, 2) * 10 + Math.pow(y - 0.56, 2) * 12);
      const noseVoid = nose < 0.08 ? -0.6 : 0;
      const jaw = Math.max(0, 0.5 - Math.sqrt(Math.pow(dx * 1.2, 2) + Math.pow(y - 0.65, 2) * 4));
      return Math.max(0, cranium + jaw + eyeVoid + noseVoid);
    },
  },
  "human-face": {
    color: "#b8a0d4",
    densityA: (y) => {
      if (y > 0.92) return 0.0;
      if (y > 0.80) return 0.08;
      if (y > 0.68) return 0.25;
      if (y > 0.54) return 0.45;
      if (y > 0.42) return 0.6;
      if (y > 0.30) return 0.75;
      if (y > 0.18) return 0.85;
      if (y > 0.08) return 0.95;
      return 0.9;
    },
    densityB: (y, x) => {
      const dx = x - 0.5;
      const discCenterY = 0.62;
      const dy = y - discCenterY;
      const discR = 0.27;
      const dist = Math.sqrt(dx * dx * 3.5 + dy * dy * 3.5);
      if (y < 0.07) return 0.0;
      if (y < 0.16) return 0.03;
      if (y < 0.28) return 0.06;
      if (y < 0.38 && dist > discR) return 0.1;
      if (dist < discR) return Math.min(0.95, 0.7 + (discR - dist) * 1.5);
      if (y > 0.35 && y < 0.85 && Math.abs(dx) > 0.27) return 0.06;
      if (y > 0.88) return 0.85;
      if (y > 0.80) return 0.9;
      return 0.08;
    },
    densityC: (y, x) => {
      const dx = x - 0.5;
      const absDx = Math.abs(dx);
      const forehead = y > 0.12 && y < 0.30 ? Math.max(0, 0.8 - Math.sqrt(dx * dx * 3 + Math.pow(y - 0.21, 2) * 2) * 2.5) : 0;
      const faceMass = y > 0.30 && y < 0.58 ? Math.max(0, 0.9 - Math.sqrt(dx * dx * 2.2 + Math.pow(y - 0.42, 2) * 1.5) * 2.2) : 0;
      const leftEye = Math.abs(y - 0.40) < 0.02 && x > 0.30 && x < 0.42 ? -0.6 : 0;
      const rightEye = Math.abs(y - 0.40) < 0.02 && x > 0.58 && x < 0.70 ? -0.6 : 0;
      const nose = absDx < 0.04 && y > 0.44 && y < 0.54 ? -0.15 : 0;
      const lips = Math.abs(y - 0.60) < 0.012 && absDx < 0.12 ? -0.35 : 0;
      const jaw = y > 0.58 && y < 0.75 ? Math.max(0, 0.6 - Math.sqrt(Math.pow(dx * 1.1, 2) + Math.pow(y - 0.66, 2) * 2.5) * 2.5) : 0;
      return Math.max(0, Math.min(1, forehead + faceMass + leftEye + rightEye + nose + lips + jaw));
    },
  },
  raven: {
    color: "#6a7d8e",
    densityA: (y, x) => {
      // Pine forest — vertical tree silhouettes
      const treeLine = 0.25 + Math.sin(x * 12) * 0.08 + Math.sin(x * 5) * 0.05;
      if (y > treeLine) return Math.min(0.92, 0.5 + (y - treeLine) * 1.5);
      if (y > treeLine - 0.06) return 0.15;
      return 0.02;
    },
    densityB: (y) => {
      // Night sky — dark bands
      if (y < 0.1) return 0.92;
      if (y < 0.3) return 0.85 - (y - 0.1) * 1.5;
      if (y < 0.5) return 0.55 - (y - 0.3) * 1.2;
      if (y < 0.7) return 0.3 - (y - 0.5) * 0.8;
      if (y < 0.85) return 0.15;
      return 0.08;
    },
    densityC: (y, x) => {
      // Raven profile — beak pointing right
      const dy = y - 0.42, dx = x - 0.45;
      const body = Math.max(0, 0.85 - Math.sqrt(dx * dx * 1.8 + dy * dy * 2.5) * 2.8);
      const beak = x > 0.6 && x < 0.78 && Math.abs(y - 0.40) < (0.04 - (x - 0.6) * 0.15) ? 0.85 : 0;
      const head = Math.max(0, 0.8 - Math.sqrt(Math.pow(x - 0.55, 2) * 5 + Math.pow(y - 0.35, 2) * 5) * 2.5);
      const eye = Math.sqrt(Math.pow(x - 0.57, 2) * 12 + Math.pow(y - 0.36, 2) * 14) < 0.06 ? -0.7 : 0;
      return Math.max(0, body + head + beak + eye);
    },
  },
  lion: {
    color: "#d4a060",
    densityA: (y, x) => {
      // Savannah tree line — flat horizon with scattered trees
      const treeLine = 0.52 + Math.sin(x * 8) * 0.04 + Math.sin(x * 3) * 0.06;
      if (y > treeLine + 0.12) return 0.15;
      if (y > treeLine) return Math.min(0.88, 0.4 + (y - treeLine) * 4);
      if (y > treeLine - 0.08) return Math.max(0, 0.6 - Math.abs(y - treeLine + 0.04) * 8);
      return 0.03;
    },
    densityB: (y) => {
      // Desert storm — heavy horizontal bands
      if (y < 0.12) return 0.88;
      if (y < 0.35) return 0.8 - (y - 0.12) * 1.2;
      if (y < 0.55) return 0.5;
      if (y < 0.75) return 0.35 - (y - 0.55) * 0.8;
      return 0.15;
    },
    densityC: (y, x) => {
      // Lion head — frontal with mane
      const dx = x - 0.5, dy = y - 0.42;
      const mane = Math.max(0, 0.8 - Math.sqrt(dx * dx * 1.2 + dy * dy * 1.5) * 2.2);
      const face = Math.max(0, 0.9 - Math.sqrt(dx * dx * 3 + Math.pow(y - 0.44, 2) * 3) * 3);
      const leftEye = Math.sqrt(Math.pow(x - 0.38, 2) * 8 + Math.pow(y - 0.42, 2) * 10) < 0.08 ? -0.8 : 0;
      const rightEye = Math.sqrt(Math.pow(x - 0.62, 2) * 8 + Math.pow(y - 0.42, 2) * 10) < 0.08 ? -0.8 : 0;
      const nose = Math.sqrt(Math.pow(x - 0.5, 2) * 14 + Math.pow(y - 0.52, 2) * 16) < 0.05 ? -0.5 : 0;
      return Math.max(0, mane + face + leftEye + rightEye + nose);
    },
  },
  whale: {
    color: "#6a9eb8",
    densityA: (y) => {
      // Ocean wave horizon — flowing bands
      if (y < 0.15) return 0.04;
      if (y < 0.35) return 0.08 + (y - 0.15) * 0.5;
      if (y < 0.55) return 0.18 + Math.sin(y * 20) * 0.08;
      if (y < 0.75) return 0.4 + (y - 0.55) * 1.5;
      return Math.min(0.9, 0.7 + (y - 0.75) * 0.8);
    },
    densityB: (y, x) => {
      // Moonlit clouds — soft masses
      const moonDist = Math.sqrt(Math.pow(x - 0.65, 2) * 3 + Math.pow(y - 0.25, 2) * 4);
      const moon = moonDist < 0.15 ? 0.9 - moonDist * 3 : 0;
      const clouds = Math.max(0, 0.5 * Math.sin(y * 6 + x * 2) * Math.max(0, 0.8 - Math.abs(y - 0.55) * 2));
      return Math.max(0, Math.min(0.9, moon + clouds + (y > 0.7 ? (y - 0.7) * 1.5 : 0)));
    },
    densityC: (y, x) => {
      // Whale side silhouette
      const dx = x - 0.5, dy = y - 0.48;
      const body = Math.max(0, 0.85 - Math.sqrt(dx * dx * 0.8 + dy * dy * 6) * 2.2);
      const tail = x < 0.15 ? Math.max(0, 0.6 - Math.sqrt(Math.pow(x - 0.1, 2) * 4 + Math.pow(y - 0.38, 2) * 3) * 3) : 0;
      const tailFluke = x < 0.08 ? Math.max(0, 0.5 * (1 - Math.abs(y - 0.35) * 6)) : 0;
      const head = x > 0.7 ? Math.max(0, 0.7 - Math.sqrt(Math.pow(x - 0.78, 2) * 3 + dy * dy * 4) * 2.5) : 0;
      return Math.max(0, body + tail + tailFluke + head);
    },
  },
  tree: {
    color: "#6e9e6e",
    densityA: (y, x) => {
      // Mountain ridgeline — angular peaks
      const dx = x - 0.5;
      const ridge = 0.3 + Math.abs(dx) * 0.6 + Math.sin(x * 8) * 0.04;
      if (y > ridge) return Math.min(0.9, 0.3 + (y - ridge) * 2);
      if (y > ridge - 0.05) return 0.15;
      return 0.02;
    },
    densityB: (y) => {
      // Rain bands — horizontal atmospheric movement
      const base = y * 0.6;
      const bands = Math.sin(y * 15) * 0.12;
      return Math.max(0.02, Math.min(0.85, base + bands));
    },
    densityC: (y, x) => {
      // Solitary tree — trunk + canopy
      const dx = x - 0.5;
      const trunk = Math.abs(dx) < 0.04 && y > 0.55 && y < 0.85 ? 0.9 : 0;
      const canopy = Math.max(0, 0.85 - Math.sqrt(dx * dx * 2.5 + Math.pow(y - 0.35, 2) * 3) * 2.5);
      const canopyMask = y < 0.58 ? canopy : 0;
      const roots = y > 0.82 ? Math.max(0, 0.3 - Math.abs(dx) * 1.5) : 0;
      return Math.max(0, trunk + canopyMask + roots);
    },
  },
};

// Build scenario list from the curated combos + density map
const SCENARIOS: Scenario[] = SLAT_WALL_IMAGE_COMBOS.map((combo) => {
  const density = DENSITY_MAP[combo.id];
  return {
    id: combo.id,
    label: combo.emergent,
    sideA: combo.sideA,
    sideB: combo.sideB,
    emergent: combo.emergent,
    color: density?.color ?? "#888",
    densityA: density?.densityA ?? (() => 0.3),
    densityB: density?.densityB ?? (() => 0.3),
    densityC: density?.densityC ?? (() => 0.3),
  };
});

// ─── SLAT WALL CANVAS ──────────────────────────────────────────────────────────

function SlatWallCanvas({
  scenario,
  state,
  slatCount,
  width = 800,
  height = 300,
}: {
  scenario: Scenario;
  state: "A" | "B" | "C";
  slatCount: number;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sw = width / slatCount;
    const lineCount = 80;
    const light = "#dedad2";

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < slatCount; i++) {
      const xFrac = (i + 0.5) / slatCount;

      ctx.save();
      ctx.beginPath();
      ctx.rect(i * sw, 0, sw, height);
      ctx.clip();

      let densityFn: DensityFn;

      if (state === "C") {
        const isOdd = i % 2 === 0;
        const bgFn = isOdd ? scenario.densityA : scenario.densityB;
        const cFn = scenario.densityC;

        for (let row = 0; row < lineCount; row++) {
          const yFrac = row / lineCount;
          const y = yFrac * height;
          const lineH = height / lineCount;

          const bgD = Math.max(0, Math.min(1, bgFn(yFrac, xFrac)));
          const cD = Math.max(0, Math.min(1, cFn(yFrac, xFrac)));
          const combined = Math.max(0, Math.min(1, bgD * 0.3 + cD));

          if (combined > 0.02) {
            const alpha = Math.min(1, combined * 1.2);
            ctx.fillStyle = `rgba(17,17,17,${alpha})`;
            ctx.fillRect(i * sw, y, sw, lineH * combined * 1.5);
          }
        }
      } else {
        densityFn = state === "A" ? scenario.densityA : scenario.densityB;

        for (let row = 0; row < lineCount; row++) {
          const yFrac = row / lineCount;
          const y = yFrac * height;
          const lineH = height / lineCount;
          const d = Math.max(0, Math.min(1, densityFn(yFrac, xFrac)));

          if (d > 0.02) {
            ctx.fillStyle = `rgba(17,17,17,${Math.min(1, d * 1.2)})`;
            ctx.fillRect(i * sw, y, sw, lineH * d * 1.5);
          }
        }
      }

      ctx.restore();

      // Slat edge
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * sw, 0);
      ctx.lineTo(i * sw, height);
      ctx.stroke();
    }
  }, [scenario, state, slatCount, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "auto", display: "block", borderRadius: "4px" }}
    />
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function SlatWallSimulator({ projectId, slatCount, slatWidth, wallWidthFt, projectCode, initialAiImages }: SlatWallSimulatorProps) {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [activeState, setActiveState] = useState<"A" | "B" | "C">("A");
  const [isAnimating, setIsAnimating] = useState(false);
  const animRef = useRef<number>(0);
  const [isPending, startTransition] = useTransition();

  // AI-generated images — keyed by scenarioId, each containing state→url map
  const [aiImagesByScenario, setAiImagesByScenario] = useState<Record<string, Record<string, string>>>(initialAiImages ?? {});
  const aiImages = aiImagesByScenario[activeScenario.id] ?? {};
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const hasAnyAiImages = Object.values(aiImagesByScenario).some((m) => Object.keys(m).length > 0);
  const hasCurrentScenarioImages = Object.keys(aiImages).length > 0;
  const [viewMode, setViewMode] = useState<"canvas" | "ai">(hasAnyAiImages ? "ai" : "canvas");

  const generateAI = useCallback(
    (state: "A" | "B" | "C") => {
      if (aiLoading[state]) return;
      const scenarioId = activeScenario.id;
      setAiLoading((prev) => ({ ...prev, [state]: true }));
      startTransition(async () => {
        try {
          const result = await generateSimulatorImage({
            projectId,
            scenarioId,
            state,
            sideA: activeScenario.sideA,
            sideB: activeScenario.sideB,
            emergent: activeScenario.emergent,
          });
          if (result.imageUrl) {
            setAiImagesByScenario((prev) => ({
              ...prev,
              [scenarioId]: { ...prev[scenarioId], [state]: result.imageUrl! },
            }));
          }
          setViewMode("ai");
        } catch (error) {
          console.error("AI generation failed:", error);
        } finally {
          setAiLoading((prev) => ({ ...prev, [state]: false }));
        }
      });
    },
    [projectId, activeScenario, aiLoading],
  );

  const animateToState = useCallback(
    (targetState: "A" | "B" | "C") => {
      if (isAnimating) return;
      setIsAnimating(true);

      const start = performance.now();
      const duration = 800;

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          setActiveState(targetState);
          setIsAnimating(false);
        }
      };

      animRef.current = requestAnimationFrame(tick);
    },
    [isAnimating],
  );

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const stateColors = { A: "#6a9fd4", B: "#d46a6a", C: activeScenario.color };

  return (
    <div
      className="rounded-3xl border border-border/70 overflow-hidden"
      style={{ background: "#0a0a0a", color: "#f0ede6", fontFamily: "monospace" }}
    >
      {/* Header */}
      <div style={{ padding: "20px 24px 12px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "4px", color: "#444", marginBottom: "4px" }}>
          RB STUDIO / KINETIC SLAT WALL SIMULATOR
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "28px",
              letterSpacing: "2px",
              lineHeight: 1,
              color: "#f0ede6",
              margin: 0,
            }}
          >
            ROTATING SLAT WALL{" "}
            <span style={{ color: activeScenario.color }}>SIMULATOR</span>
          </h2>
          <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#444" }}>
            {projectCode}
          </span>
        </div>
      </div>

      {/* Scenario Picker */}
      <div style={{ padding: "0 24px 12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setActiveScenario(s);
              setActiveState("A");
              const scenarioHasImages = Object.keys(aiImagesByScenario[s.id] ?? {}).length > 0;
              setViewMode(scenarioHasImages ? "ai" : "canvas");
            }}
            type="button"
            style={{
              background: activeScenario.id === s.id ? s.color : "#1a1a1a",
              color: activeScenario.id === s.id ? "#0a0a0a" : "#666",
              border: `1px solid ${activeScenario.id === s.id ? s.color : "#2a2a2a"}`,
              padding: "6px 14px",
              fontSize: "10px",
              letterSpacing: "1.5px",
              cursor: "pointer",
              fontFamily: "monospace",
              borderRadius: "2px",
            }}
          >
            {s.sideA.toUpperCase()} + {s.sideB.toUpperCase()} &rarr; {s.emergent.toUpperCase()}
          </button>
        ))}
      </div>

      {/* View Mode + AI Generate */}
      <div style={{ padding: "0 24px 12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setViewMode("canvas")}
          style={{
            background: viewMode === "canvas" ? "#2a2a2a" : "transparent",
            color: viewMode === "canvas" ? "#f0ede6" : "#555",
            border: "1px solid #2a2a2a",
            padding: "6px 14px",
            fontSize: "9px",
            letterSpacing: "1.5px",
            cursor: "pointer",
            fontFamily: "monospace",
            borderRadius: "2px",
          }}
        >
          CANVAS PREVIEW
        </button>
        <button
          type="button"
          onClick={() => setViewMode("ai")}
          style={{
            background: viewMode === "ai" ? "#2a2a2a" : "transparent",
            color: viewMode === "ai" ? "#f0ede6" : "#555",
            border: "1px solid #2a2a2a",
            padding: "6px 14px",
            fontSize: "9px",
            letterSpacing: "1.5px",
            cursor: "pointer",
            fontFamily: "monospace",
            borderRadius: "2px",
          }}
        >
          AI GENERATED
        </button>
        <div style={{ flex: 1 }} />
        {(["A", "B", "C"] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={!!aiLoading[s] || isPending}
            onClick={() => generateAI(s)}
            style={{
              background: aiLoading[s] ? "#1a1a1a" : "transparent",
              color: aiImages[s] ? "#4ade80" : aiLoading[s] ? "#666" : activeScenario.color,
              border: `1px solid ${aiImages[s] ? "#4ade80" : activeScenario.color}`,
              padding: "6px 14px",
              fontSize: "9px",
              letterSpacing: "1.5px",
              cursor: aiLoading[s] ? "wait" : "pointer",
              fontFamily: "monospace",
              borderRadius: "2px",
              opacity: aiLoading[s] ? 0.6 : 1,
            }}
          >
            {aiLoading[s]
              ? `GENERATING ${s === "C" ? "TRANSITION" : s}...`
              : aiImages[s]
                ? `REDO ${s === "C" ? "TRANSITION" : `SIDE ${s}`}`
                : `GENERATE ${s === "C" ? "TRANSITION" : `SIDE ${s}`}`}
          </button>
        ))}
      </div>

      {/* State Tabs */}
      <div style={{ display: "flex", borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e" }}>
        {(
          [
            { id: "A" as const, label: `SIDE A — ${activeScenario.sideA.toUpperCase()}` },
            { id: "B" as const, label: `SIDE B — ${activeScenario.sideB.toUpperCase()}` },
            { id: "C" as const, label: `EMERGENT — ${activeScenario.emergent.toUpperCase()}` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => animateToState(tab.id)}
            type="button"
            style={{
              flex: 1,
              padding: "10px 8px",
              background: activeState === tab.id ? "#1a1a1a" : "transparent",
              color: activeState === tab.id ? stateColors[tab.id] : "#444",
              border: "none",
              borderBottom:
                activeState === tab.id
                  ? `2px solid ${stateColors[tab.id]}`
                  : "2px solid transparent",
              fontSize: "9px",
              letterSpacing: "1.5px",
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Display */}
      <div style={{ padding: "16px", background: "#0d0d0d" }}>
        {viewMode === "ai" && aiImages[activeState] ? (
          <div style={{ position: "relative" }}>
            <img
              alt={`Position ${activeState} AI render`}
              src={aiImages[activeState]}
              style={{ width: "100%", display: "block", borderRadius: "4px" }}
            />
            <a
              download={`${projectCode}-simulator-${activeState.toLowerCase()}.png`}
              href={aiImages[activeState]}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                padding: "6px 12px",
                fontSize: "9px",
                letterSpacing: "1.5px",
                borderRadius: "4px",
                textDecoration: "none",
                fontFamily: "monospace",
              }}
            >
              DOWNLOAD
            </a>
          </div>
        ) : (
          <SlatWallCanvas
            scenario={activeScenario}
            state={activeState}
            slatCount={slatCount}
            width={1200}
            height={400}
          />
        )}
      </div>

      {/* State Info */}
      <div style={{ padding: "10px 24px", borderTop: "1px solid #1e1e1e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "9px", letterSpacing: "2px", color: "#555" }}>
            {activeState === "A"
              ? "ALL SLATS FORWARD — SIDE A VISIBLE"
              : activeState === "B"
                ? "ALL SLATS ROTATED 180° — SIDE B VISIBLE"
                : "ALTERNATING SLATS — EMERGENT IMAGE REVEALED"}
          </div>
          <div style={{ fontSize: "9px", color: "#333", textAlign: "right", lineHeight: 2 }}>
            {slatCount} SLATS &middot; {slatWidth}&quot; EACH &middot; {wallWidthFt} FT WIDE
          </div>
        </div>
      </div>

      {/* Three State Preview Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", padding: "0 16px 16px" }}>
        {(
          [
            { state: "A" as const, label: "SIDE A", sub: activeScenario.sideA },
            { state: "B" as const, label: "SIDE B", sub: activeScenario.sideB },
            { state: "C" as const, label: "EMERGENT", sub: activeScenario.emergent },
          ] as const
        ).map(({ state, label, sub }) => (
          <div
            key={state}
            onClick={() => { animateToState(state); setActiveState(state); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && animateToState(state)}
            style={{
              background: "#111",
              border: `1px solid ${activeState === state ? stateColors[state] : "#1e1e1e"}`,
              borderRadius: "4px",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            {viewMode === "ai" && aiImages[state] ? (
              <img
                alt={`${label} preview`}
                src={aiImages[state]}
                style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }}
              />
            ) : (
              <SlatWallCanvas
                scenario={activeScenario}
                state={state}
                slatCount={slatCount}
                width={400}
                height={160}
              />
            )}
            <div style={{ padding: "6px 10px" }}>
              <div style={{ fontSize: "7px", letterSpacing: "2px", color: stateColors[state] }}>
                {label}
                {aiImages[state] ? " (AI)" : ""}
              </div>
              <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tech Specs Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          padding: "14px 24px",
          borderTop: "1px solid #1e1e1e",
        }}
      >
        {[
          { label: "SLAT COUNT", value: String(slatCount) },
          { label: "SLAT WIDTH", value: `${slatWidth}"` },
          { label: "WALL WIDTH", value: `${wallWidthFt} FT` },
          { label: "LINE SYSTEM", value: "HORIZONTAL ONLY" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: "7px", letterSpacing: "2px", color: "#444", marginBottom: "2px" }}>
              {label}
            </div>
            <div style={{ fontWeight: 800, fontSize: "18px", color: activeScenario.color, letterSpacing: "1px" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 24px",
          borderTop: "1px solid #1a1a1a",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "8px",
          color: "#333",
          letterSpacing: "2px",
        }}
      >
        <div>ROTATING SLAT WALL SYSTEM &middot; RB STUDIO &middot; PROPRIETARY CONCEPT</div>
        <div>HORIZONTAL LINE DENSITY METHOD &middot; THREE-STATE OPTICAL REVEAL</div>
      </div>
    </div>
  );
}
