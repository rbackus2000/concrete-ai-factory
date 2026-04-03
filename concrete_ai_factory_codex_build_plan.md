# Concrete AI Factory — Codex Build Plan

## Stack Decision

### Database
**PostgreSQL + Prisma**

Why:
- relational data fits the SKU/template/rules/output model
- strong schema control for engineering-heavy product data
- easy migrations as fields evolve
- works cleanly with Next.js and Codex-driven repo workflows
- supports JSON fields where useful without turning the whole system into a schemaless mess

Do **not** use Firebase, Airtable, or a pure spreadsheet as the primary database for this. They are fine as import/export layers, not as the system of record.

### App Stack
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- PostgreSQL
- Zod for validation
- React Hook Form for editing
- server-side PDF/Markdown export layer later

## Why this fits Codex

Codex is positioned for agentic coding workflows across the Codex app, IDE extension, and CLI, with guidance emphasizing clear repo structure, planning, validation, and reusable skills. OpenAI also documents Codex local environments and GitHub review workflows, which fits this project well. The Codex model lineup and coding guidance make it a sensible environment for building this app.

## System Architecture

### Core Principle
One SKU record is the source of truth.

The SKU record drives:
- concept prompt generation
- blueprint prompt generation
- mold prompt generation
- alignment prompt generation
- build packet generation
- QC generation
- calculator outputs
- export outputs

## Data Model

### 1. skus
Primary product table.

Fields:
- id
- active
- sku
- product_name
- category
- collection
- style
- prompt_archetype
- outer_l
- outer_w
- outer_h
- wall_thk
- bottom_thk
- top_lip_thk
- inner_l
- inner_w
- inner_d
- hollow_core_depth
- dome_rise_min
- dome_rise_max
- long_rib_ct
- cross_rib_ct
- rib_width
- rib_height
- drain_dia
- reinf_dia
- reinf_thk
- drain_taper_len
- target_wt_min
- target_wt_max
- fiber_pct
- draft_angle
- corner_radius
- finish
- pigment_family
- use_case
- outer_mold_material
- basin_core_material
- void_core_material
- status
- notes
- created_at
- updated_at

### 2. prompt_templates
- id
- template_key
- output_type
- title
- template_body
- category_scope
- version
- active
- created_at
- updated_at

### 3. rules_master
- id
- rule_key
- category
- condition_json
- output_json
- severity
- message
- active
- created_at
- updated_at

### 4. materials_master
- id
- material_name
- material_type
- unit
- default_cost
- default_density
- coverage_rate
- notes
- created_at
- updated_at

### 5. qc_templates
- id
- category
- section
- checklist_json
- version
- active
- created_at
- updated_at

### 6. build_packet_templates
- id
- category
- section_key
- section_title
- template_body
- sort_order
- active
- created_at
- updated_at

### 7. generated_outputs
Stores output snapshots so users can regenerate and compare revisions.

- id
- sku_id
- output_type
- content
- version_label
- generated_from_rules_version
- generated_from_template_version
- created_at

## Repo Layout

```text
/concrete-ai-factory
  /app
    /(dashboard)
      /dashboard
      /skus
      /skus/[sku]
      /generator
      /packets/[sku]
      /calculator
      /settings/templates
  /components
    /sku
    /generator
    /packet
    /calculator
    /shared
  /lib
    /db
    /engines
      rules-engine.ts
      prompt-engine.ts
      packet-builder.ts
      calculator-engine.ts
      validation-engine.ts
    /services
      sku-service.ts
      template-service.ts
      output-service.ts
      export-service.ts
    /schemas
      sku-schema.ts
      template-schema.ts
  /prisma
    schema.prisma
    seed.ts
  /docs
    architecture.md
    codex-brief.md
    prompt-spec.md
    packet-spec.md
```

## Build Phases

### Phase 1 — Foundation
Completed:
- Prisma schema created and hardened
- PostgreSQL local development via Docker configured
- migration setup repaired and made healthy
- seed data for S1-EROSION implemented
- prompt templates, packet templates, rules, materials, and QC tables seeded

### Phase 2 — Engines
Completed:
- validation engine
- rules engine
- prompt engine
- calculator engine
- packet builder

### Phase 3 — UI
Completed:
- dashboard
- SKU list page
- SKU detail/editor page
- generator page
- packet preview page
- calculator page
- output history pages
- admin CRUD pages for core records

### Phase 4 — Export
Completed for v1:
- markdown export for prompt, packet, and calculation outputs
- PDF export for build packet outputs
- versioned generated outputs and output history views

## Current Implemented State — Delta From Original Plan

This section reflects what has actually been built compared to the original canvas plan.

### 1. Local development and runtime
Implemented:
- `docker-compose.yml` for local PostgreSQL 16
- `.env.example` aligned to local Postgres connection string
- `next.config.ts` corrected to top-level `typedRoutes`
- Prisma local workflow repaired and healthy again
- Prisma seed configuration moved out of deprecated `package.json#prisma` usage into `prisma.config.ts`
- migration ordering issue fixed so `prisma migrate dev` now works correctly

Current local workflow:
- `docker compose up -d`
- `npm run db:migrate`
- `npm run seed`
- `npm run dev`
- `npm run db:studio`

### 2. Final database direction
Database remains **PostgreSQL + Prisma**.

The schema evolved beyond the original draft and now reflects a stricter reusable-system architecture.

Implemented core records:
- `Sku`
- `PromptTemplate`
- `RulesMaster`
- `MaterialsMaster`
- `QcTemplate`
- `BuildPacketTemplate`
- `GeneratedOutput`
- `GeneratedOutputBuildPacketSection`

### 3. Final schema direction
#### `Sku`
`Sku` is now the core product record and carries typed manufacturable geometry instead of a single soft `dimensionsJson` blob.

Implemented typed geometry fields include:
- outerLength
- outerWidth
- outerHeight
- innerLength
- innerWidth
- innerDepth
- wallThickness
- bottomThickness
- topLipThickness
- hollowCoreDepth
- domeRiseMin
- domeRiseMax
- longRibCount
- crossRibCount
- ribWidth
- ribHeight
- drainDiameter
- reinforcementDiameter
- reinforcementThickness
- draftAngle
- cornerRadius
- fiberPercent

Still intentionally JSON:
- `datumSystemJson`
- `calculatorDefaults`

#### Reusable scoped masters
`PromptTemplate`, `RulesMaster`, `MaterialsMaster`, `QcTemplate`, and `BuildPacketTemplate` are not modeled as permanent child collections of every SKU.

They resolve through:
- `categoryScope`
- optional `skuCategory`
- optional `skuOverrideId`

That is the actual implemented architecture.

#### Generated outputs
`GeneratedOutput` stores saved runs for:
- prompt outputs
- build packet outputs
- calculation outputs
- exportable output detail views

For packet provenance, the system now also uses `GeneratedOutputBuildPacketSection` so one generated build packet can reference multiple contributing packet sections rather than pretending a whole packet came from one template row.

### 4. Seeded first production object
Still centered on `S1-EROSION` as the first production test case.

Seeded and operational:
- S1-EROSION SKU
- starter materials
- starter rules
- starter QC templates
- starter prompt templates
- starter build packet sections
- starter generated output example

### 5. Engine layer actually built
Implemented exact engine files:
- `lib/engines/validation-engine.ts`
- `lib/engines/rules-engine.ts`
- `lib/engines/prompt-engine.ts`
- `lib/engines/calculator-engine.ts`
- `lib/engines/packet-builder.ts`

Working responsibilities:
- validation-engine checks manufacturability and input validity
- rules-engine derives clearances, mold logic, warnings, and computed values
- prompt-engine resolves templates and injects SKU + derived variables
- calculator-engine computes production math and cost placeholders
- packet-builder assembles build packet sections from SKU + templates + derived rules/QC

### 6. Services and page architecture
Implemented architecture direction:
- pages stay thin
- server actions handle mutations
- services orchestrate Prisma access
- engines hold business logic

Important implemented services include:
- `sku-service.ts`
- `sku-write.ts`
- `generator-service.ts`
- `packet-service.ts`
- `calculator-service.ts`
- `dashboard-service.ts`
- `generated-output-service.ts`
- `admin-service.ts`
- `export-service.ts`
- `pdf-export-service.ts`

### 7. Pages currently implemented
Implemented internal app pages now include:
- `/dashboard`
- `/skus`
- `/skus/[skuCode]`
- `/generator`
- `/packets/[skuCode]`
- `/calculator`
- `/outputs`
- `/outputs/[outputId]`
- `/outputs/[outputId]/markdown`
- `/outputs/[outputId]/print`
- `/outputs/[outputId]/pdf`
- `/admin`
- `/admin/prompt-templates`
- `/admin/prompt-templates/new`
- `/admin/prompt-templates/[id]`
- `/admin/rules-master`
- `/admin/rules-master/new`
- `/admin/rules-master/[id]`
- `/admin/build-packet-templates`
- `/admin/build-packet-templates/new`
- `/admin/build-packet-templates/[id]`
- `/admin/qc-templates`
- `/admin/qc-templates/new`
- `/admin/qc-templates/[id]`
- `/admin/materials-master`
- `/admin/materials-master/new`
- `/admin/materials-master/[id]`

### 8. End-to-end workflows currently working
Implemented and verified:

#### SKU editing
- `/skus/[skuCode]` loads from Prisma
- editable form using React Hook Form + Zod
- writes normalized geometry and controlled JSON fields back to Prisma

#### Generation
- `/generator` resolves live templates and rules from Prisma
- saves `GeneratedOutput` rows for prompt, packet, and calculation runs
- build packet generation also creates `GeneratedOutputBuildPacketSection` rows

#### Packet preview
- `/packets/[skuCode]` renders Prisma-backed packet content
- includes packet sections plus derived rule and QC content
- read-only by design

#### Calculator
- `/calculator` loads live SKU and materials-backed defaults
- accepts override inputs for units, waste, pigment, sealer coats, and cost assumptions
- saves calculation outputs into `GeneratedOutput`

### 9. Output history and inspection
Implemented output management beyond the original plan:
- `/outputs` global history page
- `/outputs/[outputId]` detail page
- recent output section on SKU detail page

Output detail views now separate:
- rendered text
- packet sections
- rules applied
- QC templates applied
- calculation metrics
- source references
- raw input payload
- raw output payload

### 10. Admin CRUD layer now built
This was not fully defined in the original canvas but is now implemented.

Admin CRUD exists for:
- `PromptTemplate`
- `RulesMaster`
- `BuildPacketTemplate`
- `QcTemplate`
- `MaterialsMaster`

Each has:
- list view
- create page
- edit page
- Zod validation
- Prisma-backed reads/writes
- activate/archive handling via `RecordStatus`

### 11. Export layer now built
Implemented export status:

#### Markdown export
Works for:
- prompt outputs
- build packet outputs
- calculation outputs

#### Printable packet rendering
Works for:
- build packet outputs

#### PDF export
Currently production-ready for:
- `BUILD_PACKET`

Implementation notes:
- packet PDF export routes through services, not bloated pages
- PDF rendering currently depends on local Python + `reportlab`
- markdown export is the clean universal export format for all current output types

### 12. Image generation direction added after original canvas
The original canvas assumed prompt generation, but the system direction now distinguishes between:
- `IMAGE_PROMPT` for prompt/debug output
- `IMAGE_RENDER` for actual rendered images

Current design direction for image rendering:
- use category-based prompt families instead of one universal image prompt
- resolve image templates by SKU category and scene preset
- keep prompt generation traceable internally, but make finished image generation the user-facing path

Recommended image template keys now defined for future seed/use:
- `sink_image_lifestyle`
- `sink_image_catalog`
- `sink_image_detail`
- `furniture_image_lifestyle`
- `furniture_image_catalog`
- `furniture_image_detail`
- `panel_image_installed`
- `panel_image_sample`
- `panel_image_repeat_pattern`

Implemented design decision:
- sinks, furniture, and panels/tiles should not share one giant backend image prompt
- backend image generation should use category template + SKU variable injection + scene preset + negative rules

### 13. Hardening status
Implemented or acknowledged:
- internal-only Basic Auth exists
- audit logging exists for CRUD writes
- export routes are a remaining audit-log gap to close
- audit-history UI is still missing
- PDF export runtime depends on local Python + reportlab

### 14. Current v1 status
This project is no longer just a build plan. It is now a working internal v1 system with:
- healthy Prisma migration flow
- seeded S1-EROSION test object
- Prisma-backed CRUD and generation flows
- packet provenance stored in normalized section rows
- output history and inspection
- admin management for core system records
- markdown export for all outputs
- PDF export for build packet outputs

### 15. Remaining weak spots
Current known weak spots:
- auth is still Basic Auth rather than SSO/session-backed user management
- audit logs do not yet have a proper UI
- export actions themselves are not yet audit-logged
- PDF runtime depends on Python + reportlab
- prompt and calculation outputs do not yet have dedicated PDF document models
- some flexible fields remain JSON/textarea driven by design

## First Production Test Case
Use `S1-EROSION` first.

Why:
- most complete product definition already exists
- enough structural detail to validate the data model
- enough prompt detail to validate the generator
- enough fabrication detail to validate packet generation

## Codex Operating Pattern

### Best repo workflow
Use Codex to work in short, controlled passes:
1. create schema
2. run migration
3. seed example SKU
4. build engine module
5. add route/page
6. validate outputs
7. commit

### What not to do
- do not ask Codex to build the entire system in one prompt
- do not keep rules in scattered markdown files forever
- do not let templates drift from the database source of truth
- do not let product edits bypass schema validation

## Codex Build Brief

Use this as the first build brief in Codex:

Build a Next.js + TypeScript internal app called `concrete-ai-factory` using PostgreSQL and Prisma. Create the full Prisma schema for SKU-driven concrete product generation, including tables for skus, prompt_templates, rules_master, materials_master, qc_templates, build_packet_templates, and generated_outputs. Seed the database with one fully populated example SKU for `S1-EROSION` and starter template rows for image prompt, blueprint prompt, alignment prompt, mold breakdown prompt, detail sheet prompt, and build packet sections. Then scaffold pages for SKU list, SKU detail, generator, packet preview, and calculator. Keep the code modular and production-oriented.

## Codex Execution — What To Do Now

### Step 1 — Create the repo
Create a new repo/folder named:

```text
concrete-ai-factory
```

Initialize it in Codex/your IDE and make sure Codex is pointed at that project directory.

OpenAI’s Codex quickstart says the IDE extension starts in Agent mode by default, which is the right mode here because it can read files, write code, and run commands in the project directory. Configure the project early and keep prompts scoped to the repo. 

### Step 2 — Give Codex the first prompt
Paste this as the first real build prompt in Codex:

```text
Build a new internal web app called `concrete-ai-factory` using Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, Zod, and React Hook Form.

Requirements:
- Create the project structure for a production-oriented internal tool.
- Add Prisma with a PostgreSQL datasource.
- Create models for: skus, prompt_templates, rules_master, materials_master, qc_templates, build_packet_templates, and generated_outputs.
- Include enums where appropriate for category, output type, and status.
- Add createdAt and updatedAt fields consistently.
- Seed the database with one fully populated SKU for `S1-EROSION`.
- Seed starter prompt templates for image prompt, blueprint prompt, alignment prompt, mold breakdown prompt, detail sheet prompt, and build packet sections.
- Scaffold routes/pages for: dashboard, skus list, sku detail, generator, packet preview, and calculator.
- Keep the code modular with `/lib/engines`, `/lib/services`, and `/lib/schemas`.
- After scaffolding, show me the Prisma schema, the seed structure, and the generated file tree before moving to deeper logic.
```

Codex prompting guidance recommends giving the agent concrete context, file references, and explicit deliverables rather than vague “build everything” requests. 

### Step 3 — Approve only the foundation pass
For the first pass, do **not** let Codex wander into polishing UI or export features.

Approve only this scope:
- project scaffold
- Prisma schema
- database config
- initial migration setup
- seed file
- route/page scaffolding
- file tree

### Step 4 — Then give Codex the engine prompt
Once the foundation is done, use this second prompt:

```text
Now implement the core engines for the concrete-ai-factory app.

Build these modules:
- lib/engines/validation-engine.ts
- lib/engines/rules-engine.ts
- lib/engines/prompt-engine.ts
- lib/engines/calculator-engine.ts
- lib/engines/packet-builder.ts

Requirements:
- validation-engine checks manufacturability constraints for SKU data
- rules-engine derives values like clearances, mold box dimensions, rib offsets, estimated surface area, and warnings
- prompt-engine loads prompt templates and injects SKU + derived variables into final prompt text
- calculator-engine computes batch size, scale factor, water, plasticizer, fiber, pigment grams, sealer estimate, and material cost placeholders
- packet-builder assembles standardized build packet sections from SKU data and packet templates
- keep each engine pure and testable where possible
- add at least basic example usage for S1-EROSION
- show me the implementation summary and any assumptions before continuing
```

### Step 5 — Then build the usable UI
Use this third prompt:

```text
Now connect the database and engine layer to the UI.

Build usable internal pages for:
- /dashboard
- /skus
- /skus/[sku]
- /generator
- /packets/[sku]
- /calculator

Requirements:
- /skus shows a table of SKU records
- /skus/[sku] shows editable product data using React Hook Form + Zod validation
- /generator lets me pick a SKU and generate prompt outputs
- /packets/[sku] shows the assembled build packet preview
- /calculator uses SKU defaults but allows override inputs for units, waste factor, pigment intensity, sealer coats, and costs
- use simple, clean internal-tool styling, not marketing-site styling
- wire the pages to Prisma-backed services
- keep components separated under /components
```

### Step 6 — Configure Codex for the repo
OpenAI documents that Codex supports project-level config via `.codex/config.toml`, while the IDE extension and CLI share config behavior. Add project config early so this repo behaves consistently. 

Recommended repo-level config direction:
- use the project root as the writable workspace
- require approval for destructive actions
- allow normal file edits and safe local commands

### Step 7 — Use short controlled passes
OpenAI’s Codex best practices recommend configuring the environment early and working in clear, scoped tasks rather than one giant prompt. That is exactly how this repo should be built. 

Working pattern:
1. scaffold
2. inspect files
3. refine schema
4. run migration
5. seed data
6. build engines
7. wire UI
8. test outputs
9. export later

## First Files Codex Should Produce

At minimum, after pass one you should see:

```text
/app/(dashboard)/dashboard/page.tsx
/app/(dashboard)/skus/page.tsx
/app/(dashboard)/skus/[sku]/page.tsx
/app/(dashboard)/generator/page.tsx
/app/(dashboard)/packets/[sku]/page.tsx
/app/(dashboard)/calculator/page.tsx
/lib/engines/validation-engine.ts
/lib/engines/rules-engine.ts
/lib/engines/prompt-engine.ts
/lib/engines/calculator-engine.ts
/lib/engines/packet-builder.ts
/lib/services/sku-service.ts
/lib/services/template-service.ts
/lib/services/output-service.ts
/lib/schemas/sku-schema.ts
/prisma/schema.prisma
/prisma/seed.ts
```

## What You Should Say to Codex If It Starts Going Sideways

Use these correction prompts:

### If Codex gets too fancy
```text
Stop adding polish. Stay focused on internal-tool architecture, schema correctness, and modular engine design.
```

### If Codex starts collapsing logic into pages
```text
Refactor business logic out of route/page files and into /lib/engines and /lib/services.
```

### If Codex makes the schema sloppy
```text
Tighten the Prisma schema. Normalize where appropriate, use enums where useful, and keep naming consistent with the concrete product system.
```

### If Codex skips seed data
```text
Add complete seed data for S1-EROSION and starter prompt/build packet templates before doing more UI work.
```

## Final Call

Database choice: **PostgreSQL + Prisma**.

That is the correct system of record for this product. Google Sheets can exist as an import/export layer. It should not be the backbone.

