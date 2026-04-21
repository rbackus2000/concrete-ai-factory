import { NextRequest, NextResponse } from "next/server";
import { toggleSequence } from "@/lib/services/marketing-service";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const sequence = await toggleSequence(id);
    return NextResponse.json({ data: sequence });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to toggle sequence";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
