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
          enum: ["VESSEL_SINK", "FURNITURE", "PANEL", "WALL_TILE"],
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
          enum: ["VESSEL_SINK", "FURNITURE", "PANEL", "WALL_TILE"],
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
          enum: ["VESSEL_SINK", "FURNITURE", "PANEL", "WALL_TILE"],
          description: "Optional filter by SKU category scope.",
        },
      },
      required: [],
    },
  },
  // ── DESIGN & GENERATION TOOLS ─────────────────────────────────
  {
    name: "design_new_product",
    description:
      "Generate a structured design brief for a new GFRC product from a natural language description. Claude will research current trends and create a detailed design with dimensions, features, finish, mount type, drain type, and an image generation prompt. Returns the brief for user review before creation. Use this when the user wants to design a new sink, furniture piece, or wall tile.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description:
            "Natural language description of the product to design. Be specific about form, style, size, use case, and any unique features. Example: 'A wide shallow ramp sink with a linear slot drain, designed for a commercial restroom, dark charcoal finish'",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "generate_concept_image",
    description:
      "Generate a photorealistic AI product image using Google Gemini from an image prompt. Use this after design_new_product to visualize the concept, or create custom product renders. The image is persisted to the database as a GeneratedOutput + GeneratedImageAsset. Returns the image URL.",
    input_schema: {
      type: "object" as const,
      properties: {
        image_prompt: {
          type: "string",
          description:
            "Detailed image generation prompt describing the product, materials, lighting, camera angle, and setting. Should specify GFRC concrete, the finish, and 'hyperrealistic commercial product photography'.",
        },
        product_name: {
          type: "string",
          description: "Name of the product for labeling the generated output.",
        },
      },
      required: ["image_prompt", "product_name"],
    },
  },
  {
    name: "create_product_from_design",
    description:
      "Create a complete product in the database from an approved design brief. This generates the full product bundle: SKU record with all 40+ geometry fields, build packet sections, scoped materials, and QC checklists. The SKU is created in DRAFT status. Use this ONLY after the user has reviewed and approved the design brief from design_new_product.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_name: { type: "string", description: "Product name from the approved design brief." },
        category: { type: "string", enum: ["VESSEL_SINK", "FURNITURE", "PANEL", "WALL_TILE"], description: "Product category." },
        style_description: { type: "string", description: "2-3 sentence design description." },
        key_features: {
          type: "array",
          items: { type: "string" },
          description: "List of key design features.",
        },
        outer_length: { type: "number", description: "Outer length in inches." },
        outer_width: { type: "number", description: "Outer width in inches." },
        outer_height: { type: "number", description: "Outer height in inches." },
        inner_depth: { type: "number", description: "Inner basin/cavity depth in inches." },
        drain_type: { type: "string", enum: ["Round", "Slot", "Grid", ""], description: "Drain type." },
        mount_type: { type: "string", description: "Mount type (WALL_MOUNT_STUD, VESSEL_TOP_MOUNT, FREESTANDING, WALL_MOUNT_THINSET)." },
        finish: { type: "string", description: "Finish name from the approved brief." },
        image_prompt: { type: "string", description: "Image generation prompt from the approved brief." },
        concept_image_url: { type: "string", description: "URL of a previously generated concept image, if any." },
      },
      required: ["product_name", "category", "style_description", "key_features", "outer_length", "outer_width", "outer_height", "inner_depth", "drain_type", "mount_type", "finish", "image_prompt"],
    },
  },
  {
    name: "generate_sku_output",
    description:
      "Generate an output (image prompt, build packet, blueprint, etc.) for an existing SKU using the full generation pipeline. This resolves scoped templates, rules, and materials, then produces the output. Use this to generate image prompts, build packets, or other outputs for a SKU.",
    input_schema: {
      type: "object" as const,
      properties: {
        sku_code: { type: "string", description: "SKU code (e.g., 'S1-EROSION')." },
        output_type: {
          type: "string",
          enum: ["IMAGE_PROMPT", "BUILD_PACKET", "BLUEPRINT_PROMPT", "ALIGNMENT_PROMPT", "MOLD_BREAKDOWN_PROMPT", "DETAIL_SHEET_PROMPT"],
          description: "Type of output to generate.",
        },
        scene_preset: {
          type: "string",
          description: "Scene preset for image prompts (e.g., 'lifestyle', 'catalog', 'detail', 'installed', 'sample').",
        },
      },
      required: ["sku_code", "output_type"],
    },
  },
  {
    name: "calculate_mold_print_specs",
    description:
      "Calculate 3D print mold specifications for a SKU: mold dimensions in mm, section splitting plan for Ender-5 Max (400x400x400mm build volume), slicing settings (layer height, infill, supports), and estimated print time. Use this when the user asks about mold printing, STL generation, or 3D print planning for a product.",
    input_schema: {
      type: "object" as const,
      properties: {
        sku_code: {
          type: "string",
          description: "SKU code to calculate mold specs for (e.g., 'S1-EROSION').",
        },
      },
      required: ["sku_code"],
    },
  },
];
