import { NextRequest, NextResponse } from "next/server";

import { searchContacts } from "@/lib/services/contact-service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const results = await searchContacts(query);
  return NextResponse.json({ data: results });
}
