/**
 * Tool definitions for the Jacob agent.
 * These map to Anthropic's tool_use format.
 */

export type AgentTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "list_skus",
    description:
      "List all SKU records in the system. Returns code, name, category, status, and key dimensions for each SKU. Use this when the user asks about products, what we make, or wants to see available SKUs.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["VESSEL_SINK", "FURNITURE", "PANEL"],
          description: "Optional filter by SKU category.",
        },
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
          description: "Optional filter by status. Defaults to showing all.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_sku_details",
    description:
      "Get the full detailed record for a specific SKU including all geometry, specs, calculator defaults, datum system, and bracket specs. Use this when someone asks about a specific product's dimensions, specs, or manufacturing details.",
    input_schema: {
      type: "object" as const,
      properties: {
        sku_code: {
          type: "string",
          description: "The SKU code (e.g., 'S1-EROSION').",
        },
      },
      required: ["sku_code"],
    },
  },
  {
    name: "search_rules",
    description:
      "Search manufacturing rules in the system. Returns rule code, title, category, priority, and rule text. Use this when asked about manufacturing constraints, process rules, or QC requirements.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["DIMENSIONAL", "ALIGNMENT", "MOLD_SYSTEM", "PROCESS", "QC"],
          description: "Optional filter by rule category.",
        },
        sku_category: {
          type: "string",
          enum: ["VESSEL_SINK", "FURNITURE", "PANEL"],
          description: "Optional filter by SKU category scope.",
        },
      },
      required: [],
    },
  },
  {
    name: "search_materials",
    description:
      "Search materials in the system. Returns material code, name, category, unit, quantity, unit cost, and notes. Use this when asked about materials, costs, or what goes into a product.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
            "GFRC", "FACE_COAT", "BACKING_MIX", "PIGMENT", "REINFORCEMENT",
            "INSERT", "SEALER", "PACKAGING", "HARDWARE",
          ],
          description: "Optional filter by material category.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_recent_outputs",
    description:
      "Get recent generated outputs (prompts, build packets, calculations, image renders). Use this when asked about what's been generated, recent activity, or output history.",
    input_schema: {
      type: "object" as const,
      properties: {
        output_type: {
          type: "string",
          enum: [
            "IMAGE_PROMPT", "IMAGE_RENDER", "BLUEPRINT_PROMPT", "ALIGNMENT_PROMPT",
            "MOLD_BREAKDOWN_PROMPT", "DETAIL_SHEET_PROMPT", "BUILD_PACKET", "CALCULATION",
          ],
          description: "Optional filter by output type.",
        },
        limit: {
          type: "number",
          description: "Number of results to return. Defaults to 10.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_dashboard_metrics",
    description:
      "Get summary metrics for the dashboard — total SKUs, outputs generated, active rules, materials count, etc. Use this when asked about system status or overall progress.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_prompt_templates",
    description:
      "Search prompt templates in the system. Returns template key, name, category, output type, and scope.",
    input_schema: {
      type: "object" as const,
      properties: {
        output_type: {
          type: "string",
          enum: [
            "IMAGE_PROMPT", "IMAGE_RENDER", "BLUEPRINT_PROMPT", "ALIGNMENT_PROMPT",
            "MOLD_BREAKDOWN_PROMPT", "DETAIL_SHEET_PROMPT", "BUILD_PACKET", "CALCULATION",
          ],
          description: "Optional filter by output type.",
        },
      },
      required: [],
    },
  },
  {
    name: "search_qc_templates",
    description:
      "Search QC (quality control) templates. Returns checklist items, acceptance criteria, and rejection criteria.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["SETUP", "PRE_DEMOLD", "POST_DEMOLD", "ALIGNMENT"],
          description: "Optional filter by QC category.",
        },
      },
      required: [],
    },
  },
  {
    name: "list_slat_wall_projects",
    description:
      "List slat wall projects. Returns project code, name, status, client info, and config summary.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
          description: "Optional filter by project status.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_equipment_status",
    description:
      "Get equipment procurement status — categories, items, costs, and what's been purchased vs. still needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        phase: {
          type: "number",
          description: "Optional filter by procurement phase number.",
        },
      },
      required: [],
    },
  },
  {
    name: "search_build_packet_templates",
    description:
      "Search build packet templates. Returns section keys, names, order, and content previews.",
    input_schema: {
      type: "object" as const,
      properties: {
        sku_category: {
          type: "string",
          enum: ["VESSEL_SINK", "FURNITURE", "PANEL"],
          description: "Optional filter by SKU category scope.",
        },
      },
      required: [],
    },
  },
];
