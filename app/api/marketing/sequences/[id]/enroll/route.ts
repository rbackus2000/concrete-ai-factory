import { NextRequest, NextResponse } from "next/server";
import { enrollContactSchema } from "@/lib/schemas/marketing";
import { enrollContact } from "@/lib/services/marketing-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = enrollContactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const enrollment = await enrollContact(
      id,
      parsed.data.contactId,
      parsed.data.triggerRefId,
      parsed.data.triggerType,
    );
    if (!enrollment) {
      return NextResponse.json(
        { error: "Could not enroll contact (already enrolled or unsubscribed)" },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: enrollment }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enroll contact";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
