import { NextRequest, NextResponse } from "next/server";
import { updateCampaignSchema } from "@/lib/schemas/marketing";
import { getCampaign, updateCampaign, cancelCampaign } from "@/lib/services/marketing-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json({ data: campaign });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const campaign = await updateCampaign(id, parsed.data);
    return NextResponse.json({ data: campaign });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await cancelCampaign(id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
