import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Try local filesystem first (works in dev)
  try {
    const localPath = path.join(process.cwd(), "public", "generated-images", `${id}.png`);
    const data = await readFile(localPath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // File not on disk — serve from DB
  }

  // Look up asset by generatedOutputId prefix match
  const asset = await prisma.generatedImageAsset.findFirst({
    where: {
      OR: [
        { generatedOutputId: id },
        { generatedOutputId: id.replace(/-[^-]+$/, "") },
      ],
    },
    select: { metadataJson: true },
  });

  if (!asset?.metadataJson) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const metadata = asset.metadataJson as Record<string, unknown>;
  const base64 = metadata["imageBase64"] as string | undefined;

  if (!base64) {
    return NextResponse.json({ error: "Image data not available" }, { status: 404 });
  }

  const buffer = Buffer.from(base64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
