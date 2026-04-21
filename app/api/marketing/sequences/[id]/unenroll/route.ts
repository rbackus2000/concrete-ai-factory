import { NextRequest, NextResponse } from "next/server";
import { unenrollContactSchema } from "@/lib/schemas/marketing";
import { unenrollContact } from "@/lib/services/marketing-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = unenrollContactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const enrollment = await unenrollContact(id, parsed.data.contactId, parsed.data.reason);
    if (!enrollment) {
      return NextResponse.json({ error: "No active enrollment found" }, { status: 404 });
    }
    return NextResponse.json({ data: enrollment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unenroll contact";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
