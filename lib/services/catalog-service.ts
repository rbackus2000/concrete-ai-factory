import { prisma } from "@/lib/db";
import { composeCatalogSpec, type CatalogSpec } from "@/lib/catalog/compose-spec";
import { renderCatalogPdf } from "@/lib/catalog/render-pdf";

// MinIO is path-style, so the public URL must include the bucket name.
const CDN_BASE = "https://cdn.opsrbstudio.com/bdc-products";

export type CatalogRecord = {
  id: string;
  version: number;
  title: string;
  subtitle: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  publishedAt: Date | null;
  pdfUrl: string | null;
  jsonUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listCatalogs(): Promise<CatalogRecord[]> {
  const records = await prisma.catalog.findMany({
    orderBy: { version: "desc" },
  });
  return records.map((r) => ({
    id: r.id,
    version: r.version,
    title: r.title,
    subtitle: r.subtitle,
    status: r.status,
    publishedAt: r.publishedAt,
    pdfUrl: r.pdfUrl,
    jsonUrl: r.jsonUrl,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getLatestPublishedCatalog(): Promise<CatalogRecord | null> {
  const r = await prisma.catalog.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { version: "desc" },
  });
  if (!r) return null;
  return {
    id: r.id,
    version: r.version,
    title: r.title,
    subtitle: r.subtitle,
    status: r.status,
    publishedAt: r.publishedAt,
    pdfUrl: r.pdfUrl,
    jsonUrl: r.jsonUrl,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function previewCatalogSpec(): Promise<CatalogSpec> {
  // For preview we use the next version number (current max + 1).
  const latest = await prisma.catalog.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;
  return composeCatalogSpec(version);
}

async function uploadToMinIO(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET || "bdc-products";
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error("MinIO env vars not set; cannot upload catalog files.");
  }
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    endpoint,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from(body),
    ContentType: contentType,
  }));
  return `${CDN_BASE}/${key}`;
}

export async function publishCatalog(): Promise<CatalogRecord> {
  // Allocate next version number.
  const latest = await prisma.catalog.findFirst({
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  // Compose the full spec from content + Sku data.
  const spec = await composeCatalogSpec(version);

  // Render PDF + JSON.
  const pdfBytes = await renderCatalogPdf(spec);
  const jsonBytes = Buffer.from(JSON.stringify(spec, null, 2), "utf8");

  // Upload both to MinIO. Versioned + "latest" copies.
  const pdfKey = `catalogs/v${version}.pdf`;
  const pdfLatestKey = `catalogs/latest.pdf`;
  const jsonKey = `catalogs/v${version}.json`;
  const jsonLatestKey = `catalogs/latest.json`;

  const pdfUrl = await uploadToMinIO(pdfKey, pdfBytes, "application/pdf");
  await uploadToMinIO(pdfLatestKey, pdfBytes, "application/pdf");
  const jsonUrl = await uploadToMinIO(jsonKey, jsonBytes, "application/json");
  await uploadToMinIO(jsonLatestKey, jsonBytes, "application/json");

  // Mark previously ACTIVE catalogs as ARCHIVED so we always have one current.
  await prisma.catalog.updateMany({
    where: { status: "ACTIVE" },
    data: { status: "ARCHIVED" },
  });

  // Insert the new ACTIVE row.
  const created = await prisma.catalog.create({
    data: {
      version,
      title: spec.meta.title,
      subtitle: spec.meta.subtitle,
      status: "ACTIVE",
      publishedAt: new Date(),
      pdfUrl,
      jsonUrl,
      metadataJson: { sectionCount: spec.sections.length, productCount: spec.sections.reduce((a, s) => a + s.products.length, 0) } as object,
    },
  });

  return {
    id: created.id,
    version: created.version,
    title: created.title,
    subtitle: created.subtitle,
    status: created.status,
    publishedAt: created.publishedAt,
    pdfUrl: created.pdfUrl,
    jsonUrl: created.jsonUrl,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}
