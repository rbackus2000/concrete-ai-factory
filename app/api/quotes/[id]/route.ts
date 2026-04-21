import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { quoteFormSchema } from "@/lib/schemas/quote";
import { deleteQuote, getQuote, updateQuote } from "@/lib/services/quote-service";

export const dynamic = "force-dynamic";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  return NextResponse.json({ data: quote });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = quoteFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const contactId = typeof body.contactId === "string" ? body.contactId : undefined;
  const quote = await updateQuote(id, { ...parsed.data, contactId }, actor);
  return NextResponse.json({ data: quote });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;

  try {
    await deleteQuote(id, actor);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
