import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../lib/db";
import { exportGeneratedOutputMarkdown } from "../lib/services/export-service";
import { generateOutput } from "../lib/services/generator-service";
import { exportBuildPacketPdf } from "../lib/services/pdf-export-service";
import { getSkuByCode, updateSkuFromEditor } from "../lib/services/sku-service";
import { getSystemActor } from "../lib/auth/session";
import type { SkuEditorValues } from "../lib/schemas/sku";

function buildEditorValuesFromSku(
  sku: NonNullable<Awaited<ReturnType<typeof getSkuByCode>>>,
): SkuEditorValues {
  return {
    name: sku.name,
    slug: sku.slug,
    category: sku.category,
    status: sku.status,
    type: sku.type,
    finish: sku.finish,
    summary: sku.summary,
    targetWeightMin: sku.targetWeight.min,
    targetWeightMax: sku.targetWeight.max,
    outerLength: sku.outerLength,
    outerWidth: sku.outerWidth,
    outerHeight: sku.outerHeight,
    innerLength: sku.innerLength,
    innerWidth: sku.innerWidth,
    innerDepth: sku.innerDepth,
    wallThickness: sku.wallThickness,
    bottomThickness: sku.bottomThickness,
    topLipThickness: sku.topLipThickness,
    hollowCoreDepth: sku.hollowCoreDepth,
    domeRiseMin: sku.domeRiseMin,
    domeRiseMax: sku.domeRiseMax,
    longRibCount: sku.longRibCount,
    crossRibCount: sku.crossRibCount,
    ribWidth: sku.ribWidth,
    ribHeight: sku.ribHeight,
    drainDiameter: sku.drainDiameter,
    reinforcementDiameter: sku.reinforcementDiameter,
    reinforcementThickness: sku.reinforcementThickness,
    draftAngle: sku.draftAngle,
    cornerRadius: sku.cornerRadius,
    fiberPercent: sku.fiberPercent,
    datumSystemJson: JSON.stringify(sku.datumSystem, null, 2),
    calculatorDefaultsJson: JSON.stringify(sku.calculatorDefaults, null, 2),
  };
}

test("SKU edit writes and audit logging work", async () => {
  const actor = getSystemActor();
  const sku = await getSkuByCode("S1-EROSION");

  assert.ok(sku, "S1-EROSION should exist");

  const original = buildEditorValuesFromSku(sku);
  const marker = `smoke-${Date.now()}`;
  const nextValues: SkuEditorValues = {
    ...original,
    summary: `${original.summary} ${marker}`,
  };

  try {
    const updated = await updateSkuFromEditor("S1-EROSION", nextValues, actor);
    assert.match(updated.summary, new RegExp(marker));

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: "SKU",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    assert.ok(auditLog, "Expected SKU audit log");
    assert.equal(auditLog.action, "UPDATE");
  } finally {
    await updateSkuFromEditor("S1-EROSION", original, actor);
  }
});

test("BUILD_PACKET generation plus markdown and PDF exports work", async () => {
  const generated = await generateOutput({
    skuCode: "S1-EROSION",
    outputType: "BUILD_PACKET",
    requestedOutput: "Smoke test build packet",
    creativeDirection: "Keep the output aligned with the seeded manufacturable data.",
  });

  assert.equal(generated.outputType, "BUILD_PACKET");

  try {
    const markdown = await exportGeneratedOutputMarkdown(generated.id);
    assert.ok(markdown, "Expected markdown export");
    assert.match(markdown.content, /## Build Packet/);

    const pdf = await exportBuildPacketPdf(generated.id);
    assert.ok(pdf, "Expected PDF export");
    assert.equal(pdf.content.subarray(0, 4).toString("ascii"), "%PDF");
  } finally {
    await prisma.generatedOutput.delete({
      where: { id: generated.id },
    });
  }
});
