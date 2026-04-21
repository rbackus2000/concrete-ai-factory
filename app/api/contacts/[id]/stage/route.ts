import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { stageUpdateSchema } from "@/lib/schemas/contact";
import { updateContactStage } from "@/lib/services/contact-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = stageUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const contact = await updateContactStage(id, parsed.data.stage, actor);
    return NextResponse.json({ data: contact });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update stage";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
