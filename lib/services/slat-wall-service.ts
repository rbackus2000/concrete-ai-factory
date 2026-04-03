import { prisma } from "../db";
import { decimalToNumber } from "./service-helpers";

function mapProject(p: NonNullable<Awaited<ReturnType<typeof prisma.slatWallProject.findUnique>>>) {
  return {
    id: p.id,
    code: p.code,
    slug: p.slug,
    name: p.name,
    status: p.status,
    clientName: p.clientName ?? "",
    location: p.location ?? "",
    designer: p.designer ?? "",
    engineer: p.engineer ?? "",
    revision: p.revision ?? "",
    description: p.description ?? "",
    positionAName: p.positionAName ?? "",
    positionBName: p.positionBName ?? "",
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function mapConfig(c: NonNullable<Awaited<ReturnType<typeof prisma.slatWallConfig.findUnique>>>) {
  return {
    id: c.id,
    totalSlatCount: c.totalSlatCount,
    slatWidth: decimalToNumber(c.slatWidth) ?? 7,
    slatThickness: decimalToNumber(c.slatThickness) ?? 0.45,
    slatHeight: decimalToNumber(c.slatHeight) ?? 180,
    totalWallWidth: decimalToNumber(c.totalWallWidth),
    supportFrameType: c.supportFrameType ?? "",
    pivotType: c.pivotType ?? "",
    rotationAngleA: decimalToNumber(c.rotationAngleA) ?? 0,
    rotationAngleB: decimalToNumber(c.rotationAngleB) ?? 180,
    slatSpacing: decimalToNumber(c.slatSpacing) ?? 0.25,
    notes: c.notes ?? "",
  };
}

function mapSlat(s: NonNullable<Awaited<ReturnType<typeof prisma.slatRecord.findFirst>>>) {
  return {
    id: s.id,
    slatIndex: s.slatIndex,
    slatId: s.slatId,
    wallPosition: s.wallPosition,
    width: decimalToNumber(s.width),
    height: decimalToNumber(s.height),
    thickness: decimalToNumber(s.thickness),
    weight: decimalToNumber(s.weight),
    faceASliceId: s.faceASliceId,
    faceAImageUrl: s.faceAImageUrl,
    faceBSliceId: s.faceBSliceId,
    faceBImageUrl: s.faceBImageUrl,
    faceAColorRef: s.faceAColorRef ?? "",
    faceBColorRef: s.faceBColorRef ?? "",
    orientation: s.orientation,
    status: s.status,
    notes: s.notes ?? "",
  };
}

export async function listSlatWallProjects() {
  const projects = await prisma.slatWallProject.findMany({
    include: { config: true, _count: { select: { slats: true } } },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((p) => ({
    ...mapProject(p),
    slatCount: p._count.slats,
    totalSlatCount: p.config?.totalSlatCount ?? 0,
    slatWidth: decimalToNumber(p.config?.slatWidth) ?? 0,
    slatHeight: decimalToNumber(p.config?.slatHeight) ?? 0,
  }));
}

export async function getSlatWallDetail(projectId: string) {
  const project = await prisma.slatWallProject.findUnique({
    where: { id: projectId },
    include: {
      config: true,
      artworks: { orderBy: { position: "asc" } },
      slats: { orderBy: { slatIndex: "asc" } },
    },
  });

  if (!project) return null;

  return {
    project: mapProject(project),
    config: project.config ? mapConfig(project.config) : null,
    artworks: project.artworks.map((a) => ({
      id: a.id,
      position: a.position,
      originalFilename: a.originalFilename,
      imageUrl: a.imageUrl,
      width: a.width,
      height: a.height,
      description: a.description ?? "",
      status: a.status,
    })),
    slats: project.slats.map(mapSlat),
  };
}

export async function getSlatWallForEdit(projectId: string) {
  const project = await prisma.slatWallProject.findUnique({
    where: { id: projectId },
    include: { config: true },
  });

  if (!project) return null;

  return {
    project: mapProject(project),
    config: project.config ? mapConfig(project.config) : null,
  };
}
