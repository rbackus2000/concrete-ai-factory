import { NextRequest, NextResponse } from "next/server";
import { sendCampaignSchema } from "@/lib/schemas/marketing";
import { sendCampaign } from "@/lib/services/marketing-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = sendCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const campaign = await sendCampaign(id, parsed.data.sendNow, parsed.data.scheduledAt);
    return NextResponse.json({ data: campaign });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
