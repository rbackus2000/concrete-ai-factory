"use server";

import { Prisma } from "@prisma/client";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateImageWithGemini } from "@/lib/services/image-generation-service";
import { decimalToNumber } from "@/lib/services/service-helpers";

export async function generateSimulatorImage(input: {
  projectId: string;
  state: "A" | "B" | "C";
  scenario?: string;
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

  const posAName = project.positionAName ?? "Image A";
  const posBName = project.positionBName ?? "Image B";
  const posADesc = project.positionADescription ?? posAName;
  const posBDesc = project.positionBDescription ?? posBName;

  let promptText: string;

  if (input.state === "A") {
    promptText = `Generate a flat, full-frame artwork image that would appear on a ${wallFt} ft wide x ${heightFt} ft tall rotating slat wall when all ${slatCount} slats are in Position A.

The image is: ${posADesc}

CRITICAL REQUIREMENTS:
- The image must fill the ENTIRE frame edge to edge — no borders, no margins, no environment
- Aspect ratio must match the wall proportions: ${wallFt} ft wide x ${heightFt} ft tall
- The image should be a single continuous artwork — as if painted on a flat wall
- Show ${slatCount} subtle vertical slat division lines evenly spaced across the width (thin lines, 40% opacity white or black depending on image brightness)
- Each slat strip is ${slatW}" wide with ${spacing}" gaps between
- The artwork should read as one unified composition across all slats
- Premium, architectural quality, bold composition suitable for museum-scale display

Do NOT show: room environment, frames, lighting, 3D perspective, wall mounting. This is the flat artwork only with slat lines overlaid.

RB Studio | ${project.code} | Position A`;
  } else if (input.state === "B") {
    promptText = `Generate a flat, full-frame artwork image that would appear on a ${wallFt} ft wide x ${heightFt} ft tall rotating slat wall when all ${slatCount} slats are in Position B.

The image is: ${posBDesc}

CRITICAL REQUIREMENTS:
- The image must fill the ENTIRE frame edge to edge — no borders, no margins, no environment
- Aspect ratio must match the wall proportions: ${wallFt} ft wide x ${heightFt} ft tall
- The image should be a single continuous artwork — as if painted on a flat wall
- Show ${slatCount} subtle vertical slat division lines evenly spaced across the width (thin lines, 40% opacity white or black depending on image brightness)
- Each slat strip is ${slatW}" wide with ${spacing}" gaps between
- The artwork should read as one unified composition across all slats
- Premium, architectural quality, bold composition suitable for museum-scale display

Do NOT show: room environment, frames, lighting, 3D perspective, wall mounting. This is the flat artwork only with slat lines overlaid.

RB Studio | ${project.code} | Position B`;
  } else {
    promptText = `Generate a flat, full-frame image showing a rotating slat wall in its MID-ROTATION transitional state between two artworks.

The wall is ${wallFt} ft wide x ${heightFt} ft tall with ${slatCount} slats, each ${slatW}" wide.

Position A artwork: ${posADesc}
Position B artwork: ${posBDesc}

In this transitional state:
- Alternating slats show fragments of Image A and Image B
- Some slats are angled showing thin concrete edges (dark vertical stripes)
- The result is an abstract vertical fragmentation — elegant and kinetic
- Fragments of both images are visible but neither reads as complete
- The overall effect should feel like a visual transition, not chaos

CRITICAL REQUIREMENTS:
- Fill the ENTIRE frame edge to edge — no borders, no environment
- ${slatCount} vertical slat divisions visible
- Mix of Image A fragments, Image B fragments, and dark edge-on slat strips
- Premium, museum-quality abstract kinetic art aesthetic

Do NOT show: room, frames, lighting, 3D perspective. Flat artwork view only.

RB Studio | ${project.code} | Transition State`;
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
        scenario: input.scenario,
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
