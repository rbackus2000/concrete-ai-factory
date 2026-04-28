import { NextRequest, NextResponse } from "next/server";

import { tradeApplicationSchema } from "@/lib/schemas/trade-application";
import { submitTradeApplication } from "@/lib/services/trade-application-service";

// This endpoint is consumed by the public BDC website (backusdesignco.com).
// It is intentionally outside the admin Basic Auth boundary — the parent
// middleware excludes /api — so it gates itself with a shared bearer
// token (STOREFRONT_API_KEY). The website holds the same key in its
// Vercel env and sends it on every request.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkBearer(request: NextRequest): { ok: true } | { ok: false; status: number; body: object } {
  const expected = process.env.STOREFRONT_API_KEY;

  if (!expected) {
    // Dev convenience: when no key is configured, accept the request but
    // log a warning so we never silently miss the misconfiguration in prod.
    console.warn(
      "[storefront/trade-application] STOREFRONT_API_KEY is not set — accepting unauthenticated request",
    );
    return { ok: true };
  }

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      body: { error: "Missing or malformed Authorization header" },
    };
  }

  const token = header.slice("Bearer ".length).trim();
  if (token !== expected) {
    return { ok: false, status: 401, body: { error: "Invalid storefront API key" } };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const auth = checkBearer(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tradeApplicationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  try {
    const result = await submitTradeApplication(parsed.data);
    return NextResponse.json({ data: result }, { status: result.isNew ? 201 : 200 });
  } catch (err) {
    console.error("[storefront/trade-application] failed", err);
    return NextResponse.json(
      { error: "Failed to record trade application" },
      { status: 500 },
    );
  }
}
