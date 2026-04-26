/**
 * Generalized: fill out the 8-color palette for any list of SKUs by
 * generating missing family-scoped color variants via CAF with the hero
 * image as a Gemini reference + geometry-lock instruction.
 *
 * Called for sinks, furniture, panels, wall tiles. Scene preset + website
 * subdirectory are derived from SKU category. Hero-color mapping per SKU
 * is hard-coded at the top of each category's plan.
 *
 * Usage:
 *   node --import tsx scripts/fill-sku-color-palette.ts --category sinks
 *   node --import tsx scripts/fill-sku-color-palette.ts --category furniture
 *   node --import tsx scripts/fill-sku-color-palette.ts --category panels
 *   node --import tsx scripts/fill-sku-color-palette.ts --category tiles
 */

import path from "node:path";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });

process.env.GEMINI_IMAGE_ASPECT_RATIO = "3:4";

import { Prisma, PrismaClient, type SkuCategory } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { generateImageWithGemini } from "../lib/services/image-generation-service";
import type { ImageScenePreset } from "../lib/schemas/generator";

const prisma = new PrismaClient();

const WEBSITE_ROOT = "/Users/rbackus2000/backus-design-co";

// MinIO S3 client. When MINIO_* env vars are set, generated variants
// are pushed to the bucket in addition to the local website public dir.
// When unset, the script runs local-only.
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "";
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "bdc-products";
const minioClient = MINIO_ENDPOINT
  ? new S3Client({
      endpoint: MINIO_ENDPOINT,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
      },
    })
  : null;

async function pushToMinIO(localPath: string, key: string): Promise<void> {
  if (!minioClient) return;
  const body = await readFile(localPath);
  await minioClient.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/png",
    }),
  );
}

const CLASSIC_COLORS = ["Linen", "Frost", "Beach", "Graphite", "Pewter", "Storm", "Shadow", "Carbon"] as const;
const WOODFORM_COLORS = ["Mist", "Dune", "Fog", "Forest", "Grove", "Twilight", "Mocha", "Ember"] as const;

type Family = "Classic" | "Woodform";

type SkuPlan = {
  code: string;
  slug: string;
  family: Family;
  heroColor: string;
  /** If the hero color isn't one of the 8 palette colors, name a palette color
   *  whose slot the hero fills for the website UI. */
  heroAliasColor?: string;
};

type CategoryCfg = {
  category: SkuCategory;
  websiteDir: string;
  scenePreset: ImageScenePreset;
  roomHintBuilder: (color: string) => string;
  plans: SkuPlan[];
};

// Classic room hints — tuned for product type.
const CLASSIC_BATHROOM_HINTS: Record<string, string> = {
  Linen: "warm off-white studio backdrop with soft diffuse daylight",
  Frost: "cool pale grey studio backdrop with even neutral lighting",
  Beach: "sandy beige studio backdrop, clean daylight from one side",
  Graphite: "cool medium-grey studio backdrop with soft sidelight",
  Pewter: "warm medium-grey studio backdrop with balanced neutral lighting",
  Storm: "cool dark-grey studio backdrop with controlled directional light",
  Shadow: "deep charcoal studio backdrop with soft rim light",
  Carbon: "near-black studio backdrop with minimal directional highlight",
};
const WOODFORM_STUDIO_HINTS: Record<string, string> = {
  Mist: "bright warm-white studio backdrop",
  Dune: "warm sand-tone studio backdrop",
  Fog: "cool soft-grey studio backdrop",
  Forest: "warm amber-tinted studio backdrop",
  Grove: "warm medium-brown studio backdrop",
  Twilight: "cool dusk-toned studio backdrop",
  Mocha: "deep warm-brown studio backdrop",
  Ember: "near-black studio backdrop with subtle warmth",
};

// Hospitality interior hints (for panels).
const CLASSIC_INTERIOR_HINTS: Record<string, string> = {
  Linen: "airy daylit residential living room with pale oak furniture",
  Frost: "bright minimalist gallery foyer with polished concrete floor",
  Beach: "sunlit coastal hotel lounge with rope accents and woven rugs",
  Graphite: "contemporary office reception with walnut desk",
  Pewter: "upscale restaurant waiting area with leather banquette",
  Storm: "moody corporate lobby with tufted bench",
  Shadow: "luxury hotel corridor with linen bench and cove lighting",
  Carbon: "sleek high-rise entry with dark walnut console",
};
const WOODFORM_INTERIOR_HINTS: Record<string, string> = {
  Mist: "bright coastal residential living room with white linen upholstery",
  Dune: "warm Mediterranean hotel lounge with terracotta tile and rattan",
  Fog: "minimalist Scandinavian living room with pale oak floor",
  Forest: "warm mid-century lounge with olive leather armchairs",
  Grove: "dark hospitality library with deep walnut shelving",
  Twilight: "moody speakeasy lounge with velvet armchairs",
  Mocha: "deep-toned hotel library with green walls and brass lamps",
  Ember: "intimate dining room with dark walnut table and brass pendants",
};

function studioHint(family: Family, color: string): string {
  return (family === "Woodform" ? WOODFORM_STUDIO_HINTS : CLASSIC_BATHROOM_HINTS)[color] ?? "clean neutral studio backdrop";
}
function interiorHint(family: Family, color: string): string {
  return (family === "Woodform" ? WOODFORM_INTERIOR_HINTS : CLASSIC_INTERIOR_HINTS)[color] ?? "refined hospitality interior";
}

// Two reference-lock instructions, chosen by scene preset.
// - GEOMETRY_AND_BACKDROP_LOCK: used for catalog / sample / repeat_pattern
//   studio renders. The ONLY thing that changes between variants is the
//   product's material color. Backdrop, camera angle, lighting, and
//   composition must match the reference byte-for-byte in feel.
// - GEOMETRY_LOCK_ROOM_VARY: used only for the installed preset (panels),
//   where showing the product in different interior contexts is desirable.
const GEOMETRY_AND_BACKDROP_LOCK =
  "REFERENCE IMAGE: The attached image shows the APPROVED product render. The ONLY thing you are allowed to change is the product's material color/tone — apply the new specified color to the product surface. You MUST keep identical: the product shape, surface geometry, relief/texture pattern, proportions, silhouette, camera angle, composition, framing, studio backdrop, floor/surface under the product, and lighting direction. The scene behind and around the product must look the same as the reference. Do NOT change the backdrop color. Do NOT change the camera angle. Do NOT invent new geometry. Only the product's material color changes.";

const GEOMETRY_LOCK_ROOM_VARY =
  "REFERENCE IMAGE: The attached image shows the APPROVED physical product design. You MUST keep the product's surface geometry, shape, relief/texture pattern, proportions, and silhouette EXACTLY as shown in the reference — this is the locked manufacturing spec and must not change. What you SHOULD change: the finish color/tone and the ambient room setting (different furniture, different warm-lit interior). Do NOT invent new geometry or change the product's shape.";

function referenceInstructionFor(scenePreset: ImageScenePreset): string {
  return scenePreset === "installed" ? GEOMETRY_LOCK_ROOM_VARY : GEOMETRY_AND_BACKDROP_LOCK;
}

// ── Category plans ─────────────────────────────────────────────

const SINK_PLANS: SkuPlan[] = [
  { code: "S1-EROSION", slug: "s1-erosion", family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "S2-CANYON", slug: "s2-canyon", family: "Classic", heroColor: "Shadow", heroAliasColor: "Shadow" },
  { code: "S3-TIDE", slug: "s3-tide", family: "Classic", heroColor: "Linen", heroAliasColor: "Linen" },
  { code: "S4-FACET", slug: "s4-facet", family: "Classic", heroColor: "Storm", heroAliasColor: "Storm" },
  { code: "S5-SLOPE", slug: "s5-slope", family: "Classic", heroColor: "Beach", heroAliasColor: "Beach" },
  { code: "S6-TIMBER", slug: "s6-timber", family: "Woodform", heroColor: "Dune", heroAliasColor: "Dune" },
  { code: "S7-ROUND", slug: "s7-round", family: "Classic", heroColor: "Frost", heroAliasColor: "Frost" },
  { code: "S8-OVAL", slug: "s8-oval", family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "S9-RIDGE", slug: "s9-ridge", family: "Classic", heroColor: "Linen", heroAliasColor: "Linen" },
  { code: "S10-CHANNEL", slug: "s10-channel", family: "Classic", heroColor: "Graphite", heroAliasColor: "Graphite" },
  { code: "S11-RIVER", slug: "s11-river", family: "Classic", heroColor: "Beach", heroAliasColor: "Beach" },
  { code: "S12-STRATA", slug: "s12-strata", family: "Classic", heroColor: "Frost", heroAliasColor: "Frost" },
  { code: "S13-SPHERE", slug: "s13-sphere", family: "Classic", heroColor: "Shadow", heroAliasColor: "Shadow" },
];

const FURNITURE_PLANS: SkuPlan[] = [
  { code: "F1-MONOLITH", slug: "f1-monolith", family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "F2-SLAB", slug: "f2-slab", family: "Classic", heroColor: "Shadow", heroAliasColor: "Shadow" },
  { code: "F3-ARCADE", slug: "f3-arcade", family: "Classic", heroColor: "Beach", heroAliasColor: "Beach" },
  { code: "F4-LEDGE", slug: "f4-ledge", family: "Classic", heroColor: "Storm", heroAliasColor: "Storm" },
  { code: "F5-BASIN", slug: "f5-basin", family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "F6-STUMP", slug: "f6-stump", family: "Woodform", heroColor: "Grove", heroAliasColor: "Grove" },
  { code: "F7-FISSURE", slug: "f7-fissure", family: "Classic", heroColor: "Carbon", heroAliasColor: "Carbon" },
];

const PANEL_PLANS: SkuPlan[] = [
  { code: "P6-STAVE", slug: "p6-stave", family: "Woodform", heroColor: "Grove" },
  { code: "P7-RHYTHM", slug: "p7-rhythm", family: "Classic", heroColor: "Graphite" },
  { code: "P8-KINETIC", slug: "p8-kinetic", family: "Classic", heroColor: "Shadow" },
  { code: "P9-DUNE", slug: "p9-dune", family: "Woodform", heroColor: "Dune" },
];

const TILE_PLANS: SkuPlan[] = [
  { code: "T1-SLATE", slug: "t1-slate", family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "T2-RIDGE", slug: "t2-ridge", family: "Classic", heroColor: "Linen", heroAliasColor: "Linen" },
  { code: "T3-CHANNEL", slug: "t3-channel", family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "T4-MONOLITH", slug: "t4-monolith", family: "Classic", heroColor: "Shadow", heroAliasColor: "Shadow" },
  { code: "T5-TECTONIC", slug: "t5-tectonic", family: "Classic", heroColor: "Carbon", heroAliasColor: "Carbon" },
];

const HARDGOOD_PLANS: SkuPlan[] = [
  { code: "HG1-VESSEL-XL", slug: "vessel-bowl-xl",      family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "HG2-CANDLE",    slug: "taper-candle-holder", family: "Classic", heroColor: "Carbon", heroAliasColor: "Carbon" },
  { code: "HG3-CATCHALL",  slug: "catchall-tray",       family: "Classic", heroColor: "Linen",  heroAliasColor: "Linen"  },
  { code: "HG4-BOOKEND",   slug: "bookend-set",         family: "Classic", heroColor: "Shadow", heroAliasColor: "Shadow" },
  { code: "HG5-INCENSE",   slug: "incense-burner",      family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
  { code: "HG6-SOAPDISH",  slug: "soap-dish",           family: "Classic", heroColor: "Linen",  heroAliasColor: "Linen"  },
  { code: "HG7-PLANTER",   slug: "desktop-planter",     family: "Classic", heroColor: "Beach",  heroAliasColor: "Beach"  },
  { code: "HG8-COASTER",   slug: "coaster-set",         family: "Classic", heroColor: "Pewter", heroAliasColor: "Pewter" },
];

const CATEGORIES: Record<string, CategoryCfg> = {
  sinks: {
    category: "VESSEL_SINK",
    websiteDir: "sinks",
    scenePreset: "catalog",
    roomHintBuilder: (color) => studioHint("Classic", color), // will be overridden per-plan
    plans: SINK_PLANS,
  },
  furniture: {
    category: "FURNITURE",
    websiteDir: "furniture",
    scenePreset: "catalog",
    roomHintBuilder: (color) => studioHint("Classic", color),
    plans: FURNITURE_PLANS,
  },
  panels: {
    category: "PANEL",
    websiteDir: "slat-wall",
    scenePreset: "installed",
    roomHintBuilder: (color) => interiorHint("Classic", color),
    plans: PANEL_PLANS,
  },
  tiles: {
    category: "WALL_TILE",
    websiteDir: "tile",
    scenePreset: "repeat_pattern",
    roomHintBuilder: (color) => studioHint("Classic", color),
    plans: TILE_PLANS,
  },
  hardgoods: {
    category: "HARD_GOOD",
    websiteDir: "hard-goods",
    scenePreset: "catalog",
    roomHintBuilder: (color) => studioHint("Classic", color),
    plans: HARDGOOD_PLANS,
  },
};

function buildVariantPrompt(opts: {
  skuCode: string;
  productName: string;
  category: SkuCategory;
  family: Family;
  color: string;
  scenePreset: ImageScenePreset;
}) {
  const isInstalled = opts.scenePreset === "installed";

  if (isInstalled) {
    // Panels: vary the room per color (hospitality-lifestyle aesthetic).
    const hint = interiorHint(opts.family, opts.color);
    return `Product render of the ${opts.skuCode} ${opts.productName} rendered in ${opts.family} ${opts.color}.

Finish:
Apply ${opts.family} ${opts.color} across the entire product surface. ${opts.color} is the dominant material color. Keep the surface geometry EXACTLY as shown in the reference image — only the finish color changes.

Interior setting:
${hint}. Ambient interior lighting, one or two upholstered seating pieces, a warm lamp, a rug or side table. Wide-to-medium interior shot at relaxed eye-level. The wall stretches through the frame.

Composition: 3:4 portrait orientation.

Negative constraints:
Do NOT change the product shape, relief, or proportions. No people. No visible brand logos.`;
  }

  // Studio catalog / sample / repeat-pattern: keep the backdrop locked to
  // the reference. Only the product's material color changes. No prose
  // describing a new backdrop — that is what was causing the backdrop to
  // drift (e.g. Carbon variant landed on a black backdrop).
  return `Color variant render of the ${opts.skuCode} ${opts.productName}.

The ONLY change from the reference image is the product's material color. The product is hand-cast Glass Fiber Reinforced Concrete (GFRC) — solid pigmented concrete throughout. "${opts.family} ${opts.color}" is the NAME of a concrete pigment color, not a different material. Apply ${opts.family} ${opts.color} as a UNIFORM, MATTE concrete pigment with very subtle micro-texture only. The color must be even and consistent across the entire product. Keep the studio backdrop, floor/shadow, camera angle, lighting, framing, and composition identical to the reference. Do not restyle the scene.

Composition: 3:4 portrait orientation, matching the reference crop.

Negative constraints:
Do NOT change the backdrop color or lighting. Do NOT change the camera angle. Do NOT change the product shape, relief, or proportions. Do NOT add marble veining, streaks, swirling cloudy patterns, or stone-like figuring of any kind. Do NOT render the product as carbon fiber, woven fabric, twill weave, herringbone, or any composite material — it is solid concrete only. The interior of any basin or curved surface must be a uniform matte tone, not marbled. No people. No visible brand logos.`;
}

async function persistOne(opts: {
  skuId: string;
  skuCode: string;
  slug: string;
  productName: string;
  category: SkuCategory;
  family: Family;
  color: string;
  scenePreset: ImageScenePreset;
  websiteDir: string;
  referenceImagePath: string;
}) {
  const promptText = buildVariantPrompt({
    skuCode: opts.skuCode,
    productName: opts.productName,
    category: opts.category,
    family: opts.family,
    color: opts.color,
    scenePreset: opts.scenePreset,
  });

  const label = `${opts.family} ${opts.color}`;
  const created = await prisma.generatedOutput.create({
    data: {
      skuId: opts.skuId,
      title: `${opts.skuCode} IMAGE RENDER · ${opts.scenePreset.toUpperCase()} · ${label}`,
      outputType: "IMAGE_RENDER",
      status: "QUEUED",
      inputPayload: {
        skuCode: opts.skuCode,
        outputType: "IMAGE_RENDER",
        scenePreset: opts.scenePreset,
        colorOverride: opts.color,
        finishOverride: opts.family,
        sealerOverride: "Matte",
        requestedOutput: `Color palette — ${label}`,
        creativeDirection: "Color variant using hero as geometry reference.",
      } as Prisma.InputJsonValue,
      outputPayload: {
        promptText,
        variantLabel: label,
        imageStatus: "QUEUED",
        referenceImagePath: opts.referenceImagePath,
      } as Prisma.InputJsonValue,
      generatedBy: "palette-fill-script",
    },
  });

  try {
    const providerResult = await generateImageWithGemini({
      generatedOutputId: created.id,
      promptText,
      referenceImagePath: opts.referenceImagePath,
      referenceInstruction: referenceInstructionFor(opts.scenePreset),
    });

    const asset = await prisma.generatedImageAsset.create({
      data: {
        generatedOutputId: created.id,
        promptTextUsed: promptText,
        modelName: providerResult.modelName,
        imageUrl: providerResult.imageUrl,
        filePath: providerResult.filePath,
        status: "GENERATED",
        width: providerResult.width,
        height: providerResult.height,
        metadataJson: providerResult.metadataJson,
      },
    });

    await prisma.generatedOutput.update({
      where: { id: created.id },
      data: {
        status: "GENERATED",
        outputPayload: {
          promptText,
          variantLabel: label,
          imageStatus: "GENERATED",
          imageAssetId: asset.id,
          imageUrl: asset.imageUrl,
          filePath: asset.filePath,
          referenceImagePath: opts.referenceImagePath,
        } as Prisma.InputJsonValue,
      },
    });

    if (!asset.filePath) throw new Error("no filePath");
    const destDir = path.join(WEBSITE_ROOT, "public", "images", opts.websiteDir);
    await mkdir(destDir, { recursive: true });
    const fileName = `${opts.slug}-${opts.color.toLowerCase()}.png`;
    const destFile = path.join(destDir, fileName);
    await copyFile(asset.filePath, destFile);
    await pushToMinIO(destFile, `${opts.websiteDir}/${fileName}`);
    return { ok: true as const, file: destFile };
  } catch (err) {
    await prisma.generatedOutput.update({
      where: { id: created.id },
      data: {
        status: "FAILED",
        outputPayload: {
          promptText,
          imageStatus: "FAILED",
          errorMessage: err instanceof Error ? err.message : String(err),
        } as Prisma.InputJsonValue,
      },
    });
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let category = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--category") category = args[++i] ?? "";
  }
  return { category };
}

async function main() {
  const { category } = parseArgs();
  if (!category || !CATEGORIES[category]) {
    console.error(`Usage: --category <sinks|furniture|panels|tiles|hardgoods>`);
    process.exit(1);
  }
  const cfg = CATEGORIES[category]!;

  const t0 = Date.now();
  const results: Array<{ label: string; ok: boolean; info: string }> = [];

  for (const plan of cfg.plans) {
    const sku = await prisma.sku.findUnique({ where: { code: plan.code } });
    if (!sku) { console.log(`[${plan.code}] not found`); continue; }

    // ALWAYS anchor to the website's canonical hero file, not the DB's
    // "most recent" asset. Otherwise color variants chain off each other
    // and drift (backdrops, lighting) propagate variant-to-variant.
    const heroPath = path.join(WEBSITE_ROOT, "public", "images", cfg.websiteDir, `${plan.slug}.png`);
    if (!existsSync(heroPath)) {
      console.log(`[${plan.code}] hero file missing at ${heroPath} — skipping`);
      continue;
    }
    const referenceImagePath = heroPath;

    const palette = plan.family === "Woodform" ? WOODFORM_COLORS : CLASSIC_COLORS;
    const heroAlias = plan.heroAliasColor ?? plan.heroColor;
    const needed = palette.filter((c) => c !== heroAlias);

    console.log(`[${plan.code}] family=${plan.family}, hero=${plan.heroColor}→${heroAlias}, ref=${path.basename(referenceImagePath)}`);

    for (const color of needed) {
      const destDir = path.join(WEBSITE_ROOT, "public", "images", cfg.websiteDir);
      const destFile = path.join(destDir, `${plan.slug}-${color.toLowerCase()}.png`);
      if (existsSync(destFile)) {
        console.log(`  ${color}: skip (on disk)`);
        results.push({ label: `${plan.code}/${color}`, ok: true, info: "skipped" });
        continue;
      }

      process.stdout.write(`  ${color} ... `);
      const start = Date.now();
      const r = await persistOne({
        skuId: sku.id,
        skuCode: plan.code,
        slug: plan.slug,
        productName: sku.name,
        category: cfg.category,
        family: plan.family,
        color,
        scenePreset: cfg.scenePreset,
        websiteDir: cfg.websiteDir,
        referenceImagePath,
      });
      const ms = Date.now() - start;
      if (r.ok) {
        console.log(`ok (${(ms / 1000).toFixed(1)}s) → ${path.relative(WEBSITE_ROOT, r.file)}`);
        results.push({ label: `${plan.code}/${color}`, ok: true, info: r.file });
      } else {
        console.log(`FAILED: ${r.error}`);
        results.push({ label: `${plan.code}/${color}`, ok: false, info: r.error });
      }
    }
  }

  const totalS = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("");
  console.log(`Done in ${totalS}s — ${ok} ok, ${failed.length} failed.`);
  if (failed.length) for (const f of failed) console.log(`  ${f.label}: ${f.info}`);
}

main()
  .catch((err) => { console.error("fatal:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
