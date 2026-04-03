"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  buildSlatWallPrompt,
  type SlatWallOutputType,
  type SlatWallProjectData,
} from "@/lib/engines/slat-wall-prompt-engine";
import { generateImageWithGemini } from "@/lib/services/image-generation-service";
import { decimalToNumber } from "@/lib/services/service-helpers";

export async function generateSlatWallOutputAction(input: {
  projectId: string;
  outputType: SlatWallOutputType;
  creativeDirection: string;
}) {
  await requireSession();

  const project = await prisma.slatWallProject.findUnique({
    where: { id: input.projectId },
    include: { config: true },
  });

  if (!project) throw new Error("Project not found.");
  if (!project.config) throw new Error("Project has no configuration.");

  const projectData: SlatWallProjectData = {
    code: project.code,
    name: project.name,
    clientName: project.clientName ?? "",
    location: project.location ?? "",
    designer: project.designer ?? "",
    positionAName: project.positionAName ?? "Image A",
    positionBName: project.positionBName ?? "Image B",
    positionADescription: project.positionADescription ?? "",
    positionBDescription: project.positionBDescription ?? "",
    config: {
      totalSlatCount: project.config.totalSlatCount,
      slatWidth: decimalToNumber(project.config.slatWidth) ?? 7,
      slatThickness: decimalToNumber(project.config.slatThickness) ?? 0.45,
      slatHeight: decimalToNumber(project.config.slatHeight) ?? 180,
      slatSpacing: decimalToNumber(project.config.slatSpacing) ?? 0.25,
      supportFrameType: project.config.supportFrameType ?? "",
      pivotType: project.config.pivotType ?? "",
      rotationAngleA: decimalToNumber(project.config.rotationAngleA) ?? 0,
      rotationAngleB: decimalToNumber(project.config.rotationAngleB) ?? 180,
    },
  };

  const promptText = buildSlatWallPrompt(
    projectData,
    input.outputType,
    input.creativeDirection,
  );

  const isImageOutput = input.outputType !== "BUILD_PACKET";
  const title = `${project.code} ${input.outputType.replace(/_/g, " ")}`;

  // Find or use a placeholder SKU for the GeneratedOutput FK
  const anySku = await prisma.sku.findFirst({ where: { status: "ACTIVE" } });
  if (!anySku) throw new Error("At least one active SKU is required.");

  const output = await prisma.generatedOutput.create({
    data: {
      skuId: anySku.id,
      title,
      outputType: "IMAGE_RENDER",
      status: "GENERATED",
      inputPayload: {
        projectId: input.projectId,
        projectCode: project.code,
        outputType: input.outputType,
        creativeDirection: input.creativeDirection,
      } as Prisma.InputJsonValue,
      outputPayload: {
        text: promptText,
        promptText,
        slatWallProjectId: input.projectId,
        slatWallOutputType: input.outputType,
      } as Prisma.InputJsonValue,
      generatedBy: "slat-wall-generator",
    },
  });

  let imageUrl: string | null = null;

  if (isImageOutput) {
    try {
      const result = await generateImageWithGemini({
        generatedOutputId: output.id,
        promptText,
        imageSize: "2K",
      });

      const asset = await prisma.generatedImageAsset.create({
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

      imageUrl = asset.imageUrl;

      await prisma.generatedOutput.update({
        where: { id: output.id },
        data: {
          outputPayload: {
            text: promptText,
            promptText,
            slatWallProjectId: input.projectId,
            slatWallOutputType: input.outputType,
            imageUrl: asset.imageUrl,
            imageStatus: "GENERATED",
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error("[slat-wall-gen] Image generation failed:", error instanceof Error ? error.message : error);
    }
  }

  revalidatePath(`/slat-walls/${input.projectId}`);

  return {
    id: output.id,
    title,
    outputType: input.outputType,
    text: promptText,
    imageUrl,
  };
}
