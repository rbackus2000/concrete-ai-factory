import { NextRequest, NextResponse } from "next/server";
import type { QuoteStatus } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { quoteFormSchema } from "@/lib/schemas/quote";
import { createQuote, listQuotes } from "@/lib/services/quote-service";

export const dynamic = "force-dynamic";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") as QuoteStatus | null;
  const search = searchParams.get("search") || undefined;

  const quotes = await listQuotes({
    status: status || undefined,
    search,
  });

  return NextResponse.json({ data: quotes });
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);

  const body = await request.json();
  const parsed = quoteFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const contactId = typeof body.contactId === "string" ? body.contactId : undefined;
  const quote = await createQuote({ ...parsed.data, contactId }, actor);
  return NextResponse.json({ data: quote }, { status: 201 });
}
