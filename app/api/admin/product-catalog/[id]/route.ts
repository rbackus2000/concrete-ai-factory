import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuditAction, AuditEntityType } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/shared";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/services/audit-service";

const updatePriceSchema = z.object({
  retailPrice: z.number().min(0).nullable(),
  wholesalePrice: z.number().min(0).nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = authenticateRequest(request.headers.get("authorization"));
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updatePriceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sku = await prisma.sku.findUnique({ where: { id }, select: { code: true } });
  if (!sku) {
    return NextResponse.json({ error: "SKU not found" }, { status: 404 });
  }

  await prisma.sku.update({
    where: { id },
    data: {
      retailPrice: parsed.data.retailPrice,
      wholesalePrice: parsed.data.wholesalePrice,
    },
  });

  await createAuditLog({
    actor: session,
    entityType: AuditEntityType.SKU,
    entityId: id,
    action: AuditAction.UPDATE,
    summary: `Updated pricing for ${sku.code}: retail=$${parsed.data.retailPrice ?? "null"}, wholesale=$${parsed.data.wholesalePrice ?? "null"}.`,
  });

  return NextResponse.json({ data: { success: true } });
}
