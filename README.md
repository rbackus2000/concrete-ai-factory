# Concrete AI Factory

Production-oriented scaffold for an internal concrete product tooling app built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style source components, Prisma, PostgreSQL, Zod, and React Hook Form.

## Included

- Modular route scaffold for dashboard, SKUs, generator, packet preview, and calculator.
- Prisma schema covering `skus`, `prompt_templates`, `rules_master`, `materials_master`, `qc_templates`, `build_packet_templates`, and `generated_outputs`.
- Seed bundle with one fully populated `S1-EROSION` SKU and starter prompt/build-packet templates.
- Modular folders for `lib/engines`, `lib/services`, and `lib/schemas`.

## Local Bootstrap

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d`.
3. Add `GEMINI_API_KEY` in `.env.local` if you want `IMAGE_RENDER` generation enabled.
4. Install dependencies with `npm install`.
5. Run `npm run bootstrap`.
6. Start the app with `npm run dev`.
7. Sign in with one of the Basic Auth users from `.env`.

## Useful Commands

- `npm run bootstrap`: generate Prisma client, run `prisma migrate dev`, and seed starter data.
- `npm run pdf:check`: verify that `python3` and `reportlab` are available for PDF export.
- `npm run seed`: rerun Prisma seed data.
- `npm run db:studio`: open Prisma Studio.
- `npm run typecheck`: regenerate Next route types, then run `tsc --noEmit`.
- `npm run smoke`: run smoke coverage for SKU edit, packet generation, markdown export, and packet PDF export.

## Internal Access Model

- All app routes require HTTP Basic Auth using `INTERNAL_AUTH_USERS_JSON`.
- `ADMIN` users can access `/admin/*` CRUD surfaces.
- Standard `USER` accounts can use SKU, generator, packet, output, and calculator flows but are blocked from admin CRUD.

## PDF Runtime

- Build packet PDF export currently depends on local `python3` plus the `reportlab` package.
- Run `npm run pdf:check` during setup to confirm the runtime is available.
- If the runtime is missing, PDF export now fails with a clear message instead of a generic server error.
