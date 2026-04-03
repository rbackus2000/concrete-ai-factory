---
name: Concrete AI Factory — project overview
description: GFRC manufacturing internal tool — SKU management, AI prompt/image generation, build packets, calculators, export
type: project
---

Internal tooling app for Robert's concrete (GFRC) manufacturing company. Phases 1-4 (Foundation, Engines, UI, Export) are complete as of 2026-04-02. Single-app Next.js 15 with Prisma/Postgres, no monorepo. All routes behind HTTP Basic Auth. Only one fully seeded test SKU (S1-EROSION).

**Why:** Robert needs factory operators to generate build packets, QC checklists, material calculations, and AI-rendered product images from a single SKU record.

**How to apply:** This is a working internal tool, not a public SaaS. Prioritize operator usability and correctness over polish. The three-tier scope system (GLOBAL > SKU_CATEGORY > SKU_OVERRIDE) is central to every engine and must be respected in any new feature.
