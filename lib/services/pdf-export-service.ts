import { spawnSync } from "node:child_process";
import path from "node:path";

import { getPrintablePacketExport } from "./export-service";
import { ensurePdfRuntimeAvailable } from "./pdf-runtime-service";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function exportBuildPacketPdf(outputId: string) {
  const printable = await getPrintablePacketExport(outputId);

  if (!printable) {
    return null;
  }

  ensurePdfRuntimeAvailable();

  const scriptPath = path.join(process.cwd(), "scripts", "render_packet_pdf.py");
  const payload = {
    title: printable.title,
    outputId: printable.outputId,
    sku: printable.sku,
    status: printable.status,
    version: printable.version,
    createdAt: printable.createdAt,
    sections: printable.sections,
    rulesApplied: printable.rulesApplied,
    qcTemplatesApplied: printable.qcTemplatesApplied,
    sourceReferences: printable.sourceReferences,
    technicalDrawings: printable.technicalDrawings,
  };

  const result = spawnSync("python3", [scriptPath], {
    input: JSON.stringify(payload),
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() || "Unknown PDF export error.";
    throw new Error(`PDF export failed: ${stderr}`);
  }

  return {
    filename: `${printable.sku.code}-${slugify(printable.title)}.pdf`,
    content: result.stdout,
  };
}
