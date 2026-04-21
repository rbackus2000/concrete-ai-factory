import { NextRequest, NextResponse } from "next/server";
import type { InvoiceStatus } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { invoiceCreateSchema } from "@/lib/schemas/invoice";
import { listInvoices, createInvoice } from "@/lib/services/invoice-service";

export const dynamic = "force-dynamic";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") as InvoiceStatus | null;
  const search = searchParams.get("search") || undefined;

  const invoices = await listInvoices({
    status: status || undefined,
    search,
  });

  return NextResponse.json({ data: invoices });
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);
  const body = await request.json();
  const parsed = invoiceCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const invoice = await createInvoice(parsed.data, actor);
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
