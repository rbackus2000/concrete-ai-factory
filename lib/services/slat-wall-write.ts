import { prisma } from "../db";
import type { SlatWallProjectEditorValues } from "../schemas/slat-wall";

export async function createSlatWallProject(values: SlatWallProjectEditorValues) {
  const project = await prisma.slatWallProject.create({
    data: {
      code: values.code,
      slug: values.slug,
      name: values.name,
      status: values.status,
      clientName: values.clientName || null,
      location: values.location || null,
      designer: values.designer || null,
      engineer: values.engineer || null,
      revision: values.revision || null,
      description: values.description || null,
      positionAName: values.positionAName || null,
      positionBName: values.positionBName || null,
      positionADescription: values.positionADescription || null,
      positionBDescription: values.positionBDescription || null,
      config: {
        create: {
          totalSlatCount: values.totalSlatCount,
          slatWidth: values.slatWidth,
          slatThickness: values.slatThickness,
          slatHeight: values.slatHeight,
          totalWallWidth: values.totalSlatCount * (values.slatWidth + values.slatSpacing),
          slatSpacing: values.slatSpacing,
          supportFrameType: values.supportFrameType || null,
          pivotType: values.pivotType || null,
          rotationAngleA: values.rotationAngleA,
          rotationAngleB: values.rotationAngleB,
        },
      },
    },
    include: { config: true },
  });

  // Auto-generate slat records
  const slatData = Array.from({ length: values.totalSlatCount }, (_, i) => ({
    projectId: project.id,
    slatIndex: i + 1,
    slatId: `S-${String(i + 1).padStart(2, "0")}`,
    wallPosition: i + 1,
    width: values.slatWidth,
    height: values.slatHeight,
    thickness: values.slatThickness,
    faceASliceId: `A-${String(i + 1).padStart(2, "0")}`,
    faceBSliceId: `B-${String(i + 1).padStart(2, "0")}`,
  }));

  await prisma.slatRecord.createMany({ data: slatData });

  return project;
}

export async function updateSlatWallProject(
  projectId: string,
  values: SlatWallProjectEditorValues,
) {
  const existing = await prisma.slatWallProject.findUnique({
    where: { id: projectId },
    include: { config: true },
  });

  if (!existing) throw new Error("Project not found.");

  const slatCountChanged = existing.config?.totalSlatCount !== values.totalSlatCount;

  const project = await prisma.slatWallProject.update({
    where: { id: projectId },
    data: {
      code: values.code,
      slug: values.slug,
      name: values.name,
      status: values.status,
      clientName: values.clientName || null,
      location: values.location || null,
      designer: values.designer || null,
      engineer: values.engineer || null,
      revision: values.revision || null,
      description: values.description || null,
      positionAName: values.positionAName || null,
      positionBName: values.positionBName || null,
      positionADescription: values.positionADescription || null,
      positionBDescription: values.positionBDescription || null,
      config: {
        upsert: {
          create: {
            totalSlatCount: values.totalSlatCount,
            slatWidth: values.slatWidth,
            slatThickness: values.slatThickness,
            slatHeight: values.slatHeight,
            totalWallWidth: values.totalSlatCount * (values.slatWidth + values.slatSpacing),
            slatSpacing: values.slatSpacing,
            supportFrameType: values.supportFrameType || null,
            pivotType: values.pivotType || null,
            rotationAngleA: values.rotationAngleA,
            rotationAngleB: values.rotationAngleB,
          },
          update: {
            totalSlatCount: values.totalSlatCount,
            slatWidth: values.slatWidth,
            slatThickness: values.slatThickness,
            slatHeight: values.slatHeight,
            totalWallWidth: values.totalSlatCount * (values.slatWidth + values.slatSpacing),
            slatSpacing: values.slatSpacing,
            supportFrameType: values.supportFrameType || null,
            pivotType: values.pivotType || null,
            rotationAngleA: values.rotationAngleA,
            rotationAngleB: values.rotationAngleB,
          },
        },
      },
    },
    include: { config: true },
  });

  // Regenerate slat records if count changed
  if (slatCountChanged) {
    await prisma.slatRecord.deleteMany({ where: { projectId } });

    const slatData = Array.from({ length: values.totalSlatCount }, (_, i) => ({
      projectId: project.id,
      slatIndex: i + 1,
      slatId: `S-${String(i + 1).padStart(2, "0")}`,
      wallPosition: i + 1,
      width: values.slatWidth,
      height: values.slatHeight,
      thickness: values.slatThickness,
      faceASliceId: `A-${String(i + 1).padStart(2, "0")}`,
      faceBSliceId: `B-${String(i + 1).padStart(2, "0")}`,
    }));

    await prisma.slatRecord.createMany({ data: slatData });
  }

  return project;
}
