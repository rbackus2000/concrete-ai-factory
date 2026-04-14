"use server";

import { Prisma } from "@prisma/client";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  buildSimulatorSideAPrompt,
  buildSimulatorSideBPrompt,
  buildSimulatorEmergentPrompt,
  findImageCombo,
  buildDefaultGuidance,
  type SlatWallSimulatorPromptConfig,
} from "@/lib/engines/slat-wall-prompt-engine";
import { generateImageWithGemini } from "@/lib/services/image-generation-service";
import { decimalToNumber } from "@/lib/services/service-helpers";

export async function generateSimulatorImage(input: {
  projectId: string;
  scenarioId: string;
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

  // Look up curated combo for interpretation guidance, fall back to defaults
  const combo = findImageCombo(input.sideA, input.sideB, input.emergent);

  const config: SlatWallSimulatorPromptConfig = {
    slatCount,
    slatWidthInches: slatW,
    wallWidthFeet: wallFt,
    wallHeightFeet: heightFt,
    backgroundTone: "Warm light concrete / cream background",
    sideASubject: input.sideA,
    sideBSubject: input.sideB,
    emergentSubject: input.emergent,
    sideAInterpretationGuidance: combo?.sideAGuidance ?? buildDefaultGuidance(input.sideA, "sideA"),
    sideBInterpretationGuidance: combo?.sideBGuidance ?? buildDefaultGuidance(input.sideB, "sideB"),
    emergentInterpretationGuidance: combo?.emergentGuidance ?? buildDefaultGuidance(input.emergent, "emergent"),
    projectCode: project.code,
  };

  let promptText: string;

  if (input.state === "A") {
    promptText = buildSimulatorSideAPrompt(config);
  } else if (input.state === "B") {
    promptText = buildSimulatorSideBPrompt(config);
  } else {
    promptText = buildSimulatorEmergentPrompt(config);
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
        scenarioId: input.scenarioId,
        simulatorState: input.state,
        sideA: input.sideA,
        sideB: input.sideB,
        emergent: input.emergent,
      } as Prisma.InputJsonValue,
      outputPayload: {
        text: promptText,
        promptText,
        slatWallProjectId: input.projectId,
        slatWallScenarioId: input.scenarioId,
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
