import { NextResponse } from "next/server";

import { getPipelineData } from "@/lib/services/contact-service";

export async function GET() {
  const pipeline = await getPipelineData();
  return NextResponse.json({ data: pipeline });
}
