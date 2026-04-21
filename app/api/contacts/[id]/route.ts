import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { contactFormSchema } from "@/lib/schemas/contact";
import { getContact, updateContact, deleteContact } from "@/lib/services/contact-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contact = await getContact(id);

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ data: contact });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const contact = await updateContact(id, parsed.data, actor);
    return NextResponse.json({ data: contact });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;

  try {
    await deleteContact(id, actor);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
