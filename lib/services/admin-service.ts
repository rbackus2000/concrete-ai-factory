import { AuditAction, AuditEntityType, type Prisma } from "@prisma/client";

import type { ActionActor } from "@/lib/auth/session";

import { prisma } from "../db";
import { buildChangedFields, createAuditLog, summarizeAuditChange } from "./audit-service";
import {
  buildPacketTemplateAdminSchema,
  materialsMasterAdminSchema,
  parseOptionalJson,
  parseOptionalString,
  parseStringArrayJson,
  promptTemplateAdminSchema,
  qcTemplateAdminSchema,
  rulesMasterAdminSchema,
  type BuildPacketTemplateAdminValues,
  type MaterialsMasterAdminValues,
  type PromptTemplateAdminValues,
  type QcTemplateAdminValues,
  type RulesMasterAdminValues,
} from "../schemas/admin";

async function getSkuOptions() {
  const skus = await prisma.sku.findMany({
    orderBy: {
      code: "asc",
    },
  });

  return skus.map((sku) => ({
    id: sku.id,
    code: sku.code,
    name: sku.name,
  }));
}

function mapScopeLabel(record: {
  categoryScope: string;
  skuCategory: string | null;
  skuOverride: { code: string } | null;
}) {
  if (record.categoryScope === "GLOBAL") {
    return "GLOBAL";
  }

  if (record.categoryScope === "SKU_CATEGORY") {
    return `SKU_CATEGORY · ${record.skuCategory ?? "unspecified"}`;
  }

  return `SKU_OVERRIDE · ${record.skuOverride?.code ?? "unassigned"}`;
}

function determineAuditAction(
  nextStatus: string,
  previousStatus?: string,
): AuditAction {
  if (nextStatus === "ARCHIVED" && previousStatus !== "ARCHIVED") {
    return AuditAction.ARCHIVE;
  }

  return previousStatus ? AuditAction.UPDATE : AuditAction.CREATE;
}

export async function listPromptTemplates() {
  const rows = await prisma.promptTemplate.findMany({
    include: {
      skuOverride: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    category: row.category,
    outputType: row.outputType,
    status: row.status,
    version: row.version,
    scopeLabel: mapScopeLabel(row),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getPromptTemplateEditor(id?: string) {
  const [skuOptions, record] = await Promise.all([
    getSkuOptions(),
    id
      ? prisma.promptTemplate.findUnique({
          where: { id },
        })
      : Promise.resolve(null),
  ]);

  return {
    skuOptions,
    record: record
      ? {
          id: record.id,
          key: record.key,
          name: record.name,
          category: record.category,
          categoryScope: record.categoryScope,
          skuCategory: (record.skuCategory ?? "") as PromptTemplateAdminValues["skuCategory"],
          skuOverrideId: record.skuOverrideId ?? "",
          outputType: record.outputType,
          status: record.status,
          version: record.version,
          systemPrompt: record.systemPrompt ?? "",
          templateBody: record.templateBody,
          variablesText: JSON.stringify(record.variablesJson ?? [], null, 2),
          notes: record.notes ?? "",
        }
      : null,
  };
}

export async function createPromptTemplate(values: PromptTemplateAdminValues, actor: ActionActor) {
  const parsed = promptTemplateAdminSchema.parse(values);
  const created = await prisma.promptTemplate.create({
    data: {
      key: parsed.key,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType,
      status: parsed.status,
      version: parsed.version,
      systemPrompt: parseOptionalString(parsed.systemPrompt),
      templateBody: parsed.templateBody,
      variablesJson: parseStringArrayJson(parsed.variablesText),
      notes: parseOptionalString(parsed.notes),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PROMPT_TEMPLATE,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("prompt template", AuditAction.CREATE, {}),
    changedFields: buildChangedFields(
      {},
      {
        key: parsed.key,
        name: parsed.name,
        category: parsed.category,
        categoryScope: parsed.categoryScope,
        skuCategory: parsed.skuCategory || null,
        skuOverrideId: parseOptionalString(parsed.skuOverrideId),
        outputType: parsed.outputType,
        status: parsed.status,
        version: parsed.version,
      },
    ) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updatePromptTemplate(
  id: string,
  values: PromptTemplateAdminValues,
  actor: ActionActor,
) {
  const parsed = promptTemplateAdminSchema.parse(values);
  const existing = await prisma.promptTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Prompt template was not found.");
  }

  const updated = await prisma.promptTemplate.update({
    where: { id },
    data: {
      key: parsed.key,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType,
      status: parsed.status,
      version: parsed.version,
      systemPrompt: parseOptionalString(parsed.systemPrompt),
      templateBody: parsed.templateBody,
      variablesJson: parseStringArrayJson(parsed.variablesText),
      notes: parseOptionalString(parsed.notes),
    },
  });

  const changedFields = buildChangedFields(
    {
      key: existing.key,
      name: existing.name,
      category: existing.category,
      categoryScope: existing.categoryScope,
      skuCategory: existing.skuCategory,
      skuOverrideId: existing.skuOverrideId,
      outputType: existing.outputType,
      status: existing.status,
      version: existing.version,
      systemPrompt: existing.systemPrompt,
      templateBody: existing.templateBody,
      variablesJson: existing.variablesJson,
      notes: existing.notes,
    },
    {
      key: parsed.key,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType,
      status: parsed.status,
      version: parsed.version,
      systemPrompt: parseOptionalString(parsed.systemPrompt),
      templateBody: parsed.templateBody,
      variablesJson: parseStringArrayJson(parsed.variablesText),
      notes: parseOptionalString(parsed.notes),
    },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.PROMPT_TEMPLATE,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("prompt template", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}

export async function listRulesMaster() {
  const rows = await prisma.rulesMaster.findMany({
    include: {
      skuOverride: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    title: row.title,
    category: row.category,
    outputType: row.outputType ?? "ANY",
    priority: row.priority,
    status: row.status,
    scopeLabel: mapScopeLabel(row),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getRulesMasterEditor(id?: string) {
  const [skuOptions, record] = await Promise.all([
    getSkuOptions(),
    id
      ? prisma.rulesMaster.findUnique({
          where: { id },
        })
      : Promise.resolve(null),
  ]);

  return {
    skuOptions,
    record: record
      ? {
          id: record.id,
          code: record.code,
          title: record.title,
          category: record.category,
          categoryScope: record.categoryScope,
          skuCategory: (record.skuCategory ?? "") as RulesMasterAdminValues["skuCategory"],
          skuOverrideId: record.skuOverrideId ?? "",
          outputType: (record.outputType ?? "") as RulesMasterAdminValues["outputType"],
          status: record.status,
          priority: record.priority,
          description: record.description ?? "",
          ruleText: record.ruleText,
          source: record.source ?? "",
          metadataJson: JSON.stringify(record.metadata ?? {}, null, 2),
        }
      : null,
  };
}

export async function createRulesMaster(values: RulesMasterAdminValues, actor: ActionActor) {
  const parsed = rulesMasterAdminSchema.parse(values);
  const created = await prisma.rulesMaster.create({
    data: {
      code: parsed.code,
      title: parsed.title,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType || null,
      status: parsed.status,
      priority: parsed.priority,
      description: parseOptionalString(parsed.description),
      ruleText: parsed.ruleText,
      source: parseOptionalString(parsed.source),
      metadata: parseOptionalJson(parsed.metadataJson),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.RULES_MASTER,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("rules master record", AuditAction.CREATE, {}),
    changedFields: buildChangedFields(
      {},
      {
        code: parsed.code,
        title: parsed.title,
        category: parsed.category,
        categoryScope: parsed.categoryScope,
        skuCategory: parsed.skuCategory || null,
        skuOverrideId: parseOptionalString(parsed.skuOverrideId),
        outputType: parsed.outputType || null,
        status: parsed.status,
        priority: parsed.priority,
      },
    ) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateRulesMaster(
  id: string,
  values: RulesMasterAdminValues,
  actor: ActionActor,
) {
  const parsed = rulesMasterAdminSchema.parse(values);
  const existing = await prisma.rulesMaster.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Rules master record was not found.");
  }

  const updated = await prisma.rulesMaster.update({
    where: { id },
    data: {
      code: parsed.code,
      title: parsed.title,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType || null,
      status: parsed.status,
      priority: parsed.priority,
      description: parseOptionalString(parsed.description),
      ruleText: parsed.ruleText,
      source: parseOptionalString(parsed.source),
      metadata: parseOptionalJson(parsed.metadataJson),
    },
  });

  const changedFields = buildChangedFields(
    {
      code: existing.code,
      title: existing.title,
      category: existing.category,
      categoryScope: existing.categoryScope,
      skuCategory: existing.skuCategory,
      skuOverrideId: existing.skuOverrideId,
      outputType: existing.outputType,
      status: existing.status,
      priority: existing.priority,
      description: existing.description,
      ruleText: existing.ruleText,
      source: existing.source,
      metadata: existing.metadata,
    },
    {
      code: parsed.code,
      title: parsed.title,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType || null,
      status: parsed.status,
      priority: parsed.priority,
      description: parseOptionalString(parsed.description),
      ruleText: parsed.ruleText,
      source: parseOptionalString(parsed.source),
      metadata: parseOptionalJson(parsed.metadataJson),
    },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.RULES_MASTER,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("rules master record", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}

export async function listBuildPacketTemplates() {
  const rows = await prisma.buildPacketTemplate.findMany({
    include: {
      skuOverride: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [{ packetKey: "asc" }, { sectionOrder: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    packetKey: row.packetKey,
    sectionKey: row.sectionKey,
    name: row.name,
    sectionOrder: row.sectionOrder,
    outputType: row.outputType,
    status: row.status,
    scopeLabel: mapScopeLabel(row),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getBuildPacketTemplateEditor(id?: string) {
  const [skuOptions, record] = await Promise.all([
    getSkuOptions(),
    id
      ? prisma.buildPacketTemplate.findUnique({
          where: { id },
        })
      : Promise.resolve(null),
  ]);

  return {
    skuOptions,
    record: record
      ? {
          id: record.id,
          packetKey: record.packetKey,
          sectionKey: record.sectionKey,
          name: record.name,
          sectionOrder: record.sectionOrder,
          categoryScope: record.categoryScope,
          skuCategory: (record.skuCategory ?? "") as BuildPacketTemplateAdminValues["skuCategory"],
          skuOverrideId: record.skuOverrideId ?? "",
          outputType: record.outputType,
          status: record.status,
          content: record.content,
          variablesText: JSON.stringify(record.variables ?? [], null, 2),
        }
      : null,
  };
}

export async function createBuildPacketTemplate(
  values: BuildPacketTemplateAdminValues,
  actor: ActionActor,
) {
  const parsed = buildPacketTemplateAdminSchema.parse(values);
  const created = await prisma.buildPacketTemplate.create({
    data: {
      packetKey: parsed.packetKey,
      sectionKey: parsed.sectionKey,
      name: parsed.name,
      sectionOrder: parsed.sectionOrder,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType,
      status: parsed.status,
      content: parsed.content,
      variables: parseStringArrayJson(parsed.variablesText),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.BUILD_PACKET_TEMPLATE,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("build packet template", AuditAction.CREATE, {}),
    changedFields: buildChangedFields(
      {},
      {
        packetKey: parsed.packetKey,
        sectionKey: parsed.sectionKey,
        name: parsed.name,
        sectionOrder: parsed.sectionOrder,
        categoryScope: parsed.categoryScope,
        skuCategory: parsed.skuCategory || null,
        skuOverrideId: parseOptionalString(parsed.skuOverrideId),
        outputType: parsed.outputType,
        status: parsed.status,
      },
    ) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateBuildPacketTemplate(
  id: string,
  values: BuildPacketTemplateAdminValues,
  actor: ActionActor,
) {
  const parsed = buildPacketTemplateAdminSchema.parse(values);
  const existing = await prisma.buildPacketTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Build packet template was not found.");
  }

  const updated = await prisma.buildPacketTemplate.update({
    where: { id },
    data: {
      packetKey: parsed.packetKey,
      sectionKey: parsed.sectionKey,
      name: parsed.name,
      sectionOrder: parsed.sectionOrder,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType,
      status: parsed.status,
      content: parsed.content,
      variables: parseStringArrayJson(parsed.variablesText),
    },
  });

  const changedFields = buildChangedFields(
    {
      packetKey: existing.packetKey,
      sectionKey: existing.sectionKey,
      name: existing.name,
      sectionOrder: existing.sectionOrder,
      categoryScope: existing.categoryScope,
      skuCategory: existing.skuCategory,
      skuOverrideId: existing.skuOverrideId,
      outputType: existing.outputType,
      status: existing.status,
      content: existing.content,
      variables: existing.variables,
    },
    {
      packetKey: parsed.packetKey,
      sectionKey: parsed.sectionKey,
      name: parsed.name,
      sectionOrder: parsed.sectionOrder,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      outputType: parsed.outputType,
      status: parsed.status,
      content: parsed.content,
      variables: parseStringArrayJson(parsed.variablesText),
    },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.BUILD_PACKET_TEMPLATE,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("build packet template", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}

export async function listQcTemplates() {
  const rows = await prisma.qcTemplate.findMany({
    include: {
      skuOverride: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    templateKey: row.templateKey,
    name: row.name,
    category: row.category,
    status: row.status,
    scopeLabel: mapScopeLabel(row),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getQcTemplateEditor(id?: string) {
  const [skuOptions, record] = await Promise.all([
    getSkuOptions(),
    id
      ? prisma.qcTemplate.findUnique({
          where: { id },
        })
      : Promise.resolve(null),
  ]);

  return {
    skuOptions,
    record: record
      ? {
          id: record.id,
          templateKey: record.templateKey,
          name: record.name,
          category: record.category,
          categoryScope: record.categoryScope,
          skuCategory: (record.skuCategory ?? "") as QcTemplateAdminValues["skuCategory"],
          skuOverrideId: record.skuOverrideId ?? "",
          status: record.status,
          checklistText: JSON.stringify(record.checklistJson ?? [], null, 2),
          acceptanceCriteriaText: JSON.stringify(record.acceptanceCriteriaJson ?? [], null, 2),
          rejectionCriteriaText: JSON.stringify(record.rejectionCriteriaJson ?? [], null, 2),
          notes: record.notes ?? "",
        }
      : null,
  };
}

export async function createQcTemplate(values: QcTemplateAdminValues, actor: ActionActor) {
  const parsed = qcTemplateAdminSchema.parse(values);
  const created = await prisma.qcTemplate.create({
    data: {
      templateKey: parsed.templateKey,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      status: parsed.status,
      checklistJson: parseStringArrayJson(parsed.checklistText),
      acceptanceCriteriaJson: parseStringArrayJson(parsed.acceptanceCriteriaText),
      rejectionCriteriaJson: parseStringArrayJson(parsed.rejectionCriteriaText),
      notes: parseOptionalString(parsed.notes),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.QC_TEMPLATE,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("QC template", AuditAction.CREATE, {}),
    changedFields: buildChangedFields(
      {},
      {
        templateKey: parsed.templateKey,
        name: parsed.name,
        category: parsed.category,
        categoryScope: parsed.categoryScope,
        skuCategory: parsed.skuCategory || null,
        skuOverrideId: parseOptionalString(parsed.skuOverrideId),
        status: parsed.status,
      },
    ) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateQcTemplate(
  id: string,
  values: QcTemplateAdminValues,
  actor: ActionActor,
) {
  const parsed = qcTemplateAdminSchema.parse(values);
  const existing = await prisma.qcTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("QC template was not found.");
  }

  const updated = await prisma.qcTemplate.update({
    where: { id },
    data: {
      templateKey: parsed.templateKey,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      status: parsed.status,
      checklistJson: parseStringArrayJson(parsed.checklistText),
      acceptanceCriteriaJson: parseStringArrayJson(parsed.acceptanceCriteriaText),
      rejectionCriteriaJson: parseStringArrayJson(parsed.rejectionCriteriaText),
      notes: parseOptionalString(parsed.notes),
    },
  });

  const changedFields = buildChangedFields(
    {
      templateKey: existing.templateKey,
      name: existing.name,
      category: existing.category,
      categoryScope: existing.categoryScope,
      skuCategory: existing.skuCategory,
      skuOverrideId: existing.skuOverrideId,
      status: existing.status,
      checklistJson: existing.checklistJson,
      acceptanceCriteriaJson: existing.acceptanceCriteriaJson,
      rejectionCriteriaJson: existing.rejectionCriteriaJson,
      notes: existing.notes,
    },
    {
      templateKey: parsed.templateKey,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      status: parsed.status,
      checklistJson: parseStringArrayJson(parsed.checklistText),
      acceptanceCriteriaJson: parseStringArrayJson(parsed.acceptanceCriteriaText),
      rejectionCriteriaJson: parseStringArrayJson(parsed.rejectionCriteriaText),
      notes: parseOptionalString(parsed.notes),
    },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.QC_TEMPLATE,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("QC template", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}

export async function listMaterialsMaster() {
  const rows = await prisma.materialsMaster.findMany({
    include: {
      skuOverride: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity?.toString() ?? "0",
    unitCost: row.unitCost?.toString() ?? "0",
    status: row.status,
    scopeLabel: mapScopeLabel(row),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getMaterialsMasterEditor(id?: string) {
  const [skuOptions, record] = await Promise.all([
    getSkuOptions(),
    id
      ? prisma.materialsMaster.findUnique({
          where: { id },
        })
      : Promise.resolve(null),
  ]);

  return {
    skuOptions,
    record: record
      ? {
          id: record.id,
          code: record.code,
          name: record.name,
          category: record.category,
          categoryScope: record.categoryScope,
          skuCategory: (record.skuCategory ?? "") as MaterialsMasterAdminValues["skuCategory"],
          skuOverrideId: record.skuOverrideId ?? "",
          status: record.status,
          unit: record.unit,
          quantity: Number(record.quantity ?? 0),
          unitCost: Number(record.unitCost ?? 0),
          specification: record.specification ?? "",
          notes: record.notes ?? "",
          metadataJson: JSON.stringify(record.metadata ?? {}, null, 2),
        }
      : null,
  };
}

export async function createMaterialsMaster(
  values: MaterialsMasterAdminValues,
  actor: ActionActor,
) {
  const parsed = materialsMasterAdminSchema.parse(values);
  const created = await prisma.materialsMaster.create({
    data: {
      code: parsed.code,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      status: parsed.status,
      unit: parsed.unit,
      quantity: parsed.quantity,
      unitCost: parsed.unitCost,
      specification: parseOptionalString(parsed.specification),
      notes: parseOptionalString(parsed.notes),
      metadata: parseOptionalJson(parsed.metadataJson),
    },
  });

  await createAuditLog({
    actor,
    entityType: AuditEntityType.MATERIALS_MASTER,
    entityId: created.id,
    action: AuditAction.CREATE,
    summary: summarizeAuditChange("materials master record", AuditAction.CREATE, {}),
    changedFields: buildChangedFields(
      {},
      {
        code: parsed.code,
        name: parsed.name,
        category: parsed.category,
        categoryScope: parsed.categoryScope,
        skuCategory: parsed.skuCategory || null,
        skuOverrideId: parseOptionalString(parsed.skuOverrideId),
        status: parsed.status,
        unit: parsed.unit,
        quantity: parsed.quantity,
        unitCost: parsed.unitCost,
      },
    ) as Prisma.InputJsonValue,
  });

  return { id: created.id };
}

export async function updateMaterialsMaster(
  id: string,
  values: MaterialsMasterAdminValues,
  actor: ActionActor,
) {
  const parsed = materialsMasterAdminSchema.parse(values);
  const existing = await prisma.materialsMaster.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Material record was not found.");
  }

  const updated = await prisma.materialsMaster.update({
    where: { id },
    data: {
      code: parsed.code,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      status: parsed.status,
      unit: parsed.unit,
      quantity: parsed.quantity,
      unitCost: parsed.unitCost,
      specification: parseOptionalString(parsed.specification),
      notes: parseOptionalString(parsed.notes),
      metadata: parseOptionalJson(parsed.metadataJson),
    },
  });

  const changedFields = buildChangedFields(
    {
      code: existing.code,
      name: existing.name,
      category: existing.category,
      categoryScope: existing.categoryScope,
      skuCategory: existing.skuCategory,
      skuOverrideId: existing.skuOverrideId,
      status: existing.status,
      unit: existing.unit,
      quantity: existing.quantity?.toNumber() ?? null,
      unitCost: existing.unitCost?.toNumber() ?? null,
      specification: existing.specification,
      notes: existing.notes,
      metadata: existing.metadata,
    },
    {
      code: parsed.code,
      name: parsed.name,
      category: parsed.category,
      categoryScope: parsed.categoryScope,
      skuCategory: parsed.skuCategory || null,
      skuOverrideId: parseOptionalString(parsed.skuOverrideId),
      status: parsed.status,
      unit: parsed.unit,
      quantity: parsed.quantity,
      unitCost: parsed.unitCost,
      specification: parseOptionalString(parsed.specification),
      notes: parseOptionalString(parsed.notes),
      metadata: parseOptionalJson(parsed.metadataJson),
    },
  );
  const action = determineAuditAction(parsed.status, existing.status);

  await createAuditLog({
    actor,
    entityType: AuditEntityType.MATERIALS_MASTER,
    entityId: updated.id,
    action,
    summary: summarizeAuditChange("materials master record", action, changedFields),
    changedFields: changedFields as Prisma.InputJsonValue,
  });

  return { id: updated.id };
}
