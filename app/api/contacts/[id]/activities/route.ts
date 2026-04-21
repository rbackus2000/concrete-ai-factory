import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { activityFormSchema } from "@/lib/schemas/contact";
import { getActivities, addActivity } from "@/lib/services/contact-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = request.nextUrl;
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  const take = parseInt(url.searchParams.get("take") || "20", 10);

  const activities = await getActivities(id, skip, take);
  return NextResponse.json({ data: activities });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = getActor(request);
  const { id } = await params;
  const body = await request.json();
  const parsed = activityFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const activity = await addActivity(
      id,
      parsed.data.type,
      parsed.data.content,
      actor.id,
    );
    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add activity";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
