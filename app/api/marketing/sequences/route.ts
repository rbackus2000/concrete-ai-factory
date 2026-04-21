import { NextRequest, NextResponse } from "next/server";
import { createSequenceSchema } from "@/lib/schemas/marketing";
import { listSequences, createSequence } from "@/lib/services/marketing-service";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const isActive = url.searchParams.get("isActive");
  const isPrebuilt = url.searchParams.get("isPrebuilt");

  const sequences = await listSequences({
    isActive: isActive !== null ? isActive === "true" : undefined,
    isPrebuilt: isPrebuilt !== null ? isPrebuilt === "true" : undefined,
  });

  return NextResponse.json({ data: sequences });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSequenceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const sequence = await createSequence(parsed.data);
    return NextResponse.json({ data: sequence }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create sequence";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
