"use server";

import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

const ODA_PATH = "/Applications/ODAFileConverter.app/Contents/MacOS/ODAFileConverter";

export async function convertDxfToDwg(dxfContent: string, filename: string): Promise<number[] | null> {
  const jobId = randomUUID();
  const inputDir = path.join("/tmp", `oda-in-${jobId}`);
  const outputDir = path.join("/tmp", `oda-out-${jobId}`);

  try {
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    const dxfPath = path.join(inputDir, `${filename}.dxf`);
    await writeFile(dxfPath, dxfContent);

    await execFileAsync(ODA_PATH, [inputDir, outputDir, "ACAD2018", "DWG", "0", "1"], {
      timeout: 10000,
    });

    const dwgPath = path.join(outputDir, `${filename}.dwg`);
    const dwgBytes = await readFile(dwgPath);

    // Return as number array (serializable across server/client boundary)
    return Array.from(dwgBytes);
  } catch {
    return null;
  } finally {
    await rm(inputDir, { recursive: true, force: true }).catch(() => {});
    await rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function convertDxfBatchToDwg(
  files: Array<{ name: string; dxf: string }>,
): Promise<Array<{ name: string; dwgBytes: number[] | null }>> {
  const jobId = randomUUID();
  const inputDir = path.join("/tmp", `oda-batch-in-${jobId}`);
  const outputDir = path.join("/tmp", `oda-batch-out-${jobId}`);

  try {
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    // Write all DXF files
    for (const file of files) {
      await writeFile(path.join(inputDir, `${file.name}.dxf`), file.dxf);
    }

    // Single ODA call converts entire directory
    await execFileAsync(ODA_PATH, [inputDir, outputDir, "ACAD2018", "DWG", "0", "1"], {
      timeout: 60000,
    });

    // Read all DWG files
    const results: Array<{ name: string; dwgBytes: number[] | null }> = [];
    for (const file of files) {
      try {
        const dwgBytes = await readFile(path.join(outputDir, `${file.name}.dwg`));
        results.push({ name: file.name, dwgBytes: Array.from(dwgBytes) });
      } catch {
        results.push({ name: file.name, dwgBytes: null });
      }
    }

    return results;
  } catch {
    return files.map((f) => ({ name: f.name, dwgBytes: null }));
  } finally {
    await rm(inputDir, { recursive: true, force: true }).catch(() => {});
    await rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
}
