# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Internal tooling app for a concrete product (GFRC) manufacturing company. Manages SKU definitions, generates AI prompts and images (via Gemini), assembles build packets, runs material/cost calculators, and exports to markdown/PDF. All routes are behind HTTP Basic Auth.

**Core principle:** One SKU record is the source of truth. It drives prompt generation, build packets, QC, calculator outputs, and exports. SKU geometry is stored as typed decimal fields (not a JSON blob).

## Commands

```bash
# Local setup
docker compose up -d                  # PostgreSQL 16
npm install
npm run bootstrap                     # prisma generate + migrate dev + seed

# Development
npm run dev                           # next dev
npm run typecheck                     # next typegen && tsc --noEmit
npm run lint                          # next lint (eslint)

# Database
npm run db:studio                     # Prisma Studio GUI
npm run db:push                       # Push schema without migration
npm run db:migrate                    # prisma migrate dev
npm run seed                          # Re-seed starter data

# Tests
npm run smoke                         # node --import tsx --test scripts/smoke.test.ts
# Smoke tests require a running DB with seeded data (S1-EROSION SKU)

# PDF runtime check
npm run pdf:check                     # Verifies python3 + reportlab are available
```

## Architecture

### Three-Layer Pattern

Server Actions (`app/actions/`) -> Services (`lib/services/`) -> Engines (`lib/engines/`)

- **Actions** (`app/actions/*.ts`): Thin `"use server"` wrappers. Validate with Zod, call `requireSession()`, delegate to a service.
- **Services** (`lib/services/*.ts`): Orchestrate DB queries (Prisma), map Prisma records to domain types, call engines, persist results.
- **Engines** (`lib/engines/*.ts`): Pure business logic with no DB access. Accept typed records, return computed results.

### Engines

| Engine | Purpose |
|---|---|
| `prompt-engine` | Template interpolation with `{{token}}` and `{{#if}}` conditionals, scope resolution, scene preset mapping |
| `rules-engine` | Resolves manufacturing rules for a SKU based on scope hierarchy |
| `packet-builder` | Assembles multi-section build packets from templates + derived rules/QC sections |
| `calculator-engine` | Material quantity, cost, and batch calculations |
| `validation-engine` | QC checklist/acceptance/rejection criteria assembly |

### Three-Tier Scoping System

Templates, rules, materials, QC checklists, and build packet sections all use the same scope resolution:

1. **GLOBAL** — applies to all SKUs
2. **SKU_CATEGORY** — applies to a category (VESSEL_SINK, COUNTERTOP, FURNITURE, PANEL)
3. **SKU_OVERRIDE** — applies to one specific SKU

The `buildScopedWhere()` helper in `lib/services/service-helpers.ts` builds the Prisma OR clause. Engines filter with `matchesXxxScope()` functions.

### Auth Model

- HTTP Basic Auth enforced in `middleware.ts` using `INTERNAL_AUTH_USERS_JSON` env var (JSON array of user objects).
- Middleware sets `x-caf-user-role`, `x-caf-username`, `x-caf-display-name` headers on authenticated requests.
- `lib/auth/session.ts` reads these headers in Server Components/Actions via `requireSession()` / `requireAdminSession()`.
- `/admin/*` routes require `ADMIN` role. All other app routes require any authenticated user.

### Image Generation

- `IMAGE_PROMPT` outputs generate prompt text for debugging; `IMAGE_RENDER` outputs call Gemini and produce actual images.
- Image templates are resolved by SKU category + scene preset (e.g., `sink_image_lifestyle`, `panel_image_installed`). Sinks, furniture, and panels each have distinct prompt families.
- Uses Gemini API directly (REST, not AI SDK). See `lib/services/image-generation-service.ts`.
- Generated images saved to `public/generated-images/` (gitignored).
- Requires `GEMINI_API_KEY` in `.env.local`.

### PDF Export

- Build packet PDFs rendered by `scripts/render_packet_pdf.py` (Python 3 + reportlab).
- Called from `lib/services/pdf-export-service.ts` via child process.
- Run `npm run pdf:check` to verify the runtime is available.

### Prisma Decimal Handling

All Prisma `Decimal` fields are converted to `number` via `decimalToNumber()` in `service-helpers.ts` before passing to engines. The `mapSkuRecord()` function handles the full SKU conversion.

## Route Map

| Route | Purpose |
|---|---|
| `/` | Home / redirect |
| `/dashboard` | Summary metrics |
| `/skus` | SKU listing |
| `/skus/[skuCode]` | SKU detail & edit |
| `/generator` | Trigger output generation |
| `/outputs` | Browse generated outputs |
| `/outputs/[outputId]` | View single output |
| `/outputs/[outputId]/print` | Print-friendly view |
| `/outputs/[outputId]/markdown` | Markdown export (route handler) |
| `/outputs/[outputId]/pdf` | PDF export (route handler) |
| `/packets/[skuCode]` | Build packet for SKU |
| `/calculator` | Material/cost calculator |
| `/admin` | Admin hub |
| `/admin/prompt-templates` | CRUD prompt templates |
| `/admin/rules-master` | CRUD manufacturing rules |
| `/admin/build-packet-templates` | CRUD packet templates |
| `/admin/qc-templates` | CRUD QC checklists |
| `/admin/materials-master` | CRUD materials |
| `/admin/audit-logs` | Audit history (read-only, filterable) |

Admin entity routes follow the pattern: `/admin/{entity}`, `/admin/{entity}/new`, `/admin/{entity}/[id]`.

## Database Models

| Model | Table | Key Fields |
|---|---|---|
| `Sku` | skus | code (unique), slug, category, 40+ decimal geometry fields, calculatorDefaults JSON |
| `PromptTemplate` | prompt_templates | key+version+scope unique, systemPrompt, templateBody |
| `RulesMaster` | rules_master | code+scope unique, ruleText, priority |
| `MaterialsMaster` | materials_master | code+scope unique, quantity, unitCost |
| `QcTemplate` | qc_templates | templateKey+scope unique, checklistJson, acceptanceCriteriaJson |
| `BuildPacketTemplate` | build_packet_templates | packetKey+sectionKey+scope unique, content, sectionOrder |
| `GeneratedOutput` | generated_outputs | skuId FK, outputType, inputPayload/outputPayload JSON |
| `GeneratedOutputBuildPacketSection` | — | generatedOutputId FK, sectionKey, content |
| `GeneratedImageAsset` | — | generatedOutputId FK, imageUrl, filePath |
| `AuditLog` | audit_logs | actorId, entityType, entityId, action, changedFields JSON |

All scoped models share: `categoryScope` + optional `skuCategory` + optional `skuOverrideId`.

## Key Conventions

- **Zod schemas** live in `lib/schemas/` and mirror Prisma enums. Domain enum values are defined as `const` arrays with corresponding Zod schemas and TypeScript types in `lib/schemas/domain.ts`.
- **UI components** follow shadcn/ui patterns (new-york style, stone base color). Source components in `components/ui/`. Uses `cn()` from `lib/utils.ts`.
- **Forms** use react-hook-form + `@hookform/resolvers` with Zod schemas. Form components in `components/forms/`.
- **Audit logging** via `lib/services/audit-service.ts` — tracks CREATE, UPDATE, ARCHIVE, and export actions with actor info.
- **Route Handlers** (markdown/PDF export) are in `app/outputs/[outputId]/markdown/route.ts` and `app/outputs/[outputId]/pdf/route.ts`.
- **Build packet provenance**: `GeneratedOutputBuildPacketSection` stores individual section rows so one generated packet references multiple contributing templates, not a single template.
- Path alias: `@/*` maps to project root.
- **Naming:** Services are `{domain}-service.ts`, engines are `{domain}-engine.ts`, actions are `{domain}-actions.ts`, schemas are `{domain}.ts`. Components use kebab-case directories.
- **Types:** DB mappings exported as `{Name}Record`, form values as `{Name}Values`. Domain enums defined as `const` arrays with `z.enum()` wrappers in `lib/schemas/domain.ts`.
- **Exports:** Services and engines export named functions (not classes). Components are default exports.
- **Icons:** `lucide-react` for all icons.
- **Variants:** `class-variance-authority` (CVA) for component variant APIs.

## Tech Stack

- **Next.js** 15.2 (App Router, `typedRoutes: true`)
- **React** 19, **TypeScript** 5.8 (strict)
- **Tailwind CSS** 3.4 (class-based dark mode, HSL CSS vars)
- **Prisma** 6.6 (PostgreSQL 16 via Docker)
- **Zod** 3.24, **react-hook-form** 7.54
- **shadcn/ui** components (new-york style, stone base)
- **Python 3** + reportlab (PDF rendering only)
- **Gemini API** (image generation, REST — not AI SDK)

## Build Status

Phases 1-4 (Foundation, Engines, UI, Export) are complete. See `concrete_ai_factory_codex_build_plan.md` for full build history and delta from original plan.

### Known Weak Spots

- Auth is Basic Auth, not SSO/session-backed
- PDF export only works for BUILD_PACKET outputs (not prompts or calculations)
- PDF runtime depends on local Python 3 + reportlab
- S1-EROSION is the only fully seeded production test case
- No git repository initialized yet
