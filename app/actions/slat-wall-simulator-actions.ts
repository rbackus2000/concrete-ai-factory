"use server";

import { Prisma } from "@prisma/client";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateImageWithGemini } from "@/lib/services/image-generation-service";
import { decimalToNumber } from "@/lib/services/service-helpers";

export async function generateSimulatorImage(input: {
  projectId: string;
  state: "A" | "B" | "C";
  sideA: string;
  sideB: string;
  emergent: string;
}) {
  await requireSession();

  const project = await prisma.slatWallProject.findUnique({
    where: { id: input.projectId },
    include: { config: true },
  });

  if (!project || !project.config) throw new Error("Project not found or has no config.");

  const c = project.config;
  const slatCount = c.totalSlatCount;
  const slatW = decimalToNumber(c.slatWidth) ?? 7;
  const slatH = decimalToNumber(c.slatHeight) ?? 180;
  const spacing = decimalToNumber(c.slatSpacing) ?? 0.25;
  const wallW = slatCount * (slatW + spacing);
  const wallFt = (wallW / 12).toFixed(1);
  const heightFt = (slatH / 12).toFixed(1);

  const sideA = input.sideA;
  const sideB = input.sideB;
  const emergent = input.emergent;

  const lineStyle = `STYLE RULES (MANDATORY):
- BLACK INK ONLY on a light concrete/cream background (#dedad2 or similar warm off-white)
- All imagery expressed ENTIRELY through horizontal black lines of varying density and thickness
- Dense/thick lines = dark areas. Sparse/thin lines = light areas
- NO color whatsoever — strictly monochrome black ink on light background
- NO curves or diagonal lines — HORIZONTAL LINES ONLY
- NO photographic realism — this is a line-density artwork system
- Show ${slatCount} subtle vertical slat division lines evenly spaced (thin gaps between slats)
- Each slat strip is ${slatW}" wide
- The artwork should read as one unified composition across all slats
- Premium, architectural, museum-quality line art`;

  let promptText: string;

  if (input.state === "A") {
    promptText = `Generate a flat, full-frame horizontal-line-density artwork for a rotating slat wall. All ${slatCount} slats showing Side A.

SUBJECT: "${sideA}"
Wall: ${wallFt} ft wide x ${heightFt} ft tall, ${slatCount} slats

${lineStyle}

The image of "${sideA}" must be recognizable through varying horizontal line density — denser lines in dark/shadow areas, sparser lines in highlight areas. Fill the entire frame edge to edge.

Do NOT show: color, room environment, frames, 3D perspective, photographic imagery. Black horizontal lines on light background ONLY.

RB Studio | ${project.code} | Side A — ${sideA}`;
  } else if (input.state === "B") {
    promptText = `Generate a flat, full-frame horizontal-line-density artwork for a rotating slat wall. All ${slatCount} slats showing Side B.

SUBJECT: "${sideB}"
Wall: ${wallFt} ft wide x ${heightFt} ft tall, ${slatCount} slats

${lineStyle}

The image of "${sideB}" must be recognizable through varying horizontal line density — denser lines in dark/shadow areas, sparser lines in highlight areas. Fill the entire frame edge to edge.

Do NOT show: color, room environment, frames, 3D perspective, photographic imagery. Black horizontal lines on light background ONLY.

RB Studio | ${project.code} | Side B — ${sideB}`;
  } else {
    promptText = `Generate a flat, full-frame image showing a rotating slat wall in its emergent three-state reveal — alternating slats from Side A and Side B combine to reveal a hidden third image.

SIDE A: "${sideA}" (shown on odd slats)
SIDE B: "${sideB}" (shown on even slats)
EMERGENT IMAGE: "${emergent}" (visible when alternating slats are viewed together)

Wall: ${wallFt} ft wide x ${heightFt} ft tall, ${slatCount} slats

${lineStyle}

Odd-numbered slats show horizontal line density of "${sideA}".
Even-numbered slats show horizontal line density of "${sideB}".
Together, the alternating slats reveal the emergent form of "${emergent}" — the hidden third image that appears only when both sides are visible simultaneously.

Do NOT show: color, room environment, frames, 3D perspective, photographic imagery. Black horizontal lines on light background ONLY.

RB Studio | ${project.code} | Emergent — ${emergent}`;
  }

  // Create a temporary output record
  const anySku = await prisma.sku.findFirst({ where: { status: "ACTIVE" } });
  if (!anySku) throw new Error("At least one active SKU required.");

  const output = await prisma.generatedOutput.create({
    data: {
      skuId: anySku.id,
      title: `${project.code} SIMULATOR — ${input.state === "C" ? "TRANSITION" : `POSITION ${input.state}`}`,
      outputType: "IMAGE_RENDER",
      status: "GENERATED",
      inputPayload: {
        projectId: input.projectId,
        simulatorState: input.state,
        sideA: input.sideA,
        sideB: input.sideB,
        emergent: input.emergent,
      } as Prisma.InputJsonValue,
      outputPayload: {
        text: promptText,
        promptText,
        slatWallProjectId: input.projectId,
        slatWallOutputType: `SIMULATOR_${input.state}`,
      } as Prisma.InputJsonValue,
      generatedBy: "slat-wall-simulator",
    },
  });

  const result = await generateImageWithGemini({
    generatedOutputId: output.id,
    promptText,
    suffix: `sim-${input.state.toLowerCase()}`,
    imageSize: "2K",
  });

  await prisma.generatedImageAsset.create({
    data: {
      generatedOutputId: output.id,
      promptTextUsed: promptText,
      modelName: result.modelName,
      imageUrl: result.imageUrl,
      filePath: result.filePath,
      status: "GENERATED",
      width: result.width,
      height: result.height,
      metadataJson: result.metadataJson,
    },
  });

  return {
    imageUrl: result.imageUrl,
    outputId: output.id,
    state: input.state,
  };
}
