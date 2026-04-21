import { NextRequest, NextResponse } from "next/server";
import { updateSequenceSchema } from "@/lib/schemas/marketing";
import { getSequence, updateSequence, deleteSequence } from "@/lib/services/marketing-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sequence = await getSequence(id);
  if (!sequence) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
  }
  return NextResponse.json({ data: sequence });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSequenceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const sequence = await updateSequence(id, parsed.data);
    return NextResponse.json({ data: sequence });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update sequence";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteSequence(id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete sequence";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
