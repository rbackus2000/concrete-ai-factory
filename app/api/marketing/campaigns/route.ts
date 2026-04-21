import { NextRequest, NextResponse } from "next/server";
import { createCampaignSchema } from "@/lib/schemas/marketing";
import { listCampaigns, createCampaign } from "@/lib/services/marketing-service";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as never;
  const campaigns = await listCampaigns(status ? { status } : undefined);
  return NextResponse.json({ data: campaigns });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createCampaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const campaign = await createCampaign(parsed.data);
    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
